import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getTrial } from "@/lib/trials/trialService";
import { prisma } from "@/lib/prisma";
import Trials from "./Trials";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TrialPage({ params }: Props) {
  const { id } = await params;
  const [session, trial] = await Promise.all([auth(), getTrial(id)]);

  if (!trial) notFound();

  // Pre-fetch puzzle data for all rounds
  const puzzleIds = trial.rounds.map((r) => r.puzzleId);
  const puzzles = await prisma.puzzle.findMany({
    where: { id: { in: puzzleIds } },
    select: { id: true, solvingFen: true, solutionMoves: true, themes: true },
  });

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-lg mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/trials" className="text-sm text-blue-600 hover:underline">
            ← The Trials
          </Link>
          <span className="text-xs text-gray-400 font-mono">{id.slice(0, 8)}</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <Trials
            initialTrial={trial}
            currentUserId={session?.userId ?? null}
            puzzles={puzzles}
          />
        </div>
      </div>
    </main>
  );
}
