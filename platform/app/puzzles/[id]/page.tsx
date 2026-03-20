import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PuzzleShell from "./PuzzleShell";
import { primaryTactic } from "@/lib/tactics";
import { getGlobalAvgForTactic } from "@/lib/queries/weakTimeTactics";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}

export default async function PuzzlePage({ params, searchParams }: PageProps) {
  const [{ id }, { mode }] = await Promise.all([params, searchParams]);
  const puzzle = await prisma.puzzle.findUnique({ where: { id } });
  if (!puzzle) notFound();

  // Drill mode: compute 0.75× global avg as the countdown target
  let drillTargetMs: number | null = null;
  if (mode === "timed") {
    const tactic = primaryTactic(puzzle.themes);
    const globalAvg = await getGlobalAvgForTactic(tactic);
    if (globalAvg) drillTargetMs = Math.round(globalAvg * 0.75);
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              {mode === "timed" && (
                <span className="inline-block mr-2 text-orange-500 bg-orange-100 px-2 py-0.5 rounded-full normal-case font-bold">
                  ⏱ Drill
                </span>
              )}
              {puzzle.type === "retrograde"
                ? "Retrograde Analysis"
                : puzzle.type === "opponent_prediction"
                ? "Opponent Prediction"
                : puzzle.type === "move_ranking"
                ? "Move Ranking"
                : puzzle.type === "weakness_spot"
                ? "Weakness Spotting"
                : "Standard Puzzle"}
            </span>
            <h1 className="text-xl font-bold text-gray-900 mt-1">
              Puzzle #{puzzle.id}
            </h1>
          </div>
          <span className="text-sm text-gray-500 font-medium">
            Rating: <strong className="text-gray-800">{puzzle.rating}</strong>
          </span>
        </div>

        <PuzzleShell puzzle={puzzle} drillTargetMs={drillTargetMs} />

        {puzzle.themes && (
          <div className="mt-6 flex flex-wrap gap-2">
            {puzzle.themes.split(" ").map((t) => (
              <span
                key={t}
                className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return { title: `Puzzle ${id} — Cassandra` };
}
