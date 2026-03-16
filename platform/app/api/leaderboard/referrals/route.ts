import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface ReferralLeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  referralCount: number;
  country: string | null;
}

export interface ReferralLeaderboardResponse {
  entries: ReferralLeaderboardEntry[];
}

export async function GET() {
  const topReferrers = await prisma.user.findMany({
    where: { referralCount: { gt: 0 } },
    orderBy: { referralCount: "desc" },
    take: 50,
    select: {
      id: true,
      lichessUsername: true,
      chessComUsername: true,
      avatarUrl: true,
      referralCount: true,
      country: true,
    },
  });

  // Dense rank: tied values share the same rank
  const entries: ReferralLeaderboardEntry[] = [];
  let rank = 0;
  let prevCount: number | null = null;
  for (const u of topReferrers) {
    if (u.referralCount !== prevCount) {
      rank++;
      prevCount = u.referralCount;
    }
    entries.push({
      rank,
      userId: u.id,
      displayName: u.lichessUsername ?? u.chessComUsername ?? "Anonymous",
      avatarUrl: u.avatarUrl,
      referralCount: u.referralCount,
      country: u.country,
    });
  }

  return NextResponse.json({ entries } satisfies ReferralLeaderboardResponse, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
  });
}
