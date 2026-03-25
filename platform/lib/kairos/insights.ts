import type {
  KairosPuzzleResult,
  KairosAggregateMetrics,
  KairosInsight,
  KairosProfile,
  KairosCategory,
  InsightKey,
} from "./types";

// ─── Compute aggregate metrics ──────────────────────────────────────────────

export function computeMetrics(results: KairosPuzzleResult[]): KairosAggregateMetrics {
  const total = results.length;
  const correct = results.filter((r) => r.move_correct).length;

  const avgTime = total > 0 ? results.reduce((s, r) => s + r.solve_time_seconds, 0) / total : 0;

  // By category
  const byCat = new Map<KairosCategory, KairosPuzzleResult[]>();
  for (const r of results) {
    if (!byCat.has(r.kairos_category)) byCat.set(r.kairos_category, []);
    byCat.get(r.kairos_category)!.push(r);
  }

  const avgTimeByCategory: Partial<Record<KairosCategory, number>> = {};
  const accuracyByCategory: Partial<Record<KairosCategory, { correct: number; total: number; pct: number }>> = {};

  for (const [cat, rs] of byCat) {
    avgTimeByCategory[cat] = rs.reduce((s, r) => s + r.solve_time_seconds, 0) / rs.length;
    const c = rs.filter((r) => r.move_correct).length;
    accuracyByCategory[cat] = { correct: c, total: rs.length, pct: Math.round((c / rs.length) * 100) };
  }

  // By tactic subtype
  const byTactic: Record<string, { correct: number; total: number }> = {};
  for (const r of results) {
    if (r.tactic_subtype === "none") continue;
    if (!byTactic[r.tactic_subtype]) byTactic[r.tactic_subtype] = { correct: 0, total: 0 };
    byTactic[r.tactic_subtype].total++;
    if (r.move_correct) byTactic[r.tactic_subtype].correct++;
  }

  // Defensive
  const defResults = results.filter((r) => r.is_defensive);
  const defCorrect = defResults.filter((r) => r.move_correct).length;

  // Quiet
  const quietResults = results.filter((r) => r.kairos_category === "quiet");
  const quietCorrect = quietResults.filter((r) => r.move_correct).length;

  // Tactical vs quiet avg time
  const tacticalResults = results.filter((r) => r.has_tactic);
  const avgTimeTactical = tacticalResults.length > 0
    ? tacticalResults.reduce((s, r) => s + r.solve_time_seconds, 0) / tacticalResults.length
    : 0;
  const avgTimeQuiet = quietResults.length > 0
    ? quietResults.reduce((s, r) => s + r.solve_time_seconds, 0) / quietResults.length
    : 0;

  // By sequence length
  const bySeqLen: Record<number, { correct: number; total: number }> = {};
  for (const r of results) {
    if (!r.has_tactic) continue;
    const len = r.sequence_length;
    if (!bySeqLen[len]) bySeqLen[len] = { correct: 0, total: 0 };
    bySeqLen[len].total++;
    if (r.move_correct) bySeqLen[len].correct++;
  }

  return {
    total_puzzles: total,
    correct_count: correct,
    accuracy_pct: total > 0 ? Math.round((correct / total) * 100) : 0,
    avg_solve_time: Math.round(avgTime * 10) / 10,
    avg_time_by_category: avgTimeByCategory,
    accuracy_by_category: accuracyByCategory,
    accuracy_by_tactic: byTactic,
    defensive_accuracy: {
      correct: defCorrect,
      total: defResults.length,
      pct: defResults.length > 0 ? Math.round((defCorrect / defResults.length) * 100) : 0,
    },
    quiet_accuracy: {
      correct: quietCorrect,
      total: quietResults.length,
      pct: quietResults.length > 0 ? Math.round((quietCorrect / quietResults.length) * 100) : 0,
    },
    avg_time_tactical: Math.round(avgTimeTactical * 10) / 10,
    avg_time_quiet: Math.round(avgTimeQuiet * 10) / 10,
    accuracy_by_sequence_length: bySeqLen,
  };
}

// ─── Generate headline insight ──────────────────────────────────────────────

