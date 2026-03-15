import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** PATCH /api/users/me — update the current user's ELO rating. */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await req.json()) as { elo?: unknown };
  const elo = body.elo;

  if (typeof elo !== "number" || !Number.isInteger(elo) || elo < 0 || elo > 4000) {
    return NextResponse.json({ error: "elo must be an integer between 0 and 4000" }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({
      where: { id: session.userId },
      data: { elo },
      select: { id: true, elo: true },
    });
    return NextResponse.json({ elo: user.elo });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    throw e;
  }
}
