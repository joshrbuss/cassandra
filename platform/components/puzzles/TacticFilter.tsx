"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { TACTICS, TACTIC_LABELS, parseTactics, type Tactic } from "@/lib/tactics";

const STORAGE_KEY = "tactic_filter_prefs";

interface TacticFilterProps {
  /** Called in addition to URL update — useful for parent to react immediately */
  onChange?: (selected: Tactic[]) => void;
}

export default function TacticFilter({ onChange }: TacticFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialise from URL; fall back to localStorage
  const [selected, setSelected] = useState<Set<Tactic>>(() => {
    const fromUrl = parseTactics(searchParams.get("tactics"));
    if (fromUrl.length > 0) return new Set(fromUrl);
    return new Set<Tactic>();
  });

  // On mount, restore localStorage if URL has nothing
  useEffect(() => {
    const fromUrl = parseTactics(searchParams.get("tactics"));
    if (fromUrl.length === 0) {
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Tactic[];
        const valid = stored.filter((t): t is Tactic => TACTICS.includes(t as Tactic));
        if (valid.length > 0) {
          const next = new Set<Tactic>(valid);
          setSelected(next);
          pushToUrl(next);
          onChange?.(valid);
        }
      } catch {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pushToUrl(next: Set<Tactic>) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.size === 0) {
      params.delete("tactics");
    } else {
      params.set("tactics", [...next].join(","));
    }
    // Reset to page 1 on filter change
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggle(tactic: Tactic) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tactic)) {
        next.delete(tactic);
      } else {
        next.add(tactic);
      }
      const arr = [...next];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
      pushToUrl(next);
      onChange?.(arr);
      return next;
    });
  }

  function clearAll() {
    setSelected(new Set());
    localStorage.removeItem(STORAGE_KEY);
    pushToUrl(new Set());
    onChange?.([]);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Filter by tactic
        </span>
        {selected.size > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-blue-600 hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Horizontally scrollable on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {TACTICS.map((tactic) => {
          const active = selected.has(tactic);
          return (
            <button
              key={tactic}
              onClick={() => toggle(tactic)}
              className={`flex-shrink-0 min-h-[36px] px-3 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap ${
                active
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600"
              }`}
            >
              {TACTIC_LABELS[tactic]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
