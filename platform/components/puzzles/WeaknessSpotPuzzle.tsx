"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { type Puzzle } from "@prisma/client";
import { BoardSkeleton } from "@/components/Skeleton";

const ChessBoardWrapper = dynamic(() => import("@/components/ChessBoardWrapper"), {
  ssr: false,
  loading: () => <BoardSkeleton />,
});

interface WeaknessSpotPuzzleProps {
  puzzle: Puzzle;
}

const MAX_SELECTIONS = 3;

// Square highlight colours
const SELECTED_STYLE: React.CSSProperties = { backgroundColor: "rgba(234, 179, 8, 0.55)" };
const CORRECT_HIT_STYLE: React.CSSProperties = { backgroundColor: "rgba(34, 197, 94, 0.55)" };
const CORRECT_MISS_STYLE: React.CSSProperties = { backgroundColor: "rgba(239, 68, 68, 0.55)" };
const WRONG_PICK_STYLE: React.CSSProperties = { backgroundColor: "rgba(156, 163, 175, 0.35)" };

type Result = "perfect" | "partial" | "wrong";

export default function WeaknessSpotPuzzle({ puzzle }: WeaknessSpotPuzzleProps) {
  const correctSquares: string[] = (() => {
    try {
      return JSON.parse(puzzle.weaknessSquares ?? "[]");
    } catch {
      return [];
    }
  })();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const boardOrientation: "white" | "black" =
    puzzle.solvingFen.split(" ")[1] === "w" ? "white" : "black";

  function handleSquareClick({ square }: { piece: unknown; square: string }) {
    if (submitted) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(square)) {
        next.delete(square);
      } else if (next.size < MAX_SELECTIONS) {
        next.add(square);
      }
      return next;
    });
  }

  function handleSubmit() {
    if (selected.size === 0) return;

    const hits = [...selected].filter((sq) => correctSquares.includes(sq));
    const allCorrect =
      hits.length === correctSquares.length &&
      selected.size === correctSquares.length;

    setResult(allCorrect ? "perfect" : hits.length > 0 ? "partial" : "wrong");
    setSubmitted(true);
  }

  function handleReset() {
    setSelected(new Set());
    setSubmitted(false);
    setResult(null);
  }

  // Build square styles for the board
  const squareStyles: Record<string, React.CSSProperties> = {};

  if (!submitted) {
    // Yellow for user selections
    for (const sq of selected) {
      squareStyles[sq] = SELECTED_STYLE;
    }
  } else {
    // After submit: colour-code each square
    const correctSet = new Set(correctSquares);
    for (const sq of selected) {
      squareStyles[sq] = correctSet.has(sq) ? CORRECT_HIT_STYLE : WRONG_PICK_STYLE;
    }
    for (const sq of correctSquares) {
      if (!selected.has(sq)) {
        squareStyles[sq] = CORRECT_MISS_STYLE; // missed correct square
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Instruction */}
      {!submitted && (
        <p className="text-sm text-gray-600">
          Click up to {MAX_SELECTIONS} square{MAX_SELECTIONS > 1 ? "s" : ""} to identify the
          positional weakness{correctSquares.length > 1 ? "es" : ""}. Click again to deselect.
        </p>
      )}

      {/* Result banner */}
      {result && (
        <div
          className={`px-4 py-3 rounded-xl text-sm font-semibold ${
            result === "perfect"
              ? "bg-green-50 text-green-700 border border-green-200"
              : result === "partial"
              ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {result === "perfect"
            ? `Correct! You found ${correctSquares.length === 1 ? "the" : "all"} ${correctSquares.length} weakness${correctSquares.length !== 1 ? "es" : ""}.`
            : result === "partial"
            ? "Partial — you spotted at least one weakness. The red squares show what you missed."
            : `Wrong. The weakness${correctSquares.length !== 1 ? "es" : ""} ${correctSquares.length !== 1 ? "were" : "was"} on ${correctSquares.join(", ")}.`}
        </div>
      )}

      {/* Board */}
      <div className="w-full">
        <ChessBoardWrapper
          position={puzzle.solvingFen}
          boardOrientation={boardOrientation}
          interactive={false}
          squareStyles={squareStyles}
          onSquareClick={submitted ? undefined : handleSquareClick}
        />
      </div>

      {/* Selection count */}
      {!submitted && (
        <p className="text-xs text-gray-400 text-center">
          {selected.size} / {MAX_SELECTIONS} squares selected
          {selected.size > 0 && (
            <> — <span className="font-mono">{[...selected].join(", ")}</span></>
          )}
        </p>
      )}

      {/* Explanation — revealed after submit */}
      {submitted && puzzle.weaknessExplanation && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Explanation
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">
            {puzzle.weaknessExplanation}
          </p>
        </div>
      )}

      {/* Legend */}
      {submitted && (
        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block bg-green-400 opacity-70" />
            Correct square you found
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block bg-red-400 opacity-70" />
            Correct square you missed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block bg-gray-300" />
            Incorrect selection
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={selected.size === 0}
            className="flex-1 h-10 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Submit
          </button>
        ) : (
          <button
            onClick={handleReset}
            className="flex-1 h-10 rounded-full border border-gray-300 text-gray-600 text-sm font-semibold hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
