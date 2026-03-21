"use client";

import { useState, useEffect } from "react";

/**
 * Animated chessboard that cycles through a blunder scenario.
 * Pure CSS/DOM — no external chess library needed for display.
 */

const LIGHT = "#f0d9b5";
const DARK = "#b58863";

// A realistic position after 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7
// Black just played Nf6?? and the winning move is d5+
const PIECES: Record<string, string> = {
  a1: "\u2656", b1: "\u2658", c1: "\u2657", d1: "\u2655", f1: "\u2656",
  g1: "\u2654", a2: "\u2659", b2: "\u2659", c2: "\u2659", d2: "\u2659",
  f2: "\u2659", g2: "\u2659", h2: "\u2659",
  a4: "\u2657", // Ba4
  f3: "\u2658", // Nf3
  e4: "\u2659", // e4
  // Black
  a8: "\u265C", b8: "\u265E", c8: "\u265D", d8: "\u265B", e8: "\u265A",
  h8: "\u265C",
  a6: "\u265F", b7: "\u265F", c7: "\u265F", d7: "\u265F",
  f7: "\u265F", g7: "\u265F", h7: "\u265F",
  e5: "\u265F", // e5
  c6: "\u265E", // Nc6
  e7: "\u265D", // Be7
  f6: "\u265E", // Nf6
};

const PHASES = [
  { label: "Analysing your game...", highlight: null, highlightColor: "" },
  { label: "Blunder found: Nf6??", highlight: "f6", highlightColor: "rgba(255,50,50,0.45)" },
  { label: "Cassandra: d5+ was the win", highlight: "d5", highlightColor: "rgba(100,200,80,0.45)" },
] as const;

export default function HeroBoard() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPhase((p) => (p + 1) % PHASES.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  const current = PHASES[phase];
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const ranks = [8, 7, 6, 5, 4, 3, 2, 1];

  return (
    <div className="rounded-[14px] overflow-hidden shadow-2xl bg-[#0e0e0e] border border-[#2a2a2a]">
      {/* Board */}
      <div className="grid grid-cols-8 aspect-square">
        {ranks.map((rank) =>
          files.map((file) => {
            const sq = `${file}${rank}`;
            const isLight = (files.indexOf(file) + rank) % 2 === 1;
            const piece = PIECES[sq];
            const isHighlighted = current.highlight === sq;

            return (
              <div
                key={sq}
                className="relative flex items-center justify-center select-none"
                style={{
                  backgroundColor: isHighlighted ? current.highlightColor : isLight ? LIGHT : DARK,
                  transition: "background-color 0.5s ease",
                }}
              >
                {piece && (
                  <span className="text-[clamp(1.2rem,4vw,2.2rem)] leading-none drop-shadow-sm">
                    {piece}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Label overlay */}
      <div className="px-4 py-3 flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{
            backgroundColor: phase === 0 ? "#c8942a" : phase === 1 ? "#ff4444" : "#66cc55",
            animation: phase === 0 ? "pulse 1.5s ease-in-out infinite" : "none",
          }}
        />
        <p className="text-sm text-gray-300 font-medium truncate" style={{ fontFamily: "Georgia, serif" }}>
          {current.label}
        </p>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
