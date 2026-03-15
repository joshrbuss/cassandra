import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { joinBattle } from "@/lib/battles/battleService";

/** POST /api/battles/[id]/join — join an open battle as player 2 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Sign in to join a battle" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const battle = await joinBattle(id, session.userId);
    return NextResponse.json(battle);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not join battle";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
