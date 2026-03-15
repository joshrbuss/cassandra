import type { Metadata } from "next";
import Link from "next/link";
import { ARTICLES } from "@/lib/articles";

export const metadata: Metadata = {
  title: "Learn Chess Tactics — Cassandra Chess Puzzles",
  description:
    "Free chess tactic guides covering puzzles for beginners, tactics training, endgame puzzles, retrograde analysis, and more.",
  openGraph: {
    title: "Learn Chess Tactics — Cassandra Chess Puzzles",
    description:
      "Free guides on chess tactics, endgame puzzles, retrograde analysis, and opponent prediction training.",
    type: "website",
  },
};

export default function LearnPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            ← Back to puzzles
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Learn Chess Tactics
        </h1>
        <p className="text-gray-500 mb-10">
          Guides on patterns, techniques, and training methods — each with interactive puzzles.
        </p>

        <ol className="space-y-4">
          {ARTICLES.map((article) => (
            <li key={article.slug}>
              <Link
                href={`/learn/${article.slug}`}
                className="block bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
              >
                <h2 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600">
                  {article.title}
                </h2>
                <p className="text-sm text-gray-500 line-clamp-2">
                  {article.metaDescription}
                </p>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
