import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, channel, source, medium, landingPage } = body;

    if (!sessionId || !channel) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const session = await auth();

    await prisma.acquisitionTouch.create({
      data: {
        sessionId,
        channel,
        source: source ?? null,
        medium: medium ?? null,
        landingPage: landingPage ?? null,
        userId: session?.userId ?? null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
