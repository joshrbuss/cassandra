import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getT, resolveLocale, LOCALE_COOKIE } from "@/lib/i18n";
import ConfirmedToast from "@/components/marketing/ConfirmedToast";
import NavLanguageToggle from "@/components/NavLanguageToggle";
import HomepageStats from "@/components/HomepageStats";
import SocialLinks from "@/components/SocialLinks";

async function getStats() {
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);

  const [siteStats, userImportCount, totalUsers, recentActiveUsers] =
    await Promise.all([
      prisma.siteStats.findUnique({ where: { id: 1 } }),
      prisma.puzzle.count({ where: { source: "user_import" } }),
      prisma.user.count(),
      prisma.puzzleAttempt.findMany({
        where: {
          userId: { not: null },
          createdAt: { gte: fifteenMinAgo },
        },
        select: { userId: true },
        distinct: ["userId"],
      }),
    ]);

  return {
    puzzlesSolved: Number(siteStats?.totalPuzzlesSolved ?? 0),
    fromRealGames: userImportCount,
    totalPlayers: totalUsers,
    onlineNow: recentActiveUsers.length,
  };
}

export default async function Home() {
  // Redirect logged-in users straight to their dashboard
  const { auth } = await import("@/auth");
  const session = await auth();
  if (session?.userId) {
    const { redirect } = await import("next/navigation");
    redirect("/home");
  }

  const cookieStore = await cookies();
  const t = getT(resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value));

  const stats = await getStats().catch(() => ({
    puzzlesSolved: 0,
    fromRealGames: 0,
    totalPlayers: 0,
    onlineNow: 0,
  }));

  return (
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="bg-[#0e0e0e] px-4 sm:px-6 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#c8942a] flex items-center justify-center text-white font-bold text-sm">
              C
            </span>
            <span className="text-white font-semibold text-sm hidden sm:inline">
              Cassandra Chess
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <NavLanguageToggle />
            <Link
              href="/connect"
              className="text-gray-400 text-sm hover:text-white transition-colors hidden sm:inline"
            >
              {t("landing.nav.signIn")}
            </Link>
            <Link
              href="/connect"
              className="bg-[#c8942a] text-white text-sm font-semibold px-4 py-1.5 rounded-full hover:bg-[#b5852a] transition-colors"
            >
              {t("landing.nav.getStarted")}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-[#0e0e0e] px-4 sm:px-6 pt-16 pb-20">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[#c8942a] text-sm font-medium tracking-wide uppercase mb-4">
            {t("landing.hero.eyebrow")}
          </p>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-5">
            {t("landing.hero.title")}{" "}
            <span className="text-[#c8942a]">{t("landing.hero.titleAccent")}</span>
          </h1>

          <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            {t("landing.hero.subtitle")}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-14">
            <Link
              href="/connect"
              className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-[#c8942a] text-white font-semibold hover:bg-[#b5852a] transition-colors shadow-lg shadow-[#c8942a]/20"
            >
              {t("landing.hero.cta")}
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center h-12 px-8 rounded-full border border-[#333] text-gray-300 font-semibold hover:border-[#555] hover:text-white transition-colors"
            >
              {t("landing.hero.howItWorks")}
            </a>
          </div>

          <HomepageStats
            puzzlesSolved={stats.puzzlesSolved}
            fromRealGames={stats.fromRealGames}
            totalPlayers={stats.totalPlayers}
            onlineNow={stats.onlineNow}
          />
        </div>
      </section>

      {/* Why Cassandra */}
      <section className="bg-white px-4 sm:px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold text-[#999] uppercase tracking-widest mb-6">
            {t("landing.why.eyebrow")}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#f8f7f4] rounded-xl p-5 border border-[#eee]">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-[#1a1a1a] text-sm">
                  {t("landing.why.card1.title")}
                </h3>
                <span className="text-[9px] font-bold text-[#c8942a] bg-[#c8942a]/10 border border-[#c8942a]/30 px-1.5 py-0.5 rounded-full uppercase whitespace-nowrap ml-2 shrink-0">
                  {t("landing.why.card1.badge")}
                </span>
              </div>
              <p className="text-xs text-[#666] leading-relaxed">
                {t("landing.why.card1.desc")}
              </p>
            </div>

            <div className="bg-[#f8f7f4] rounded-xl p-5 border border-[#eee]">
              <h3 className="font-semibold text-[#1a1a1a] text-sm mb-2">
                {t("landing.why.card2.title")}
              </h3>
              <p className="text-xs text-[#666] leading-relaxed">
                {t("landing.why.card2.desc")}
              </p>
            </div>

            <div className="bg-[#f8f7f4] rounded-xl p-5 border border-[#eee]">
              <h3 className="font-semibold text-[#1a1a1a] text-sm mb-2">
                {t("landing.why.card3.title")}
              </h3>
              <p className="text-xs text-[#666] leading-relaxed">
                {t("landing.why.card3.desc")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-white px-4 sm:px-6 pb-16">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold text-[#999] uppercase tracking-widest mb-6">
            {t("landing.how.eyebrow")}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex gap-3">
              <span className="text-2xl font-extrabold text-[#c8942a]">1</span>
              <div>
                <h3 className="font-semibold text-[#1a1a1a] text-sm mb-1">{t("landing.how.step1.title")}</h3>
                <p className="text-xs text-[#666] leading-relaxed">
                  {t("landing.how.step1.desc")}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-2xl font-extrabold text-[#c8942a]">2</span>
              <div>
                <h3 className="font-semibold text-[#1a1a1a] text-sm mb-1">{t("landing.how.step2.title")}</h3>
                <p className="text-xs text-[#666] leading-relaxed">
                  {t("landing.how.step2.desc")}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-2xl font-extrabold text-[#c8942a]">3</span>
              <div>
                <h3 className="font-semibold text-[#1a1a1a] text-sm mb-1">{t("landing.how.step3.title")}</h3>
                <p className="text-xs text-[#666] leading-relaxed">
                  {t("landing.how.step3.desc")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA block */}
      <section className="bg-[#0e0e0e] px-4 sm:px-6 py-16">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-6">
            {t("landing.cta.title")}
          </h2>
          <Link
            href="/connect"
            className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-[#c8942a] text-white font-semibold hover:bg-[#b5852a] transition-colors shadow-lg shadow-[#c8942a]/20 mb-6"
          >
            {t("landing.cta.button")}
          </Link>
          <p className="text-[#c8942a] font-bold text-lg">
            {t("landing.cta.tagline")} &#127942;
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#f8f7f4] px-4 sm:px-6 py-6">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-3">
          <SocialLinks variant="light" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#999] w-full">
            <p>{t("landing.footer.copy")}</p>
            <p>{t("landing.footer.source")}</p>
          </div>
        </div>
      </footer>

      <Suspense>
        <ConfirmedToast />
      </Suspense>
    </main>
  );
}
