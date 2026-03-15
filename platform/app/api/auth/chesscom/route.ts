import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizeElo } from "@/lib/elo/normalizeElo";

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
  const body = (await req.json()) as { username?: unknown };
  const username = (typeof body.username === "string" ? body.username : "").trim();

  const normalizedUsername = username.toLowerCase();

  if (!normalizedUsername || normalizedUsername.length < 2 || normalizedUsername.length > 50) {
    return NextResponse.json({ error: "Enter a valid Chess.com username." }, { status: 400 });
  }

  // Validate against Chess.com public API
  let rawElo: number | null = null;
  try {
    const [profileRes, statsRes] = await Promise.all([
      fetch(`https://api.chess.com/pub/player/${encodeURIComponent(normalizedUsername)}`, {
        headers: { "User-Agent": "CassandraChess/1.0" },
        cache: "no-store",
      }),
      fetch(`https://api.chess.com/pub/player/${encodeURIComponent(normalizedUsername)}/stats`, {
        headers: { "User-Agent": "CassandraChess/1.0" },
        cache: "no-store",
      }),
    ]);

    if (profileRes.status === 404) {
      return NextResponse.json({ error: "Chess.com username not found." }, { status: 400 });
    }
    if (!profileRes.ok) {
      return NextResponse.json({ error: "Could not reach Chess.com. Try again." }, { status: 502 });
    }

    if (statsRes.ok) {
      const stats = (await statsRes.json()) as ChessComStats;
      rawElo =
        stats.chess_blitz?.last?.rating ??
        stats.chess_rapid?.last?.rating ??
        stats.chess_bullet?.last?.rating ??
        null;
    }
  } catch {
    return NextResponse.json({ error: "Could not reach Chess.com. Try again." }, { status: 502 });
  }

  const normalizedElo = rawElo != null ? normalizeElo(rawElo, "chess_com") : null;
  const session = await auth();

  const existing = await prisma.user.findFirst({
    where: { chessComUsername: { equals: normalizedUsername, mode: "insensitive" } },
    select: { id: true },
  });

  let userId: string;

  if (existing) {
    if (session?.userId && session.userId !== existing.id) {
      return NextResponse.json(
        { error: "This Chess.com account is already linked to another profile." },
        { status: 409 }
      );
    }
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        chessComLinkedAt: new Date(),
        ...(rawElo != null ? { rawElo, normalizedElo, elo: rawElo, eloPlatform: "chess_com" } : {}),
      },
    });
    userId = existing.id;
  } else if (session?.userId) {
    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { eloPlatform: true },
    });
    if (!currentUser) {
      // Stale session — create a fresh record
      const newUser = await prisma.user.create({
        data: {
          chessComUsername: normalizedUsername,
          chessComLinkedAt: new Date(),
          rawElo: rawElo ?? undefined,
          normalizedElo: normalizedElo ?? undefined,
          elo: rawElo ?? undefined,
          eloPlatform: rawElo != null ? "chess_com" : undefined,
        },
      });
      userId = newUser.id;
    } else {
      await prisma.user.update({
        where: { id: session.userId },
        data: {
          chessComUsername: normalizedUsername,
          chessComLinkedAt: new Date(),
          ...(rawElo != null && !currentUser.eloPlatform
            ? { rawElo, normalizedElo, elo: rawElo, eloPlatform: "chess_com" }
            : {}),
        },
      });
      userId = session.userId;
    }
  } else {
    const user = await prisma.user.create({
      data: {
        chessComUsername: username,
        chessComLinkedAt: new Date(),
        rawElo: rawElo ?? undefined,
        normalizedElo: normalizedElo ?? undefined,
        elo: rawElo ?? undefined,
        eloPlatform: rawElo != null ? "chess_com" : undefined,
      },
    });
    userId = user.id;
  }

  return NextResponse.json({ userId });
}
