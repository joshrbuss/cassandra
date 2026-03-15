import { prisma } from "@/lib/prisma";
import Link from "next/link";

interface EmbeddedPuzzleProps {
  theme: string;
  /** Optional offset to pick different puzzles within same theme */
  offset?: number;
}

/**
 * Server component that fetches a real puzzle by theme and renders an
 * interactive link card. The full puzzle experience is on the puzzle page.
 */
export default async function EmbeddedPuzzle({ theme, offset = 0 }: EmbeddedPuzzleProps) {
  const puzzles = await prisma.puzzle.findMany({
    where: {
      themes: { contains: theme },
    },
    select: { id: true, themes: true, rating: true },
    take: offset + 1,
    orderBy: { rating: "asc" },
  });

  const puzzle = puzzles[offset] ?? puzzles[0];

  if (!puzzle) {
    return null;
  }

  const themeList = puzzle.themes
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .join(" · ");

  return (
    <Link
      href={`/puzzles/${puzzle.id}`}
      className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 hover:bg-blue-100 hover:border-blue-400 transition-colors group"
    >
      <div>
        <p className="text-sm font-semibold text-blue-900 group-hover:text-blue-700">
          Practice Puzzle — Rating {puzzle.rating}
        </p>
        {themeList && (
          <p className="text-xs text-blue-600 mt-0.5">{themeList}</p>
        )}
      </div>
      <span className="text-blue-600 font-bold text-lg group-hover:translate-x-1 transition-transform">→</span>
    </Link>
  );
}
