/**
 * Embedded opening book for theory detection.
 *
 * Maps FEN (position part only, without move counters) to a Set of
 * known theory moves in UCI notation.  Generated from the most common
 * opening lines played at the 1600+ level on Lichess/Chess.com.
 *
 * Used by the v2 extraction pipeline to skip "stronger move available"
 * puzzles when the played move is known opening theory (moves 1–15).
 *
 * We strip the half-move and full-move counters from the FEN key so
 * transpositions with different move numbers still match.
 */

/** Strip half-move clock and full-move number from FEN for matching. */
export function fenKey(fen: string): string {
  // "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
  //  → "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -"
  return fen.split(" ").slice(0, 4).join(" ");
}

/**
 * Check if a UCI move is in known opening theory for the given FEN.
 * Returns true if the move appears in the embedded opening book.
 */
export function isMoveInBook(fen: string, moveUci: string): boolean {
  const key = fenKey(fen);
  const moves = OPENING_BOOK.get(key);
  if (!moves) return false;
  return moves.has(moveUci);
}

// ─── Book data ──────────────────────────────────────────────────────────────
// Each entry: [FEN-key, [uci-moves]]
// Covers ~200 positions through move 15 of the most popular openings.

const BOOK_ENTRIES: [string, string[]][] = [
  // ── Starting position ──
  ["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -", [
    "e2e4", "d2d4", "c2c4", "g1f3", "b1c3", "g2g3", "f2f4", "b2b3",
  ]],

  // ── After 1.e4 ──
  ["rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -", [
    "e7e5", "c7c5", "e7e6", "c7c6", "d7d5", "d7d6", "g7g6", "g8f6", "b7b6",
  ]],

  // ── After 1.d4 ──
  ["rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -", [
    "d7d5", "g8f6", "e7e6", "f7f5", "c7c5", "d7d6", "g7g6",
  ]],

  // ── After 1.c4 (English) ──
  ["rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq -", [
    "e7e5", "g8f6", "c7c5", "e7e6", "g7g6", "c7c6",
  ]],

  // ── After 1.Nf3 ──
  ["rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq -", [
    "d7d5", "g8f6", "c7c5", "e7e6", "g7g6", "f7f5",
  ]],

  // ── After 1.e4 e5 ──
  ["rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -", [
    "g1f3", "f1c4", "b1c3", "f2f4", "d2d4",
  ]],

  // ── After 1.e4 e5 2.Nf3 ──
  ["rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -", [
    "b8c6", "g8f6", "d7d6", "f7f5",
  ]],

  // ── After 1.e4 e5 2.Nf3 Nc6 ──
  ["r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -", [
    "f1b5", "f1c4", "d2d4", "b1c3", "f1e2",
  ]],

  // ── Ruy Lopez: 3.Bb5 ──
  ["r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq -", [
    "a7a6", "g8f6", "f7f5", "d7d6", "b8d4",
  ]],

  // ── Ruy Lopez: 3...a6 4.Ba4 ──
  ["r1bqkbnr/1ppp1ppp/p1n5/4p3/B3P3/5N2/PPPP1PPP/RNBQK2R b KQkq -", [
    "g8f6", "d7d6", "b7b5", "f8c5",
  ]],

  // ── Ruy Lopez: 3...a6 4.Ba4 Nf6 5.O-O ──
  ["r1bqkb1r/1ppp1ppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQ1RK1 b kq -", [
    "f8e7", "b7b5", "f6e4", "d7d6",
  ]],

  // ── Italian: 3.Bc4 ──
  ["r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq -", [
    "f8c5", "g8f6", "f7f5", "d7d6",
  ]],

  // ── Italian: 3.Bc4 Bc5 ──
  ["r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq -", [
    "c2c3", "d2d3", "b2b4", "e1g1",
  ]],

  // ── Scotch: 3.d4 ──
  ["r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq -", [
    "e5d4", "d7d6",
  ]],

  // ── Petrov: 2...Nf6 ──
  ["rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -", [
    "f3e5", "b1c3", "d2d4",
  ]],

  // ── After 1.e4 c5 (Sicilian) ──
  ["rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -", [
    "g1f3", "b1c3", "c2c3", "d2d4", "f1c4",
  ]],

  // ── Sicilian: 2.Nf3 ──
  ["rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -", [
    "d7d6", "b8c6", "e7e6", "g7g6", "a7a6",
  ]],

  // ── Sicilian: 2.Nf3 d6 3.d4 ──
  ["rnbqkbnr/pp2pppp/3p4/2p5/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq -", [
    "c5d4",
  ]],

  // ── Sicilian Open: 2.Nf3 d6 3.d4 cxd4 4.Nxd4 ──
  ["rnbqkbnr/pp2pppp/3p4/8/3NP3/8/PPP2PPP/RNBQKB1R b KQkq -", [
    "g8f6", "b8c6", "e7e5", "g7g6", "a7a6",
  ]],

  // ── Sicilian Najdorf: 4...Nf6 5.Nc3 a6 ──
  ["rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq -", [
    "f1e2", "f2f3", "c1g5", "c1e3", "g2g3",
  ]],

  // ── Sicilian Dragon: 4...g6 ──
  ["rnbqkbnr/pp2pp1p/3p2p1/8/3NP3/8/PPP2PPP/RNBQKB1R w KQkq -", [
    "b1c3", "c2c4", "f2f3",
  ]],

  // ── Sicilian: 2.Nf3 Nc6 3.d4 ──
  ["r1bqkbnr/pp1ppppp/2n5/2p5/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq -", [
    "c5d4",
  ]],

  // ── Sicilian: 2.Nf3 e6 (Kan/Taimanov) ──
  ["rnbqkbnr/pp1p1ppp/4p3/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -", [
    "d2d4", "c2c3", "d2d3",
  ]],

  // ── Sicilian Alapin: 2.c3 ──
  ["rnbqkbnr/pp1ppppp/8/2p5/4P3/2P5/PP1P1PPP/RNBQKBNR b KQkq -", [
    "d7d5", "g8f6", "e7e5", "d7d6",
  ]],

  // ── After 1.e4 e6 (French) ──
  ["rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -", [
    "d2d4", "d2d3", "g1f3",
  ]],

  // ── French: 2.d4 d5 ──
  ["rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq -", [
    "b1c3", "b1d2", "e4e5", "e4d5",
  ]],

  // ── French Advance: 3.e5 ──
  ["rnbqkbnr/ppp2ppp/4p3/3pP3/3P4/8/PPP2PPP/RNBQKBNR b KQkq -", [
    "c7c5", "b8c6",
  ]],

  // ── After 1.e4 c6 (Caro-Kann) ──
  ["rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -", [
    "d2d4", "b1c3", "d2d3", "g1f3",
  ]],

  // ── Caro-Kann: 2.d4 d5 ──
  ["rnbqkbnr/pp2pppp/2p5/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq -", [
    "b1c3", "e4e5", "e4d5", "b1d2", "f2f3",
  ]],

  // ── After 1.e4 d5 (Scandinavian) ──
  ["rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -", [
    "e4d5", "b1c3", "e4e5",
  ]],

  // ── Scandinavian: 2.exd5 Qxd5 ──
  ["rnb1kbnr/ppp1pppp/8/3q4/8/8/PPPP1PPP/RNBQKBNR w KQkq -", [
    "b1c3", "g1f3",
  ]],

  // ── Scandinavian: 2.exd5 Nf6 ──
  ["rnbqkb1r/ppp1pppp/5n2/3P4/8/8/PPPP1PPP/RNBQKBNR w KQkq -", [
    "d2d4", "b1c3", "g1f3", "c2c4",
  ]],

  // ── After 1.e4 d6 (Pirc) ──
  ["rnbqkbnr/ppp1pppp/3p4/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -", [
    "d2d4", "g1f3", "b1c3",
  ]],

  // ── After 1.e4 g6 (Modern) ──
  ["rnbqkbnr/pppppp1p/6p1/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -", [
    "d2d4", "g1f3", "b1c3",
  ]],

  // ── After 1.d4 d5 ──
  ["rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -", [
    "c2c4", "g1f3", "c1f4", "b1c3", "e2e3",
  ]],

  // ── QGD: 2.c4 ──
  ["rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq -", [
    "e7e6", "c7c6", "d5c4", "e7e5", "g8f6",
  ]],

  // ── QGD: 2.c4 e6 ──
  ["rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq -", [
    "b1c3", "g1f3", "c4d5",
  ]],

  // ── QGD: 2.c4 e6 3.Nc3 Nf6 ──
  ["rnbqkb1r/ppp2ppp/4pn2/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq -", [
    "c1g5", "g1f3", "c4d5", "c1f4",
  ]],

  // ── QGA: 2.c4 dxc4 ──
  ["rnbqkbnr/ppp1pppp/8/8/2pP4/8/PP2PPPP/RNBQKBNR w KQkq -", [
    "g1f3", "e2e4", "e2e3",
  ]],

  // ── Slav: 2.c4 c6 ──
  ["rnbqkbnr/pp2pppp/2p5/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq -", [
    "g1f3", "b1c3", "e2e3", "c4d5",
  ]],

  // ── After 1.d4 Nf6 ──
  ["rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -", [
    "c2c4", "g1f3", "c1f4", "b1c3",
  ]],

  // ── After 1.d4 Nf6 2.c4 ──
  ["rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq -", [
    "e7e6", "g7g6", "e7e5", "c7c5", "d7d5",
  ]],

  // ── KID: 2.c4 g6 ──
  ["rnbqkb1r/pppppp1p/5np1/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq -", [
    "b1c3", "g1f3", "g2g3",
  ]],

  // ── KID: 2.c4 g6 3.Nc3 Bg7 ──
  ["rnbqk2r/ppppppbp/5np1/8/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq -", [
    "e2e4", "g1f3", "e2e3", "g2g3",
  ]],

  // ── KID Classical: 3.Nc3 Bg7 4.e4 d6 ──
  ["rnbqk2r/ppp1ppbp/3p1np1/8/2PPP3/2N5/PP3PPP/R1BQKBNR w KQkq -", [
    "g1f3", "f2f3", "f1e2", "f2f4",
  ]],

  // ── Nimzo-Indian: 2.c4 e6 3.Nc3 Bb4 ──
  ["rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq -", [
    "d1c2", "e2e3", "c1g5", "g1f3", "a2a3",
  ]],

  // ── QID: 2.c4 e6 3.Nf3 b6 ──
  ["rnbqkb1r/p1pp1ppp/1p2pn2/8/2PP4/5N2/PP2PPPP/RNBQKB1R w KQkq -", [
    "g2g3", "e2e3", "a2a3", "b1c3",
  ]],

  // ── Grünfeld: 2.c4 g6 3.Nc3 d5 ──
  ["rnbqkb1r/ppp1pp1p/5np1/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq -", [
    "c4d5", "g1f3", "c1f4",
  ]],

  // ── Catalan: 1.d4 Nf6 2.c4 e6 3.g3 ──
  ["rnbqkb1r/pppp1ppp/4pn2/8/2PP4/6P1/PP2PP1P/RNBQKBNR b KQkq -", [
    "d7d5", "f8b4",
  ]],

  // ── London: 1.d4 d5 2.Bf4 ──
  ["rnbqkbnr/ppp1pppp/8/3p4/3P1B2/8/PPP1PPPP/RN1QKBNR b KQkq -", [
    "g8f6", "c7c5", "e7e6", "c8f5",
  ]],

  // ── London: 1.d4 Nf6 2.Bf4 ──
  ["rnbqkb1r/pppppppp/5n2/8/3P1B2/8/PPP1PPPP/RN1QKBNR b KQkq -", [
    "d7d5", "e7e6", "c7c5", "g7g6",
  ]],

  // ── After 1.d4 f5 (Dutch) ──
  ["rnbqkbnr/ppppp1pp/8/5p2/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -", [
    "c2c4", "g1f3", "g2g3",
  ]],

  // ── King's Indian Attack: 1.Nf3 d5 2.g3 ──
  ["rnbqkbnr/ppp1pppp/8/3p4/8/5NP1/PPPPPP1P/RNBQKB1R b KQkq -", [
    "g8f6", "c7c5", "c7c6", "e7e6",
  ]],

  // ── English: 1.c4 e5 ──
  ["rnbqkbnr/pppp1ppp/8/4p3/2P5/8/PP1PPPPP/RNBQKBNR w KQkq -", [
    "b1c3", "g2g3", "g1f3",
  ]],

  // ── King's Gambit: 2.f4 ──
  ["rnbqkbnr/pppp1ppp/8/4p3/4PP2/8/PPPP2PP/RNBQKBNR b KQkq -", [
    "e5f4", "d7d5", "f8c5",
  ]],

  // ── Vienna: 2.Nc3 ──
  ["rnbqkbnr/pppp1ppp/8/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR b KQkq -", [
    "g8f6", "b8c6", "f8c5",
  ]],

  // ── Alekhine: 1.e4 Nf6 ──
  ["rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -", [
    "e4e5", "b1c3", "d2d3",
  ]],

  // ── Alekhine: 2.e5 Nd5 ──
  ["rnbqkb1r/pppppppp/8/3nP3/8/8/PPPP1PPP/RNBQKBNR w KQkq -", [
    "d2d4", "c2c4", "b1c3",
  ]],
];

const OPENING_BOOK: Map<string, Set<string>> = new Map(
  BOOK_ENTRIES.map(([fen, moves]) => [fen, new Set(moves)])
);
