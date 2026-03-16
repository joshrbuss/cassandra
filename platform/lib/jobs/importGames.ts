/**
 * Orchestrates game import for a single user:
 *  1. Reads linked Lichess / Chess.com usernames from DB
 *  2. Fetches recent games from both platforms
 *  3. Extracts puzzle candidates:
 *       - Lichess: fast eval-annotation parser (no Stockfish, Vercel-safe)
 *       - Chess.com: Stockfish extractor (gracefully skips if engine unavailable)
 *  4. Deduplicates against existing puzzles (by solvingFen)
 *  5. Inserts new user-specific puzzles with isPublic=false
 *  6. Caps at MAX_PERSONAL_PUZZLES per user
 *
 * Designed to run in the cron job at /api/internal/import-games.
 */

import { prisma } from "@/lib/prisma";
import { fetchRecentGames as lichessGames } from "@/lib/chess-apis/lichess";
import { fetchRecentGames as chesscomGames } from "@/lib/chess-apis/chesscom";
import { extractPuzzlesFromAnnotatedPgn } from "./extractPuzzlesFromAnnotatedPgn";
import { extractPuzzlesFromGame } from "./extractPuzzles";

/** Hard cap on personal puzzles per user */
const MAX_PERSONAL_PUZZLES = 500;

export interface ImportResult {
  userId: string;
  gamesProcessed: number;
  puzzlesImported: number;
  errors: string[];
}

export async function importGamesForUser(userId: string): Promise<ImportResult> {
  const errors: string[] = [];
  let gamesProcessed = 0;
  let puzzlesImported = 0;

  // 1. Fetch linked usernames
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lichessUsername: true, chessComUsername: true },
  });

  if (!user) return { userId, gamesProcessed, puzzlesImported, errors: ["User not found"] };

  // 2. Check puzzle cap
  const existingCount = await prisma.puzzle.count({
    where: { sourceUserId: userId, source: "user_import" },
  });

  if (existingCount >= MAX_PERSONAL_PUZZLES) {
    return {
      userId,
      gamesProcessed: 0,
      puzzlesImported: 0,
      errors: [`Puzzle cap reached (${MAX_PERSONAL_PUZZLES})`],
    };
  }

  const remaining = MAX_PERSONAL_PUZZLES - existingCount;

  // Helper: deduplicate and insert puzzle candidates
  async function insertCandidates(
    candidates: Awaited<ReturnType<typeof extractPuzzlesFromGame>>
  ): Promise<number> {
    let inserted = 0;
    for (const candidate of candidates) {
      if (puzzlesImported >= remaining) break;

      const existing = await prisma.puzzle.findFirst({
        where: { solvingFen: candidate.solvingFen },
        select: { id: true },
      });
      if (existing) continue;

      console.log(`[import] inserting puzzle ${candidate.id} gameUrl=${candidate.gameUrl ?? "null"}`);
      await prisma.puzzle.create({
        data: {
          id: candidate.id,
          fen: candidate.fen,
          solvingFen: candidate.solvingFen,
          lastMove: candidate.lastMove,
          solutionMoves: candidate.solutionMoves,
          rating: candidate.rating,
          themes: candidate.themes,
          type: candidate.type,
          source: candidate.source,
          sourceUserId: candidate.sourceUserId,
          isPublic: candidate.isPublic,
          gameUrl: candidate.gameUrl,
          opponentUsername: candidate.opponentUsername,
          gameDate: candidate.gameDate,
          gameResult: candidate.gameResult,
          moveNumber: candidate.moveNumber,
          evalCp: candidate.evalCp,
        },
      });
      puzzlesImported++;
      inserted++;
    }
    return inserted;
  }

  // 3. Lichess — fetch 200 games with eval annotations, extract fast (no Stockfish)
  if (user.lichessUsername && puzzlesImported < remaining) {
    try {
      const pgns = await lichessGames(user.lichessUsername, 200);
      for (const pgn of pgns) {
        if (puzzlesImported >= remaining) break;
        gamesProcessed++;
        try {
          // Annotated extractor: uses %eval for blunder detection, Stockfish for solution moves
          const candidates = await extractPuzzlesFromAnnotatedPgn(pgn, userId, user.lichessUsername ?? undefined);
          await insertCandidates(candidates);
        } catch (err) {
          errors.push(`Lichess extraction failed: ${String(err)}`);
        }
      }
    } catch (err) {
      errors.push(`Lichess fetch failed: ${String(err)}`);
    }
  }

  // 4. Chess.com — fetch 3 months, use Stockfish extractor (returns [] if engine unavailable)
  if (user.chessComUsername && puzzlesImported < remaining) {
    try {
      const pgns = await chesscomGames(user.chessComUsername, 200);
      for (const pgn of pgns) {
        if (puzzlesImported >= remaining) break;
        gamesProcessed++;
        try {
          const candidates = await extractPuzzlesFromGame(pgn, userId, user.chessComUsername ?? undefined);
          await insertCandidates(candidates);
        } catch (err) {
          errors.push(`Chess.com extraction failed: ${String(err)}`);
        }
      }
    } catch (err) {
      errors.push(`Chess.com fetch failed: ${String(err)}`);
    }
  }

  // Update lastSyncedAt regardless of result so the button shows correct time
  await prisma.user.update({
    where: { id: userId },
    data: { lastSyncedAt: new Date() },
  }).catch(() => { /* ignore if user deleted */ });

  return { userId, gamesProcessed, puzzlesImported, errors };
}

/** Returns the count of puzzles imported for a user in the past 7 days. */
export async function getImportedPuzzleCount(userId: string): Promise<number> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return prisma.puzzle.count({
    where: {
      sourceUserId: userId,
      source: "user_import",
      createdAt: { gte: since },
    },
  });
}

/** Returns total lifetime imported puzzles for a user. */
export async function getTotalImportedCount(userId: string): Promise<number> {
  return prisma.puzzle.count({
    where: { sourceUserId: userId, source: "user_import" },
  });
}
