import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { getT, resolveLocale, LOCALE_COOKIE } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of service for Cassandra Chess.",
};

export default async function TermsPage() {
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
            {t("terms.title")}
          </h1>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <section>
          <h2 className="text-lg font-bold text-[#1a1a1a] mb-3">{t("terms.serviceTitle")}</h2>
          <p className="text-sm text-[#444] leading-relaxed">{t("terms.service")}</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#1a1a1a] mb-3">{t("terms.accountsTitle")}</h2>
          <p className="text-sm text-[#444] leading-relaxed">{t("terms.accounts")}</p>
          <p className="text-sm text-[#444] leading-relaxed mt-2">{t("terms.dataConsent")}</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#1a1a1a] mb-3">{t("terms.paymentsTitle")}</h2>
          <p className="text-sm text-[#444] leading-relaxed">{t("terms.payments")}</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#1a1a1a] mb-3">{t("terms.contentTitle")}</h2>
          <p className="text-sm text-[#444] leading-relaxed">{t("terms.content")}</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#1a1a1a] mb-3">{t("terms.prohibitedTitle")}</h2>
          <p className="text-sm text-[#444] leading-relaxed">{t("terms.prohibited")}</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#1a1a1a] mb-3">{t("terms.liabilityTitle")}</h2>
          <p className="text-sm text-[#444] leading-relaxed">{t("terms.liability")}</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#1a1a1a] mb-3">{t("terms.governingLawTitle")}</h2>
          <p className="text-sm text-[#444] leading-relaxed">{t("terms.governingLaw")}</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#1a1a1a] mb-3">{t("terms.contactTitle")}</h2>
          <p className="text-sm text-[#444]">
            <a href="mailto:josh@cassandrachess.com" className="text-[#c8942a] hover:underline">
              josh@cassandrachess.com
            </a>
          </p>
        </section>

        {/* Footer links */}
        <div className="pt-6 border-t border-[#eee] flex gap-4">
          <Link href="/privacy" className="text-sm text-[#c8942a] hover:underline">
            {t("legal.privacy")}
          </Link>
          <Link href="/" className="text-sm text-[#999] hover:underline">
            {t("nav.home")}
          </Link>
        </div>
      </div>
    </main>
  );
}
