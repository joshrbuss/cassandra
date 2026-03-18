import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { joinTrial } from "@/lib/trials/trialService";

/** POST /api/trials/[id]/join — join an open trial as player 2 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Sign in to join a trial" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const trial = await joinTrial(id, session.userId);
    return NextResponse.json(trial);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not join trial";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
