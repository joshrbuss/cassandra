"use client";

import dynamic from "next/dynamic";
import { BoardSkeleton } from "@/components/Skeleton";

const TrainPuzzleShell = dynamic(() => import("./TrainPuzzleShell"), {
  ssr: false,
  loading: () => <BoardSkeleton />,
});

interface TrainPuzzleClientProps {
  puzzleId: string;
  solvingFen: string;
  solutionMoves: string;
  opponentUsername?: string | null;
  gameDate?: string | null;
  gameResult?: string | null;
  moveNumber?: number | null;
  evalCp?: number | null;
  playerColor?: string | null;
  gameUrl?: string | null;
  stripeLink?: string | null;
  footerText?: string;
}

export default function TrainPuzzleClient(props: TrainPuzzleClientProps) {
  return <TrainPuzzleShell {...props} />;
}
