import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizeElo } from "@/lib/elo/normalizeElo";
import { generateReferralCode, creditReferrer } from "@/lib/referral";

/**
 * GET — Initiates Chess.com OAuth sign-in (legacy redirect route).
 */
export function GET(req: NextRequest) {
  const callbackUrl = req.nextUrl.searchParams.get("callbackUrl") ?? "/settings";
  const target = new URL("/api/auth/signin/chesscom", req.nextUrl.origin);
  target.searchParams.set("callbackUrl", callbackUrl);
  return NextResponse.redirect(target);
}

interface ChessComStats {
  chess_blitz?: { last?: { rating?: number } };
  chess_rapid?: { last?: { rating?: number } };
  chess_bullet?: { last?: { rating?: number } };
}

/**
 * POST — Connect a Chess.com username to the current user.
 * Returns { userId } on success; the client then signs in via next-auth/react.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as { username?: unknown; ref?: unknown };
  const username = (typeof body.username === "string" ? body.username : "").trim();
  const refCode = typeof body.ref === "string" ? body.ref.trim() : undefined;
  const country = req.headers.get("x-vercel-ip-country") ?? undefined;

  const normalizedUsername = username.toLowerCase();

  if (!normalizedUsername || normalizedUsername.length < 2 || normalizedUsername.length > 50) {
    return NextResponse.json({ error: "Enter a valid Chess.com username." }, { status: 400 });
  }

  console.log(`[chesscom] Connecting username="${normalizedUsername}" ref="${refCode ?? "none"}"`);

  // Validate against Chess.com public API (10s timeout to avoid Vercel function timeout)
  let rawElo: number | null = null;
  try {
    const [profileRes, statsRes] = await Promise.all([
      fetch(`https://api.chess.com/pub/player/${encodeURIComponent(normalizedUsername)}`, {
        headers: { "User-Agent": "CassandraChess/1.0" },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      }),
      fetch(`https://api.chess.com/pub/player/${encodeURIComponent(normalizedUsername)}/stats`, {
        headers: { "User-Agent": "CassandraChess/1.0" },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      }),
    ]);

    console.log(`[chesscom] API response: profile=${profileRes.status} stats=${statsRes.status}`);

    if (profileRes.status === 404) {
      return NextResponse.json({ error: "Chess.com username not found." }, { status: 400 });
    }
    if (!profileRes.ok) {
      console.error(`[chesscom] Chess.com API error: profile=${profileRes.status}`);
      return NextResponse.json({ error: "Could not reach Chess.com. Try again." }, { status: 502 });
    }

    if (statsRes.ok) {
      const stats = (await statsRes.json()) as ChessComStats;
      rawElo =
        stats.chess_blitz?.last?.rating ??
        stats.chess_rapid?.last?.rating ??
        stats.chess_bullet?.last?.rating ??
        null;
      console.log(`[chesscom] rawElo=${rawElo}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[chesscom] Chess.com API fetch failed: ${msg}`);
    if (msg.includes("timeout") || msg.includes("abort")) {
      return NextResponse.json({ error: "Chess.com is taking too long to respond. Please try again in a moment." }, { status: 504 });
    }
    return NextResponse.json({ error: "Could not reach Chess.com. Try again." }, { status: 502 });
  }

  const normalizedElo = rawElo != null ? normalizeElo(rawElo, "chess_com") : null;
  const session = await auth();

  try {
    // Case-insensitive lookup for existing user
    const existing = await prisma.user.findFirst({
      where: { chessComUsername: { equals: normalizedUsername, mode: "insensitive" } },
      select: { id: true },
    });

    let userId: string;

    if (existing) {
      // Username already in DB — treat as login, update last-seen data
      console.log(`[chesscom] Existing user ${existing.id}, updating`);
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          chessComLinkedAt: new Date(),
          ...(rawElo != null ? { rawElo, normalizedElo, elo: rawElo, eloPlatform: "chess_com" as const } : {}),
          ...(country ? { country } : {}),
        },
      });
      userId = existing.id;
    } else if (session?.userId) {
      const currentUser = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { eloPlatform: true, referredBy: true, chessComUsername: true, lichessUsername: true },
      });
      if (!currentUser) {
        // Stale session — create a fresh record
        console.log(`[chesscom] Stale session, creating new user`);
        const newUser = await prisma.user.create({
          data: {
            chessComUsername: normalizedUsername,
            chessComLinkedAt: new Date(),
            rawElo: rawElo ?? undefined,
            normalizedElo: normalizedElo ?? undefined,
            elo: rawElo ?? undefined,
            eloPlatform: rawElo != null ? "chess_com" : undefined,
            referralCode: generateReferralCode(),
            referredBy: refCode || undefined,
            country,
          },
        });
        if (refCode) creditReferrer(refCode).catch(() => {});
        userId = newUser.id;
      } else {
        // Check if this is the first chess account connection (referral credit opportunity)
        const isFirstConnect = !currentUser.chessComUsername && !currentUser.lichessUsername;
        console.log(`[chesscom] Adding to session user ${session.userId}, firstConnect=${isFirstConnect}`);

        await prisma.user.update({
          where: { id: session.userId },
          data: {
            chessComUsername: normalizedUsername,
            chessComLinkedAt: new Date(),
            ...(rawElo != null && !currentUser.eloPlatform
              ? { rawElo, normalizedElo, elo: rawElo, eloPlatform: "chess_com" as const }
              : {}),
            ...(country ? { country } : {}),
            ...(refCode && !currentUser.referredBy ? { referredBy: refCode } : {}),
          },
        });
        // Credit referrer on first chess account connection
        if (refCode && isFirstConnect) creditReferrer(refCode).catch(() => {});
        userId = session.userId;
      }
    } else {
      // Brand new user — no session
      console.log(`[chesscom] New user, creating record`);
      const user = await prisma.user.create({
        data: {
          chessComUsername: normalizedUsername,
          chessComLinkedAt: new Date(),
          rawElo: rawElo ?? undefined,
          normalizedElo: normalizedElo ?? undefined,
          elo: rawElo ?? undefined,
          eloPlatform: rawElo != null ? "chess_com" : undefined,
          referralCode: generateReferralCode(),
          referredBy: refCode || undefined,
          country,
        },
      });
      if (refCode) creditReferrer(refCode).catch(() => {});
      userId = user.id;
    }

    console.log(`[chesscom] Success: userId=${userId}`);
    return NextResponse.json({ userId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: string })?.code;
    console.error(`[chesscom] DB error: code=${code} message=${msg}`);

    // Unique constraint violation — another user already has this username
    if (code === "P2002") {
      return NextResponse.json({ error: "This Chess.com account is already linked to another profile." }, { status: 409 });
    }

    return NextResponse.json({ error: "Something went wrong connecting your account. Please try again." }, { status: 500 });
  }
}
