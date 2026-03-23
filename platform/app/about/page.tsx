import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { getT, resolveLocale, LOCALE_COOKIE, preloadLocale } from "@/lib/i18n";
import CassandraLogo from "@/components/CassandraLogo";
import NavLanguageToggle from "@/components/NavLanguageToggle";
import HeroForm from "../HeroForm";
import SocialLinks from "@/components/SocialLinks";
import CookiePreferencesLink from "@/components/CookiePreferencesLink";

export const metadata: Metadata = {
  title: "About Cassandra — Your games contain a pattern for why you lose",
  description:
    "Cassandra finds the mistakes in your games and builds personalised puzzles around them. Free, no paywall.",
};

const PUZZLE_TYPES = [
  { titleKey: "about.puzzleType.whatYouMissed", descKey: "about.puzzleType.whatYouMissedDesc" },
  { titleKey: "about.puzzleType.retrograde", descKey: "about.puzzleType.retrogradeDesc" },
  { titleKey: "about.puzzleType.moveRanking", descKey: "about.puzzleType.moveRankingDesc" },
  { titleKey: "about.puzzleType.threatOrBluff", descKey: "about.puzzleType.threatOrBluffDesc" },
  { titleKey: "about.puzzleType.flipTheBoard", descKey: "about.puzzleType.flipTheBoardDesc" },
] as const;

