import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const VALID_LOCALES = new Set(["en", "es", "fr", "de", "pt", "ru"]);

/** PATCH /api/users/me — update the current user's profile fields. */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await req.json()) as { elo?: unknown; locale?: unknown };
  const data: Record<string, unknown> = {};

  // ELO update
  if (body.elo !== undefined) {
    const elo = body.elo;
    if (typeof elo !== "number" || !Number.isInteger(elo) || elo < 0 || elo > 4000) {
      return NextResponse.json({ error: "elo must be an integer between 0 and 4000" }, { status: 400 });
    }
    data.elo = elo;
  }

  // Locale update
  if (body.locale !== undefined) {
    if (typeof body.locale !== "string" || !VALID_LOCALES.has(body.locale)) {
      return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
    }
    data.locale = body.locale;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({
      where: { id: session.userId },
      data,
      select: { id: true, elo: true, locale: true },
    });
    return NextResponse.json({ elo: user.elo, locale: user.locale });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    throw e;
  }
}
