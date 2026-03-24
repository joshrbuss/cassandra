import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchRecentGames } from "@/lib/chess-apis/chesscom";

/**
 * V2 puzzle extraction — game fetching endpoint.
 *
 * POST /api/extract-v2
 * Body: { username?: string, maxGames?: number }
 *
 * Returns PGNs and user info. Stockfish analysis happens client-side
 * via browser WASM — no server-side engine needed.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = (body.username as string) || "j_r_b_01";
    const maxGames = Math.min((body.maxGames as number) || 3, 10);

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { chessComUsername: { equals: username, mode: "insensitive" } },
          { lichessUsername: { equals: username, mode: "insensitive" } },
        ],
      },
    });

    const userId = user?.id ?? `v2-test-${username}`;

    const pgns = await fetchRecentGames(username, maxGames);

    if (pgns.length === 0) {
      return NextResponse.json({
        ok: false,
        error: "No games found for this user on Chess.com",
        username,
      });
    }

    return NextResponse.json({
      ok: true,
      username,
      userId,
      sourceUserId: user?.id ?? null,
      pgns,
    });
  } catch (error) {
    console.error("[extract-v2] Error fetching games:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
