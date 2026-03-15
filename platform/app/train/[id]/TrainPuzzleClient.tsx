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
  boardOrientation: "white" | "black";
}

export default function TrainPuzzleClient({
  puzzleId,
  solvingFen,
  solutionMoves,
  boardOrientation,
}: TrainPuzzleClientProps) {
  return (
    <StandardPuzzle
      puzzleId={puzzleId}
      solvingFen={solvingFen}
      solutionMoves={solutionMoves}
      boardOrientation={boardOrientation}
    />
  );
}
