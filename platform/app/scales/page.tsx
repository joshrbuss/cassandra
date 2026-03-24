import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ScalesShell from "./ScalesShell";

export const metadata = {
  title: "The Scales — Rank the Top 3 Moves",
  description:
    "See a position, find the top 3 moves, and rank them from best to worst. The Scales trains the skill that separates good players from great ones.",
};

export default async function ScalesPage() {
  const session = await auth();
  if (!session?.userId) redirect("/connect");

  // Pick a random pre-seeded ScalesPosition (single query via raw SQL for speed)
  const positions = await prisma.$queryRaw<{ id: string; fen: string; move1: string; move2: string; move3: string; eval1: number; eval2: number; eval3: number; pv1: string | null; pv2: string | null; pv3: string | null; hasSacrifice: boolean }[]>`
    SELECT * FROM ScalesPosition ORDER BY RANDOM() LIMIT 1
  `;
  const position = positions[0] ?? null;

  if (!position) {
    return (
      <main className="min-h-screen bg-[#0e0e0e] flex flex-col items-center justify-center px-4 text-center">
        <p className="text-[#c8942a] text-3xl mb-4">&#9878;</p>
        <h1 className="text-xl font-bold text-white mb-2">No Positions Available</h1>
        <p className="text-gray-500 text-sm mb-6">
          The Scales needs pre-seeded positions to work. Run the seeder script first.
        </p>
      </main>
    );
  }

  return (
    <ScalesShell
      puzzleId={position.id}
      fen={position.fen}
      rating={0}
      engineTop3={[
        { move: position.move1, cp: position.eval1, pv: position.pv1 ?? undefined },
        { move: position.move2, cp: position.eval2, pv: position.pv2 ?? undefined },
        { move: position.move3, cp: position.eval3, pv: position.pv3 ?? undefined },
      ]}
      hasSacrifice={position.hasSacrifice}
    />
  );
}
