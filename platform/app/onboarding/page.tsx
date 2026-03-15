import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import OnboardingClient from "./OnboardingClient";

export const metadata = {
  title: "Get Started — Cassandra Chess",
};

export default async function OnboardingPage() {
  const session = await auth();

  let lichessUsername: string | null = null;
  let chessComUsername: string | null = null;

  if (session?.userId) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { lichessUsername: true, chessComUsername: true },
    });
    lichessUsername = user?.lichessUsername ?? null;
    chessComUsername = user?.chessComUsername ?? null;
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Connect your account
          </h1>
          <p className="text-gray-500">
            Enter your Lichess or Chess.com username to get puzzles from your own games.
          </p>
        </div>

        <OnboardingClient
          lichessUsername={lichessUsername}
          chessComUsername={chessComUsername}
        />

        <p className="text-center text-xs text-gray-400 mt-8">
          Already set up?{" "}
          <a href="/dashboard" className="text-blue-600 hover:underline">
            Go to your dashboard →
          </a>
        </p>
      </div>
    </main>
  );
}
