import { type NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET;

/**
 * Verify Resend webhook signature (svix).
 * https://resend.com/docs/dashboard/webhooks/introduction
 */
function verifySignature(
  payload: string,
  headers: {
    svixId: string | null;
    svixTimestamp: string | null;
    svixSignature: string | null;
  },
): boolean {
  if (!WEBHOOK_SECRET) return false;
  const { svixId, svixTimestamp, svixSignature } = headers;
  if (!svixId || !svixTimestamp || !svixSignature) return false;

  // Reject timestamps older than 5 minutes
  const ts = parseInt(svixTimestamp, 10);
  if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

  // Resend webhook secrets start with "whsec_" — strip prefix and base64 decode
  const secretBytes = Buffer.from(
    WEBHOOK_SECRET.startsWith("whsec_")
      ? WEBHOOK_SECRET.slice(6)
      : WEBHOOK_SECRET,
    "base64",
  );

  const toSign = `${svixId}.${svixTimestamp}.${payload}`;
  const expected = crypto
    .createHmac("sha256", secretBytes)
    .update(toSign)
    .digest("base64");

  // svix-signature may contain multiple signatures separated by spaces
  const signatures = svixSignature.split(" ");
  return signatures.some((sig) => {
    const sigValue = sig.startsWith("v1,") ? sig.slice(3) : sig;
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expected),
        Buffer.from(sigValue),
      );
    } catch {
      return false;
    }
  });
}

interface ResendWebhookPayload {
  type: string;
  data: {
    email_id?: string;
    to?: string[];
    created_at?: string;
  };
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const isValid = verifySignature(rawBody, {
    svixId: req.headers.get("svix-id"),
    svixTimestamp: req.headers.get("svix-timestamp"),
    svixSignature: req.headers.get("svix-signature"),
  });

  if (!isValid) {
    console.warn("[resend-webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: ResendWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, data } = payload;
  const emailId = data.email_id ?? "unknown";
  const recipientEmail = data.to?.[0] ?? "unknown";
  const occurredAt = data.created_at ? new Date(data.created_at) : new Date();

  // Only store events we care about
  const TRACKED_EVENTS = new Set([
    "email.sent",
    "email.delivered",
    "email.opened",
    "email.clicked",
    "email.bounced",
    "email.complained",
  ]);

  if (!TRACKED_EVENTS.has(type)) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    await prisma.resendEvent.create({
      data: { type, emailId, recipientEmail, occurredAt },
    });
  } catch (err) {
    console.error("[resend-webhook] DB insert failed:", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
