import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { getT, resolveLocale, LOCALE_COOKIE, preloadLocale } from "@/lib/i18n";
import CassandraLogo from "@/components/CassandraLogo";
import NavLanguageToggle from "@/components/NavLanguageToggle";
import SocialLinks from "@/components/SocialLinks";
import CookiePreferencesLink from "@/components/CookiePreferencesLink";
import FeedbackForm from "./FeedbackForm";

export const metadata: Metadata = {
  title: "Feedback — Cassandra",
  description: "Found a bug? Have an idea? Send feedback directly to the team.",
};

export default async function FeedbackPage() {
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
              className="text-white text-sm font-medium transition-colors hidden sm:inline"
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
            {t("feedback.eyebrow")}
          </p>
          <h1
            className="text-[32px] sm:text-[44px] leading-[1.1] font-normal text-[#111] mb-5"
            style={{ fontFamily: "Georgia, serif", letterSpacing: "-0.02em" }}
          >
            {t("feedback.headline")}
          </h1>
          <p className="text-[#555] text-[16px] leading-relaxed max-w-lg mx-auto whitespace-pre-line">
            {t("feedback.intro")}
          </p>
        </div>
      </section>

      {/* ── Form ── */}
      <div className="bg-white px-4 sm:px-8 py-12 flex-1">
        <div className="max-w-xl mx-auto">
          <FeedbackForm />
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
