import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateStreak } from "@/lib/streak";

/**
 * POST /api/scales/complete
 *
 * Called when a user finishes a Scales session.
 * Credits the daily streak (idempotent — skips if already solved today).
 */
export const POST = auth(async function POST(req) {
  const session = req.auth;
  const userId = session?.userId ?? null;

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  await updateStreak(userId);

  return NextResponse.json({ ok: true });
}) as unknown as (req: Request) => Promise<Response>;