export default async function AboutPage() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  await preloadLocale(locale);
  const t = getT(locale);

  return (
    <main className="min-h-screen flex flex-col">
      {/* ── Navbar ── */}
      <nav className="bg-[#0e0e0e] px-4 sm:px-8 py-3.5">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <CassandraLogo className="w-9 h-9" />
            <span className="text-white text-[32px]" style={{ fontFamily: "Georgia, serif" }}>
              Cassandra
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/about"
              className="text-white text-sm font-medium transition-colors hidden sm:inline"
            >
              {t("nav.about")}
            </Link>
            <Link
              href="/feedback"
              className="text-gray-300 text-sm hover:text-white transition-colors hidden sm:inline"
            >
              {t("nav.feedback")}
            </Link>
            <Link
              href="/learn"
              className="text-gray-300 text-sm hover:text-white transition-colors hidden sm:inline"
            >
              {t("landing.nav.learn")}
            </Link>
            <Link
              href="/connect"
              className="text-gray-300 text-sm hover:text-white transition-colors hidden sm:inline"
            >
              {t("landing.nav.signIn")}
            </Link>
            <NavLanguageToggle />
            <Link
              href="/connect"
              className="text-[#0e0e0e] text-sm font-semibold px-4 py-1.5 rounded-full bg-[#c49e45] hover:bg-[#b5892a] transition-colors"
            >
              {t("landing.nav.getStarted")}
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="bg-[#f9f7f4] px-4 sm:px-8 pt-16 pb-12 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-[11px] uppercase tracking-[0.12em] text-[#c49e45] font-semibold mb-4">
            {t("about.eyebrow")}
          </p>
          <h1
            className="text-[32px] sm:text-[44px] leading-[1.1] font-normal text-[#111] mb-5"
            style={{ fontFamily: "Georgia, serif", letterSpacing: "-0.02em" }}
          >
            {t("about.headline")}
          </h1>
          <p className="text-[#555] text-[17px] leading-relaxed max-w-xl mx-auto">
            {t("about.subtext")}
          </p>
        </div>
      </section>

      {/* ── Body ── */}
      <div className="bg-white px-4 sm:px-8 py-12 flex-1">
        <div className="max-w-2xl mx-auto space-y-12">

          {/* Quote card */}
          <div className="bg-[#0e0e0e] rounded-2xl p-8 sm:p-10">
            <p
              className="text-[#ddd] text-[16px] sm:text-[18px] leading-relaxed italic"
              style={{ fontFamily: "Georgia, serif" }}
            >
              &ldquo;{t("about.quote")}&rdquo;
            </p>
            <p className="text-[#888] text-xs mt-4 uppercase tracking-wider">
              {t("about.quoteAttribution")}
            </p>
          </div>

          {/* Why Cassandra exists */}
          <section>
            <h2
              className="text-[22px] sm:text-[26px] font-normal text-[#111] mb-4"
              style={{ fontFamily: "Georgia, serif" }}
            >
              {t("about.whyTitle")}
            </h2>
            <p className="text-[#555] text-[15px] leading-relaxed">
              {t("about.whyBody")}
            </p>
          </section>

          {/* Not all mistakes are the same */}
          <section>
            <h2
              className="text-[22px] sm:text-[26px] font-normal text-[#111] mb-4"
              style={{ fontFamily: "Georgia, serif" }}
            >
              {t("about.notAllTitle")}
            </h2>
            <p className="text-[#555] text-[15px] leading-relaxed mb-6">
              {t("about.notAllBody")}
            </p>

            {/* Puzzle type cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PUZZLE_TYPES.map(({ titleKey, descKey }) => (
                <div
                  key={titleKey}
                  className="border border-[#e8e5e0] rounded-xl p-5 bg-[#faf9f7]"
                >
                  <p className="text-[14px] font-semibold text-[#111] mb-1">{t(titleKey)}</p>
                  <p className="text-[13px] text-[#777] leading-relaxed">{t(descKey)}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Built for how you actually lose */}
          <section>
            <h2
              className="text-[22px] sm:text-[26px] font-normal text-[#111] mb-4"
              style={{ fontFamily: "Georgia, serif" }}
            >
              {t("about.builtForTitle")}
            </h2>
            <p className="text-[#555] text-[15px] leading-relaxed">
              {t("about.builtForBody")}
            </p>
          </section>

          {/* Free */}
          <section>
            <h2
              className="text-[22px] sm:text-[26px] font-normal text-[#111] mb-4"
              style={{ fontFamily: "Georgia, serif" }}
            >
              {t("about.freeTitle")}
            </h2>
            <p className="text-[#555] text-[15px] leading-relaxed">
              {t("about.freeBody")}
            </p>
          </section>

          {/* Sign-off */}
          <div className="border-t border-[#e5e5e5] pt-8">
            <p
              className="text-[24px] text-[#111] italic"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {t("about.signOff")}
            </p>
            <p className="text-[#c49e45] text-sm mt-1">
              {t("about.signOffHandle")}
            </p>
          </div>

          {/* Crown divider */}
          <div className="flex justify-center py-4">
            <CassandraLogo className="w-10 h-10 opacity-30" />
          </div>

          {/* Input card */}
          <div className="bg-[#0e0e0e] rounded-2xl p-6 sm:p-8">
            <HeroForm
              dark
              ctaLabel={t("landing.hero.cta")}
              chesscomPlaceholder={t("landing.hero.chesscomPlaceholder")}
              lichessPlaceholder={t("landing.hero.lichessPlaceholder")}
              trustFree={t("landing.hero.trustFree")}
              trustUnlimited={t("landing.hero.trustUnlimited")}
              trustNoPaywall={t("landing.hero.trustNoPaywall")}
              trustPersonalised={t("landing.hero.trustPersonalised")}
            />
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="bg-[#0e0e0e] px-4 sm:px-6 py-6">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-3">
          <SocialLinks variant="dark" />
          <div className="flex items-center justify-center gap-3 text-xs">
            <Link href="/privacy" className="text-[#c8942a] hover:text-[#e0ad3a] transition-colors">{t("legal.privacy")}</Link>
            <span className="text-[#444]">&middot;</span>
            <Link href="/terms" className="text-[#c8942a] hover:text-[#e0ad3a] transition-colors">{t("legal.terms")}</Link>
            <span className="text-[#444]">&middot;</span>
            <CookiePreferencesLink />
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#999] w-full">
            <p>{t("landing.footer.copy")}</p>
            <p>{t("landing.footer.source")}</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
