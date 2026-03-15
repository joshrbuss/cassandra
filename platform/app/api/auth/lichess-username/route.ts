import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface LichessProfile {
  id: string;
  username: string;
  perfs?: {
    blitz?: { rating?: number };
    rapid?: { rating?: number };
    bullet?: { rating?: number };
  };
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { username?: unknown };
  const username = (typeof body.username === "string" ? body.username : "").trim();

  if (!username || username.length < 2 || username.length > 30) {
    return NextResponse.json({ error: "Enter a valid Lichess username." }, { status: 400 });
  }

  // Validate against Lichess public API
  let profile: LichessProfile;
  try {
    const res = await fetch(
      `https://lichess.org/api/user/${encodeURIComponent(username)}`,
      { headers: { "User-Agent": "CassandraChess/1.0" }, cache: "no-store" }
    );
    if (res.status === 404) {
      return NextResponse.json({ error: "Lichess username not found." }, { status: 400 });
    }
    if (!res.ok) {
      return NextResponse.json({ error: "Could not reach Lichess. Try again." }, { status: 502 });
    }
    profile = (await res.json()) as LichessProfile;
  } catch {
    return NextResponse.json({ error: "Could not reach Lichess. Try again." }, { status: 502 });
  }

  const actualUsername = profile.username.toLowerCase();
  const rawElo =
    profile.perfs?.blitz?.rating ??
    profile.perfs?.rapid?.rating ??
    profile.perfs?.bullet?.rating ??
    null;

  const session = await auth();

  // Check if this Lichess username is already in DB
  const existing = await prisma.user.findFirst({
    where: { lichessUsername: { equals: actualUsername, mode: "insensitive" } },
    select: { id: true },
  });

  let userId: string;

  if (existing) {
    // Username already in DB — treat as login, update last-seen data
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        lichessLinkedAt: new Date(),
        ...(rawElo != null ? { rawElo, normalizedElo: rawElo, elo: rawElo, eloPlatform: "lichess" } : {}),
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
          lichessUsername: actualUsername,
          lichessLinkedAt: new Date(),
          rawElo: rawElo ?? undefined,
          normalizedElo: rawElo ?? undefined,
          elo: rawElo ?? undefined,
          eloPlatform: rawElo != null ? "lichess" : undefined,
        },
      });
      userId = newUser.id;
    } else {
      await prisma.user.update({
        where: { id: session.userId },
        data: {
          lichessUsername: actualUsername,
          lichessLinkedAt: new Date(),
          ...(rawElo != null && !currentUser.eloPlatform
            ? { rawElo, normalizedElo: rawElo, elo: rawElo, eloPlatform: "lichess" }
            : {}),
        },
      });
      userId = session.userId;
    }
  } else {
    // New user — create record
    const user = await prisma.user.create({
      data: {
        lichessUsername: actualUsername,
        lichessLinkedAt: new Date(),
        rawElo: rawElo ?? undefined,
        normalizedElo: rawElo ?? undefined,
        elo: rawElo ?? undefined,
        eloPlatform: rawElo != null ? "lichess" : undefined,
      },
    });
    userId = user.id;
  }

  return NextResponse.json({ userId });
}
