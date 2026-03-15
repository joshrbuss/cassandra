"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TACTIC_LABELS, type Tactic } from "@/lib/tactics";
import { formatTime } from "@/lib/benchmarks";
import type { UserStatsResponse, TacticStat } from "@/app/api/users/[id]/stats/route";

interface TacticBreakdownTableProps {
  userId: string;
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: 4 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div
                className="h-4 bg-gray-100 rounded animate-pulse"
                style={{ animationDelay: `${i * 60 + j * 20}ms`, width: j === 0 ? "80px" : "48px" }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function TacticBreakdownTable({ userId }: TacticBreakdownTableProps) {
  const [stats, setStats] = useState<UserStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/users/${encodeURIComponent(userId)}/stats`)
      .then((r) => r.json())
      .then((d: UserStatsResponse) => setStats(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (!loading && (!stats || stats.by_tactic.length === 0)) {
    return (
      <p className="text-sm text-gray-400 italic">
        No tactic data yet — solve some puzzles to see your breakdown.
      </p>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">Tactic Breakdown</p>
        {stats && (
          <p className="text-xs text-gray-400">
            Overall accuracy:{" "}
            <span className="font-semibold text-gray-600">{stats.overall_accuracy}%</span>
          </p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
              <th className="px-4 py-2 text-left">Tactic</th>
              <th className="px-4 py-2 text-right">Attempted</th>
              <th className="px-4 py-2 text-right">Accuracy</th>
              <th className="px-4 py-2 text-right">Avg Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <SkeletonRows />
            ) : (
              stats!.by_tactic.map((row: TacticStat) => {
                const isWeakest =
                  stats!.weakest_tactic === row.tactic && row.attempted >= 5;
                return (
                  <tr
                    key={row.tactic}
                    className={`${isWeakest ? "border-l-2 border-red-400 bg-red-50" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">
                          {TACTIC_LABELS[row.tactic as Tactic] ?? row.tactic}
                        </span>
                        {isWeakest && (
                          <Link
                            href={`/puzzles?tactics=${row.tactic}`}
                            className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full hover:bg-red-200 transition-colors font-medium"
                          >
                            Train this weakness →
                          </Link>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 tabular-nums">
                      {row.attempted}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span
                        className={`font-semibold ${
                          row.accuracy >= 80
                            ? "text-green-600"
                            : row.accuracy >= 60
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {row.accuracy}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 font-mono tabular-nums text-xs">
                      {row.avg_time_ms > 0 ? formatTime(row.avg_time_ms) : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
