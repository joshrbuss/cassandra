"use client";

import { useState, useCallback } from "react";
import { Chess } from "chess.js";
import dynamic from "next/dynamic";
import Link from "next/link";
import { BoardSkeleton } from "@/components/Skeleton";

const ChessBoardWrapper = dynamic(
  () => import("@/components/ChessBoardWrapper"),
  { ssr: false, loading: () => <BoardSkeleton /> }
);

interface Props {
  puzzleId: string;
  fenBefore: string;
  fenAfter: string;
  moveSan: string;
  moveUci: string;
  explanation: string;
}

type Phase = "selecting" | "correct" | "wrong";

/**
 * Parse a FEN to extract captured material for each side.
 * Returns pieces that are missing from the starting position.
 */
function getCapturedPieces(fen: string): { white: string[]; black: string[] } {
  const board = fen.split(" ")[0];
  const starting: Record<string, number> = {
    P: 8, N: 2, B: 2, R: 2, Q: 1, K: 1,
    p: 8, n: 2, b: 2, r: 2, q: 1, k: 1,
  };
  const current: Record<string, number> = {};
  for (const ch of board) {
    if (/[pnbrqkPNBRQK]/.test(ch)) {
      current[ch] = (current[ch] ?? 0) + 1;
    }
  }

  const whiteCaptured: string[] = []; // black pieces that were captured
  const blackCaptured: string[] = []; // white pieces that were captured

  for (const [piece, count] of Object.entries(starting)) {
    const diff = count - (current[piece] ?? 0);
    for (let i = 0; i < diff; i++) {
      if (piece === piece.toUpperCase()) {
        // White piece captured by black
        blackCaptured.push(piece);
      } else {
        // Black piece captured by white
        whiteCaptured.push(piece);
      }
    }
  }

  return { white: whiteCaptured, black: blackCaptured };
}

const PIECE_UNICODE: Record<string, string> = {
  K: "\u2654", Q: "\u2655", R: "\u2656", B: "\u2657", N: "\u2658", P: "\u2659",
  k: "\u265A", q: "\u265B", r: "\u265C", b: "\u265D", n: "\u265E", p: "\u265F",
};

