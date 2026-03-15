import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

/**
 * /puzzles/opponent-prediction
 *
 * Picks a random opponent-prediction puzzle and redirects to its canonical
 * URL so the puzzle is shareable. If no puzzles exist, renders a friendly
 * empty state instead of throwing.
 */
export default async function OpponentPredictionLandingPage() {
  const puzzles = await prisma.puzzle.findMany({
    where: { type: "opponent_prediction" },
    select: { id: true },
  });

  if (puzzles.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <p className="text-4xl mb-4">♟️</p>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            No Opponent Prediction Puzzles Yet
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            Run the seed script to load puzzles with themes like{" "}
            <code className="bg-gray-100 px-1 rounded">fork</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">pin</code>, or{" "}
            <code className="bg-gray-100 px-1 rounded">backRankMate</code>.
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center h-10 px-6 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Back to Home
          </a>
        </div>
      </main>
    );
  }

  const random = puzzles[Math.floor(Math.random() * puzzles.length)];
  redirect(`/puzzles/${random.id}`);
}

export const metadata = {
  title: "Opponent Prediction Puzzles — Cassandra Chess",
  description:
    "Predict what your opponent will play next. Train defensive awareness and tactical pattern recognition.",
};
