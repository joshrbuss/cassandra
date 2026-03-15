import { type NextRequest, NextResponse } from "next/server";

/**
 * Initiates Chess.com OAuth sign-in.
 * Redirects to next-auth's Chess.com provider sign-in URL.
 * After authorization, next-auth handles the callback at /api/auth/callback/chesscom.
 *
 * Supports ?callbackUrl= to redirect after sign-in (defaults to /settings).
 */
export function GET(req: NextRequest) {
  const callbackUrl = req.nextUrl.searchParams.get("callbackUrl") ?? "/settings";
  const target = new URL("/api/auth/signin/chesscom", req.nextUrl.origin);
  target.searchParams.set("callbackUrl", callbackUrl);
  return NextResponse.redirect(target);
}
