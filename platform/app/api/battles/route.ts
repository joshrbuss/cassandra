import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createBattle, listOpenBattles } from "@/lib/battles/battleService";

/** GET /api/battles — list open battles waiting for a second player */
export async function GET() {
  const battles = await listOpenBattles();
  return NextResponse.json(battles);
}

/** POST /api/battles — create a new battle (requires auth) */
export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Sign in to create a battle" }, { status: 401 });
  }

  const battle = await createBattle(session.userId);
  return NextResponse.json(battle, { status: 201 });
}
