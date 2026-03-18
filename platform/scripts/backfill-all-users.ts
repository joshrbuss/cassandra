/**
 * Backfill script: re-imports puzzles for ALL users with linked chess accounts.
 *
 * For each user:
 *  1. Deletes existing source='user_import' puzzles
 *  2. Resets RawGame records to pending
 *  3. Clears lastSyncedAt so full fetch happens
 *  4. Fetches PGNs from Chess.com (archives) and/or Lichess
 *  5. Extracts puzzles (Lichess: eval annotations + Stockfish solution, Chess.com: full Stockfish)
 *  6. Saves puzzles via Prisma
 *
 * Usage: cd platform && npx tsx scripts/backfill-all-users.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Chess } from "chess.js";
import { spawn } from "child_process";
import { existsSync } from "fs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient({ log: ["error", "warn"] });
const MAX_PERSONAL_PUZZLES = 500;
const BLUNDER_THRESHOLD_PAWNS = 0.6;
const MAX_PER_GAME = 3;
const ANALYSIS_DEPTH = 12;
const ENGINE_TIMEOUT_MS = 10_000;

// ---------- CUID ----------
function cuid(): string {
  return `c${Date.now().toString(36)}${randomBytes(8).toString("hex")}`;
}

// ---------- Stockfish wrapper ----------
interface EngineResult { move: string; cp: number; }

function findEngine(): string[] | null {
  const paths = ["/opt/homebrew/bin/stockfish", "/usr/local/bin/stockfish", "/usr/bin/stockfish"];
  for (const p of paths) { if (existsSync(p)) return [p]; }
  return null;
}

const engineCmd = findEngine();

async function getBestMove(fen: string): Promise<EngineResult | null> {
  if (!engineCmd) return null;
  return new Promise((resolve) => {
    const proc = spawn(engineCmd[0], engineCmd.slice(1), { stdio: ["pipe", "pipe", "pipe"] });
    let bestMove = "", cp = 0, done = false;

    const finish = (r: EngineResult | null) => {
      if (!done) { done = true; clearTimeout(t); try { proc.kill(); } catch {} resolve(r); }
    };
    const t = setTimeout(() => finish(null), ENGINE_TIMEOUT_MS);

    let buf = "";
    proc.stdout!.on("data", (chunk: Buffer) => {
      buf += chunk.toString();
      const lines = buf.split("\n"); buf = lines.pop() ?? "";
      for (const line of lines) {
        if (line.startsWith("info") && line.includes("score cp")) {
          const m = line.match(/score cp (-?\d+)/); if (m) cp = parseInt(m[1], 10);
          const pv = line.match(/\bpv ([a-h][1-8][a-h][1-8]\w?)/); if (pv) bestMove = pv[1];
        }
        if (line.startsWith("bestmove")) {
          const bm = line.match(/bestmove ([a-h][1-8][a-h][1-8]\w?)/); if (bm) bestMove = bm[1];
          finish(bestMove ? { move: bestMove, cp } : null); return;
        }
      }
    });
    proc.stderr!.on("data", () => {});
    proc.on("error", () => finish(null));
    proc.on("exit", (code) => { if (code && !done) finish(null); });

    proc.stdin!.write("uci\nisready\n");
    proc.stdin!.write(`position fen ${fen}\ngo depth ${ANALYSIS_DEPTH}\n`);
  });
}

// ---------- PGN helpers ----------
function extractGameUrl(pgn: string): string | undefined {
  return pgn.match(/\[Link\s+"([^"]+)"\]/)?.[1]
    ?? (pgn.match(/\[Site\s+"([^"]+)"\]/)?.[1]?.startsWith("http")
      ? pgn.match(/\[Site\s+"([^"]+)"\]/)?.[1] : undefined);
}

function parsePgnHeader(pgn: string, tag: string): string | undefined {
  return pgn.match(new RegExp(`\\[${tag}\\s+"([^"]+)"\\]`))?.[1];
}

function extractGameContext(pgn: string, playerUsername?: string) {
  const white = parsePgnHeader(pgn, "White");
  const black = parsePgnHeader(pgn, "Black");
  const result = parsePgnHeader(pgn, "Result");
  const utcDate = parsePgnHeader(pgn, "UTCDate") ?? parsePgnHeader(pgn, "Date");
  const gameDate = utcDate?.replace(/\./g, "-");

  if (!playerUsername || !white || !black) return { gameDate };

  const lc = playerUsername.toLowerCase();
  let playerColor: "white" | "black" | undefined;
  if (white.toLowerCase() === lc) playerColor = "white";
  else if (black.toLowerCase() === lc) playerColor = "black";
  if (!playerColor) return { gameDate };

  const opponentUsername = playerColor === "white" ? black : white;
  let gameResult: string | undefined;
  if (result === "1-0") gameResult = playerColor === "white" ? "win" : "loss";
  else if (result === "0-1") gameResult = playerColor === "black" ? "win" : "loss";
  else if (result === "1/2-1/2") gameResult = "draw";

  return { opponentUsername, gameResult, gameDate, playerColor };
}

// ---------- Eval annotation extractor (Lichess) ----------
function parseEvalValue(s: string): number | null {
  const t = s.trim();
  if (t.startsWith("#")) { const n = parseInt(t.slice(1), 10); return isNaN(n) ? null : n > 0 ? 30 : -30; }
  const v = parseFloat(t); return isNaN(v) ? null : v;
}

function extractEvals(pgn: string): (number | null)[] {
  const out: (number | null)[] = [];
  const re = /\[%eval\s+([^\]]+)\]/g;
  let m; while ((m = re.exec(pgn))) out.push(parseEvalValue(m[1]));
  return out;
}

interface ParsedMove { uci: string; fenBefore: string; fenAfter: string; sideToMove: "w" | "b"; }

function parseMoves(pgn: string): ParsedMove[] {
  const chess = new Chess();
  try { chess.loadPgn(pgn); } catch { return []; }
  const history = chess.history({ verbose: true });
  if (!history.length) return [];
  const replay = new Chess();
  return history.map((move) => {
    const fenBefore = replay.fen();
    const side = replay.turn() as "w" | "b";
    replay.move(move);
    return { uci: `${move.from}${move.to}${move.promotion ?? ""}`, fenBefore, fenAfter: replay.fen(), sideToMove: side };
  });
}

async function tryExtendSequence(startFen: string, firstMove: string): Promise<string> {
  try {
    const chess = new Chess(startFen);
    const m1 = chess.move({ from: firstMove.slice(0, 2), to: firstMove.slice(2, 4), promotion: firstMove[4] || undefined });
    if (!m1) return firstMove;
    const r2 = await getBestMove(chess.fen()); if (!r2) return firstMove;
    const m2 = chess.move({ from: r2.move.slice(0, 2), to: r2.move.slice(2, 4), promotion: r2.move[4] || undefined });
    if (!m2) return firstMove;
    const r3 = await getBestMove(chess.fen());
    if (!r3 || r3.cp < 200) return firstMove;
    return `${firstMove} ${r2.move} ${r3.move}`;
  } catch { return firstMove; }
}

interface PuzzleCandidate {
  id: string; fen: string; solvingFen: string; lastMove: string; solutionMoves: string;
  rating: number; themes: string; type: string; source: string; sourceUserId: string;
  isPublic: boolean; gameUrl?: string; opponentUsername?: string; gameDate?: string;
  gameResult?: string; moveNumber?: number; evalCp?: number; playerColor?: string;
}

async function extractFromAnnotatedPgn(pgn: string, userId: string, playerUsername: string): Promise<PuzzleCandidate[]> {
  const gameUrl = extractGameUrl(pgn);
  const ctx = extractGameContext(pgn, playerUsername);
  const evals = extractEvals(pgn);
  if (evals.length === 0) return [];

  const moves = parseMoves(pgn);
  if (moves.length < 5) return [];

  const playerTurn: "w" | "b" | null = ctx.playerColor === "white" ? "w" : ctx.playerColor === "black" ? "b" : null;
  const candidates: PuzzleCandidate[] = [];

  for (let i = 1; i < moves.length && candidates.length < MAX_PER_GAME; i++) {
    const evalBefore = evals[i - 1], evalAfter = evals[i];
    if (evalBefore === null || evalAfter === null) continue;
    const { sideToMove, uci: blunderUci, fenBefore } = moves[i];
    if (playerTurn && sideToMove !== playerTurn) continue;

    const swing = sideToMove === "w" ? evalBefore - evalAfter : evalAfter - evalBefore;
    if (swing < BLUNDER_THRESHOLD_PAWNS) continue;

    const engineResult = await getBestMove(fenBefore);
    if (!engineResult || engineResult.move === blunderUci) continue;

    const solutionMoves = await tryExtendSequence(fenBefore, engineResult.move);
    const swingCp = Math.round(swing * 100);
    const rating = swingCp >= 600 ? 1200 : swingCp >= 400 ? 1000 : swingCp >= 250 ? 900 : 800;

    candidates.push({
      id: cuid(), fen: fenBefore, solvingFen: fenBefore, lastMove: i >= 1 ? moves[i - 1].uci : "",
      solutionMoves, rating, themes: "tactics", type: "standard", source: "user_import",
      sourceUserId: userId, isPublic: false, gameUrl, ...ctx,
      moveNumber: Math.floor(i / 2) + 1,
      evalCp: sideToMove === "w" ? Math.round(evalBefore * 100) : Math.round(-evalBefore * 100),
    });
  }
  return candidates;
}

// ---------- Full Stockfish extraction (Chess.com games without eval annotations) ----------
async function extractFromFullGame(pgn: string, userId: string, playerUsername: string): Promise<PuzzleCandidate[]> {
  const gameUrl = extractGameUrl(pgn);
  const ctx = extractGameContext(pgn, playerUsername);
  const moves = parseMoves(pgn);
  if (moves.length < 10) return [];

  const playerTurn: "w" | "b" | null = ctx.playerColor === "white" ? "w" : ctx.playerColor === "black" ? "b" : null;
  const candidates: PuzzleCandidate[] = [];
  let prevCp: number | null = null;

  // Skip first 16 half-moves (opening)
  for (let i = 0; i < moves.length && candidates.length < MAX_PER_GAME; i++) {
    const { sideToMove, fenBefore } = moves[i];

    // Evaluate position before this move
    const result = await getBestMove(fenBefore);
    if (!result) { prevCp = null; continue; }

    // Convert to white-relative cp for swing calculation
    const cpWhite = sideToMove === "w" ? result.cp : -result.cp;

    if (i >= 16 && prevCp !== null && playerTurn && sideToMove === playerTurn) {
      // Swing: how much worse position got for the side that moved
      const swing = sideToMove === "w" ? prevCp - cpWhite : cpWhite - prevCp;
      const swingPawns = swing / 100;

      if (swingPawns >= BLUNDER_THRESHOLD_PAWNS) {
        // The blunder was made at move i — puzzle is at fenBefore of move i
        // But actually, the blunder is the move they played, and the puzzle position is BEFORE that move
        // So we need the position BEFORE move i (fenBefore) and the solution is Stockfish's best move
        const solutionMoves = await tryExtendSequence(fenBefore, result.move);
        const swingCp = Math.round(swingPawns * 100);
        const rating = swingCp >= 600 ? 1200 : swingCp >= 400 ? 1000 : swingCp >= 250 ? 900 : 800;

        candidates.push({
          id: cuid(), fen: fenBefore, solvingFen: fenBefore, lastMove: i >= 1 ? moves[i - 1].uci : "",
          solutionMoves, rating, themes: "tactics", type: "standard", source: "user_import",
          sourceUserId: userId, isPublic: false, gameUrl, ...ctx,
          moveNumber: Math.floor(i / 2) + 1,
          evalCp: sideToMove === "w" ? result.cp : -result.cp,
        });
      }
    }
    prevCp = cpWhite;
  }
  return candidates;
}

// ---------- Game fetchers ----------
async function fetchChessComGames(username: string, maxGames = 200): Promise<string[]> {
  const archivesUrl = `https://api.chess.com/pub/player/${encodeURIComponent(username)}/games/archives`;
  const archivesRes = await fetch(archivesUrl, { signal: AbortSignal.timeout(15_000) });
  if (!archivesRes.ok) return [];
  const { archives = [] } = (await archivesRes.json()) as { archives?: string[] };
  console.log(`    Archives: ${archives.length} months`);

  const pgns: string[] = [];
  for (const url of archives.slice(-12).reverse()) {
    if (pgns.length >= maxGames) break;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) continue;
      const data = (await res.json()) as { games?: Array<{ pgn?: string }> };
      for (const g of [...(data.games ?? [])].reverse()) {
        if (g.pgn) { pgns.push(g.pgn); if (pgns.length >= maxGames) break; }
      }
      console.log(`    ${url.split("/").slice(-2).join("/")}: ${(data.games ?? []).length} games (${pgns.length} total)`);
    } catch { /* skip */ }
  }
  return pgns;
}

