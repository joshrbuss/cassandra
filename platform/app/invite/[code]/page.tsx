import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getT, resolveLocale, LOCALE_COOKIE, preloadLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "You're invited to Cassandra Chess",
  description: "Accept your invitation and start training on your own chess blunders for free.",
};

function displayName(u: { lichessUsername: string | null; chessComUsername: string | null }): string {
  return u.lichessUsername ?? u.chessComUsername ?? "A friend";
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  await preloadLocale(locale);
  const t = getT(locale);

  // Look up the referrer by their referral code
  const referrer = await prisma.user.findUnique({
    where: { referralCode: code },
    select: {
      lichessUsername: true,
      chessComUsername: true,
      currentStreak: true,
      referralCount: true,
    },
  });

  const name = referrer ? displayName(referrer) : t("invite.someone");

  // Compute referrer accuracy if they exist
  let accuracy: number | null = null;
  let puzzlesSolved = 0;
  if (referrer) {
    const lichess = referrer.lichessUsername;
    const chesscom = referrer.chessComUsername;
    // Find the user ID from the referral code
    const referrerUser = await prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });
    if (referrerUser) {
      const attempts = await prisma.puzzleAttempt.findMany({
        where: { userId: referrerUser.id, attemptNumber: 1 },
        select: { success: true },
      });
      puzzlesSolved = attempts.filter((a) => a.success).length;
      if (attempts.length > 0) {
        accuracy = Math.round((puzzlesSolved / attempts.length) * 100);
      }
    }
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Obsidian hero */}
      <header className="bg-[#0e0e0e] px-4 sm:px-6 py-16">
        <div className="max-w-2xl mx-auto text-center">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full border-2 border-[#c8942a] bg-[#1a1a1a] flex items-center justify-center text-white font-bold text-2xl mx-auto mb-5">
            {name[0].toUpperCase()}
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight mb-4">
            {t("invite.title", { name })}
          </h1>

          {/* Referrer stats */}
          {referrer && (
            <div className="flex items-center justify-center gap-6 mb-6">
              <div className="text-center">
                <p className="text-xl font-bold text-[#c8942a] tabular-nums">{referrer.currentStreak}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">{t("invite.statStreak")}</p>
              </div>
              {accuracy !== null && (
                <div className="text-center">
                  <p className="text-xl font-bold text-[#c8942a] tabular-nums">{accuracy}%</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">{t("invite.statAccuracy")}</p>
                </div>
              )}
              <div className="text-center">
                <p className="text-xl font-bold text-[#c8942a] tabular-nums">{puzzlesSolved}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">{t("invite.statSolved")}</p>
              </div>
            </div>
          )}

          <p className="text-gray-400 text-sm sm:text-base max-w-lg mx-auto mb-8 leading-relaxed">
            {t("invite.sellingPoint")}
          </p>

          <Link
            href={`/connect?ref=${encodeURIComponent(code)}`}
            className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-[#c8942a] text-white font-semibold hover:bg-[#b5852a] transition-colors shadow-lg shadow-[#c8942a]/20"
          >
            {t("invite.acceptButton", { name })}
          </Link>
        </div>
      </header>

      {/* Why Cassandra section */}
      <section className="px-4 sm:px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#f8f7f4] rounded-xl p-5 border border-[#eee]">
              <h2 className="font-semibold text-[#1a1a1a] text-sm mb-2">{t("invite.card1Title")}</h2>
              <p className="text-xs text-[#666] leading-relaxed">{t("invite.card1Desc")}</p>
            </div>
            <div className="bg-[#f8f7f4] rounded-xl p-5 border border-[#eee]">
              <h2 className="font-semibold text-[#1a1a1a] text-sm mb-2">{t("invite.card2Title")}</h2>
              <p className="text-xs text-[#666] leading-relaxed">{t("invite.card2Desc")}</p>
            </div>
            <div className="bg-[#f8f7f4] rounded-xl p-5 border border-[#eee]">
              <h2 className="font-semibold text-[#1a1a1a] text-sm mb-2">{t("invite.card3Title")}</h2>
              <p className="text-xs text-[#666] leading-relaxed">{t("invite.card3Desc")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0e0e0e] px-4 sm:px-6 py-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 text-xs mb-2">
            <Link href="/privacy" className="text-[#c8942a] hover:text-[#e0ad3a] transition-colors">{t("legal.privacy")}</Link>
            <span className="text-[#444]">·</span>
            <Link href="/terms" className="text-[#c8942a] hover:text-[#e0ad3a] transition-colors">{t("legal.terms")}</Link>
          </div>
          <p className="text-xs text-[#999]">© 2026 Cassandra Chess</p>
        </div>
      </footer>
    </main>
  );
}
