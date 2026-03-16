"use server";

import { redirect } from "next/navigation";
import { signIn, auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizeElo } from "@/lib/elo/normalizeElo";

export type ConnectState = { error: string } | null;

const SAFE_CALLBACKS = ["/connect", "/onboarding", "/settings", "/home", "/dashboard", "/analysing", "/unlearned"];

function safeCallback(url: string | null): string {
  return url && SAFE_CALLBACKS.includes(url) ? url : "/connect";
}

// ─── Lichess ────────────────────────────────────────────────────────────────

interface LichessProfile {
  id: string;
  username: string;
  perfs?: {
    blitz?: { rating?: number };
    rapid?: { rating?: number };
    bullet?: { rating?: number };
  };
}

export async function connectLichessUsername(
  _prev: ConnectState,
  formData: FormData
): Promise<ConnectState> {
  const raw = (formData.get("username") as string | null) ?? "";
  const callbackUrl = safeCallback(formData.get("callbackUrl") as string | null);
  const username = raw.trim();

  if (!username || username.length < 2 || username.length > 30) {
    return { error: "Enter a valid Lichess username." };
  }

  // Validate against Lichess public API
  let profile: LichessProfile;
  try {
    const res = await fetch(
      `https://lichess.org/api/user/${encodeURIComponent(username)}`,
      { headers: { "User-Agent": "CassandraChess/1.0" }, cache: "no-store" }
    );
    if (res.status === 404) return { error: "Lichess username not found." };
    if (!res.ok) return { error: "Could not reach Lichess. Try again." };
    profile = (await res.json()) as LichessProfile;
  } catch {
    return { error: "Could not reach Lichess. Try again." };
  }

  const actualUsername = profile.username;
  const rawElo =
    profile.perfs?.blitz?.rating ??
    profile.perfs?.rapid?.rating ??
    profile.perfs?.bullet?.rating ??
    null;

  const session = await auth();

  // Find if this Lichess username is already in DB
  const existing = await prisma.user.findUnique({
    where: { lichessUsername: actualUsername },
    select: { id: true },
  });

  let userId: string;

  if (existing) {
    if (session?.userId && session.userId !== existing.id) {
      return { error: "This Lichess account is already linked to another profile." };
    }
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        lichessLinkedAt: new Date(),
        ...(rawElo != null ? { rawElo, normalizedElo: rawElo, elo: rawElo, eloPlatform: "lichess" } : {}),
      },
    });
    userId = existing.id;
  } else if (session?.userId) {
    // Add Lichess to an already signed-in user
    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { eloPlatform: true },
    });
    if (!currentUser) {
      // Stale session — user record was deleted. Create a fresh record.
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
          // Only set ELO fields if the user has no primary platform yet
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

  if (!session?.userId) {
    try {
      await signIn("credentials", { userId, redirectTo: callbackUrl });
    } catch (e) {
      // next-auth signals a redirect by throwing — re-throw it so Next.js handles it
      if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw e;
      return { error: "Sign-in failed. Please try again or contact support." };
    }
  }

  redirect(callbackUrl);
}

// ─── Chess.com ───────────────────────────────────────────────────────────────

interface ChessComStats {
  chess_blitz?: { last?: { rating?: number } };
  chess_rapid?: { last?: { rating?: number } };
  chess_bullet?: { last?: { rating?: number } };
}

export async function connectChessComUsername(
  _prev: ConnectState,
  formData: FormData
): Promise<ConnectState> {
  const raw = (formData.get("username") as string | null) ?? "";
  const callbackUrl = safeCallback(formData.get("callbackUrl") as string | null);
  const username = raw.trim();

  if (!username || username.length < 2 || username.length > 50) {
    return { error: "Enter a valid Chess.com username." };
  }

  // Validate against Chess.com public API
  let rawElo: number | null = null;
  try {
    const [profileRes, statsRes] = await Promise.all([
      fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}`, {
        headers: { "User-Agent": "CassandraChess/1.0" },
        cache: "no-store",
      }),
      fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}/stats`, {
        headers: { "User-Agent": "CassandraChess/1.0" },
        cache: "no-store",
      }),
    ]);

    if (profileRes.status === 404) return { error: "Chess.com username not found." };
    if (!profileRes.ok) return { error: "Could not reach Chess.com. Try again." };

    if (statsRes.ok) {
      const stats = (await statsRes.json()) as ChessComStats;
      rawElo =
        stats.chess_blitz?.last?.rating ??
        stats.chess_rapid?.last?.rating ??
        stats.chess_bullet?.last?.rating ??
        null;
    }
  } catch {
    return { error: "Could not reach Chess.com. Try again." };
  }

  const normalizedElo = rawElo != null ? normalizeElo(rawElo, "chess_com") : null;
  const session = await auth();

  const existing = await prisma.user.findUnique({
    where: { chessComUsername: username },
    select: { id: true },
  });

  let userId: string;

  if (existing) {
    if (session?.userId && session.userId !== existing.id) {
      return { error: "This Chess.com account is already linked to another profile." };
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
      // Stale session — user record was deleted. Create a fresh record.
      const newUser = await prisma.user.create({
        data: {
          chessComUsername: username,
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
          chessComUsername: username,
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

  if (!session?.userId) {
    try {
      await signIn("credentials", { userId, redirectTo: callbackUrl });
    } catch (e) {
      if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw e;
      return { error: "Sign-in failed. Please try again or contact support." };
    }
  }

  redirect(callbackUrl);
}
