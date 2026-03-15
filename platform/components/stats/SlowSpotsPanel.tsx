"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TACTIC_LABELS, type Tactic } from "@/lib/tactics";
import { formatTime } from "@/lib/benchmarks";
import type { SlowTacticsResponse } from "@/app/api/users/[id]/slow-tactics/route";
import type { SlowTactic } from "@/lib/queries/weakTimeTactics";

interface SlowSpotsPanelProps {
  userId: string;
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0"
        >
          <div
            className="h-4 bg-gray-100 rounded animate-pulse"
            style={{ width: "90px", animationDelay: `${i * 60}ms` }}
          />
          <div
            className="h-4 bg-gray-100 rounded animate-pulse"
            style={{ width: "120px", animationDelay: `${i * 60 + 20}ms` }}
          />
          <div
            className="h-8 bg-gray-100 rounded-full animate-pulse"
            style={{ width: "80px", animationDelay: `${i * 60 + 40}ms` }}
          />
        </div>
      ))}
    </>
  );
}

export default function SlowSpotsPanel({ userId }: SlowSpotsPanelProps) {
  const [data, setData] = useState<SlowTactic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/users/${encodeURIComponent(userId)}/slow-tactics`)
      .then((r) => r.json())
      .then((d: SlowTacticsResponse) => setData(d.slow_tactics ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (!loading && data.length === 0) return null;

  return (
    <div className="w-full overflow-hidden rounded-xl border border-orange-200 bg-white shadow-sm">
      <div className="px-4 py-3 border-b border-orange-100 bg-orange-50 flex items-center gap-2">
        <span className="text-orange-500 text-base">⏱</span>
        <p className="text-sm font-semibold text-orange-800">Slow Spots</p>
        <p className="text-xs text-orange-600 ml-auto">
          Tactics where you&apos;re 2× slower than average
        </p>
      </div>

      {loading ? (
        <SkeletonRows />
      ) : (
        <div className="divide-y divide-gray-50">
          {data.map((row) => (
            <div
              key={row.tactic}
              className="flex items-center gap-3 px-4 py-3 flex-wrap"
            >
              {/* Tactic name */}
              <span className="font-medium text-gray-800 text-sm min-w-[80px]">
                {TACTIC_LABELS[row.tactic as Tactic] ?? row.tactic}
              </span>

              {/* Time comparison */}
              <div className="flex items-center gap-2 text-xs flex-1">
                <span className="text-orange-600 font-mono font-semibold">
                  {formatTime(row.userAvg)}
                </span>
                <span className="text-gray-400">vs</span>
                <span className="text-gray-500 font-mono">
                  {formatTime(row.globalAvg)} avg
                </span>
                <span className="text-orange-500 font-semibold">
                  ({(row.userAvg / row.globalAvg).toFixed(1)}×)
                </span>
              </div>

              {/* Drill CTA */}
              <Link
                href={`/puzzles?tactics=${row.tactic}&mode=timed`}
                className="flex-shrink-0 text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 px-3 py-1.5 rounded-full font-semibold transition-colors"
              >
                Drill this →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
