import { getResend, FROM_EMAIL } from "./resend";

export async function sendConfirmationEmail(email: string, confirmUrl: string): Promise<void> {
  const resend = getResend();

  if (!resend) {
    console.log(`[email] Confirmation link for ${email}: ${confirmUrl}`);
    return;
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Confirm your Cassandra Chess subscription",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#1d4ed8">Almost there!</h2>
        <p>Click the button below to confirm your subscription to Cassandra Chess puzzle picks.</p>
        <a href="${confirmUrl}"
           style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;
                  border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Confirm subscription
        </a>
        <p style="color:#6b7280;font-size:13px">
          Link expires in 72 hours. If you didn't sign up, ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(email: string): Promise<void> {
  const resend = getResend();

  if (!resend) {
    console.log(`[email] Welcome email for ${email} (no API key, skipping)`);
    return;
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Welcome to Cassandra Chess — Chess On!",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;color:#1a1a1a">
        <div style="background:#0e0e0e;padding:24px;border-radius:12px 12px 0 0">
          <h1 style="color:#c8942a;margin:0;font-size:22px">Welcome to Cassandra Chess</h1>
        </div>
        <div style="padding:24px;background:#eeebe6;border-radius:0 0 12px 12px">
          <p>You're on the list.</p>
          <p>We'll send your weekly puzzle digest every Monday.</p>
          <p>Keep training.</p>
          <p style="color:#c8942a;font-weight:600;font-size:18px;margin-top:16px">Chess On!</p>
        </div>
      </div>
    `,
  });
}
