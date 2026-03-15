import { Resend } from "resend";

const FROM_EMAIL = process.env.EMAIL_FROM ?? "Cassandra Chess <noreply@cassandra.chess>";

export async function sendConfirmationEmail(email: string, confirmUrl: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Dev fallback: log the confirmation link so the flow can be tested locally
    console.log(`[email] Confirmation link for ${email}: ${confirmUrl}`);
    return;
  }

  const resend = new Resend(apiKey);
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
