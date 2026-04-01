import type { Metadata } from "next";
import AnalyseShell from "./AnalyseShell";

export const metadata: Metadata = {
  title: "Game Analysis",
  description: "Full game review with move-by-move analysis, eval graph, and move classifications.",
};

export default function AnalysePage() {
  return <AnalyseShell />;
}
