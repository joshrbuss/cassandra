import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchKeywords } from "@/lib/analytics/search-console";

export const maxDuration = 30;

/**
 * GET /api/cron/sync-search-console
 *
 * Fetches the last 7 days of keyword data from Google Search Console
 * and upserts it into the SearchConsoleKeyword table.
 *
 * Protected by CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const provided =
    req.headers.get("x-cron-secret") ??
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // GSC data has a ~3 day lag, so fetch days 3–10 ago
  const endDate = daysAgo(3);
  const startDate = daysAgo(10);

  console.log(`[sync-search-console] Fetching ${startDate} to ${endDate}`);

  try {
    const rows = await fetchKeywords(startDate, endDate);
    console.log(`[sync-search-console] Got ${rows.length} keyword rows`);

    let upserted = 0;
    // Batch upserts in chunks of 50
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50);
      await Promise.all(
        batch.map((row) =>
          prisma.searchConsoleKeyword.upsert({
            where: {
              keyword_date: { keyword: row.keyword, date: row.date },
            },
            update: {
              clicks: row.clicks,
              impressions: row.impressions,
              ctr: row.ctr,
              position: row.position,
            },
            create: {
              keyword: row.keyword,
              date: row.date,
              clicks: row.clicks,
              impressions: row.impressions,
              ctr: row.ctr,
              position: row.position,
            },
          }),
        ),
      );
      upserted += batch.length;
    }

    console.log(`[sync-search-console] Upserted ${upserted} rows`);
    return NextResponse.json({ ok: true, rows: upserted });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[sync-search-console] Failed: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
