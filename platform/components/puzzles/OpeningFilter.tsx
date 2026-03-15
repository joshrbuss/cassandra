"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";

const ELO_BANDS = [
  { label: "600–999", value: "600-999" },
  { label: "1000–1199", value: "1000-1199" },
  { label: "1200–1399", value: "1200-1399" },
  { label: "1400–1599", value: "1400-1599" },
  { label: "1600–1799", value: "1600-1799" },
  { label: "1800+", value: "1800-9999" },
];

export default function OpeningFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [eco, setEco] = useState(searchParams.get("eco") ?? "");
  const [eloRange, setEloRange] = useState(searchParams.get("elo_range") ?? "");

  const hasFilter = eco.trim() !== "" || eloRange !== "";

  function applyFilters(newEco: string, newEloRange: string) {
    const params = new URLSearchParams(searchParams.toString());
    const ecoVal = newEco.trim().toUpperCase();
    if (ecoVal) {
      params.set("eco", ecoVal);
    } else {
      params.delete("eco");
    }
    if (newEloRange) {
      params.set("elo_range", newEloRange);
    } else {
      params.delete("elo_range");
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function clearAll() {
    setEco("");
    setEloRange("");
    applyFilters("", "");
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Opening filter
        </span>
        {hasFilter && (
          <button onClick={clearAll} className="text-xs text-blue-600 hover:underline">
            Clear
          </button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {/* ECO code input */}
        <input
          type="text"
          value={eco}
          onChange={(e) => setEco(e.target.value)}
          onBlur={() => applyFilters(eco, eloRange)}
          onKeyDown={(e) => {
            if (e.key === "Enter") applyFilters(eco, eloRange);
          }}
          placeholder="ECO code (e.g. B90)"
          maxLength={3}
          className="flex-1 min-w-[140px] h-9 px-3 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-blue-400 placeholder-gray-400"
        />

        {/* ELO range selector */}
        <select
          value={eloRange}
          onChange={(e) => {
            setEloRange(e.target.value);
            applyFilters(eco, e.target.value);
          }}
          className="h-9 px-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-blue-400 text-gray-600 bg-white"
        >
          <option value="">All ratings</option>
          {ELO_BANDS.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
