import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ARTICLES, getArticle } from "@/lib/articles";
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
      siteName: "Cassandra Chess Puzzles",
    },
    twitter: {
      card: "summary",
      title: article.metaTitle,
      description: article.metaDescription,
    },
  };
}

/** Convert article content (markdown-ish headings + paragraphs) to JSX */
function renderContent(content: string) {
  const sections = content.split(/\n\n+/);
  return sections.map((block, i) => {
    if (block.startsWith("## ")) {
      return (
        <h2 key={i} className="text-xl font-bold text-gray-900 mt-8 mb-3">
          {block.slice(3)}
        </h2>
      );
    }
    if (block.startsWith("**") && block.endsWith("**")) {
      // Bold-only block — treat as subheading
      const inner = block.slice(2, -2);
      return (
        <h3 key={i} className="font-semibold text-gray-900 mt-4 mb-1">
          {inner}
        </h3>
      );
    }
    // Handle inline bold within paragraphs
    const parts = block.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i} className="text-gray-700 leading-relaxed">
        {parts.map((part, j) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={j}>{part.slice(2, -2)}</strong>;
          }
          return part;
        })}
      </p>
    );
  });
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  // Pick up to 3 themes for embedded puzzles
  const embedThemes = article.themes.slice(0, 3);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <article className="max-w-2xl mx-auto">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-sm text-gray-400">
          <Link href="/" className="hover:text-blue-600 hover:underline">Home</Link>
          <span>/</span>
          <Link href="/learn" className="hover:text-blue-600 hover:underline">Learn</Link>
          <span>/</span>
          <span className="text-gray-600">{article.title}</span>
        </nav>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-6 leading-snug">
          {article.title}
        </h1>

        {/* Article body */}
        <div className="prose-like space-y-4">
          {renderContent(article.content)}
        </div>

        {/* Embedded interactive puzzles */}
        {embedThemes.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
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
        <div className="mt-12 pt-8 border-t border-gray-200 flex items-center justify-between text-sm">
          <Link href="/learn" className="text-blue-600 hover:underline">
            ← All articles
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center h-9 px-5 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors text-sm"
          >
            Start training →
          </Link>
        </div>
      </article>
    </main>
  );
}
