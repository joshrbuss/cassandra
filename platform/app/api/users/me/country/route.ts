import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { country?: unknown };
  const country = typeof body.country === "string" ? body.country.trim().toUpperCase() : null;

  if (country && (country.length !== 2 || !/^[A-Z]{2}$/.test(country))) {
    return NextResponse.json({ error: "Invalid country code" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: { country: country || null },
  });

  return NextResponse.json({ ok: true, country: country || null });
}
