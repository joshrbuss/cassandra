import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { getT, resolveLocale, LOCALE_COOKIE } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for Cassandra Chess — what we collect, how we use it, and your rights.",
};

export default async function PrivacyPage() {
  const cookieStore = await cookies();
  const t = getT(resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value));

  return (
    <main className="min-h-screen bg-white">
      {/* Obsidian header */}
      <header className="bg-[#0e0e0e] px-4 sm:px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="text-[#c8942a] text-sm hover:underline">
            {t("nav.home")}
          </Link>
          <h1 className="text-3xl font-extrabold text-white mt-3">
            {t("privacy.title")}
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            {t("privacy.lastUpdated")}
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* What we collect */}
        <section>
          <h2 className="text-lg font-bold text-[#1a1a1a] mb-3">{t("privacy.collectTitle")}</h2>
          <ul className="list-disc list-inside space-y-2 text-sm text-[#444] leading-relaxed">
            <li>{t("privacy.collect.username")}</li>
            <li>{t("privacy.collect.email")}</li>
            <li>{t("privacy.collect.country")}</li>
            <li>{t("privacy.collect.ratings")}</li>
            <li>{t("privacy.collect.gameHistory")}</li>
            <li>{t("privacy.collect.device")}</li>
            <li>{t("privacy.collect.puzzleData")}</li>
            <li>{t("privacy.collect.streakStats")}</li>
            <li>{t("privacy.collect.referral")}</li>
            <li>{t("privacy.collect.payment")}</li>
            <li>{t("privacy.collect.cookies")}</li>
          </ul>
        </section>

        {/* Data notice */}
        <section className="bg-[#f8f7f4] border border-[#eee] rounded-xl p-5">
          <p className="text-sm text-[#444] leading-relaxed">
            {t("privacy.dataNotice")}
          </p>
        </section>

        {/* Third party services */}
        <section>
          <h2 className="text-lg font-bold text-[#1a1a1a] mb-3">{t("privacy.thirdPartyTitle")}</h2>
          <ul className="list-disc list-inside space-y-2 text-sm text-[#444] leading-relaxed">
            <li>{t("privacy.thirdParty.ga4")}</li>
            <li>{t("privacy.thirdParty.gsc")}</li>
            <li>{t("privacy.thirdParty.bing")}</li>
            <li>{t("privacy.thirdParty.adsense")}</li>
            <li>{t("privacy.thirdParty.metaPixel")}</li>
            <li>{t("privacy.thirdParty.vercelFull")}</li>
            <li>{t("privacy.thirdParty.supabase")}</li>
            <li>{t("privacy.thirdParty.resend")}</li>
            <li>{t("privacy.thirdParty.stripe")}</li>
            <li>{t("privacy.thirdParty.chesscom")}</li>
            <li>{t("privacy.thirdParty.lichess")}</li>
            <li>{t("privacy.thirdParty.stockfish")}</li>
          </ul>
        </section>

        {/* Your rights */}
        <section>
          <h2 className="text-lg font-bold text-[#1a1a1a] mb-3">{t("privacy.rightsTitle")}</h2>
          <p className="text-sm text-[#444] leading-relaxed">
            {t("privacy.rights")}
          </p>
        </section>

        {/* Cookies */}
        <section>
          <h2 className="text-lg font-bold text-[#1a1a1a] mb-3">{t("privacy.cookiesTitle")}</h2>
          <p className="text-sm text-[#444] leading-relaxed">
            {t("privacy.cookiesDesc")}
          </p>
        </section>

        {/* What happens if you decline cookies */}
        <section>
          <h2 className="text-lg font-bold text-[#1a1a1a] mb-3">{t("privacy.declineTitle")}</h2>
          <p className="text-sm text-[#444] leading-relaxed">
            {t("privacy.declineDesc")}
          </p>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-lg font-bold text-[#1a1a1a] mb-3">{t("privacy.contactTitle")}</h2>
          <p className="text-sm text-[#444]">
            <a href="mailto:josh@cassandrachess.com" className="text-[#c8942a] hover:underline">
              josh@cassandrachess.com
            </a>
          </p>
        </section>

        {/* Footer links */}
        <div className="pt-6 border-t border-[#eee] flex gap-4">
          <Link href="/terms" className="text-sm text-[#c8942a] hover:underline">
            {t("legal.terms")}
          </Link>
          <Link href="/" className="text-sm text-[#999] hover:underline">
            {t("nav.home")}
          </Link>
        </div>
      </div>
    </main>
  );
}
