import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface ReferralLeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  referralCount: number;
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
    },
  });

  const entries: ReferralLeaderboardEntry[] = topReferrers.map((u, i) => ({
    rank: i + 1,
    userId: u.id,
    displayName: u.lichessUsername ?? u.chessComUsername ?? "Anonymous",
    avatarUrl: u.avatarUrl,
    referralCount: u.referralCount,
  }));

  return NextResponse.json({ entries } satisfies ReferralLeaderboardResponse, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
  });
}
