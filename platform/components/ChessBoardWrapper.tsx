"use client";

import { memo } from "react";
import { Chessboard } from "react-chessboard";

export interface PieceDropHandlerArgs {
  piece: { isSparePiece: boolean; position: string; pieceType: string };
  sourceSquare: string;
  targetSquare: string | null;
}

interface ChessBoardWrapperProps {
  position: string;
  /** Square styles, e.g. for highlighting the last move */
  squareStyles?: Record<string, React.CSSProperties>;
  /** Allow interactive drag-and-drop */
  interactive?: boolean;
  onPieceDrop?: (args: PieceDropHandlerArgs) => boolean;
  /** Called when user clicks a square (used by weakness-spot puzzles) */
  onSquareClick?: (args: { piece: unknown; square: string }) => void;
  boardOrientation?: "white" | "black";
}

export default memo(function ChessBoardWrapper({
  position,
  squareStyles,
  interactive = false,
  onPieceDrop,
  onSquareClick,
  boardOrientation = "white",
}: ChessBoardWrapperProps) {
  return (
    <Chessboard
      options={{
        position,
        boardOrientation,
        allowDragging: interactive,
        onPieceDrop,
        onSquareClick,
        squareStyles,
        boardStyle: {
          borderRadius: "4px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
        },
      }}
    />
  );
});
