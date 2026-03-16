import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/users/me/subscribe
 *
 * Saves the user's email to both Subscriber (for digest) and User (so we
 * know they're subscribed and don't show the popup again).
 * Requires auth.
 */
export const POST = auth(async function POST(req) {
  const session = req.auth;
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const email = (body as Record<string, unknown>)?.email;

  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  // Save to Subscriber table
  await prisma.subscriber.upsert({
    where: { email },
    update: { source: "in_app_popup" },
    create: { email, source: "in_app_popup", confirmed: false },
  });

  // Store email on User record
  await prisma.user.update({
    where: { id: session.userId },
    data: { email },
  });

  return NextResponse.json({ success: true });
}) as unknown as (req: Request) => Promise<Response>;
