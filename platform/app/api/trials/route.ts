import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createTrial, listOpenTrials } from "@/lib/trials/trialService";

/** GET /api/trials — list open trials waiting for a second player */
export async function GET() {
  const trials = await listOpenTrials();
  return NextResponse.json(trials);
}

/** POST /api/trials — create a new trial (requires auth) */
export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Sign in to create a trial" }, { status: 401 });
  }

  const trial = await createTrial(session.userId);
  return NextResponse.json(trial, { status: 201 });
}
