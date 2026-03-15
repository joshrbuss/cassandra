import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { submitRound } from "@/lib/battles/battleService";

interface SubmitBody {
  puzzleId: string;
  solveTimeMs: number;
  success: boolean;
}

/** POST /api/battles/[id]/submit — record a player's round result */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await params;
  const body: SubmitBody = await req.json().catch(() => null);

  if (
    !body ||
    typeof body.puzzleId !== "string" ||
    typeof body.solveTimeMs !== "number" ||
    typeof body.success !== "boolean"
  ) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const result = await submitRound(
      id,
      session.userId,
      body.puzzleId,
      body.solveTimeMs,
      body.success
    );
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not submit round";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