export function generateInsight(metrics: KairosAggregateMetrics): KairosInsight {
  const {
    avg_time_tactical,
    avg_time_quiet,
    accuracy_pct,
    accuracy_by_tactic,
    defensive_accuracy,
    correct_count,
    total_puzzles,
    avg_solve_time,
  } = metrics;

  // Clock drain: quiet time > 2x tactical time
  if (avg_time_quiet > 0 && avg_time_tactical > 0 && avg_time_quiet > avg_time_tactical * 2) {
    return {
      key: "clock_drain",
      headline: "You're burning clock in calm positions.",
      body: `You spent ${avg_time_quiet.toFixed(0)}s on average in positions with no winning move, and ${avg_time_tactical.toFixed(0)}s when there was one. That's backwards — and it's the pattern we see in 33% of games where players lose on time from a winning position.`,
      shareStat: `${avg_time_quiet.toFixed(0)}s avg in calm positions vs ${avg_time_tactical.toFixed(0)}s in tactical ones`,
      shareNumber: `${avg_time_quiet.toFixed(0)}s`,
    };
  }

  // Missed tactics: < 50% accuracy on tactical puzzles
  const tacticalTotal = Object.values(accuracy_by_tactic).reduce((s, t) => s + t.total, 0);
  const tacticalCorrect = Object.values(accuracy_by_tactic).reduce((s, t) => s + t.correct, 0);
  const tacticalMissRate = tacticalTotal > 0 ? 1 - tacticalCorrect / tacticalTotal : 0;
  if (tacticalMissRate > 0.5 && tacticalTotal >= 3) {
    // Find highest miss subtype
    let worstSubtype = "";
    let worstMissRate = 0;
    for (const [subtype, { correct, total }] of Object.entries(accuracy_by_tactic)) {
      if (total >= 2) {
        const rate = 1 - correct / total;
        if (rate > worstMissRate) {
          worstMissRate = rate;
          worstSubtype = subtype.replace(/_/g, " ");
        }
      }
    }
    return {
      key: "missed_tactics",
      headline: `You found ${tacticalCorrect} of ${tacticalTotal} winning moves.`,
      body: `Your miss rate on ${worstSubtype || "tactical"} positions was higher than other patterns — that's your clearest tactical gap from this session.`,
      shareStat: `Found ${tacticalCorrect}/${tacticalTotal} winning moves`,
      shareNumber: `${tacticalCorrect}/${tacticalTotal}`,
    };
  }

  // Missed defense: > 60% miss rate
  if (defensive_accuracy.total >= 2 && defensive_accuracy.pct < 40) {
    const missed = defensive_accuracy.total - defensive_accuracy.correct;
    return {
      key: "missed_defense",
      headline: `You missed ${missed} of ${defensive_accuracy.total} opponent threats.`,
      body: "Spotting what your opponent is planning before calculating your own ideas is a separate skill — and one of the most undertrained at every level.",
      shareStat: `Missed ${missed}/${defensive_accuracy.total} defensive positions`,
      shareNumber: `${missed}/${defensive_accuracy.total}`,
    };
  }

  // Flat timing: solve times consistent across types (< 1.3x ratio)
  if (
    avg_time_quiet > 0 &&
    avg_time_tactical > 0 &&
    avg_time_quiet / avg_time_tactical < 1.3 &&
    avg_time_tactical / avg_time_quiet < 1.3
  ) {
    return {
      key: "flat_timing",
      headline: `You think at ${avg_solve_time.toFixed(0)}s per position regardless of type.`,
      body: "That consistency can be a strength or a sign that you're not adjusting your calculation depth to what the position needs. Quick decisions in calm positions save your clock for the moments that matter.",
      shareStat: `${avg_solve_time.toFixed(0)}s average per position — consistent across all types`,
      shareNumber: `${avg_solve_time.toFixed(0)}s`,
    };
  }

  // Default: strong overall
  return {
    key: "strong_overall",
    headline: `${correct_count} of ${total_puzzles} correct — ${accuracy_pct}% accuracy.`,
    body: "Solid performance across position types. Your recognition is working — the next step is seeing this in your own games, where the patterns are specific to the positions you actually reach.",
    shareStat: `${accuracy_pct}% accuracy across 20 positions`,
    shareNumber: `${accuracy_pct}%`,
  };
}

// ─── Generate full profile (Layer 2) ────────────────────────────────────────

