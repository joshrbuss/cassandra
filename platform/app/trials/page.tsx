import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { listOpenTrials } from "@/lib/trials/trialService";
import { prisma } from "@/lib/prisma";
import { playerDisplayName } from "@/lib/trials/types";
import CreateTrialButton from "./CreateTrialButton";

export const metadata: Metadata = {
  title: "The Trials",
  description: "Challenge another player to a head-to-head puzzle trial.",
};

export default async function TrialsPage() {
  const [session, openTrials, activeTrialCount] = await Promise.all([
    auth(),
    listOpenTrials(),
    prisma.trial.count({ where: { status: "active" } }),
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
            <span className="font-semibold text-gray-900">{activeTrialCount}</span> active{" "}
            {activeTrialCount === 1 ? "trial" : "trials"}
          </span>
          <span>
            <span className="font-semibold text-gray-900">{openTrials.length}</span> open{" "}
            {openTrials.length === 1 ? "open challenge" : "open challenges"}
          </span>
        </div>

        {/* Create trial */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-1">Start a challenge</h2>
          <p className="text-sm text-gray-500 mb-4">
            Get a shareable link and send it to a friend, or wait in the lobby for a random opponent.
          </p>
          {isSignedIn ? (
            <CreateTrialButton />
          ) : (
            <div className="text-sm text-gray-500">
              <Link href="/connect" className="text-blue-600 hover:underline font-medium">
                Connect your account
              </Link>{" "}
              to create a trial.
            </div>
          )}
        </div>

        {/* Open trials */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-3">Open challenges</h2>
          {openTrials.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No open challenges right now — create one above!</p>
          ) : (
            <ol className="space-y-2">
              {openTrials.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/trials/${t.id}`}
                    className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">⚔️</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {playerDisplayName(t.player1)}&apos;s challenge
                        </div>
                        <div className="text-xs text-gray-400">
                          Rating {t.player1.trialRating} •{" "}
                          {new Date(t.createdAt).toLocaleTimeString([], {
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
