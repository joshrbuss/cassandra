import { NextRequest, NextResponse } from "next/server";
import { getSlowTactics } from "@/lib/queries/weakTimeTactics";
import type { SlowTactic } from "@/lib/queries/weakTimeTactics";

export interface SlowTacticsResponse {
  slow_tactics: SlowTactic[];
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const slow_tactics = await getSlowTactics(id);
  const response: SlowTacticsResponse = { slow_tactics };
  return NextResponse.json(response);
}
