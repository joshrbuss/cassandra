export interface Article {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  /** Lichess theme tags to pull embedded puzzles from (comma-separated OR for DB query) */
  themes: string[];
  content: string; // HTML-safe plain text sections, rendered as paragraphs
}

export const ARTICLES: Article[] = [
  {
    slug: "chess-puzzles-for-beginners",
    title: "Chess Puzzles for Beginners: Where to Start and How to Improve",
    metaTitle: "Chess Puzzles for Beginners — Start Training Today",
    metaDescription:
      "New to chess puzzles? Learn how to solve tactics, why puzzles are the fastest way to improve, and try interactive beginner puzzles now.",
    themes: ["mateIn1", "fork", "pin"],
    content: `Chess puzzles are the single most effective way for beginners to improve. Unlike playing full games—where the feedback loop is slow—puzzles give you instant results on a specific skill: spotting the best move in a given position.

## Why Puzzles Work

When you solve a puzzle correctly, your brain reinforces a pattern. The next time you see a similar position in a game, you'll find the right move faster and with more confidence. This is the core of pattern recognition, and it's how grandmasters think.

Beginners often skip puzzles because they feel difficult at first. But the discomfort is the point. Each puzzle you struggle with and eventually solve is building a library of patterns in your mind.

## What to Focus On First

**Mates in 1.** Before anything else, practice finding checkmate in one move. These puzzles train you to see when the king is vulnerable—the most fundamental tactical awareness in chess.

**Forks.** A fork is when one piece attacks two enemy pieces simultaneously. The knight is the best forking piece because of its unusual movement, but pawns, bishops, and queens can fork too. Spotting fork opportunities before your opponent does is worth significant rating points.

**Pins.** A pin occurs when a piece cannot move without exposing a more valuable piece behind it. Pins can be absolute (the king is behind) or relative (any valuable piece is behind). Learning to create pins—and avoid being pinned—will transform your middle game.

## How to Practice Effectively

Set a daily target: 5 to 10 puzzles per session. Consistency beats volume. Don't rush—take time to visualize the position before moving. After solving (or failing), always look at the explanation and replay the line.

Cassandra's puzzle trainer starts the clock the moment the board loads, so you get real timing data about your solving speed. This is valuable feedback: if you're taking over a minute on a mate-in-2, that's a pattern you need to reinforce more.

## The Next Step

Once you're comfortable with mates in 1 and basic tactics, move to multi-move combinations. These require you to calculate several moves ahead—a skill that separates 600-rated players from 1000-rated players.

Try the interactive puzzles below to get started. Each one is drawn from real games.`,
  },
  {
    slug: "chess-tactics-trainer",
    title: "Chess Tactics Trainer: How Deliberate Practice Builds Pattern Recognition",
    metaTitle: "Chess Tactics Trainer — Build Pattern Recognition",
    metaDescription:
      "Learn how tactical training works, what makes a good chess tactics trainer, and practice real positions with instant feedback.",
    themes: ["fork", "pin", "skewer", "discoveredAttack"],
    content: `A chess tactics trainer is only as good as the feedback loop it creates. Most trainers show you whether you got the move right. The best ones show you *why* you got it wrong—and how to see it next time.

## What Deliberate Practice Looks Like in Chess

Psychologist Anders Ericsson's research on expertise shows that improvement comes from practicing at the edge of your ability, with immediate feedback and focused correction. Chess puzzles fit this model perfectly.

The key is to avoid puzzle-mode thinking: don't just try random moves until something works. Instead, analyze the position before touching a piece. Ask: What are the threats? What pieces are undefended? What would my opponent's best response be?

## The Four Core Tactical Motifs

**Forks** — one attacker, two targets. Always scan for knight forks after every exchange. They're invisible until you're trained to see them.

**Pins** — restricting a piece's movement by threatening what's behind it. Pins to the king are absolute; the pinned piece literally cannot move. Pins to the queen are relative but often decide material.

**Skewers** — the reverse of a pin. The more valuable piece is in front and must move, exposing the piece behind. Queens and rooks along open files are common skewer targets.

**Discovered attacks** — moving one piece to reveal a threat from another. A discovered check is especially powerful because the opponent must respond to the check while you capture elsewhere.

## Why Speed Matters

In a real game, you don't have unlimited time. Players who have drilled a pattern hundreds of times find the winning move in seconds—freeing their thinking time for deeper calculation later in the position.

Cassandra's timed puzzle trainer tracks your solve speed and compares it against all other players. If you're consistently in the bottom 25% for speed on a particular motif, that's where to focus your drilling.

## Building a Training Routine

Spend the first part of each session on motifs you already recognize—this builds fluency. Spend the rest on patterns where you struggle. After a month of daily 15-minute sessions, most players see a 150–200 Elo improvement in online games.`,
  },
  {
    slug: "retrograde-analysis-chess",
    title: "Retrograde Analysis in Chess: Reading Positions Backwards",
    metaTitle: "Retrograde Analysis Chess — Train Reverse Thinking",
    metaDescription:
      "What is retrograde analysis? Learn how working backwards from a chess position deepens your understanding and try interactive retrograde puzzles.",
    themes: ["mateIn2", "quietMove"],
    content: `Retrograde analysis is the art of reading a chess position backwards: instead of asking "what's the best move from here?", you ask "what move was just played to reach this position?"

This sounds like a strange thing to practice. In real games, you always know the move history. But the ability to reconstruct what your opponent was *thinking* when they made their last move is one of the most underrated skills in chess.

## Why Retrograde Analysis Matters

When your opponent makes a move, they had a reason. Sometimes the reason is obvious—they captured a piece. Often, it's not. The move might be:

- Preparation for a future threat
- A response to a danger they saw in your position
- A mistake driven by a specific fear or miscalculation

Players who understand their opponent's intent can exploit it. If you recognize that the last move was a mistake—that your opponent *should* have played something else—you gain a concrete candidate move to analyze.

## Retrograde in Endgames

Retrograde analysis is most formally used in endgame composition and study, where composers design positions and work backward to find elegant zugzwang situations or proof games. But the skill it builds—reading positions without a move list—is valuable at every level.

## How We Use It in Training

Cassandra's retrograde puzzles show you a standard puzzle position and ask: "What was the last move?" Four multiple-choice options are displayed. Three are plausible distractors; one is the actual move that reached the position.

Getting the retrograde question right earns you a clearer mental model of the position before you solve the main puzzle. Even when you get it wrong, seeing the correct last move teaches you something about the position's history.

## Practical Application

In your games, when your opponent plays a surprising move, pause before responding. Ask: "What were they afraid of? What are they threatening?" This habit alone can add dozens of Elo points, because the most dangerous opponent moves are the ones you didn't think about from their perspective.

Try the retrograde puzzles below—they're harder than standard tactics but uniquely rewarding.`,
  },
  {
    slug: "chess-endgame-puzzles",
    title: "Chess Endgame Puzzles: The Fastest Path to Closing Out Games",
    metaTitle: "Chess Endgame Puzzles — Learn to Convert Advantages",
    metaDescription:
      "Endgame puzzles are how club players learn to win won games. Practice king and pawn endings, rook endings, and key endgame patterns.",
    themes: ["endgame", "mateIn2", "mateIn3"],
    content: `Most chess games are decided not by a tactical blow but by the endgame—the phase where both sides have traded down to a small number of pieces and technical precision determines the outcome.

Improving in endgames is one of the highest-leverage investments a club player can make. Unlike opening theory, endgame knowledge doesn't become outdated. The principles for winning a king-and-pawn ending are the same today as they were a hundred years ago.

## The Core Endgame Patterns to Know

**Opposition.** When two kings face each other with an odd number of squares between them, the player *not* to move has the opposition—a positional advantage that often decides pawn endgames. Understanding opposition is the entry point for all pawn ending theory.

**The square rule.** Given a passed pawn and no other pieces, you can calculate whether the defending king can catch the pawn without moving—just by drawing a square from the pawn to the promotion square. If the king is inside the square, it catches the pawn. Outside, it doesn't.

**Rook behind the passed pawn.** In rook endings, the rook belongs behind passed pawns—yours or your opponent's. This principle applies to both offense and defense and explains most rook endgame technique.

**The Lucena and Philidor positions.** These are the two fundamental rook-and-pawn vs. rook positions. Lucena wins; Philidor draws. Knowing them by heart means you can correctly evaluate—and play—the most common endgame position in practical chess.

## Why Puzzles Beat Memorization

Reading endgame books is valuable but passive. Puzzles force you to apply the principles under pressure. When the clock is running, theory becomes concrete: find the right move *now*.

Cassandra's endgame puzzles are drawn from real game positions, not theoretical constructs. They're harder than composed studies because the position may not be perfectly clean—just like your actual games.

## How to Practice

Work through each puzzle slowly. Find the candidate moves, calculate the resulting positions, and choose. Then replay the solution and understand why each move was necessary. Pay attention to the exact timing—endgames are often decided by a single tempo.`,
  },
  {
    slug: "daily-chess-puzzles",
    title: "Daily Chess Puzzles: Building the Habit That Compounds",
    metaTitle: "Daily Chess Puzzles — Build Your Tactical Habit",
    metaDescription:
      "Why daily chess puzzles beat weekend cramming, how to structure your sessions, and where to find the best puzzles to practice with.",
    themes: ["fork", "pin", "mateIn1", "mateIn2"],
    content: `The players who improve fastest at chess are rarely the ones who study the most in a single sitting. They're the ones who show up every day.

Daily puzzle practice creates compounding returns. A 15-minute session today might not feel like much, but after three months of consistent practice, your pattern library has grown substantially. You start seeing tactics two and three moves before they materialize—not because you calculated, but because you recognized.

## Why Daily Beats Weekly

**Spaced repetition.** Patterns learned and reviewed at intervals are retained far longer than those crammed in one session. Daily puzzle practice approximates this effect naturally: you're reinforcing patterns across time, not all at once.

**Lower cognitive load.** When you sit down to practice every day, you don't have to "warm up" as long. Your chess brain is already running. Players who skip days often spend the first 20 minutes reorienting before they're actually training.

**Momentum.** Streaks matter psychologically. Knowing you've solved puzzles 30 days in a row creates an incentive to continue that has nothing to do with chess—and that's fine. Use that incentive.

## Structuring Your Daily Session

A 15-minute daily session might look like:

- **5 minutes:** Repeat one puzzle type you've been drilling (mates in 1, forks, etc.)
- **8 minutes:** Solve new puzzles at or slightly above your comfort level
- **2 minutes:** Review one puzzle you got wrong recently

This structure ensures you're reinforcing known patterns while pushing into new difficulty—the combination that produces improvement.

## What Makes a Good Daily Puzzle Set

The best daily puzzles are:
- Drawn from real games (not composed positions)
- Timed, so you get feedback on your solving speed
- Varied in motif, to keep your training broad
- Explained after you solve, so you understand the idea

Cassandra pulls puzzles from the Lichess open database—over 2 million real game positions. Each puzzle is timed, and after solving you see how your speed compares to all other players.`,
  },
  {
    slug: "chess-puzzle-timer",
    title: "Chess Puzzle Timer Training: Why Speed Is a Skill Worth Measuring",
    metaTitle: "Chess Puzzle Timer — Train Speed and Accuracy Together",
    metaDescription:
      "Learn how puzzle timers help you measure tactical fluency, what your solve speed means for different time controls, and how to train for faster chess.",
    themes: ["fork", "pin", "skewer", "discoveredAttack", "mateIn2"],
    content: `Solving a puzzle correctly is one thing. Solving it in 8 seconds is another.

Speed in tactical positions isn't about moving fast and hoping—it's about recognizing the pattern so completely that the correct move appears immediately, without calculation. This is tactical fluency, and it's what separates players who know tactics from players who *use* them in games.

## What Solve Time Actually Measures

When you solve a puzzle slowly, it usually means one of two things:

1. You haven't seen this pattern enough times for it to be automatic.
2. You found the pattern but doubted yourself and spent time confirming.

Both are useful diagnostics. If you regularly take 90+ seconds on fork puzzles, you need more fork reps. If you find the move in 5 seconds but spend another 30 confirming it, you need more confidence-building through successful repetitions.

## Time Control Benchmarks

How fast you *should* solve a puzzle depends on what you're training for:

- **Bullet (1+0 or 2+1):** Aim for under 8 seconds per tactical position. Intuition dominates; calculation is minimal.
- **Blitz (3+2 or 5+0):** 8–20 seconds. You have time for a quick two-move calculation.
- **Rapid (10+0 or 15+10):** 20–45 seconds. Full candidate move analysis is possible.
- **Classical (60+ minutes):** Under 90 seconds. Speed is less critical, but fluency frees mental energy for deeper plans.

Cassandra shows you which time control you play and flags when your solve time exceeds the expected threshold for that control. This makes the benchmarks actionable, not just decorative.

## Training for Speed

**Volume first, then speed.** Don't try to go fast when you're still learning a motif. Get the pattern right a hundred times, then start timing yourself.

**Review slow solves.** After each session, look at puzzles where you took longer than your target. What slowed you down? Was it the piece type, the board configuration, or a specific sub-pattern you haven't seen?

**Solve under pressure.** Add a consequence to slow solving: if you take more than 20 seconds on what should be a blitz-speed puzzle, force yourself to do it again from a fresh board. This simulates the tension of a real game clock.`,
  },
  {
    slug: "predict-opponent-moves-chess",
    title: "How to Predict Your Opponent's Moves in Chess",
    metaTitle: "Predict Opponent Moves in Chess — Train Defensive Awareness",
    metaDescription:
      "Anticipating your opponent's threats before they happen is a skill you can train. Learn the techniques and try interactive opponent prediction puzzles.",
    themes: ["deflection", "backRankMate", "pin", "fork"],
    content: `The strongest chess players don't just find good moves—they predict what their opponent will do before it happens. This defensive awareness is what allows them to avoid threats rather than react to them.

Most tactical training focuses on attacking: find the winning move, execute the combination, collect material. This is necessary. But players who only train this way develop a blind spot: they underestimate what their opponent is planning.

## Why Opponent Prediction Is a Distinct Skill

Finding your best move and predicting your opponent's best move require different thinking processes. When you're finding your move, you're looking for activity—threats, captures, checks. When you're predicting the opponent's move, you need to *defend*, which means understanding their threats from their perspective.

This shift in perspective is not natural. It requires deliberate practice.

## The Questions to Ask

Before every move, ask yourself: "If I don't play here, what will my opponent do?" Specifically:

- **Checks.** Can my opponent deliver check on their next move? If so, is any of those checks dangerous?
- **Captures.** Is any of my material hanging or en prise? Can my opponent win material for free?
- **Threats.** Is my opponent threatening a combination—something that will happen in two or three moves if I don't respond?

Most blunders in club chess are caused by ignoring one of these three categories.

## Training Opponent Prediction

Cassandra's opponent prediction puzzle type shows you a position and asks: "What will your opponent play?" You choose from four options. The correct answer is the actual move that was played—usually the most dangerous or thematic response.

After answering, the puzzle reveals the idea: "Your opponent was threatening a back-rank mate" or "Your opponent was setting up a pin on the d-file." This explanation is the training signal. You're learning to read the board from the other side.

## The Compound Benefit

Players who practice opponent prediction become harder to beat. They see threats coming, defend accurately, and avoid the panicked reactions that cause rating losses. Over time, this also improves their attacking play—because understanding threats from the opponent's perspective helps you construct more unstoppable ones yourself.`,
  },
  {
    slug: "learn-from-chess-blunders",
    title: "How to Actually Learn From Your Chess Blunders (Not Just Review Them)",
    metaTitle: "Learn From Chess Blunders — Turn Mistakes Into Improvement",
    metaDescription:
      "Reviewing blunders isn't enough. Here's how to turn your chess mistakes into lasting improvement using targeted puzzle training.",
    themes: ["fork", "pin", "hangingPiece"],
    content: `Every chess player reviews their blunders. You lose a game, open the analysis board, and click through the moves until Stockfish highlights the moment you went wrong. You stare at the position, nod, and close the tab. Three games later, you make the same mistake.

## Why Passive Review Fails

Reviewing a blunder after the fact is passive learning. You're consuming information, not producing it. Your brain registers "I shouldn't have done that" but doesn't build the neural pathway that would prevent it next time.

Research on skill acquisition is clear: recognition is not the same as recall. You might recognise your blunder when someone points it out. But in a live game, with the clock ticking and your opponent staring at you, you need recall — the ability to see the danger before it happens, without a prompt.

This is the gap between reviewing and training. Reviewing tells you what went wrong. Training makes sure it doesn't happen again.

## Active Drilling vs Reviewing

Active drilling means you're placed back into the exact position where you made the mistake — or a structurally similar one — and forced to find the correct move yourself. No analysis arrows. No engine suggestions. Just you and the board.

When you solve a position actively, you're building the pattern into your long-term memory. Each repetition strengthens the connection. After five or six successful solves of the same motif, you start seeing it in your games without consciously looking for it.

This is the difference between a player who "knows about back-rank mates" and a player who never gets back-rank mated. The first one reviewed. The second one drilled.

## Spaced Repetition in Chess

Spaced repetition is the most efficient memorisation technique known to cognitive science. Instead of practising a pattern once and moving on, you revisit it at increasing intervals — after one day, then three days, then a week.

Each time you successfully recall the pattern, the interval grows. Each time you fail, it shrinks. Over time, the patterns that are hardest for you get the most practice, while easy ones fade into the background.

Applied to chess: the blunders you keep making should resurface as puzzles more often than the ones you've already corrected. This is targeted training — not random puzzle solving.

## How Cassandra Chess Automates This

Cassandra analyses your actual games from Chess.com and Lichess. When you make a blunder — a move that drops 60+ centipawns — we extract that position and turn it into a puzzle. The puzzle shows you the position before your mistake and asks: what should you have played?

This means every puzzle you solve on Cassandra is directly relevant to your weaknesses. You're not solving random positions from random games. You're drilling the exact patterns where you personally go wrong.

Other platforms charge for game analysis. We run Stockfish on every game for free and turn the results into personalised training. Connect your account and stop reviewing your blunders — start training on them.

**[Stop reviewing. Start training →](/connect)**`,
  },
  {
    slug: "free-chess-puzzles",
    title: "The Best Free Chess Puzzles in 2026 — And Why Personalised Ones Work Better",
    metaTitle: "Free Chess Puzzles 2026 — Unlimited & Personalised",
    metaDescription:
      "Chess.com charges for more puzzles and game analysis. Here's how to get unlimited free chess puzzles — including ones built from your own games.",
    themes: ["mateIn1", "mateIn2", "fork"],
    content: `Chess puzzles are the backbone of tactical improvement. But in 2026, the puzzle landscape is split: some platforms lock their best content behind paywalls, while others offer millions of puzzles for free. Here's what you need to know.

## The Lichess Open Database

Lichess maintains the largest open-source chess puzzle database in the world — over 4 million puzzles, all free, all derived from real games. Every puzzle has a difficulty rating, themes, and a verified solution. The database is released under CC0, meaning anyone can use it for any purpose.

This is genuinely remarkable. A decade ago, high-quality chess puzzles were locked inside expensive books. Today, millions of them are freely available to anyone with an internet connection.

Cassandra Chess draws from this database for its general puzzle library. Every puzzle you solve in our library comes from a real game position, rated and themed by the Lichess community.

## The Chess.com Paywall Problem

Chess.com offers excellent puzzles, but free users are limited to a small number per day. Want more? That's a premium subscription. Want game analysis with engine evaluations? Premium again. Want to see where you blundered? You guessed it — premium.

This creates a frustrating situation for improving players. The players who need the most practice — those making the most blunders — are the ones who can least afford unlimited access.

## Why Generic Puzzles Have Limits

Even with unlimited free puzzles, there's a fundamental problem: generic puzzles are generic. They're drawn from other people's games, featuring positions you may never encounter in your own play.

A 1200-rated player who plays the Italian Game faces different tactical patterns than a 1200-rated player who plays the Sicilian. A player who struggles with endgame conversions needs different training than one who hangs pieces in the opening.

Random puzzles improve your tactics generally. But targeted puzzles — ones that match your specific weaknesses — improve you faster.

## The Personalised Puzzle Concept

What if your puzzle training was built from your own games? Every blunder you make becomes a puzzle. Every position where you went wrong becomes a drill. Your training set is unique to you, targeting exactly the patterns where you lose rating points.

This is what Cassandra Chess does. Connect your Chess.com or Lichess account, and we analyse your games with Stockfish — the same engine analysis that Chess.com charges for. We find your blunders and generate personalised puzzles from them.

The result: a puzzle bank that's 100% relevant to your actual chess. No generic positions. No paying for analysis. Just targeted training on your real weaknesses.

## Unlimited, Free, No Paywall

Cassandra Chess is free. No puzzle limits. No subscription tiers. No paywalled game analysis. Connect your account, and your entire game history becomes your personal training ground.

We believe chess improvement tools should be accessible to everyone — not locked behind a paywall that gates the players who need them most.

**[Get your free personalised puzzles →](/connect)**`,
  },
  {
    slug: "chess-tactics-trainer-personalised",
    title: "Chess Tactics Trainer — Why Random Puzzles Are Holding You Back",
    metaTitle: "Chess Tactics Trainer — Stop Solving Random Puzzles",
    metaDescription:
      "Most chess tactics trainers give you random positions. Here's why that doesn't work — and what to do instead.",
    themes: ["pin", "skewer", "discoveredAttack"],
    content: `You open your favourite chess tactics trainer. A position loads. You solve it — or you don't. Another position loads. Repeat for twenty minutes.

This is how most chess players train tactics. And it works, to a point. Random puzzle solving will improve your pattern recognition and raise your rating. But there's a ceiling, and most players hit it without understanding why.

## How Tactics Trainers Work

A typical chess tactics trainer selects positions from a large database, filtered by your approximate difficulty level. As you solve puzzles, your puzzle rating adjusts — get one right and you see harder positions, get one wrong and you see easier ones.

This adaptive difficulty is better than a fixed set. But the selection is still essentially random within your rating band. You might get a fork puzzle, then an endgame puzzle, then a back-rank mate, then another fork. There's no strategic logic to the sequence.

## The Problem With Random Positions

Random training treats every weakness equally. But your weaknesses aren't equal. You might be excellent at spotting forks but terrible at finding discovered attacks. A random trainer doesn't know this — it gives you roughly equal exposure to both motifs.

The result: you spend significant training time on patterns you've already mastered, while undertraining the ones that actually cost you games. It's like a tennis player who practises serves and backhands equally when their backhand is fine and their serve is losing them matches.

**Specificity matters.** The most efficient training targets your actual weaknesses, not a random sample of all possible weaknesses.

## The Data Already Exists

Here's the thing: your chess platforms already know your weaknesses. Every game you play on Chess.com or Lichess generates a complete record of your decisions. Every blunder is logged. Every pattern you missed is documented.

The data to build a personalised training plan is sitting right there in your game history. The question is whether anyone is using it.

## Training On Your Weaknesses

Cassandra Chess connects to your Chess.com and Lichess accounts and analyses your actual games. We run Stockfish on every position and identify where you blundered — where your move was significantly worse than the best available move.

Each blunder becomes a puzzle. The position before your mistake loads on the board. Your job: find what you should have played. No hints. No arrows. Just the position and the clock.

Because these puzzles come from your own games, they target your specific blind spots. If you keep falling for the same knight fork pattern in the Sicilian, that's exactly what you'll be drilling. If your endgame technique falls apart under pressure, those are the positions you'll see.

## Beyond the Random Ceiling

Players who switch from random puzzle training to personalised training typically report faster improvement. The reason is simple: every minute of training is relevant. There's no wasted time on patterns you've already internalised.

This doesn't mean random puzzles are useless — they're great for broadening your tactical vocabulary. But once you've built a foundation, the fastest path to improvement is targeted drilling on your documented weaknesses.

**[Connect your account and start targeted training →](/connect)**

*Want to try Cassandra's daily challenge? **[Cassandra's Prophecy →](/prophecy)** — a new brilliant puzzle every day.*`,
  },
];

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}
