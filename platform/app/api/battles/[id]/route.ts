import { NextRequest, NextResponse } from "next/server";
import { getBattle } from "@/lib/battles/battleService";

/** GET /api/battles/[id] — get current battle state */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const battle = await getBattle(id);
  if (!battle) {
    return NextResponse.json({ error: "Battle not found" }, { status: 404 });
  }
  return NextResponse.json(battle);
}
