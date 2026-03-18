import crypto from "crypto";

const SITE_URL = "sc-domain:cassandrachess.com";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_BASE = "https://www.googleapis.com/webmasters/v3";

interface KeywordRow {
  keyword: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  date: string;
}

/**
 * Create a signed JWT for Google service account auth.
 */
function createJwt(clientEmail: string, privateKey: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");

  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      iss: clientEmail,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  ).toString("base64url");

  const signable = `${header}.${payload}`;
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(signable)
    .sign(privateKey, "base64url");

  return `${signable}.${signature}`;
}

/**
 * Exchange a signed JWT for an access token.
 */
async function getAccessToken(): Promise<string> {
  const clientEmail = process.env.GSC_CLIENT_EMAIL;
  const privateKey = process.env.GSC_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error("GSC_CLIENT_EMAIL and GSC_PRIVATE_KEY must be set");
  }

  const jwt = createJwt(clientEmail, privateKey);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

/**
 * Fetch keyword performance data from Google Search Console.
 *
 * @param startDate YYYY-MM-DD
 * @param endDate   YYYY-MM-DD
 * @returns Array of keyword rows with daily breakdown
 */
export async function fetchKeywords(
  startDate: string,
  endDate: string,
): Promise<KeywordRow[]> {
  const token = await getAccessToken();

  const res = await fetch(
    `${API_BASE}/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ["query", "date"],
        rowLimit: 5000,
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Search Console API error (${res.status}): ${text}`);
  }

  const data = await res.json();
  const rows: KeywordRow[] = (data.rows ?? []).map(
    (row: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }) => ({
      keyword: row.keys[0],
      date: row.keys[1],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }),
  );

  return rows;
}
