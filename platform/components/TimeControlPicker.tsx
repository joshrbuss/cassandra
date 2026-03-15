"use client";

import { useEffect, useState } from "react";
import {
  TIME_CONTROLS,
  TIME_CONTROL_LABELS,
  type TimeControl,
} from "@/lib/benchmarks";

const STORAGE_KEY = "cassandra_time_control";

interface TimeControlPickerProps {
  onChange: (tc: TimeControl) => void;
}

export default function TimeControlPicker({ onChange }: TimeControlPickerProps) {
  const [selected, setSelected] = useState<TimeControl>("blitz");

  // Load persisted preference on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as TimeControl | null;
    if (stored && TIME_CONTROLS.includes(stored)) {
      setSelected(stored);
      onChange(stored);
    }
  }, [onChange]);

  function handleSelect(tc: TimeControl) {
    setSelected(tc);
    localStorage.setItem(STORAGE_KEY, tc);
    onChange(tc);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
        I play
      </span>
      {TIME_CONTROLS.map((tc) => (
        <button
          key={tc}
          onClick={() => handleSelect(tc)}
          className={`min-h-[36px] px-3 rounded-full text-xs font-semibold border transition-colors ${
            selected === tc
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600"
          }`}
        >
          {TIME_CONTROL_LABELS[tc]}
        </button>
      ))}
    </div>
  );
}
