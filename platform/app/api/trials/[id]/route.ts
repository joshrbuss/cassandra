import { NextRequest, NextResponse } from "next/server";
import { getTrial } from "@/lib/trials/trialService";

/** GET /api/trials/[id] — get current trial state */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const trial = await getTrial(id);
  if (!trial) {
    return NextResponse.json({ error: "Trial not found" }, { status: 404 });
  }
  return NextResponse.json(trial);
}
