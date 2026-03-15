"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const ChessBoardWrapper = dynamic(() => import("./ChessBoardWrapper"), {
  ssr: false,
});

interface MoveOptionProps {
  san: string;
  uci: string;
  resultFen: string;
  state: "idle" | "selected" | "correct" | "wrong";
  onClick: () => void;
}

const stateStyles: Record<MoveOptionProps["state"], string> = {
  idle: "bg-white border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-800",
  selected: "bg-blue-50 border-blue-500 text-blue-900",
  correct: "bg-green-50 border-green-500 text-green-900",
  wrong: "bg-red-50 border-red-400 text-red-800 opacity-70",
};

export default function MoveOption({
  san,
  resultFen,
  state,
  onClick,
}: MoveOptionProps) {
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <div className="relative">
      <button
        className={`w-full min-h-[44px] px-4 py-3 rounded-lg border-2 text-left font-mono text-sm font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 ${stateStyles[state]}`}
        onClick={onClick}
        disabled={state === "correct" || state === "wrong"}
        onMouseEnter={() => setPreviewOpen(true)}
        onMouseLeave={() => setPreviewOpen(false)}
        onTouchStart={() => setPreviewOpen((v) => !v)}
      >
        <span className="flex items-center gap-2">
          {state === "correct" && <span>✓</span>}
          {state === "wrong" && <span>✗</span>}
          {san}
        </span>
      </button>

      {/* Board preview — desktop: hover; mobile: tap toggle */}
      {previewOpen && (
        <div
          className="absolute z-50 left-full ml-3 top-0 shadow-2xl rounded-lg overflow-hidden bg-white border border-gray-200"
          style={{ width: 180 }}
          onMouseEnter={() => setPreviewOpen(true)}
          onMouseLeave={() => setPreviewOpen(false)}
        >
          <div style={{ width: 180, height: 180 }}>
            <ChessBoardWrapper position={resultFen} />
          </div>
          <p className="text-center text-xs text-gray-500 py-1">After {san}</p>
        </div>
      )}
    </div>
  );
}
