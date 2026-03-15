import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Removes an OAuth provider link from the authenticated user's record. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await req.json()) as { provider?: string };
  const { provider } = body;

  if (provider === "lichess") {
    await prisma.user.update({
      where: { id: session.userId },
      data: { lichessUsername: null, lichessLinkedAt: null },
    });
  } else if (provider === "chesscom") {
    await prisma.user.update({
      where: { id: session.userId },
      data: { chessComUsername: null, chessComLinkedAt: null },
    });
  } else {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
