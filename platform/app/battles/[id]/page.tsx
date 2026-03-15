import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getBattle } from "@/lib/battles/battleService";
import { prisma } from "@/lib/prisma";
import BattleArena from "./BattleArena";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BattlePage({ params }: Props) {
  const { id } = await params;
  const [session, battle] = await Promise.all([auth(), getBattle(id)]);

  if (!battle) notFound();

  // Pre-fetch puzzle data for all rounds
  const puzzleIds = battle.rounds.map((r) => r.puzzleId);
  const puzzles = await prisma.puzzle.findMany({
    where: { id: { in: puzzleIds } },
    select: { id: true, solvingFen: true, solutionMoves: true, themes: true },
  });

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-lg mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/battles" className="text-sm text-blue-600 hover:underline">
            ← Battles
          </Link>
          <span className="text-xs text-gray-400 font-mono">{id.slice(0, 8)}</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <BattleArena
            initialBattle={battle}
            currentUserId={session?.userId ?? null}
            puzzles={puzzles}
          />
        </div>
      </div>
    </main>
  );
}
