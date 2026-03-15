import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyConfirmToken } from "@/lib/email/token";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  const email = await verifyConfirmToken(token);
  if (!email) {
    return NextResponse.redirect(`${baseUrl}/?confirmed=invalid`);
  }

  try {
    await prisma.subscriber.update({
      where: { email },
      data: { confirmed: true },
    });
  } catch {
    // Subscriber not found — token may be valid but email was never inserted
    return NextResponse.redirect(`${baseUrl}/?confirmed=invalid`);
  }

  return NextResponse.redirect(`${baseUrl}/?confirmed=true`);
}
