import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { ARTICLES, getArticle, getLocalizedArticle, getLocalizedArticles } from "@/lib/articles";
import { resolveLocale, LOCALE_COOKIE } from "@/lib/i18n";
import EmbeddedPuzzle from "@/components/EmbeddedPuzzle";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};

  return {
    title: article.metaTitle,
    description: article.metaDescription,
    openGraph: {
      title: article.metaTitle,
      description: article.metaDescription,
      type: "article",
      siteName: "Cassandra Chess",
    },
    twitter: {
      card: "summary",
      title: article.metaTitle,
      description: article.metaDescription,
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

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const article = getLocalizedArticle(slug, locale);
  if (!article) notFound();

  const readTime = estimateReadTime(article.content);
  const embedThemes = article.themes.slice(0, 3);

  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://cassandrachess.com";

  // Find related articles for internal linking (exclude current)
  const allArticles = getLocalizedArticles(locale);
  const relatedArticles = allArticles
    .filter((a) => a.slug !== slug)
    .filter((a) => a.themes.some((t) => article.themes.includes(t)))
    .slice(0, 3);

  // JSON-LD structured data for rich snippets
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.metaDescription,
    url: `${siteUrl}/learn/${slug}`,
    datePublished: "2026-01-15",
    dateModified: "2026-03-17",
    author: {
      "@type": "Organization",
      name: "Cassandra Chess",
      url: siteUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "Cassandra Chess",
      url: siteUrl,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteUrl}/learn/${slug}`,
    },
    wordCount: article.content.split(/\s+/).length,
    timeRequired: `PT${readTime}M`,
  };

  return (
    <main className="min-h-screen bg-white">
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Obsidian header */}
      <header className="bg-[#0e0e0e] px-4 sm:px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <nav className="flex items-center gap-2 text-xs text-gray-500 mb-4">
            <Link href="/" className="text-[#c8942a] hover:underline">Home</Link>
            <span>/</span>
            <Link href="/learn" className="text-[#c8942a] hover:underline">Learn</Link>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-snug">
            {article.title}
          </h1>
          <p className="text-xs text-gray-500 mt-3">{readTime} min read</p>
        </div>
      </header>

      {/* Article body */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="space-y-4">
          {renderContent(article.content)}
        </div>

        {/* Embedded interactive puzzles */}
        {embedThemes.length > 0 && (
          <section className="mt-12 bg-[#f8f7f4] rounded-xl border border-[#eee] p-6">
            <h2 className="text-lg font-bold text-[#1a1a1a] mb-4">
              Try It — Interactive Puzzles
            </h2>
            <div className="space-y-3">
              {embedThemes.map((theme, i) => (
                <EmbeddedPuzzle key={theme} theme={theme} offset={i} />
              ))}
            </div>
          </section>
        )}

        {/* Related articles */}
        {relatedArticles.length > 0 && (
          <section className="mt-12 pt-8 border-t border-[#eee]">
            <h2 className="text-lg font-bold text-[#1a1a1a] mb-4">Keep reading</h2>
            <div className="space-y-3">
              {relatedArticles.map((a) => (
                <Link
                  key={a.slug}
                  href={`/learn/${a.slug}`}
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
          <p className="text-white font-semibold mb-1">Ready to train on your own blunders?</p>
          <p className="text-gray-400 text-xs mb-4">Connect your Chess.com or Lichess account — free, no paywall.</p>
          <Link
            href="/connect"
            className="inline-flex items-center justify-center h-10 px-6 rounded-full bg-[#c8942a] text-white font-semibold hover:bg-[#b5852a] transition-colors text-sm"
          >
            Connect your account →
          </Link>
        </div>

        <div className="mt-6 flex items-center justify-between text-sm">
          <Link href="/learn" className="text-[#c8942a] hover:underline">
            ← All articles
          </Link>
          <Link href="/connect" className="text-[#c8942a] hover:underline">
            Start training →
          </Link>
        </div>
      </div>
    </main>
  );
}
