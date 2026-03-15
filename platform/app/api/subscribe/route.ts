import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signConfirmToken } from "@/lib/email/token";
import { sendConfirmationEmail } from "@/lib/email/sender";

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
    // Upsert so re-subscribes don't throw a unique constraint error.
    // Never expose whether the email already exists.
    await prisma.subscriber.upsert({
      where: { email },
      update: { source }, // refresh source on re-subscribe
      create: { email, source, confirmed: false },
    });
  } catch {
    // Swallow — never leak existence
  }

  try {
    const token = await signConfirmToken(email);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const confirmUrl = `${baseUrl}/api/subscribe/confirm?token=${encodeURIComponent(token)}`;
    await sendConfirmationEmail(email, confirmUrl);
  } catch (err) {
    console.error("[subscribe] Failed to send confirmation email:", err);
    // Still return success — don't expose internal errors
  }

  return NextResponse.json({ success: true });
}
