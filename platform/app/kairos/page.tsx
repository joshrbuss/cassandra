import type { Metadata } from "next";
import { selectKairosPuzzles } from "@/lib/kairos/puzzleSelection";
import KairosShell from "./KairosShell";

export const metadata: Metadata = {
  title: "Kairos — How Do You Actually Think at the Board?",
  description:
    "20 positions. We measure how long you think, what you choose, and what that reveals about how you make decisions under pressure. No account needed.",
  openGraph: {
    title: "Kairos — How Do You Actually Think at the Board?",
    description:
      "20 positions. We measure how long you think, what you choose, and what that reveals about how you make decisions under pressure.",
    url: "https://cassandrachess.com/kairos",
  },
};

export default function KairosPage() {
  // Generate a session ID and select puzzles server-side
  const sessionId = `kairos-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const puzzles = selectKairosPuzzles(sessionId);

  return <KairosShell puzzles={puzzles} sessionId={sessionId} />;
}
