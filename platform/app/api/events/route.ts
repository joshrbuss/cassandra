import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getResend } from "@/lib/email/resend";

export async function POST(request: NextRequest) {
  const event = await request.json();

  if (event.type === "email.received") {
    const resend = getResend();
    if (resend) {
      await resend.emails.send({
        from: "josh@cassandrachess.com",
        to: "josh@e4d5.io",
        subject: `[Cassandra Chess] ${event.data.subject}`,
        text: `From: ${event.data.from}\n\n${event.data.text || event.data.html}`,
      });
    }
  }

  return NextResponse.json({});
}
