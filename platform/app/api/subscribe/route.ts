import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/email/sender";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, source } = body as Record<string, unknown>;

  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }
  if (typeof source !== "string" || !source) {
    return NextResponse.json({ error: "source is required" }, { status: 400 });
  }

  try {
    await prisma.subscriber.upsert({
      where: { email },
      update: { source, confirmed: true },
      create: { email, source, confirmed: true },
    });
  } catch {
    // Swallow — never leak existence
  }

  try {
    await sendWelcomeEmail(email);
  } catch (err) {
    console.error("[subscribe] Failed to send welcome email:", err);
  }

  return NextResponse.json({ success: true });
}
