import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { getT, resolveLocale, LOCALE_COOKIE, preloadLocale } from "@/lib/i18n";
import CassandraLogo from "@/components/CassandraLogo";
import ConfirmedToast from "@/components/marketing/ConfirmedToast";
import DemoBoard from "./DemoBoard";
import HeroForm from "./HeroForm";
import SocialLinks from "@/components/SocialLinks";
import CookiePreferencesLink from "@/components/CookiePreferencesLink";
import NavLanguageToggle from "@/components/NavLanguageToggle";

export default async function Home() {
  // Redirect logged-in users straight to their dashboard
  const { auth } = await import("@/auth");
  const session = await auth();
  if (session?.userId) {
    const { redirect } = await import("next/navigation");
    redirect("/home");
  }

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
              className="text-gray-300 text-sm hover:text-white transition-colors hidden sm:inline"
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
      <section className="bg-[#f9f7f4] px-4 sm:px-8 pt-10 sm:pt-12 pb-4 sm:pb-6 flex-1">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 items-start">

          {/* Left column — floating card */}
          <div className="bg-white rounded-2xl border border-[#e8e5e0] shadow-[0_2px_20px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="p-5 sm:p-6 pb-0">
              {/* Eyebrow */}
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#c49e45] font-semibold mb-2">
                Personalised chess training
              </p>

              <h1
                className="text-[32px] sm:text-[42px] leading-[1.1] font-normal text-[#111] mb-3"
                style={{ fontFamily: "Georgia, serif", letterSpacing: "-0.02em" }}
              >
                {t("landing.hero.h1")}{" "}
                <span className="inline-block">&#9823;</span>
              </h1>

              <p className="text-[#555] text-[16px] leading-relaxed mb-5 max-w-lg">
                {t("landing.hero.value")}
              </p>

              {/* How it works */}
              <p className="text-[11px] uppercase tracking-[0.1em] text-[#999] font-semibold mb-3">
                {t("landing.hero.howItWorks")}
              </p>

              <div className="space-y-3 mb-5">
                <div className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-[#c8942a] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <p className="text-[14px] font-semibold text-[#111]">{t("landing.hero.step1.title")}</p>
                    <p className="text-[13px] text-[#777] mt-0.5">{t("landing.hero.step1.desc")}</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-[#c8942a] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <p className="text-[14px] font-semibold text-[#111]">{t("landing.hero.step2.title")}</p>
                    <p className="text-[13px] text-[#777] mt-0.5">{t("landing.hero.step2.desc")}</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-[#c8942a] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <p className="text-[14px] font-semibold text-[#111]">{t("landing.hero.step3.title")}</p>
                    <p className="text-[13px] text-[#777] mt-0.5">Enter your username below</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Obsidian input card — flush to bottom, no top radius */}
            <div className="bg-[#0e0e0e] p-4 px-6" style={{ borderRadius: "0 0 16px 16px" }}>
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

          {/* Right column — animated board */}
          <div className="lg:sticky lg:top-4">
            <DemoBoard />
          </div>
        </div>
      </section>

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

      <Suspense>
        <ConfirmedToast />
      </Suspense>
    </main>
  );
}
