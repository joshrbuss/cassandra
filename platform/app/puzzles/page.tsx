import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { parseTactics, TACTIC_LABELS, type Tactic } from "@/lib/tactics";
import TacticFilter from "@/components/puzzles/TacticFilter";
import OpeningFilter from "@/components/puzzles/OpeningFilter";
import type { Prisma } from "@prisma/client";

export const metadata: Metadata = {
  title: "Puzzle Browser",
  description: "Browse and filter chess puzzles by tactic type.",
};

interface Props {
  searchParams: Promise<{
    tactics?: string;
    type?: string;
    eco?: string;
    elo_range?: string;
    page?: string;
    mode?: string;
    source?: string;
  }>;
}

const PAGE_SIZE = 20;

async function PuzzleGrid({ searchParams }: Props) {
  const params = await searchParams;
  const tactics = parseTactics(params.tactics ?? null);
  const typeFilter = params.type;
  const ecoFilter = params.eco?.trim().toUpperCase() || null;
  const sourceFilter = params.source ?? null;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));

  // Parse elo_range param, e.g. "1200-1399"
  let eloRange: { min: number; max: number } | null = null;
  if (params.elo_range) {
    const [minStr, maxStr] = params.elo_range.split("-");
    const min = parseInt(minStr, 10);
    const max = parseInt(maxStr, 10);
    if (!isNaN(min) && !isNaN(max)) eloRange = { min, max };
  }

  const where: Prisma.PuzzleWhereInput = {};
  if (typeFilter) where.type = typeFilter;
  if (ecoFilter) where.ecoCode = ecoFilter;
  if (sourceFilter) where.source = sourceFilter;
  if (eloRange) {
    where.eloRangeMin = { equals: eloRange.min };
    where.eloRangeMax = { equals: eloRange.max };
  }
  if (tactics.length === 1) {
    where.themes = { contains: tactics[0] };
  } else if (tactics.length > 1) {
    where.OR = tactics.map((t) => ({ themes: { contains: t } }));
  }

  const [puzzles, total] = await Promise.all([
    prisma.puzzle.findMany({
      where,
      select: {
        id: true,
        rating: true,
        themes: true,
        type: true,
        ecoCode: true,
        openingName: true,
      },
      orderBy: { rating: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.puzzle.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const buildPageUrl = (p: number) => {
    const q = new URLSearchParams();
    if (params.tactics) q.set("tactics", params.tactics);
    if (params.type) q.set("type", params.type);
    if (params.eco) q.set("eco", params.eco);
    if (params.elo_range) q.set("elo_range", params.elo_range);
    if (params.mode) q.set("mode", params.mode);
    if (params.source) q.set("source", params.source);
    q.set("page", String(p));
    return `/puzzles?${q.toString()}`;
  };

  const puzzleHref = (puzzleId: string) =>
    params.mode ? `/puzzles/${puzzleId}?mode=${params.mode}` : `/puzzles/${puzzleId}`;

  return (
    <>
      {/* User import banner */}
      {params.source === "user_import" && (
        <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-xs text-blue-700 font-medium">
          <span>♟</span>
          <span>Showing puzzles generated from your games — practice your own mistakes.</span>
        </div>
      )}

      {/* Drill mode banner */}
      {params.mode === "timed" && (
        <div className="mb-3 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2 text-xs text-orange-700 font-medium">
          <span>⏱</span>
          <span>Drill mode — each puzzle shows a tighter countdown based on the global average for that tactic.</span>
        </div>
      )}

      {/* Results count */}
      <p className="text-xs text-gray-400 mb-3">
        {total.toLocaleString()} puzzle{total !== 1 ? "s" : ""}
        {tactics.length > 0 && (
          <>
            {" "}matching{" "}
            <span className="text-gray-600 font-medium">
              {tactics.map((t) => TACTIC_LABELS[t as Tactic]).join(", ")}
            </span>
          </>
        )}
        {ecoFilter && (
          <>
            {" "}in opening{" "}
            <span className="text-gray-600 font-medium">{ecoFilter}</span>
          </>
        )}
      </p>

      {/* Puzzle grid */}
      {puzzles.length === 0 ? (
        <p className="text-gray-400 italic text-sm">No puzzles found for this filter.</p>
      ) : (
        <ol className="space-y-2">
          {puzzles.map((p) => {
            const firstTag = p.themes.trim().split(/\s+/)[0];
            return (
              <li key={p.id}>
                <Link
                  href={puzzleHref(p.id)}
                  className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-gray-400">{p.id}</span>
                    {firstTag && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {TACTIC_LABELS[firstTag as Tactic] ?? firstTag}
                      </span>
                    )}
                    {p.ecoCode && (
                      <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                        {p.openingName ? `${p.openingName} — ${p.ecoCode}` : p.ecoCode}
                      </span>
                    )}
                    {p.type !== "standard" && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full capitalize">
                        {p.type.replace("_", " ")}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-gray-500 ml-2 flex-shrink-0">
                    ★ {p.rating}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          {page > 1 ? (
            <Link
              href={buildPageUrl(page - 1)}
              className="text-sm text-blue-600 hover:underline"
            >
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-xs text-gray-400">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={buildPageUrl(page + 1)}
              className="text-sm text-blue-600 hover:underline"
            >
              Next →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </>
  );
}

export default function PuzzlesPage({ searchParams }: Props) {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            ← Home
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-3">Puzzles</h1>
        </div>

        {/* Filters — client components, need Suspense boundary */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm space-y-4">
          <Suspense>
            <TacticFilter />
          </Suspense>
          <div className="border-t border-gray-100 pt-4">
            <Suspense>
              <OpeningFilter />
            </Suspense>
          </div>
        </div>

        {/* Puzzle grid — server component reading searchParams */}
        <Suspense
          fallback={
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-white border border-gray-200 rounded-lg animate-pulse" />
              ))}
            </div>
          }
        >
          <PuzzleGrid searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
