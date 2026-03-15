"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import MoveOption from "./MoveOption";
import { BoardSkeleton, OptionsSkeleton } from "./Skeleton";

const ChessBoardWrapper = dynamic(() => import("./ChessBoardWrapper"), {
  ssr: false,
  loading: () => <BoardSkeleton />,
});

interface MoveOptionData {
  uci: string;
  san: string;
  resultFen: string;
}

interface RetrogradePuzzleProps {
  puzzleId: string;
  /** FEN of the position the user sees (after opponent's last move) */
  solvingFen: string;
  /** Called when the user correctly identifies the last move */
  onCorrect: () => void;
  /** Called when the user skips the retrograde step */
  onSkip: () => void;
}

type OptionState = "idle" | "selected" | "correct" | "wrong";

export default function RetrogradePuzzle({
  puzzleId,
  solvingFen,
  onCorrect,
  onSkip,
}: RetrogradePuzzleProps) {
  const [options, setOptions] = useState<MoveOptionData[]>([]);
  const [correctUci, setCorrectUci] = useState<string>("");
  const [playerColor, setPlayerColor] = useState<"white" | "black">("white");
  const [optionStates, setOptionStates] = useState<OptionState[]>([]);
  const [phase, setPhase] = useState<"loading" | "question" | "wrong" | "correct">("loading");
  const [selectedUci, setSelectedUci] = useState<string | null>(null);

  const loadOptions = useCallback(async () => {
    setPhase("loading");
    try {
      const res = await fetch(`/api/puzzles/${puzzleId}/last-move-options`);
      if (!res.ok) throw new Error("Failed to load options");
      const data = await res.json();
      setOptions(data.options);
      setCorrectUci(data.correctUci);
      setPlayerColor(data.playerColor);
      setOptionStates(data.options.map(() => "idle" as OptionState));
      setPhase("question");
      setSelectedUci(null);
    } catch {
      setPhase("question");
    }
  }, [puzzleId]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  function handleSelect(idx: number) {
    if (phase !== "question") return;
    const chosen = options[idx];
    setSelectedUci(chosen.uci);

    if (chosen.uci === correctUci) {
      setOptionStates((prev) =>
        prev.map((s, i) => (i === idx ? "correct" : s))
      );
      setPhase("correct");
      setTimeout(onCorrect, 900);
    } else {
      setOptionStates((prev) =>
        prev.map((s, i) => {
          if (i === idx) return "wrong";
          if (options[i].uci === correctUci) return "correct";
          return s;
        })
      );
      setPhase("wrong");
    }
  }

  const colorLabel = playerColor === "white" ? "White" : "Black";

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-[500px] mx-auto">
      {/* Board */}
      <div className="w-full aspect-square max-w-[400px]">
        <ChessBoardWrapper
          position={solvingFen}
          boardOrientation={playerColor === "white" ? "black" : "white"}
        />
      </div>

      {/* Question prompt */}
      <div className="w-full text-center">
        <h2 className="text-lg font-semibold text-gray-800">
          What was <span className="text-blue-600">{colorLabel}</span>&apos;s last move?
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Select the move that reached this position.
        </p>
      </div>

      {/* Options */}
      {phase === "loading" ? (
        <div className="w-full">
          <OptionsSkeleton />
        </div>
      ) : (
        <div className="flex flex-col gap-3 w-full">
          {options.map((opt, idx) => (
            <MoveOption
              key={opt.uci}
              san={opt.san}
              uci={opt.uci}
              resultFen={opt.resultFen}
              state={optionStates[idx] ?? "idle"}
              onClick={() => handleSelect(idx)}
            />
          ))}
        </div>
      )}

      {/* Feedback + actions */}
      {phase === "wrong" && (
        <div className="w-full rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800">
          <p className="font-semibold mb-1">Not quite.</p>
          <p>
            The correct last move was{" "}
            <span className="font-mono font-bold">
              {options.find((o) => o.uci === correctUci)?.san ?? correctUci}
            </span>
            . The board shows the highlighted correct move above.
          </p>
          <div className="flex gap-3 mt-3">
            <button
              className="flex-1 min-h-[44px] rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
              onClick={loadOptions}
            >
              Try again
            </button>
            <button
              className="flex-1 min-h-[44px] rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              onClick={onSkip}
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {phase === "correct" && (
        <div className="w-full rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800">
          <p className="font-semibold">Correct! Unlocking the puzzle…</p>
        </div>
      )}

      {phase === "question" && (
        <button
          className="text-sm text-gray-400 hover:text-gray-600 underline"
          onClick={onSkip}
        >
          Skip this step
        </button>
      )}
    </div>
  );
}
