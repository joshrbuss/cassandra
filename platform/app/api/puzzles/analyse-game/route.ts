/**
 * POST /api/puzzles/analyse-game
 *
 * Picks the next pending RawGame for the authenticated user and returns its
 * PGN so the client can analyse it with browser Stockfish. Marks the game as
 * "processing" while analysis is in-flight.
 *
 * Request body (optional):
 *   { gameId: string, puzzlesFound: number }
 *   — If provided, marks that game as "done" and records puzzle count, then
 *     picks the next pending game.
 *
 * Response:
 *   { done: boolean, gameId: string | null, pgn: string | null,
 *     platform: string | null, puzzlesFound: number, remaining: number }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // If the client is reporting completion of a previous game, mark it done
  let body: { gameId?: string; puzzlesFound?: number } | null = null;
  try {
    body = await req.json();
  } catch {
    // No body — that's fine, just pick the next game
  }

  if (body?.gameId) {
    await prisma.rawGame.updateMany({
      where: { id: body.gameId, userId: session.userId },
      data: {
        status: "done",
        puzzlesFound: body.puzzlesFound ?? 0,
        processedAt: new Date(),
      },
    });
  }

  // Pick the next pending game
  const nextGame = await prisma.rawGame.findFirst({
    where: { userId: session.userId, status: { in: ["pending", "processing"] } },
    orderBy: { createdAt: "asc" },
    select: { id: true, pgn: true, platform: true },
  });

  const remaining = await prisma.rawGame.count({
    where: { userId: session.userId, status: { in: ["pending", "processing"] } },
  });

  if (!nextGame) {
    return NextResponse.json({
      done: true,
      gameId: null,
      pgn: null,
      platform: null,
      puzzlesFound: 0,
      remaining: 0,
    });
  }

  // Mark as processing
  await prisma.rawGame.update({
    where: { id: nextGame.id },
    data: { status: "processing" },
  });

  return NextResponse.json({
    done: false,
    gameId: nextGame.id,
    pgn: nextGame.pgn,
    platform: nextGame.platform,
    puzzlesFound: 0,
    remaining: remaining - 1,
  });
}
