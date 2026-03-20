import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ARTICLES, getLocalizedArticle, getLocalizedArticles } from "@/lib/articles";
import { isLocale } from "@/lib/i18n/locales";
import { getT, preloadLocale } from "@/lib/i18n";

export const dynamic = "force-static";

const NON_EN_LOCALES = ["fr", "es", "de", "pt", "ru"] as const;

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams() {
  return NON_EN_LOCALES.flatMap((locale) =>
    ARTICLES.map((a) => ({ locale, slug: a.slug }))
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale) || locale === "en") return {};

  await preloadLocale(locale);
  const article = getLocalizedArticle(slug, locale);
  if (!article) return {};

  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://cassandrachess.com";
  const canonicalUrl = `${siteUrl}/${locale}/learn/${slug}`;
  const enUrl = `${siteUrl}/learn/${slug}`;
  const description = article.metaDescription.slice(0, 155);

  // Build hreflang alternates: x-default + en → /learn/slug, others → /locale/learn/slug
  const languages: Record<string, string> = {
    "x-default": enUrl,
    en: enUrl,
  };
  for (const l of NON_EN_LOCALES) {
    languages[l] = `${siteUrl}/${l}/learn/${slug}`;
  }

  return {
    title: article.metaTitle,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages,
    },
    openGraph: {
      title: article.metaTitle,
      description,
      type: "article",
      url: canonicalUrl,
      siteName: "Cassandra",
      locale,
    },
    twitter: {
      card: "summary",
      title: article.metaTitle,
      description,
    },
  };
}

function estimateReadTime(content: string): number {
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

/** Convert article content (markdown-ish headings + paragraphs) to JSX */
function renderContent(content: string) {
  const sections = content.split(/\n\n+/);
  return sections.map((block, i) => {
    if (block.startsWith("## ")) {
      return (
        <h2 key={i} className="text-xl font-bold text-[#1a1a1a] mt-8 mb-3">
          {block.slice(3)}
        </h2>
      );
    }
    if (block.startsWith("- ")) {
      const items = block.split("\n").filter((l) => l.startsWith("- "));
      return (
        <ul key={i} className="list-disc list-inside space-y-1 text-sm text-[#444] leading-relaxed">
          {items.map((item, j) => {
            const text = item.slice(2);
            const parts = text.split(/(\*\*[^*]+\*\*)/g);
            return (
              <li key={j}>
                {parts.map((part, k) =>
                  part.startsWith("**") && part.endsWith("**")
                    ? <strong key={k}>{part.slice(2, -2)}</strong>
                    : part
                )}
              </li>
            );
          })}
        </ul>
      );
    }
    // Handle inline bold, links within paragraphs
    const parts = block.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
    return (
      <p key={i} className="text-sm text-[#444] leading-relaxed">
        {parts.map((part, j) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={j} className="text-[#1a1a1a]">{part.slice(2, -2)}</strong>;
          }
          const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
          if (linkMatch) {
            return (
              <Link key={j} href={linkMatch[2]} className="text-[#c8942a] hover:underline">
                {linkMatch[1]}
              </Link>
            );
          }
          // Handle italic
          const italicParts = part.split(/(\*[^*]+\*)/g);
          if (italicParts.length > 1) {
            return italicParts.map((ip, k) =>
              ip.startsWith("*") && ip.endsWith("*") && !ip.startsWith("**")
                ? <em key={`${j}-${k}`}>{ip.slice(1, -1)}</em>
                : ip
            );
          }
          return part;
        })}
      </p>
    );
  });
}

export default async function LocaleArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale) || locale === "en") notFound();

  await preloadLocale(locale);
  const t = getT(locale);
  const article = getLocalizedArticle(slug, locale);
  if (!article) notFound();

  const readTime = estimateReadTime(article.content);
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://cassandrachess.com";

  // Related articles for internal linking (exclude current)
  const allArticles = getLocalizedArticles(locale);
  const relatedArticles = allArticles
    .filter((a) => a.slug !== slug)
    .filter((a) => a.themes.some((th) => article.themes.includes(th)))
    .slice(0, 3);

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.metaDescription,
    url: `${siteUrl}/${locale}/learn/${slug}`,
    inLanguage: locale,
    datePublished: "2026-01-15",
    dateModified: "2026-03-17",
    author: {
      "@type": "Organization",
      name: "Cassandra",
      url: siteUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "Cassandra",
      url: siteUrl,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteUrl}/${locale}/learn/${slug}`,
    },
    wordCount: article.content.split(/\s+/).length,
    timeRequired: `PT${readTime}M`,
  };

  return (
    <main className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Obsidian header */}
      <header className="bg-[#0e0e0e] px-4 sm:px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <nav className="flex items-center gap-2 text-xs text-gray-500 mb-4">
            <Link href="/" className="text-[#c8942a] hover:underline">{t("nav.home")}</Link>
            <span>/</span>
            <Link href={`/${locale}/learn`} className="text-[#c8942a] hover:underline">{t("learn.title")}</Link>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-snug">
            {article.title}
          </h1>
          <p className="text-xs text-gray-500 mt-3">{readTime} {t("learn.minRead")}</p>
        </div>
      </header>

      {/* Article body */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="space-y-4">
          {renderContent(article.content)}
        </div>

        {/* Related articles */}
        {relatedArticles.length > 0 && (
          <section className="mt-12 pt-8 border-t border-[#eee]">
            <h2 className="text-lg font-bold text-[#1a1a1a] mb-4">{t("learn.keepReading")}</h2>
            <div className="space-y-3">
              {relatedArticles.map((a) => (
                <Link
                  key={a.slug}
                  href={`/${locale}/learn/${a.slug}`}
                  className="block bg-[#f8f7f4] rounded-xl border border-[#eee] p-4 hover:border-[#c8942a] transition-colors"
                >
                  <p className="font-semibold text-[#1a1a1a] text-sm">{a.title}</p>
                  <p className="text-xs text-[#666] mt-1">{a.metaDescription}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA + footer nav */}
        <div className="mt-10 bg-[#0e0e0e] rounded-xl p-6 text-center">
          <p className="text-white font-semibold mb-1">{t("learn.ctaTitle")}</p>
          <p className="text-gray-400 text-xs mb-4">{t("learn.ctaDesc")}</p>
          <Link
            href="/connect"
            className="inline-flex items-center justify-center h-10 px-6 rounded-full bg-[#c8942a] text-white font-semibold hover:bg-[#b5852a] transition-colors text-sm"
          >
            {t("learn.ctaButton")}
          </Link>
        </div>

        <div className="mt-6 flex items-center justify-between text-sm">
          <Link href={`/${locale}/learn`} className="text-[#c8942a] hover:underline">
            ← {t("learn.allArticles")}
          </Link>
          <Link href="/connect" className="text-[#c8942a] hover:underline">
            {t("learn.startTraining")} →
          </Link>
        </div>
      </div>
    </main>
  );
}