export default function EchoShell({
  puzzleId,
  fenBefore,
  fenAfter,
  moveSan,
  moveUci,
  explanation,
}: Props) {
  // Determine who just moved (it's the opposite of whose turn it is in fenAfter)
  const sideToMove = fenAfter.split(" ")[1]; // "w" or "b"
  const movedSide = sideToMove === "w" ? "black" : "white";
  const boardOrientation: "white" | "black" =
    movedSide === "white" ? "white" : "black";

  const [phase, setPhase] = useState<Phase>("selecting");
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
  const [userGuessFrom, setUserGuessFrom] = useState<string | null>(null);
  const [highlightSquares, setHighlightSquares] = useState<
    Record<string, React.CSSProperties>
  >({});
  const [showBeforePosition, setShowBeforePosition] = useState(false);

  const correctTo = moveUci.slice(2, 4);
  const correctFrom = moveUci.slice(0, 2);

  const captured = getCapturedPieces(fenAfter);

  /**
   * Step 1: User clicks a piece on the board (the piece that moved).
   * Step 2: User clicks the square it came FROM.
   */
  const handleSquareClick = useCallback(
    ({ square }: { piece: unknown; square: string }) => {
      if (phase !== "selecting") return;

      if (!selectedPiece) {
        // Step 1: select the piece that moved — must be on the "after" board
        const chess = new Chess(fenAfter);
        const piece = chess.get(square as never);
        if (!piece) return;
        // Only allow selecting pieces of the side that just moved
        const movedColor = movedSide === "white" ? "w" : "b";
        if (piece.color !== movedColor) return;

        setSelectedPiece(square);
        setHighlightSquares({
          [square]: { backgroundColor: "rgba(200, 148, 42, 0.5)" },
        });
      } else {
        // Step 2: user clicks where the piece came FROM
        setUserGuessFrom(square);

        const isCorrect =
          selectedPiece === correctTo && square === correctFrom;

        if (isCorrect) {
          setPhase("correct");
          setHighlightSquares({
            [correctFrom]: { backgroundColor: "rgba(76, 175, 80, 0.5)" },
            [correctTo]: { backgroundColor: "rgba(76, 175, 80, 0.5)" },
          });
          // Show the "before" position briefly
          setShowBeforePosition(true);
          setTimeout(() => setShowBeforePosition(false), 2000);
          // Credit streak
          fetch("/api/scales/complete", { method: "POST" }).catch(() => {});
        } else {
          setPhase("wrong");
          // Highlight the user's wrong guess in red, correct answer in green
          const styles: Record<string, React.CSSProperties> = {
            [correctFrom]: { backgroundColor: "rgba(76, 175, 80, 0.5)" },
            [correctTo]: { backgroundColor: "rgba(76, 175, 80, 0.5)" },
          };
          if (selectedPiece !== correctTo) {
            styles[selectedPiece] = {
              backgroundColor: "rgba(244, 67, 54, 0.4)",
            };
          }
          if (square !== correctFrom) {
            styles[square] = { backgroundColor: "rgba(244, 67, 54, 0.4)" };
          }
          setHighlightSquares(styles);
        }
      }
    },
    [phase, selectedPiece, correctTo, correctFrom, fenAfter, movedSide]
  );

  /** Reset selection without changing phase */
  function resetSelection() {
    setSelectedPiece(null);
    setUserGuessFrom(null);
    setHighlightSquares({});
  }

  const displayFen = showBeforePosition ? fenBefore : fenAfter;

  return (
    <div className="w-full min-h-screen bg-[#0e0e0e]">
      {/* Nav */}
      <nav className="bg-[#0e0e0e] border-b border-[#1a1a1a] px-4 py-3 flex items-center justify-between">
        <Link
          href="/home"
          className="text-sm font-medium text-[#c8942a] hover:text-[#e0ad3a] transition-colors"
        >
          &larr; Home
        </Link>
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-600">
          The Echo
        </span>
        <span className="w-16" />
      </nav>

      <div className="max-w-lg mx-auto px-4 pt-4 pb-6">
        {/* Instruction / Results panel */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-5 py-4 mb-4">
          {phase === "selecting" ? (
            <>
              <p className="text-white font-bold text-lg">
                What move was just played?
              </p>
              <p className="text-gray-500 text-sm mt-1">
                {!selectedPiece
                  ? "Click the piece that moved to reach this position."
                  : "Now click the square it came from."}
              </p>
              {selectedPiece && (
                <button
                  onClick={resetSelection}
                  className="mt-2 text-xs text-[#c8942a] hover:text-[#e0ad3a] transition-colors"
                >
                  Clear selection
                </button>
              )}
            </>
          ) : phase === "correct" ? (
            <>
              <p className="font-bold text-lg text-green-400">Correct!</p>
              <p className="text-gray-400 text-sm mt-1">
                The move was{" "}
                <span className="text-white font-semibold">{moveSan}</span>{" "}
                &mdash; {explanation}.
              </p>
              {showBeforePosition && (
                <p className="text-[10px] text-gray-500 mt-2 italic">
                  Showing the position before the move...
                </p>
              )}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    window.location.href = "/echo";
                  }}
                  className="flex-1 text-center bg-[#c8942a] text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#b5852a] transition-colors"
                >
                  Next position
                </button>
                <Link
                  href="/home"
                  className="flex-1 text-center bg-[#2a2a2a] text-gray-400 px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#333] hover:text-gray-300 transition-colors"
                >
                  Done
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="font-bold text-lg text-red-400">Not quite</p>
              <p className="text-gray-400 text-sm mt-1">
                The move was{" "}
                <span className="text-white font-semibold">{moveSan}</span>{" "}
                &mdash; {explanation}.
              </p>
              <p className="text-gray-500 text-xs mt-2">
                The correct squares are highlighted in green.
              </p>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    window.location.href = "/echo";
                  }}
                  className="flex-1 text-center bg-[#c8942a] text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#b5852a] transition-colors"
                >
                  Next position
                </button>
                <Link
                  href="/home"
                  className="flex-1 text-center bg-[#2a2a2a] text-gray-400 px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#333] hover:text-gray-300 transition-colors"
                >
                  Done
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Board label */}
        <div className="mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">
            {phase === "selecting"
              ? `${movedSide} just moved`
              : showBeforePosition
              ? "Before the move"
              : "Position after the move"}
          </p>
        </div>

        {/* Board */}
        <div className="w-full aspect-square">
          <ChessBoardWrapper
            position={displayFen}
            interactive={false}
            onSquareClick={handleSquareClick}
            boardOrientation={boardOrientation}
            squareStyles={highlightSquares}
          />
        </div>

        {/* Captured pieces tray */}
        <div className="mt-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Captured pieces
          </p>
          <div className="flex justify-between">
            <div className="flex items-center gap-0.5">
              <span className="text-[10px] text-gray-500 mr-1.5">White took:</span>
              {captured.white.length > 0 ? (
                captured.white.map((p, i) => (
                  <span key={i} className="text-lg leading-none">
                    {PIECE_UNICODE[p]}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-600">none</span>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              <span className="text-[10px] text-gray-500 mr-1.5">Black took:</span>
              {captured.black.length > 0 ? (
                captured.black.map((p, i) => (
                  <span key={i} className="text-lg leading-none">
                    {PIECE_UNICODE[p]}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-600">none</span>
              )}
            </div>
          </div>
        </div>

        {/* Tagline */}
        <div className="mt-3 text-center">
          <p className="text-xs text-gray-600">
            The Echo trains retrograde analysis — thinking backwards from the
            result to understand what happened.
          </p>
        </div>

        {/* Footer */}
        <footer className="mt-10 pt-6 border-t border-[#1a1a1a] text-center">
          <p className="text-xs text-gray-600">
            Cassandra Chess &middot; Positions from real games
          </p>
        </footer>
      </div>
    </div>
  );
}
