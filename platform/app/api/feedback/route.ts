import { NextResponse } from "next/server";
import { getResend, FROM_EMAIL } from "@/lib/email/resend";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, message, email } = body as {
      type: string;
      message: string;
      email?: string;
    };

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const subject = `[Cassandra Feedback] ${type || "General"}`;
    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;color:#1a1a1a">
        <div style="background:#0e0e0e;padding:20px 24px;border-radius:12px 12px 0 0">
          <h2 style="color:#c8942a;margin:0;font-size:18px">New Feedback</h2>
        </div>
        <div style="padding:24px;background:#f9f7f4;border-radius:0 0 12px 12px">
          <p style="margin:0 0 4px"><strong>Type:</strong> ${type || "Not specified"}</p>
          ${email ? `<p style="margin:0 0 4px"><strong>Email:</strong> ${email}</p>` : ""}
          <hr style="border:none;border-top:1px solid #e5e5e5;margin:12px 0" />
          <p style="white-space:pre-wrap;margin:0">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
        </div>
      </div>
    `;

    const resend = getResend();
    if (!resend) {
      console.log("[feedback] No RESEND_API_KEY, logging feedback:");
      console.log({ type, message, email });
      return NextResponse.json({ ok: true });
    }

    await resend.emails.send({
      from: FROM_EMAIL,
      to: "josh@cassandrachess.com",
      replyTo: email || undefined,
      subject,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[feedback] Error:", error);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
