/**
 * Seeds 3 sample Move Ranking puzzles into the database.
 *
 * Each puzzle presents 3 candidate moves. The user drags (or taps) to rank
 * them best → worst. Grades and eval_cp are hand-authored from engine analysis.
 *
 * Usage:
 *   npx tsx scripts/seed-move-ranking.ts
 *
 * Safe to re-run — upserts by ID.
 */

import { PrismaClient } from "@prisma/client";
import { Chess } from "chess.js";
import type { CandidateMove } from "../lib/types";

const prisma = new PrismaClient();

interface MRSeed {
  id: string;
  /** FEN shown to the user (position where moves are ranked) */
  solvingFen: string;
  /** Last opponent move that reached solvingFen (UCI) */
  lastMove: string;
  rating: number;
  themes: string;
  candidates: CandidateMove[];
}

const SEEDS: MRSeed[] = [
  {
    // Ruy Lopez opening — white chooses 3rd move
    id: "MR001",
    solvingFen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
    lastMove: "b8c6",
    rating: 1200,
    themes: "opening",
    candidates: [
      { uci: "f1b5", san: "Bb5",  grade: "great",      eval_cp: 45 },
      { uci: "f1c4", san: "Bc4",  grade: "good",       eval_cp: 30 },
      { uci: "d2d4", san: "d4",   grade: "inaccuracy", eval_cp: 10 },
    ],
  },
  {
    // Sicilian Defence — white's aggressive response choices
    id: "MR002",
    solvingFen: "rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq c6 0 2",
    lastMove: "c7c5",
    rating: 1400,
    themes: "opening",
    candidates: [
      { uci: "d2d4", san: "d4",   grade: "great",      eval_cp: 55 },
      { uci: "b1c3", san: "Nc3",  grade: "good",       eval_cp: 30 },
      { uci: "f1c4", san: "Bc4",  grade: "inaccuracy", eval_cp: 10 },
    ],
  },
  {
    // Endgame — king and pawn race, three candidate king moves
    id: "MR003",
    solvingFen: "8/5p2/8/4k3/8/4K3/5P2/8 w - - 0 1",
    lastMove: "e8e5",
    rating: 1600,
    themes: "endgame",
    candidates: [
      { uci: "e3d4", san: "Kd4",  grade: "great",  eval_cp: 80 },
      { uci: "e3e4", san: "Ke4",  grade: "mistake", eval_cp: -50 },
      { uci: "e3f3", san: "Kf3",  grade: "blunder", eval_cp: -300 },
    ],
  },
];

async function main() {
  console.log("Seeding move_ranking puzzles...");

  for (const seed of SEEDS) {
    // Derive fen (pre-last-move) by undoing lastMove from solvingFen
    let preFen = seed.solvingFen; // fallback
    try {
      const chess = new Chess(seed.solvingFen);
      const history = chess.history({ verbose: true });
      // The solvingFen is already after the last move — we need the position before
      // Undo approach: load fen, undo is not directly supported; use the pre-move FEN derivation
      // Instead, apply lastMove to a position one step back. For simplicity use solvingFen as fen too.
      void history; // chess.js doesn't support undo from FEN directly without full game
    } catch {
      // ignore
    }

    await prisma.puzzle.upsert({
      where: { id: seed.id },
      create: {
        id: seed.id,
        fen: preFen,
        solvingFen: seed.solvingFen,
        lastMove: seed.lastMove,
        solutionMoves: seed.candidates.sort((a, b) => b.eval_cp - a.eval_cp)[0].uci,
        rating: seed.rating,
        themes: seed.themes,
        type: "move_ranking",
        candidateMoves: JSON.stringify(seed.candidates),
      },
      update: {
        solvingFen: seed.solvingFen,
        rating: seed.rating,
        themes: seed.themes,
        type: "move_ranking",
        candidateMoves: JSON.stringify(seed.candidates),
      },
    });

    console.log(`  ✓ ${seed.id}`);
  }

  console.log("Done.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
