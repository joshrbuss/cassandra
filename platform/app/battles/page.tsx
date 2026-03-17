import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { listOpenBattles } from "@/lib/battles/battleService";
import { prisma } from "@/lib/prisma";
import { playerDisplayName } from "@/lib/battles/types";
import CreateBattleButton from "./CreateBattleButton";

export const metadata: Metadata = {
  title: "The Trials",
  description: "Challenge another player to a head-to-head puzzle trial.",
};

export default async function BattlesPage() {
  const [session, openBattles, activeBattleCount] = await Promise.all([
    auth(),
    listOpenBattles(),
    prisma.battle.count({ where: { status: "active" } }),
  ]);

  const isSignedIn = !!session?.userId;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            ← Home
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-3">The Trials</h1>
          <p className="text-sm text-gray-500 mt-1">
            Race a friend through 5 puzzles — fastest correct solver wins each round.
          </p>
        </div>

        {/* Stats bar */}
        <div className="flex gap-6 mb-6 text-sm text-gray-500">
          <span>
            <span className="font-semibold text-gray-900">{activeBattleCount}</span> active{" "}
            {activeBattleCount === 1 ? "trial" : "trials"}
          </span>
          <span>
            <span className="font-semibold text-gray-900">{openBattles.length}</span> open{" "}
            {openBattles.length === 1 ? "open challenge" : "open challenges"}
          </span>
        </div>

        {/* Create battle */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-1">Start a challenge</h2>
          <p className="text-sm text-gray-500 mb-4">
            Get a shareable link and send it to a friend, or wait in the lobby for a random opponent.
          </p>
          {isSignedIn ? (
            <CreateBattleButton />
          ) : (
            <div className="text-sm text-gray-500">
              <Link href="/connect" className="text-blue-600 hover:underline font-medium">
                Connect your account
              </Link>{" "}
              to create a battle.
            </div>
          )}
        </div>

        {/* Open battles */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-3">Open challenges</h2>
          {openBattles.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No open challenges right now — create one above!</p>
          ) : (
            <ol className="space-y-2">
              {openBattles.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/battles/${b.id}`}
                    className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">⚔️</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {playerDisplayName(b.player1)}&apos;s challenge
                        </div>
                        <div className="text-xs text-gray-400">
                          Rating {b.player1.battleRating} •{" "}
                          {new Date(b.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                      Join →
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </main>
  );
}
