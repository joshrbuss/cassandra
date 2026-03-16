import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { ARTICLES, getArticle, getLocalizedArticle } from "@/lib/articles";
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

  return (
    <main className="min-h-screen bg-white">
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

        {/* Footer nav */}
        <div className="mt-12 pt-8 border-t border-[#eee] flex items-center justify-between text-sm">
          <Link href="/learn" className="text-[#c8942a] hover:underline">
            ← All articles
          </Link>
          <Link
            href="/connect"
            className="inline-flex items-center justify-center h-9 px-5 rounded-full bg-[#c8942a] text-white font-semibold hover:bg-[#b5852a] transition-colors text-sm"
          >
            Start training →
          </Link>
        </div>
      </div>
    </main>
  );
}
