import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeMetrics, generateInsight } from "@/lib/kairos/insights";
import type { KairosPuzzleResult } from "@/lib/kairos/types";

export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { puzzleResults, email, chesscomUsername } = body as {
    puzzleResults: KairosPuzzleResult[];
    email?: string;
    chesscomUsername?: string;
  };

  if (!Array.isArray(puzzleResults) || puzzleResults.length === 0) {
    return NextResponse.json({ error: "puzzleResults array required" }, { status: 400 });
  }

  const metrics = computeMetrics(puzzleResults);
  const insight = generateInsight(metrics);

  // Validate email loosely if provided
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const cleanEmail = typeof email === "string" && EMAIL_RE.test(email) ? email : null;

  const session = await prisma.kairosSession.create({
    data: {
      puzzleResults: JSON.stringify(puzzleResults),
      aggregateMetrics: JSON.stringify(metrics),
      insightKey: insight.key,
      insightData: JSON.stringify(insight),
      email: cleanEmail,
      chesscomUsername: typeof chesscomUsername === "string" ? chesscomUsername : null,
    },
  });

  // If email provided, add to subscriber list tagged kairos_beta
  if (cleanEmail) {
    try {
      await prisma.subscriber.upsert({
        where: { email: cleanEmail },
        update: { source: "kairos_beta" },
        create: { email: cleanEmail, source: "kairos_beta", confirmed: true },
      });
    } catch {
      // Swallow
    }
  }

  return NextResponse.json({
    sessionId: session.id,
    metrics,
    insight,
  });
}
