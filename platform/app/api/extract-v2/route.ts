import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchRecentGames } from "@/lib/chess-apis/chesscom";
import { extractPuzzlesV2 } from "@/lib/jobs/extractPuzzlesV2";

/**
 * V2 puzzle extraction — internal testing endpoint.
 *
 * POST /api/extract-v2
 * Body: { username?: string, maxGames?: number }
 *
 * Defaults to j_r_b_01 on Chess.com. Fetches recent games,
 * runs the v2 extraction pipeline, and stores puzzles.
 */
export async function POST(request: Request) {
  const start = Date.now();

  try {
    const body = await request.json().catch(() => ({}));
    const username = (body.username as string) || "j_r_b_01";
    const maxGames = Math.min((body.maxGames as number) || 3, 10); // cap at 10

    console.log(`\n[extract-v2] ═══ Starting V2 extraction for ${username} (max ${maxGames} games) ═══\n`);

    // Find or identify the user
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { chessComUsername: { equals: username, mode: "insensitive" } },
          { lichessUsername: { equals: username, mode: "insensitive" } },
        ],
      },
    });

    const userId = user?.id ?? `v2-test-${username}`;
    console.log(`[extract-v2] User: ${user ? `found (${user.id})` : `not in DB, using temp ID: ${userId}`}`);

    // Fetch recent games from Chess.com
    console.log(`[extract-v2] Fetching up to ${maxGames} games from Chess.com...`);
    const pgns = await fetchRecentGames(username, maxGames);
    console.log(`[extract-v2] Fetched ${pgns.length} games`);

    if (pgns.length === 0) {
      return NextResponse.json({
        ok: false,
        error: "No games found for this user on Chess.com",
        username,
      });
    }

    // Extract puzzles from each game
    const allCandidates = [];
    let totalPositionsAnalysed = 0;

    for (let g = 0; g < pgns.length; g++) {
      console.log(`\n[extract-v2] ─── Game ${g + 1}/${pgns.length} ───`);

      const result = await extractPuzzlesV2(pgns[g], userId, username);
      allCandidates.push(...result.candidates);
      totalPositionsAnalysed += result.stoppedAt;
    }

    console.log(`\n[extract-v2] ═══ Extraction complete: ${allCandidates.length} puzzles from ${pgns.length} games ═══`);

    // Store puzzles (skip duplicates by solvingFen for this user)
    let stored = 0;
    let skipped = 0;

    for (const c of allCandidates) {
      // Check for duplicate
      const existing = await prisma.puzzle.findFirst({
        where: { solvingFen: c.solvingFen, sourceUserId: user?.id ?? undefined },
      });

      if (existing) {
        console.log(`[extract-v2] Skipped duplicate: ${c.solvingFen.slice(0, 30)}...`);
        skipped++;
        continue;
      }

      // Store — use Prisma create, omitting extractionVersion from DB
      // (store it in themes or a separate field)
      await prisma.puzzle.create({
        data: {
          id: c.id,
          fen: c.fen,
          solvingFen: c.solvingFen,
          lastMove: c.lastMove,
          solutionMoves: c.solutionMoves,
          rating: c.rating,
          themes: `${c.themes} v2`,
          type: c.type,
          source: "user_import",
          sourceUserId: user?.id ?? undefined,
          isPublic: false,
          gameUrl: c.gameUrl,
          opponentUsername: c.opponentUsername,
          gameDate: c.gameDate,
          gameResult: c.gameResult,
          moveNumber: c.moveNumber,
          evalCp: c.evalCp,
          playerColor: c.playerColor,
          // Mark as v2 via subtype field (exists in schema)
          subtype: "v2",
        },
      });
      stored++;
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    const summary = {
      ok: true,
      username,
      gamesAnalysed: pgns.length,
      totalPositionsAnalysed,
      puzzlesExtracted: allCandidates.length,
      puzzlesStored: stored,
      puzzlesSkipped: skipped,
      elapsedSeconds: parseFloat(elapsed),
      puzzles: allCandidates.map((c) => ({
        id: c.id,
        moveNumber: c.moveNumber,
        solutionMoves: c.solutionMoves,
        solutionDepth: c.solutionMoves.split(" ").length,
        themes: c.themes,
        rating: c.rating,
        evalCp: c.evalCp,
        gameUrl: c.gameUrl,
        fen: c.solvingFen,
      })),
    };

    console.log(`\n[extract-v2] ═══ FINAL SUMMARY ═══`);
    console.log(JSON.stringify(summary, null, 2));

    return NextResponse.json(summary);
  } catch (error) {
    console.error("[extract-v2] Fatal error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
