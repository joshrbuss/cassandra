import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getLocalizedArticles } from "@/lib/articles";
import { isLocale } from "@/lib/i18n/locales";
import { getT, preloadLocale } from "@/lib/i18n";
import SocialLinks from "@/components/SocialLinks";
import CookiePreferencesLink from "@/components/CookiePreferencesLink";

export const dynamic = "force-static";

const NON_EN_LOCALES = ["fr", "es", "de", "pt", "ru"] as const;

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateStaticParams() {
  return NON_EN_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale) || locale === "en") return {};

  await preloadLocale(locale);
  const t = getT(locale);

  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://cassandrachess.com";
  const canonicalUrl = `${siteUrl}/${locale}/learn`;
  const enUrl = `${siteUrl}/learn`;

  const languages: Record<string, string> = {
    "x-default": enUrl,
    en: enUrl,
  };
  for (const l of NON_EN_LOCALES) {
    languages[l] = `${siteUrl}/${l}/learn`;
  }

  return {
    title: t("learn.title"),
    description: t("learn.subtitle"),
    alternates: {
      canonical: canonicalUrl,
      languages,
    },
    openGraph: {
      title: t("learn.title"),
      description: t("learn.subtitle"),
      type: "website",
      url: canonicalUrl,
      siteName: "Cassandra",
      locale,
    },
  };
}

function estimateReadTime(content: string): number {
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

export default async function LocaleLearnPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale) || locale === "en") notFound();

  await preloadLocale(locale);
  const t = getT(locale);
  const articles = getLocalizedArticles(locale);

  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://cassandrachess.com";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t("learn.title"),
    description: t("learn.subtitle"),
    url: `${siteUrl}/${locale}/learn`,
    inLanguage: locale,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: articles.map((a, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${siteUrl}/${locale}/learn/${a.slug}`,
        name: a.title,
      })),
    },
    publisher: {
      "@type": "Organization",
      name: "Cassandra",
      url: siteUrl,
    },
  };

  return (
    <main className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Obsidian header */}
      <header className="bg-[#0e0e0e] px-4 sm:px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="text-[#c8942a] text-sm hover:underline">
            {t("nav.home")}
          </Link>
          <h1 className="text-3xl font-extrabold text-white mt-3">
            {t("learn.title")}
          </h1>
          <p className="text-gray-400 mt-2 text-sm">
            {t("learn.subtitle")}
          </p>
        </div>
      </header>

      {/* Articles list */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="space-y-4">
          {articles.map((article) => {
            const readTime = estimateReadTime(article.content);
            return (
              <Link
                key={article.slug}
                href={`/${locale}/learn/${article.slug}`}
                className="block bg-[#f8f7f4] rounded-xl border border-[#eee] p-5 hover:border-[#c8942a] transition-colors"
              >
                <h2 className="font-semibold text-[#1a1a1a] mb-1">
                  {article.title}
                </h2>
                <p className="text-xs text-[#666] leading-relaxed mb-2">
                  {article.metaDescription}
                </p>
                <span className="text-[10px] text-[#999] uppercase tracking-wider">
                  {readTime} {t("learn.minRead")}
                </span>
              </Link>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <Link
            href="/connect"
            className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-[#c8942a] text-white font-semibold hover:bg-[#b5852a] transition-colors shadow-lg shadow-[#c8942a]/20"
          >
            {t("learn.cta")}
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#0e0e0e] px-4 sm:px-6 py-6">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-3">
          <SocialLinks variant="dark" />
          <div className="flex items-center justify-center gap-3 text-xs">
            <Link href="/privacy" className="text-[#c8942a] hover:text-[#e0ad3a] transition-colors">{t("legal.privacy")}</Link>
            <span className="text-[#444]">·</span>
            <Link href="/terms" className="text-[#c8942a] hover:text-[#e0ad3a] transition-colors">{t("legal.terms")}</Link>
            <span className="text-[#444]">·</span>
            <CookiePreferencesLink />
          </div>
          <p className="text-xs text-[#999]">© 2026 Cassandra Chess</p>
        </div>
      </footer>
    </main>
  );
}
