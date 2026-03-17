import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AnalysingClient from "./AnalysingClient";

export const metadata = {
  title: "Analysing your games — Cassandra Chess",
};

export default async function AnalysingPage() {
  const session = await auth();
  if (!session?.userId) redirect("/connect");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { lichessUsername: true, chessComUsername: true, elo: true },
  });

  if (!user?.lichessUsername && !user?.chessComUsername) {
    redirect("/connect");
  }

  const platform = user.chessComUsername ? "Chess.com" : "Lichess";

  // Pick a random library puzzle near the user's Elo for "while you wait"
  const elo = user.elo ?? 1200;
  const libraryPuzzle = await prisma.libraryPuzzle.findFirst({
    where: {
      rating: { gte: elo - 200, lte: elo + 200 },
    },
    select: { id: true, rating: true, themes: true },
    orderBy: { id: "asc" },
    skip: Math.floor(Math.random() * 20), // pseudo-random
  });

  return (
    <main className="min-h-screen bg-[#0e0e0e] flex flex-col items-center justify-center px-4 py-16">
      <AnalysingClient
        platform={platform}
        libraryPuzzleId={libraryPuzzle?.id ?? null}
        libraryPuzzleRating={libraryPuzzle?.rating ?? null}
      />
    </main>
  );
}
