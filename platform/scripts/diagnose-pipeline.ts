/**
 * Diagnostic script for the puzzle extraction pipeline.
 * Tests the full flow: fetch → stockfish → extract → (dry-run insert)
 *
 * Usage: npx tsx scripts/diagnose-pipeline.ts Ivon365
 */

import { fetchRecentGames } from "../lib/chess-apis/chesscom";
import { getBestMove } from "../lib/jobs/stockfish";
import { Chess } from "chess.js";

const USERNAME = process.argv[2] || "Ivon365";
const BLUNDER_THRESHOLD = 60;
const MAX_GAMES_TO_ANALYSE = 5; // limit for diagnostic

async function main() {
  console.log("=".repeat(70));
  console.log(`PIPELINE DIAGNOSTIC for Chess.com user: ${USERNAME}`);
  console.log("=".repeat(70));

  // ── Step 1: Game Fetching ──────────────────────────────────────────
  console.log("\n── STEP 1: Game Fetching ──");
  const pgns = await fetchRecentGames(USERNAME, 200);
  console.log(`[fetch] Found ${pgns.length} rated games in last 6 months`);

  if (pgns.length === 0) {
    console.log("[fetch] FAILED — no games returned. Check username.");
    return;
  }

  // Check eval annotations
  let withEvals = 0;
  let withoutEvals = 0;
  for (const pgn of pgns) {
    if (pgn.includes("[%eval")) {
      withEvals++;
    } else {
      withoutEvals++;
    }
  }
  console.log(`[fetch] ${withEvals} have eval annotations, ${withoutEvals} need Stockfish analysis`);

  // Show a sample PGN header
  const samplePgn = pgns[0];
  const headerLines = samplePgn.split("\n").filter(l => l.startsWith("[")).slice(0, 8);
  console.log(`[fetch] Sample PGN headers:\n${headerLines.join("\n")}`);

  // ── Step 2: Stockfish Initialisation ───────────────────────────────
  console.log("\n── STEP 2: Stockfish Initialisation ──");
  const testFen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
  const testResult = await getBestMove(testFen);
  if (testResult) {
    console.log(`[stockfish] Initialised successfully — test position: best=${testResult.move} cp=${testResult.cp}`);
  } else {
    console.log("[stockfish] FAILED — getBestMove returned null");
    console.log("[stockfish] Checking paths...");
    const { existsSync } = await import("fs");
    const { join } = await import("path");
    const paths = [
      "/opt/homebrew/bin/stockfish",
      "/usr/local/bin/stockfish",
      "/usr/bin/stockfish",
      join(process.cwd(), "node_modules/stockfish/bin/stockfish-18-lite-single.js"),
    ];
    for (const p of paths) {
      console.log(`  ${p}: ${existsSync(p) ? "EXISTS" : "not found"}`);
    }
    console.log("[stockfish] Cannot continue without Stockfish. Aborting.");
    return;
  }

  // ── Step 3: Position Evaluation ────────────────────────────────────
  console.log("\n── STEP 3: Position Evaluation ──");

  const gamesToAnalyse = pgns.slice(0, MAX_GAMES_TO_ANALYSE);
  let totalPositionsEvaluated = 0;
  let totalEngineFailures = 0;
  let totalBlundersFound = 0;
  let totalPuzzlesCreated = 0;

  for (let g = 0; g < gamesToAnalyse.length; g++) {
    const pgn = gamesToAnalyse[g];
    const hasEval = pgn.includes("[%eval");

    // Parse PGN
    const chess = new Chess();
    try {
      chess.loadPgn(pgn);
    } catch (e) {
      console.log(`[game ${g + 1}] FAILED to parse PGN: ${e}`);
      continue;
    }

    const history = chess.history({ verbose: true });
    const replay = new Chess();
    const positions: { fen: string; uci: string }[] = [];
    for (const move of history) {
      const fen = replay.fen();
      const uci = `${move.from}${move.to}${move.promotion ?? ""}`;
      positions.push({ fen, uci });
      replay.move(move);
    }

    // Determine player colour
    const whiteHeader = pgn.match(/\[White\s+"([^"]+)"\]/)?.[1] ?? "";
    const blackHeader = pgn.match(/\[Black\s+"([^"]+)"\]/)?.[1] ?? "";
    const linkHeader = pgn.match(/\[Link\s+"([^"]+)"\]/)?.[1] ?? "";
    const lc = USERNAME.toLowerCase();
    const playerColor = whiteHeader.toLowerCase() === lc ? "white"
      : blackHeader.toLowerCase() === lc ? "black" : "unknown";
    const playerTurn = playerColor === "white" ? "w" : playerColor === "black" ? "b" : null;

    console.log(`\n[game ${g + 1}/${gamesToAnalyse.length}] ${whiteHeader} vs ${blackHeader} | positions=${positions.length} | color=${playerColor} | hasEval=${hasEval} | url=${linkHeader}`);

    if (positions.length < 5) {
      console.log(`  Skipped — too few positions`);
      continue;
    }

    let prevCp: number | null = null;
    let prevBestMove: string | null = null;
    let gamePositionsEvaluated = 0;
    let gameEngineFailures = 0;
    let gameBlunders = 0;
    let maxSwing = 0;

    for (let i = 0; i < positions.length; i++) {
      const { fen } = positions[i];
      const result = await getBestMove(fen);

      if (!result) {
        gameEngineFailures++;
        prevCp = null;
        prevBestMove = null;
        continue;
      }

      gamePositionsEvaluated++;
      const currentCp = result.cp;

      if (prevCp !== null && prevBestMove !== null) {
        const blunderTurn = positions[i - 1].fen.split(" ")[1];

        if (playerTurn && blunderTurn !== playerTurn) {
          prevCp = currentCp;
          prevBestMove = result.move;
          continue;
        }

        const swing = prevCp - (-currentCp); // = prevCp + currentCp

        if (Math.abs(swing) > Math.abs(maxSwing)) maxSwing = swing;

        if (swing > 30) {
          const moveNum = Math.floor(i / 2) + 1;
          const isBlunder = swing >= BLUNDER_THRESHOLD;
          console.log(`  [eval] move ${moveNum} | prevCp=${prevCp} currentCp=${currentCp} swing=${swing}cp ${isBlunder ? "→ BLUNDER" : ""}`);
          if (isBlunder) {
            gameBlunders++;
            totalBlundersFound++;

            // Step 4: Puzzle creation (dry run)
            const blunderFen = positions[i - 1].fen;
            const solvingChess = new Chess(blunderFen);
            const sideToMove = blunderFen.split(" ")[1];
            console.log(`  [puzzle] Created: move ${moveNum} | fen=${blunderFen.split(" ").slice(0, 2).join(" ")}... | solution=${prevBestMove} | sideToMove=${sideToMove}`);
            totalPuzzlesCreated++;
          }
        }
      }

      prevCp = currentCp;
      prevBestMove = result.move;
    }

    totalPositionsEvaluated += gamePositionsEvaluated;
    totalEngineFailures += gameEngineFailures;

    console.log(`  [eval] Summary: evaluated=${gamePositionsEvaluated} engineFails=${gameEngineFailures} maxSwing=${maxSwing}cp blunders=${gameBlunders}`);
  }

  // ── Final Summary ──────────────────────────────────────────────────
  console.log("\n" + "=".repeat(70));
  console.log("PIPELINE SUMMARY");
  console.log("=".repeat(70));
  console.log(`Games fetched:        ${pgns.length}`);
  console.log(`Games with evals:     ${withEvals}`);
  console.log(`Games without evals:  ${withoutEvals}`);
  console.log(`Games analysed:       ${gamesToAnalyse.length}`);
  console.log(`Positions evaluated:  ${totalPositionsEvaluated}`);
  console.log(`Engine failures:      ${totalEngineFailures}`);
  console.log(`Blunders found:       ${totalBlundersFound} (threshold: ${BLUNDER_THRESHOLD}cp)`);
  console.log(`Puzzles created:      ${totalPuzzlesCreated}`);
  console.log("=".repeat(70));

  if (totalPuzzlesCreated === 0 && totalPositionsEvaluated > 0) {
    console.log("\nDIAGNOSIS: Stockfish works but no swings exceeded the threshold.");
    console.log("This suggests either:");
    console.log("  1. The player played accurately in the sampled games");
    console.log("  2. The swing formula needs investigation");
    console.log("  3. The threshold may need lowering further");
  } else if (totalEngineFailures > 0 && totalPositionsEvaluated === 0) {
    console.log("\nDIAGNOSIS: Stockfish failed on all positions.");
    console.log("Check that the engine binary is working correctly.");
  }
}

main().catch(console.error);
