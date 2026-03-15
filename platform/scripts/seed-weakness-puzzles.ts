/**
 * Seeds 20 hand-authored Weakness Spotting puzzles.
 *
 * Categories covered:
 *   - Isolated pawns (WS001–WS005)
 *   - Exposed king / lack of pawn shelter (WS006–WS010)
 *   - Weak outpost squares (WS011–WS015)
 *   - Color complex weaknesses (WS016–WS020)
 *
 * Usage:
 *   npx tsx scripts/seed-weakness-puzzles.ts
 *
 * Safe to re-run — upserts by ID.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface WSSeed {
  id: string;
  /** The position shown to the user */
  solvingFen: string;
  rating: number;
  themes: string;
  weaknessSquares: string[];
  weaknessExplanation: string;
}

const SEEDS: WSSeed[] = [
  // ── Isolated Pawns ─────────────────────────────────────────────────────────

  {
    id: "WS001",
    solvingFen: "r2q1rk1/pp3ppp/2n5/3p4/3N4/2N5/PPP2PPP/R2Q1RK1 w - - 0 1",
    rating: 1000,
    themes: "endgame",
    weaknessSquares: ["d5"],
    weaknessExplanation:
      "The d5-pawn is isolated — there are no Black pawns on c or e files to defend it. White's knight on d4 can attack it directly, and rooks can pile up on the d-file. Black must constantly defend this long-term structural weakness.",
  },
  {
    id: "WS002",
    solvingFen: "r1bq1rk1/pp3ppp/2p5/2p5/4P3/2N2N2/PPP2PPP/R1BQ1RK1 w - - 0 1",
    rating: 1050,
    themes: "endgame",
    weaknessSquares: ["c5", "c6"],
    weaknessExplanation:
      "Black's c-pawns are doubled on c5 and c6. Doubled pawns on the same file cannot defend each other. White can blockade both with a single piece and target the rearmost pawn (c5) with rooks along the c-file.",
  },
  {
    id: "WS003",
    solvingFen: "r1bq1rk1/pp2ppbp/2np2p1/8/3NP3/2N1B3/PPP2PPP/R2Q1RK1 w - - 0 1",
    rating: 1100,
    themes: "endgame",
    weaknessSquares: ["d6"],
    weaknessExplanation:
      "The d6-pawn is backward — it sits on a half-open d-file and cannot advance because d5 is controlled by White's knight. Rooks can pile on d1 and d8 won't help. White's knight on d4 is perfectly placed to target it.",
  },
  {
    id: "WS004",
    solvingFen: "r2q1rk1/p1p2ppp/1p6/8/8/2N5/PPP2PPP/R2Q1RK1 w - - 0 1",
    rating: 1100,
    themes: "endgame",
    weaknessSquares: ["b6"],
    weaknessExplanation:
      "The b6-pawn is isolated and advanced with no support. It can't be defended by the a7 or c7 pawns. White's knight from c3 can maneuver to d5 or a5 to attack it, and a rook on b1 will win it.",
  },
  {
    id: "WS005",
    solvingFen: "r2q1rk1/ppp2pp1/2n4p/4p3/4P3/2N2N2/PPP2PPP/R2Q1RK1 w - - 0 1",
    rating: 1150,
    themes: "endgame",
    weaknessSquares: ["h6"],
    weaknessExplanation:
      "The h6-pawn is weak and exposed. It advanced without creating an escape square for the king (the g7 pawn still blocks), leaving h6 a target for White's heavy pieces. A rook on h1 or a bishop pointing at h6 wins material.",
  },

  // ── Exposed King / Lack of Pawn Shelter ────────────────────────────────────

  {
    id: "WS006",
    solvingFen: "r2q1rk1/ppp2pp1/2n5/4p3/4P3/2N2N2/PPP2PP1/R2Q1RK1 w - - 0 1",
    rating: 1200,
    themes: "kingsideAttack",
    weaknessSquares: ["h2"],
    weaknessExplanation:
      "The h2 square is unprotected — White's h-pawn is gone, leaving the king on g1 exposed to a rook or queen swinging to h-file. With ...Rh8 and ...Qh4, Black can launch a decisive kingside attack.",
  },
  {
    id: "WS007",
    solvingFen: "r1bq1rk1/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQ - 0 5",
    rating: 1200,
    themes: "kingsideAttack",
    weaknessSquares: ["e1"],
    weaknessExplanation:
      "White's king is stuck in the center on e1 while Black has castled to safety. The e-file is semi-open (after ...exd4 ideas) and White's development is incomplete. Black can open the center with ...d5, exposing the king to rook and queen attacks.",
  },
  {
    id: "WS008",
    solvingFen: "r2q1r1k/ppp2pp1/2n4p/4p3/4P3/2N2N2/PPP2PPP/R2Q1RK1 w - - 0 1",
    rating: 1250,
    themes: "kingsideAttack",
    weaknessSquares: ["g7", "h8"],
    weaknessExplanation:
      "Black's king has retreated to h8 with pawns on g7 and h6 but no f-pawn. The g7 square is a target for a bishop sacrifice (Bxg7 Kxg7), and the exposed h8 king is vulnerable to a queen check on h7 or a rook doubling.",
  },
  {
    id: "WS009",
    solvingFen: "r1bq1rk1/ppp3p1/2n1p2p/3p4/3PP3/2N2NB1/PPP2PPP/R2QK2R w KQ - 0 1",
    rating: 1300,
    themes: "kingsideAttack",
    weaknessSquares: ["h6"],
    weaknessExplanation:
      "Black pushed ...h6 to prevent Bg5 but created a hook. After g4–g5, the h6 pawn falls or the h-file opens. Combined with the uncastled White king showing kingside aggression, the h6-pawn becomes the lever for a direct attack.",
  },
  {
    id: "WS010",
    solvingFen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/3P1N2/PPP2PPP/RNBQKB1R w KQkq - 0 4",
    rating: 1250,
    themes: "kingsideAttack",
    weaknessSquares: ["f7"],
    weaknessExplanation:
      "f7 is Black's most vulnerable point in the opening — defended only by the king. With a bishop on c4 (or similar), the f7 square is under direct fire. Sacrifices like Ng5 or Bxf7+ can immediately exploit it.",
  },

  // ── Weak Outpost Squares ────────────────────────────────────────────────────

  {
    id: "WS011",
    solvingFen: "r2q1rk1/ppp1bppp/2np4/4p3/3NP3/2N5/PPP2PPP/R1BQ1RK1 w - - 0 1",
    rating: 1300,
    themes: "outpost",
    weaknessSquares: ["d5"],
    weaknessExplanation:
      "d5 is an ideal outpost for White's knight. Black has no pawn on c6 or e6 to challenge a knight placed there. A knight on d5 attacks c7 and f6 simultaneously, dominates the center, and cannot be dislodged by a pawn.",
  },
  {
    id: "WS012",
    solvingFen: "r1bq1rk1/pp3ppp/2np4/3Np3/4P3/2N5/PPP2PPP/R1BQ1RK1 w - - 0 1",
    rating: 1350,
    themes: "outpost",
    weaknessSquares: ["d6"],
    weaknessExplanation:
      "d6 is a classic 'hole' — a square that Black can no longer defend with a pawn (the c and e pawns have moved). White's knight on d5 threatens to hop to d6, where it sits permanently and dominates Black's position.",
  },
  {
    id: "WS013",
    solvingFen: "r1bq1rk1/pp2ppbp/2n3p1/3p4/3P1B2/2N2N2/PPP2PPP/R2Q1RK1 w - - 0 1",
    rating: 1350,
    themes: "outpost",
    weaknessSquares: ["e6"],
    weaknessExplanation:
      "e6 is a weak square for Black. The e7-pawn has been traded and the d-file is open. White's bishop on f4 eyes the e5 and e6 squares. A knight planted on e6 forks queen and rook, and there's no pawn left to kick it out.",
  },
  {
    id: "WS014",
    solvingFen: "r2q1rk1/pbp1bppp/1pn1pn2/3p4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w - - 0 1",
    rating: 1400,
    themes: "outpost",
    weaknessSquares: ["c5"],
    weaknessExplanation:
      "c5 is an outpost White can occupy permanently. Black's pawn structure (b6 and d5 but no a-pawn on c-file) means no Black pawn can ever recapture a piece placed on c5. A White knight on c5 attacks b7 and pressures the queenside.",
  },
  {
    id: "WS015",
    solvingFen: "r1bq1rk1/1pp2ppp/p1np4/4p3/2BPP3/2N2N2/PPP2PPP/R1BQ1RK1 w - - 0 1",
    rating: 1400,
    themes: "outpost",
    weaknessSquares: ["d5"],
    weaknessExplanation:
      "d5 is a powerful outpost. Black's c6-knight is the only defender of d5, but after Nd5 Nxd5 cxd5, White gets a passed d-pawn. Alternatively, White can maneuver Nd5 with no pawn to challenge it, creating a permanently dominant piece.",
  },

  // ── Color Complex Weaknesses ────────────────────────────────────────────────

  {
    id: "WS016",
    solvingFen: "r2q1rk1/pp2ppbp/2np2p1/8/3NP3/2N5/PPP1BPPP/R2Q1RK1 w - - 0 1",
    rating: 1450,
    themes: "endgame",
    weaknessSquares: ["f6", "h6"],
    weaknessExplanation:
      "Black's kingside light squares (f6, h6) are critically weak. The fianchettoed bishop on g7 doesn't cover f6 or h6. After the dark-squared bishop is traded, White's pieces flood in through these light-square holes. Maneuvers like Nf5 or Qh6 become very powerful.",
  },
  {
    id: "WS017",
    solvingFen: "r1bq1rk1/pp3p1p/2np2p1/4p3/4P3/2N2NP1/PPP2P1P/R1BQ1RK1 w - - 0 1",
    rating: 1500,
    themes: "endgame",
    weaknessSquares: ["f6", "h6"],
    weaknessExplanation:
      "After ...g6 and f2-f3, the dark squares around Black's king (f6 and h6) become permanently weak. With both sides' bishops gone, the squares f6 and h6 can never be defended by a bishop again. White's knights can plant themselves there unchallenged.",
  },
  {
    id: "WS018",
    solvingFen: "r2qr1k1/ppp2pp1/2n1p2p/8/3P4/2P2N2/PP3PPP/R1BQR1K1 w - - 0 1",
    rating: 1500,
    themes: "endgame",
    weaknessSquares: ["d6", "e5"],
    weaknessExplanation:
      "Black's central pawns have left gaping holes. The d6 and e5 squares are both weak — no Black pawn can recapture a piece that lands there. After Nd4–Ne6 or a bishop pin along the d-file, these dark-square weaknesses become decisive.",
  },
  {
    id: "WS019",
    solvingFen: "r1bq1rk1/pp3ppp/2np4/2p1p3/4P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 1",
    rating: 1550,
    themes: "endgame",
    weaknessSquares: ["d5"],
    weaknessExplanation:
      "Black's pawn on c5 and e5 creates a 'pawn chain' but leaves d5 as a permanent hole. No Black pawn can recapture on d5. White plants a knight there with Nd4–Nd5, dominating the position. The knight on d5 is more powerful than any Black piece.",
  },
  {
    id: "WS020",
    solvingFen: "2r2rk1/pp2ppbp/2n3p1/q2p4/3P1B2/2N2N2/PP2PPPP/R2Q1RK1 w - - 0 1",
    rating: 1600,
    themes: "endgame",
    weaknessSquares: ["e6", "f5"],
    weaknessExplanation:
      "The light squares e6 and f5 are severe weaknesses after Black traded the light-squared bishop. White's bishop on f4 controls both squares. A knight invasion to e6 wins material immediately, and f5 offers another permanent outpost. Black's dark-square bishop cannot defend light squares.",
  },
];

async function main() {
  console.log(`Seeding ${SEEDS.length} weakness_spot puzzles...`);

  for (const seed of SEEDS) {
    await prisma.puzzle.upsert({
      where: { id: seed.id },
      create: {
        id: seed.id,
        fen: seed.solvingFen, // no retrograde phase for weakness_spot
        solvingFen: seed.solvingFen,
        lastMove: "a1a1", // placeholder — no opponent move to display
        solutionMoves: "", // not applicable for weakness_spot
        rating: seed.rating,
        themes: seed.themes,
        type: "weakness_spot",
        weaknessSquares: JSON.stringify(seed.weaknessSquares),
        weaknessExplanation: seed.weaknessExplanation,
      },
      update: {
        solvingFen: seed.solvingFen,
        rating: seed.rating,
        themes: seed.themes,
        type: "weakness_spot",
        weaknessSquares: JSON.stringify(seed.weaknessSquares),
        weaknessExplanation: seed.weaknessExplanation,
      },
    });
    console.log(`  ✓ ${seed.id} — ${seed.weaknessSquares.join(", ")}`);
  }

  console.log("Done.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
