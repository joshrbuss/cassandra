/**
 * POST /api/internal/start-analysis
 *
 * One-time trigger that kicks off the self-chaining analyse-games loop.
 * Calls /api/cron/analyse-games once; that endpoint will chain itself
 * until all pending RawGames are processed.
 *
 * Protected by CRON_SECRET.
 *
 * Usage:
 *   curl -X POST https://your-domain/api/internal/start-analysis \
 *        -H "Authorization: Bearer <CRON_SECRET>"
 */

import { type NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV === "development";
  }
  const provided =
    req.headers.get("x-cron-secret") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  return provided === secret;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Count pending games
  const pendingCount = await prisma.rawGame.count({
    where: { status: { in: ["pending", "processing"] } },
  });

  if (pendingCount === 0) {
    return NextResponse.json({ ok: true, message: "No pending games to analyse", pendingGames: 0 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  // Fire the first chain link in the background
  after(async () => {
    try {
      console.log(`[start-analysis] Kicking off analysis chain for ${pendingCount} pending games`);
      await fetch(`${baseUrl}/api/cron/analyse-games`, {
        method: "POST",
        headers: {
          ...(process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {}),
        },
      });
    } catch (err) {
      console.error(`[start-analysis] Failed to trigger analyse-games: ${err}`);
    }
  });

  return NextResponse.json({
    ok: true,
    message: `Analysis chain started for ${pendingCount} pending games`,
    pendingGames: pendingCount,
  });
}
