/**
 * Weekly puzzle digest email template.
 * Sent every Monday to confirmed subscribers.
 */

export interface WeeklyDigestData {
  /** Subscriber's display name (or "Chess player" fallback) */
  name: string;
  /** Number of puzzles solved this week */
  puzzlesSolved: number;
  /** Current accuracy percentage (0–100) */
  accuracy: number | null;
  /** Current streak in days */
  streak: number;
  /** URL to the training page */
  trainUrl: string;
  /** URL to unsubscribe */
  unsubscribeUrl: string;
}

export function renderWeeklyDigest(data: WeeklyDigestData): {
  subject: string;
  html: string;
} {
  const { name, puzzlesSolved, accuracy, streak, trainUrl, unsubscribeUrl } =
    data;

  const subject = `Your weekly puzzle digest — ${puzzlesSolved} puzzles solved`;

  const accuracyLine =
    accuracy !== null ? `<p>Accuracy: <strong>${accuracy}%</strong></p>` : "";

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:auto;color:#1a1a1a">
      <div style="background:#0e0e0e;padding:24px;border-radius:12px 12px 0 0">
        <h1 style="color:#c8942a;margin:0;font-size:20px">Cassandra Chess</h1>
        <p style="color:#999;margin:8px 0 0;font-size:13px">Weekly Digest</p>
      </div>

      <div style="padding:24px;background:#eeebe6;border-radius:0 0 12px 12px">
        <p>Hey ${name},</p>
        <p>Here's your week in review:</p>

        <div style="background:#fff;padding:16px;border-radius:8px;margin:16px 0">
          <p>Puzzles solved: <strong>${puzzlesSolved}</strong></p>
          ${accuracyLine}
          <p>Current streak: <strong>${streak} day${streak !== 1 ? "s" : ""}</strong></p>
        </div>

        <a href="${trainUrl}"
           style="display:inline-block;padding:12px 24px;background:#0e0e0e;color:#c8942a;
                  border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Keep training
        </a>

        <p style="color:#666;font-size:12px;margin-top:24px">
          Chess On!<br/>
          — Cassandra Chess
        </p>
      </div>

      <p style="color:#999;font-size:11px;text-align:center;margin-top:16px">
        <a href="${unsubscribeUrl}" style="color:#999">Unsubscribe</a>
      </p>
    </div>
  `;

  return { subject, html };
}
