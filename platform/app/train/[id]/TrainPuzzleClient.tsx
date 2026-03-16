"use client";

import dynamic from "next/dynamic";
import { BoardSkeleton } from "@/components/Skeleton";

const StandardPuzzle = dynamic(() => import("@/components/StandardPuzzle"), {
  ssr: false,
  loading: () => <BoardSkeleton />,
});

interface TrainPuzzleClientProps {
  puzzleId: string;
  solvingFen: string;
  solutionMoves: string;
}

export default function TrainPuzzleClient({
  puzzleId,
  solvingFen,
  solutionMoves,
}: TrainPuzzleClientProps) {
  // Derive orientation from the FEN's active-color field (second space-separated token).
  // "b" → black to move → flip board; anything else → white.
  const boardOrientation: "white" | "black" =
    solvingFen.split(" ")[1] === "b" ? "black" : "white";

  return (
    <StandardPuzzle
      puzzleId={puzzleId}
      solvingFen={solvingFen}
      solutionMoves={solutionMoves}
      boardOrientation={boardOrientation}
    />
  );
}