async function fetchLichessGames(username: string, count = 200): Promise<string[]> {
  const url = new URL(`https://lichess.org/api/games/user/${encodeURIComponent(username)}`);
  url.searchParams.set("max", String(count));
  url.searchParams.set("moves", "true");
  url.searchParams.set("evals", "true");
  url.searchParams.set("rated", "true");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/x-ndjson", "User-Agent": "CassandraChess/1.0" },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) return [];

  const text = await res.text();
  const pgns: string[] = [];
  for (const line of text.split("\n")) {
    const t = line.trim(); if (!t) continue;
    try {
      const g = JSON.parse(t) as { pgn?: string; id?: string };
      if (g.pgn) {
        let pgn = g.pgn;
        if (g.id && !pgn.includes("[Site ")) pgn = `[Site "https://lichess.org/${g.id}"]\n${pgn}`;
        pgns.push(pgn);
      }
    } catch { /* skip */ }
  }
  return pgns;
}

// ---------- Main ----------
async function main() {
  if (!engineCmd) { console.error("Stockfish not found!"); process.exit(1); }
  console.log(`[backfill] Stockfish: ${engineCmd.join(" ")}`);
  console.log("[backfill] Starting backfill for all users with linked accounts...\n");

  const users = await prisma.user.findMany({
    where: { OR: [{ chessComUsername: { not: null } }, { lichessUsername: { not: null } }] },
    select: { id: true, email: true, chessComUsername: true, lichessUsername: true },
  });

  console.log(`Found ${users.length} user(s):\n`);
  for (const u of users) {
    console.log(`  ${u.email ?? u.chessComUsername ?? u.lichessUsername ?? u.id} | chess.com: ${u.chessComUsername ?? "—"} | lichess: ${u.lichessUsername ?? "—"}`);
  }

  for (const user of users) {
    const label = user.email ?? user.chessComUsername ?? user.lichessUsername ?? user.id;
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Processing: ${label}`);
    console.log(`${"=".repeat(60)}`);

    // 1. Clear existing
    const deleted = await prisma.puzzle.deleteMany({ where: { sourceUserId: user.id, source: "user_import" } });
    console.log(`  Deleted ${deleted.count} existing puzzles`);

    const resetGames = await prisma.rawGame.updateMany({
      where: { userId: user.id },
      data: { status: "pending", analysedUpTo: 0, puzzlesFound: 0 },
    });
    console.log(`  Reset ${resetGames.count} RawGame records`);

    await prisma.user.update({ where: { id: user.id }, data: { lastSyncedAt: null } });

    let totalPuzzles = 0;
    let totalGames = 0;

    // 2. Lichess — eval annotations available, fast
    if (user.lichessUsername) {
      console.log(`\n  Lichess (${user.lichessUsername}):`);
      try {
        const pgns = await fetchLichessGames(user.lichessUsername);
        console.log(`    Fetched ${pgns.length} games`);

        for (let i = 0; i < pgns.length; i++) {
          totalGames++;
          try {
            const candidates = await extractFromAnnotatedPgn(pgns[i], user.id, user.lichessUsername);
            for (const c of candidates) {
              if (totalPuzzles >= MAX_PERSONAL_PUZZLES) break;
              const dup = await prisma.puzzle.findFirst({ where: { solvingFen: c.solvingFen }, select: { id: true } });
              if (dup) continue;
              await prisma.puzzle.create({ data: c as any });
              totalPuzzles++;
            }
          } catch { /* skip game */ }
          if ((i + 1) % 25 === 0 || i === pgns.length - 1) {
            console.log(`    ${i + 1}/${pgns.length} games → ${totalPuzzles} puzzles`);
          }
        }
      } catch (err) {
        console.error(`    Lichess fetch error:`, err);
      }
    }

    // 3. Chess.com — full Stockfish analysis
    if (user.chessComUsername && totalPuzzles < MAX_PERSONAL_PUZZLES) {
      console.log(`\n  Chess.com (${user.chessComUsername}):`);
      try {
        const pgns = await fetchChessComGames(user.chessComUsername);
        console.log(`    Fetched ${pgns.length} games`);

        for (let i = 0; i < pgns.length; i++) {
          if (totalPuzzles >= MAX_PERSONAL_PUZZLES) break;
          totalGames++;
          try {
            const candidates = await extractFromFullGame(pgns[i], user.id, user.chessComUsername);
            for (const c of candidates) {
              if (totalPuzzles >= MAX_PERSONAL_PUZZLES) break;
              const dup = await prisma.puzzle.findFirst({ where: { solvingFen: c.solvingFen }, select: { id: true } });
              if (dup) continue;
              await prisma.puzzle.create({ data: c as any });
              totalPuzzles++;
            }
          } catch { /* skip game */ }
          if ((i + 1) % 10 === 0 || i === pgns.length - 1) {
            console.log(`    ${i + 1}/${pgns.length} games → ${totalPuzzles} puzzles`);
          }
        }
      } catch (err) {
        console.error(`    Chess.com fetch error:`, err);
      }
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastSyncedAt: new Date() } });
    console.log(`\n  ✓ Done: ${totalGames} games, ${totalPuzzles} puzzles imported`);
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("All users processed!");
  console.log(`${"=".repeat(60)}\n`);
  await prisma.$disconnect();
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
