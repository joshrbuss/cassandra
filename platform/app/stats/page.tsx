import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@/auth";
import TacticBreakdownTableWrapper from "./TacticBreakdownTableWrapper";
import SlowSpotsPanelWrapper from "./SlowSpotsPanelWrapper";

export const metadata: Metadata = {
  title: "Your Stats",
  description: "See your tactic accuracy and solve time breakdown.",
};

export default async function StatsPage() {
  const session = await auth();
  // Real userId for authenticated users — ensures attempts recorded by the
  // attempt route (which also uses session auth) are queryable here.
  const userId = session?.userId ?? null;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            ← Home
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-3">Your Stats</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tactic accuracy and solve time across all your puzzles.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="w-full rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          }
        >
          <TacticBreakdownTableWrapper userId={userId} />
        </Suspense>

        <Suspense fallback={<div className="h-32 rounded-xl border border-orange-200 bg-orange-50 animate-pulse mt-6" />}>
          <div className="mt-6">
            <SlowSpotsPanelWrapper userId={userId} />
          </div>
        </Suspense>

        <div className="mt-8 text-center">
          <Link
            href="/puzzles"
            className="inline-flex items-center justify-center h-10 px-6 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors text-sm"
          >
            Practice puzzles →
          </Link>
        </div>
      </div>
    </main>
  );
}
