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

  // Pick a random pre-seeded ScalesPosition
  const total = await prisma.scalesPosition.count();

  if (total === 0) {
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

  const skip = Math.floor(Math.random() * total);
  const position = await prisma.scalesPosition.findFirst({
    orderBy: { id: "asc" },
    skip,
  });

  if (!position) {
    return (
      <main className="min-h-screen bg-[#0e0e0e] flex flex-col items-center justify-center px-4 text-center">
        <p className="text-[#c8942a] text-3xl mb-4">&#9878;</p>
        <h1 className="text-xl font-bold text-white mb-2">No Positions Available</h1>
        <p className="text-gray-500 text-sm mb-6">
          The Scales needs pre-seeded positions to work. Try again later.
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
        { move: position.move1, cp: position.eval1 },
        { move: position.move2, cp: position.eval2 },
        { move: position.move3, cp: position.eval3 },
      ]}
    />
  );
}
