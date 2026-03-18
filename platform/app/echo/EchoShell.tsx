"use client";

import { useState, useCallback, useMemo } from "react";
import { Chess } from "chess.js";
import dynamic from "next/dynamic";
import Link from "next/link";
import { BoardSkeleton } from "@/components/Skeleton";
import type { PieceDropHandlerArgs } from "@/components/ChessBoardWrapper";

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

  const whiteCaptured: string[] = []; // black pieces that were captured by white
  const blackCaptured: string[] = []; // white pieces that were captured by black

  for (const [piece, count] of Object.entries(starting)) {
    const diff = count - (current[piece] ?? 0);
    for (let i = 0; i < diff; i++) {
      if (piece === piece.toUpperCase()) {
        blackCaptured.push(piece);
      } else {
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
  // Determine who just moved (opposite of whose turn it is in fenAfter)
  const sideToMove = fenAfter.split(" ")[1]; // "w" or "b"
  const movedSide = sideToMove === "w" ? "black" : "white";
  const boardOrientation: "white" | "black" =
    movedSide === "white" ? "white" : "black";

  const [phase, setPhase] = useState<Phase>("selecting");
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
  const [highlightSquares, setHighlightSquares] = useState<
    Record<string, React.CSSProperties>
  >({});
  const [showBeforePosition, setShowBeforePosition] = useState(false);

  const correctTo = moveUci.slice(2, 4);
  const correctFrom = moveUci.slice(0, 2);

  const captured = getCapturedPieces(fenAfter);

  /**
   * Compute plausible "from" squares for a piece on the given square.
   * Uses fenBefore to find all legal moves that land on `toSquare`.
   */
  const getRetrogradeHints = useCallback(
    (toSquare: string): string[] => {
      try {
        const chess = new Chess(fenBefore);
        const allMoves = chess.moves({ verbose: true });

        // Moves that land on this square (piece moved here)
        const movesToSquare = allMoves
          .filter((m) => m.to === toSquare)
          .map((m) => m.from);

        if (movesToSquare.length > 0) {
          return movesToSquare;
        }

        // Piece was already on this square — show its legal destinations
        // as plausible "could have come from" squares so every piece
        // displays dots and the answer isn't revealed
        const piece = chess.get(toSquare as never);
        if (piece) {
          return allMoves
            .filter((m) => m.from === toSquare)
            .map((m) => m.to);
        }

        return [];
      } catch {
        return [];
      }
    },
    [fenBefore]
  );

  /** Show selection highlight + retrograde from-square dots */
  function showSelectionHints(square: string) {
    const hints = getRetrogradeHints(square);
    const styles: Record<string, React.CSSProperties> = {
      [square]: { backgroundColor: "rgba(200, 148, 42, 0.6)" },
    };
    for (const from of hints) {
      styles[from] = {
        background:
          "radial-gradient(circle, rgba(200, 148, 42, 0.85) 25%, transparent 25%)",
        borderRadius: "50%",
      };
    }
    setHighlightSquares(styles);
  }

  /** Check the user's guess and update phase */
  function checkGuess(pieceSquare: string, fromSquare: string) {
    const isCorrect =
      pieceSquare === correctTo && fromSquare === correctFrom;

    if (isCorrect) {
      setPhase("correct");
      setHighlightSquares({
        [correctFrom]: { backgroundColor: "rgba(76, 175, 80, 0.5)" },
        [correctTo]: { backgroundColor: "rgba(76, 175, 80, 0.5)" },
      });
      setShowBeforePosition(true);
      setTimeout(() => setShowBeforePosition(false), 2000);
      fetch("/api/scales/complete", { method: "POST" }).catch(() => {});
    } else {
      setPhase("wrong");
      const styles: Record<string, React.CSSProperties> = {
        [correctFrom]: { backgroundColor: "rgba(76, 175, 80, 0.5)" },
        [correctTo]: { backgroundColor: "rgba(76, 175, 80, 0.5)" },
      };
      if (pieceSquare !== correctTo) {
        styles[pieceSquare] = {
          backgroundColor: "rgba(244, 67, 54, 0.4)",
        };
      }
      if (fromSquare !== correctFrom) {
        styles[fromSquare] = { backgroundColor: "rgba(244, 67, 54, 0.4)" };
      }
      setHighlightSquares(styles);
    }
  }

  /** Click-to-move: first click selects piece, second click picks from-square */
  const handleSquareClick = useCallback(
    ({ square }: { piece: unknown; square: string }) => {
      if (phase !== "selecting") return;

      if (!selectedPiece) {
        // Step 1: select the piece that moved
        const chess = new Chess(fenAfter);
        const piece = chess.get(square as never);
        if (!piece) return;
        const movedColor = movedSide === "white" ? "w" : "b";
        if (piece.color !== movedColor) return;

        setSelectedPiece(square);
        showSelectionHints(square);
      } else {
        if (square === selectedPiece) {
          // Clicked same square — deselect
          setSelectedPiece(null);
          setHighlightSquares({});
          return;
        }

        // Check if clicking another piece of the same color — reselect
        const chess = new Chess(fenAfter);
        const piece = chess.get(square as never);
        const movedColor = movedSide === "white" ? "w" : "b";
        if (piece && piece.color === movedColor) {
          setSelectedPiece(square);
          showSelectionHints(square);
          return;
        }

        // Step 2: user clicks where the piece came FROM
        checkGuess(selectedPiece, square);
        setSelectedPiece(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase, selectedPiece, correctTo, correctFrom, fenAfter, fenBefore, movedSide]
  );

  /** Drag-and-drop: user drags piece from its current square to where it came from */
  function handleDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (phase !== "selecting" || !targetSquare) return false;

    // Verify the dragged piece belongs to the side that just moved
    const chess = new Chess(fenAfter);
    const piece = chess.get(sourceSquare as never);
    if (!piece) return false;
    const movedColor = movedSide === "white" ? "w" : "b";
    if (piece.color !== movedColor) return false;

    checkGuess(sourceSquare, targetSquare);
    setSelectedPiece(null);
    return true;
  }

  /** Reset selection without changing phase */
  function resetSelection() {
    setSelectedPiece(null);
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
                  ? "Click or drag the piece that moved, then show where it came from."
                  : "Now click the square it came from, or drag it there."}
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
            interactive={phase === "selecting"}
            onPieceDrop={handleDrop}
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