export function generateProfile(metrics: KairosAggregateMetrics): KairosProfile {
  const { accuracy_by_category, avg_time_by_category, accuracy_by_tactic, accuracy_by_sequence_length } = metrics;

  // Speed profile
  const speed = {
    avg_tactical: avg_time_by_category.single_tactic ?? avg_time_by_category.short_sequence ?? 0,
    avg_quiet: avg_time_by_category.quiet ?? 0,
    avg_defensive: avg_time_by_category.defensive ?? 0,
    avg_deep: avg_time_by_category.deep_sequence ?? 0,
  };

  // Accuracy profile
  const tacTotal =
    (accuracy_by_category.single_tactic?.total ?? 0) +
    (accuracy_by_category.short_sequence?.total ?? 0) +
    (accuracy_by_category.deep_sequence?.total ?? 0);
  const tacCorrect =
    (accuracy_by_category.single_tactic?.correct ?? 0) +
    (accuracy_by_category.short_sequence?.correct ?? 0) +
    (accuracy_by_category.deep_sequence?.correct ?? 0);

  const byTactic: Record<string, string> = {};
  for (const [sub, { correct, total }] of Object.entries(accuracy_by_tactic)) {
    byTactic[sub] = `${correct}/${total}`;
  }

  const accuracy = {
    tactical_rate: `${tacCorrect}/${tacTotal}`,
    defensive_rate: `${metrics.defensive_accuracy.correct}/${metrics.defensive_accuracy.total}`,
    quiet_rate: `${metrics.quiet_accuracy.correct}/${metrics.quiet_accuracy.total}`,
    by_tactic: byTactic,
  };

  // Calculation depth profile
  const single = accuracy_by_sequence_length[1] ?? { correct: 0, total: 0 };
  const seq2 = accuracy_by_sequence_length[2] ?? { correct: 0, total: 0 };
  const seq3 = accuracy_by_sequence_length[3] ?? { correct: 0, total: 0 };
  const seq4 = accuracy_by_sequence_length[4] ?? { correct: 0, total: 0 };

  const singlePct = single.total > 0 ? Math.round((single.correct / single.total) * 100) : 0;
  const seqTotal = seq2.total + seq3.total + seq4.total;
  const seqCorrect = seq2.correct + seq3.correct + seq4.correct;
  const seqPct = seqTotal > 0 ? Math.round((seqCorrect / seqTotal) * 100) : 0;
  const depthDrop = singlePct - seqPct;

  const depth = {
    single_move_pct: singlePct,
    sequence_pct: seqPct,
    depth_drop_pct: Math.max(0, depthDrop),
  };

  // Archetype classification
  const tacPct = tacTotal > 0 ? tacCorrect / tacTotal : 0;
  const defPct = metrics.defensive_accuracy.total > 0
    ? metrics.defensive_accuracy.correct / metrics.defensive_accuracy.total
    : 0;
  const quietTimeRatio =
    speed.avg_quiet > 0 && speed.avg_tactical > 0 ? speed.avg_quiet / speed.avg_tactical : 1;

  let archetype: KairosProfile["archetype"];
  let archetype_description: string;

  if (tacPct > 0.7 && depthDrop > 25) {
    archetype = "strong_recogniser_weak_calculator";
    archetype_description =
      "You spot single-move wins quickly, but your accuracy drops on longer sequences. The patterns are there — you need more practice holding lines in your head past 2-3 moves.";
  } else if (tacPct < 0.4 && seqPct > singlePct) {
    archetype = "weak_recogniser_strong_calculator";
    archetype_description =
      "When you do see something, you calculate accurately. But you're missing the initial pattern — the spark that tells you to start calculating in the first place.";
  } else if (quietTimeRatio > 2) {
    archetype = "clock_burner";
    archetype_description =
      "You spend as much time in calm positions as in complex ones. Learning to play quickly when there's no forcing continuation is one of the fastest time-management wins available.";
  } else if (tacPct > 0.6 && defPct < 0.4) {
    archetype = "tactical_blind_spot_defense";
    archetype_description =
      "Your attacking instinct is strong, but you miss what your opponent is doing. Defensive awareness is a separate skill from tactics — and it's undertrained at every level.";
  } else if (metrics.avg_solve_time > 30 && metrics.accuracy_pct > 60) {
    archetype = "consistent_slow";
    archetype_description =
      "You're accurate, but you're thinking long even in positions that don't require it. Not every position needs deep calculation — learning to trust your first instinct in calm positions will free up time for the moments that matter.";
  } else {
    archetype = "strong_overall";
    archetype_description =
      "Balanced performance across position types. You adjust your thinking to what the position needs. The next step is seeing these patterns in your own games, where the tendencies become specific and actionable.";
  }

  return { speed, accuracy, depth, archetype, archetype_description };
}
