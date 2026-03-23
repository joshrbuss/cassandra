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

Once you're comfortable with mates in 1 and basic tactics, move to multi-move combinations. These require you to calculate several moves ahead—a skill that separates 600-rated players from 1000-rated players.`,
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

## How Cassandra Automates This

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

Cassandra draws from this database for its general puzzle library. Every puzzle you solve in our library comes from a real game position, rated and themed by the Lichess community.

## The Chess.com Paywall Problem

Chess.com offers excellent puzzles, but free users are limited to a small number per day. Want more? That's a premium subscription. Want game analysis with engine evaluations? Premium again. Want to see where you blundered? You guessed it — premium.

This creates a frustrating situation for improving players. The players who need the most practice — those making the most blunders — are the ones who can least afford unlimited access.

## Why Generic Puzzles Have Limits

Even with unlimited free puzzles, there's a fundamental problem: generic puzzles are generic. They're drawn from other people's games, featuring positions you may never encounter in your own play.

A 1200-rated player who plays the Italian Game faces different tactical patterns than a 1200-rated player who plays the Sicilian. A player who struggles with endgame conversions needs different training than one who hangs pieces in the opening.

Random puzzles improve your tactics generally. But targeted puzzles — ones that match your specific weaknesses — improve you faster.

## The Personalised Puzzle Concept

What if your puzzle training was built from your own games? Every blunder you make becomes a puzzle. Every position where you went wrong becomes a drill. Your training set is unique to you, targeting exactly the patterns where you lose rating points.

This is what Cassandra does. Connect your Chess.com or Lichess account, and we analyse your games with Stockfish — the same engine analysis that Chess.com charges for. We find your blunders and generate personalised puzzles from them.

The result: a puzzle bank that's 100% relevant to your actual chess. No generic positions. No paying for analysis. Just targeted training on your real weaknesses.

## Unlimited, Free, No Paywall

Cassandra is free. No puzzle limits. No subscription tiers. No paywalled game analysis. Connect your account, and your entire game history becomes your personal training ground.

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

Cassandra connects to your Chess.com and Lichess accounts and analyses your actual games. We run Stockfish on every position and identify where you blundered — where your move was significantly worse than the best available move.

Each blunder becomes a puzzle. The position before your mistake loads on the board. Your job: find what you should have played. No hints. No arrows. Just the position and the clock.

Because these puzzles come from your own games, they target your specific blind spots. If you keep falling for the same knight fork pattern in the Sicilian, that's exactly what you'll be drilling. If your endgame technique falls apart under pressure, those are the positions you'll see.

## Beyond the Random Ceiling

Players who switch from random puzzle training to personalised training typically report faster improvement. The reason is simple: every minute of training is relevant. There's no wasted time on patterns you've already internalised.

This doesn't mean random puzzles are useless — they're great for broadening your tactical vocabulary. But once you've built a foundation, the fastest path to improvement is targeted drilling on your documented weaknesses.

**[Connect your account and start targeted training →](/connect)**

*Want to try Cassandra's daily challenge? **[Cassandra's Prophecy →](/prophecy)** — a new brilliant puzzle every day.*`,
  },
  {
    slug: "chess-tactics-trainer-free",
    title: "The Best Free Chess Tactics Trainer in 2026",
    metaTitle: "Best Free Chess Tactics Trainer 2026 — No Paywall",
    metaDescription:
      "Looking for a free chess tactics trainer? Here's why random puzzles plateau your improvement, and how training on your own games breaks through.",
    themes: ["fork", "pin", "mateIn2"],
    content: `If you search for a free chess tactics trainer, you'll find dozens of options. Lichess, Chess.com (with limits), ChessTempo, and countless apps. They all do roughly the same thing: show you a position, ask you to find the best move, and tell you whether you got it right.

Most of them work. You will improve by solving random puzzles. But there's a ceiling to how far random training can take you, and in 2026, smarter alternatives exist.

## Why Random Puzzles Eventually Stop Working

When you first start solving tactics, everything is new. Forks, pins, skewers, back-rank mates — each one builds a fresh pattern in your memory. Your rating climbs quickly because you're filling gaps everywhere.

Then progress slows. You're still solving puzzles, still putting in the time, but your rating barely moves. What happened?

The problem is that random puzzles don't know your weaknesses. They serve you an equal distribution of tactical motifs regardless of what you actually struggle with. If you're excellent at spotting forks but consistently miss discovered attacks, a random trainer will still give you roughly 50/50 — wasting half your training time on patterns you've already internalised.

This is the plateau problem, and it affects almost every chess player who trains with generic puzzle sets. For a deeper look at why this happens, see our article on [chess improvement plateaus](/learn/chess-improvement-plateaus).

## What a Good Tactics Trainer Actually Needs

A genuinely effective tactics trainer needs three things:

- **Relevance.** The positions should reflect the patterns you actually encounter in your games — not random positions from random openings at random rating levels.
- **Targeting.** The trainer should know what you're bad at and give you more of that, not a uniform random sample.
- **Feedback beyond right/wrong.** Understanding why a move is correct matters more than knowing that it is.

Most free trainers nail none of these. They give you a database, an adaptive rating, and a thumbs-up or thumbs-down. That's fine for beginners. For players trying to break through a plateau, it's insufficient.

## Training on Your Own Games

The most relevant tactical positions you can study are the ones from your own games. When you blunder a fork in the Sicilian Defence, the position involves pieces you placed, an opening you chose, and a middlegame structure you'll see again. It's not abstract — it's your chess.

[Cassandra](/) takes this approach. Connect your Chess.com or Lichess account, and we analyse your games with Stockfish — the same engine that powers professional chess analysis. Every position where you made a significant mistake becomes a puzzle.

The result is a puzzle bank that's 100% relevant to your actual weaknesses. No generic positions. No paywall. No limit on how many puzzles you can solve.

## How It Compares to Other Free Options

**Lichess puzzles** are excellent and completely free — over 4 million positions from real games. We use the Lichess open database for our own general puzzle library. But Lichess puzzles are generic. They're not drawn from your games, and they don't target your specific weaknesses. For more on this comparison, read [Lichess puzzles vs personal puzzles](/learn/lichess-puzzles-vs-personal-puzzles).

**Chess.com puzzles** are high quality but limited for free users. You get a handful per day, and game analysis requires a premium subscription. The players who need the most practice are gated behind a paywall.

**ChessTempo** has strong puzzle quality and customisation options, but the interface is dated and there's no personal game analysis.

**Cassandra** is free, unlimited, and builds your puzzle bank from your actual games. We also offer [The Prophecy](/prophecy) — a daily brilliant-move challenge — and [The Scales](/scales), a move-ranking exercise that trains positional evaluation.

## The Bottom Line

A free chess tactics trainer is valuable at every level. But if you've been solving random puzzles for months and your rating has stalled, the issue isn't effort — it's specificity. The fastest path through a plateau is training on the exact positions where you personally go wrong.

**[Connect your account — it's free →](/connect)**`,
  },
  {
    slug: "how-to-analyse-chess-games",
    title: "How to Analyse Your Chess Games (And Actually Improve)",
    metaTitle: "How to Analyse Chess Games — Turn Reviews Into Improvement",
    metaDescription:
      "Most players review games passively and learn nothing. Here's how to analyse your chess games so the lessons actually stick and your rating goes up.",
    themes: ["fork", "hangingPiece", "pin"],
    content: `You finish a game, open the analysis board, and click through the moves. The engine shows you where you went wrong. You nod. You close the tab. Next game, you make the same mistakes.

This is how most chess players "analyse" their games. It feels productive, but it's almost entirely passive. And passive review doesn't build the skills that prevent mistakes — it just shows you where they happened.

## The Difference Between Reviewing and Analysing

**Reviewing** is clicking through moves with an engine running, noting where the evaluation bar dipped. It's watching someone else's surgery on video. You can see what happened, but you haven't learned to hold the scalpel.

**Analysing** is actively engaging with critical positions. It means covering the engine evaluation, looking at the position yourself, finding candidate moves, choosing one, and only then checking the engine. It means asking *why* your move was worse, not just *that* it was worse.

The difference is effort. Analysis requires you to think. Review lets you watch.

## A Practical Analysis Method

Here's a five-step process that actually produces improvement:

**Step 1: Play through the game without an engine.** Note the moments where you felt uncertain, spent a long time, or were surprised by your opponent's move. These are your critical moments.

**Step 2: At each critical moment, write down your thought process.** What did you consider? What did you reject? What were you afraid of? This is the data that matters — not the engine's evaluation, but your reasoning.

**Step 3: Now turn on the engine.** Compare your thought process to the engine's assessment. The gap between what you considered and what the engine found is your training signal.

**Step 4: For each significant mistake, understand the pattern.** Was it a tactical blind spot (you didn't see the fork)? A positional misunderstanding (you traded the wrong pieces)? A calculation error (you saw the move but miscounted)? Each type of error requires different training. For more on this approach, see [how to train on your blunders](/learn/chess-blunder-training).

**Step 5: Drill the positions.** This is where most players stop — and it's where the actual improvement happens. Take the positions where you went wrong and solve them as puzzles, without the engine. Repeat until you can find the correct move in under 15 seconds.

## Why Most Analysis Tools Fall Short

Chess.com's game review is excellent — but it's behind a paywall. Free users get one game review per day with limited depth. Lichess offers unlimited free analysis, but the interface requires you to drive the process yourself.

Neither platform takes the critical next step: turning your mistakes into drills.

## From Analysis to Active Training

Cassandra bridges this gap. When you connect your Chess.com or Lichess account, we analyse every game with Stockfish and extract the positions where you blundered. Each blunder becomes a puzzle — the position before your mistake, with you finding the correct move.

This closes the loop between analysis and training. You don't just see where you went wrong — you actively practice getting it right. And because the puzzles come from your own games, they target patterns you'll encounter again.

The analysis is free. No subscription required, no daily limits. We run Stockfish on every game because we believe game analysis shouldn't be locked behind a paywall.

## How Often to Analyse

Analyse at least one game per day, even if briefly. Frequency beats depth. A player who spends 10 minutes analysing every game improves faster than one who does a deep 2-hour review once a month.

The best routine: play a game, analyse it with the five-step method above, and then spend 10 minutes solving your personalised puzzle bank. This creates a tight feedback loop between play and training.

**[Get free game analysis →](/connect)**`,
  },
  {
    slug: "chess-improvement-plateaus",
    title: "Why You're Stuck at the Same Chess Rating (And How to Break Through)",
    metaTitle: "Chess Rating Plateau — Why You're Stuck and How to Break Through",
    metaDescription:
      "Hit a chess rating plateau? The problem isn't effort — it's training on random positions instead of your actual weaknesses. Here's how to break through.",
    themes: ["fork", "pin", "discoveredAttack"],
    content: `You've been playing chess for months. You solved hundreds of puzzles. You watched YouTube videos. You read opening theory. And your rating hasn't moved in weeks.

Welcome to the plateau. Every chess player hits one, usually between 800–1000, 1200–1400, or 1600–1800. It's the most frustrating experience in chess because you're putting in work and getting nothing back.

But the plateau isn't caused by a lack of effort. It's caused by the wrong kind of effort.

## Why Plateaus Happen

Chess improvement follows a power curve, not a straight line. Early gains come fast because everything is new — you learn to stop hanging pieces, and you jump 200 points overnight. Then the easy wins dry up. The opponents who still hang pieces are below you now. To beat the players at your level, you need to fix subtler problems.

The issue is that most training methods don't adapt. You're still solving the same type of random puzzles that worked when you were 300 points lower. You're still watching the same kind of videos. The training that got you here won't get you there.

**The single biggest cause of rating plateaus is training on patterns you've already learned while ignoring the ones you haven't.**

## The Random Puzzle Trap

Random puzzle trainers are the biggest culprit. At any rating, you have a set of patterns you can already see and a set you can't. A random trainer gives you both — which means you're spending roughly half your time on patterns that don't challenge you.

Worse, the patterns you can't see are often specific to your playing style. A Sicilian player and a London System player face different tactical landscapes. Random puzzles drawn from all openings can't account for this. For a detailed comparison of generic vs. personal puzzles, see [Lichess puzzles vs personal puzzles](/learn/lichess-puzzles-vs-personal-puzzles).

## How to Diagnose Your Plateau

Before you can break through, you need to know what's holding you back. There are three categories:

**Tactical blind spots.** You miss specific patterns — discovered attacks, intermediate moves, or quiet defensive moves. These show up as recurring blunders in similar position types. The fix is targeted drilling, not more random puzzles. See our guide on [blunder training](/learn/chess-blunder-training) for the method.

**Positional misunderstanding.** You make reasonable-looking moves that are strategically wrong — trading the wrong pieces, misplacing pawns, neglecting king safety. These are harder to diagnose because the engine often shows only a small eval drop.

**Time management.** You find the right moves in analysis but miss them in games because you spend too much time on easy positions and too little on critical ones. If your puzzle solve times are consistently slow, this might be your issue.

## The Fix: Train on Your Actual Weaknesses

The fastest way through a plateau is to stop training randomly and start training specifically.

**Step 1: Identify your patterns.** Analyse your last 20 losses. What types of positions caused problems? Were there recurring tactical motifs you missed? Were your blunders concentrated in openings, middlegames, or endgames?

**Step 2: Build a targeted training set.** Instead of solving random puzzles, focus exclusively on the patterns you identified. If you missed 5 discovered attacks in your last 20 games, solve 50 discovered attack puzzles.

**Step 3: Use your own games.** The most relevant training positions come from your own games. Cassandra does this automatically — connect your account and we analyse every game, turning your blunders into puzzles. Each puzzle targets a specific position where you went wrong, using your actual openings and middlegame structures.

**Step 4: Track progress.** A plateau breaks when your mistake rate drops in the specific patterns you're training. If you were blundering forks in 1 out of 5 games and now it's 1 out of 20, the training is working — even if your rating hasn't moved yet. Rating follows skill with a delay.

## The Plateau Is a Signal, Not a Wall

A rating plateau means your current training method has been fully absorbed. Your brain has learned everything it can from that approach. The plateau is a signal to change methods, not to try harder at the same thing.

The players who break through are the ones who shift from general to specific training — from random puzzles to targeted drilling on their documented weaknesses.

**[Break through your plateau — free game analysis →](/connect)**`,
  },
  {
    slug: "lichess-puzzles-vs-personal-puzzles",
    title: "Lichess Puzzles vs Personal Puzzles: Which Makes You Improve Faster?",
    metaTitle: "Lichess Puzzles vs Personal Puzzles — Which Is Better?",
    metaDescription:
      "Lichess puzzles are great but generic. Personal puzzles from your own games target your specific weaknesses. Here's what the difference means for improvement.",
    themes: ["fork", "pin", "skewer", "mateIn2"],
    content: `Lichess has the best free puzzle database in chess. Over 4 million positions from real games, completely open-source, with ratings, themes, and verified solutions. If you're looking for a free chess tactics trainer, Lichess is the gold standard.

So why would anyone use anything else?

Because there's a fundamental limitation to any generic puzzle database, no matter how large or well-curated: the positions come from other people's games, not yours.

## What Lichess Puzzles Do Well

Lichess puzzles are excellent for building a broad tactical vocabulary. The database covers every motif — forks, pins, skewers, discovered attacks, deflections, decoys, and hundreds of mating patterns. The positions are drawn from real games at all rating levels, so the difficulty distribution is natural and well-calibrated.

The adaptive rating system means you're always solving puzzles near your skill level. Too easy, and your rating rises to show you harder positions. Too hard, and it drops. This keeps you in the productive zone of challenge.

For beginners and intermediate players building foundational pattern recognition, Lichess puzzles are genuinely hard to beat. Cassandra uses the Lichess open database for its own general library — we believe in building on the best available resources.

## The Limitation of Generic Puzzles

Here's the problem: Lichess puzzles are drawn from millions of games played by millions of players with millions of different opening repertoires, playing styles, and weaknesses. The positions you see are a random sample of chess tactics, not a targeted sample of your chess tactics.

This matters because your weaknesses are specific. If you play the King's Indian Defence, you face a particular set of middlegame structures that arise from that opening. If you play the London System, your tactical landscape is completely different. A random puzzle database treats both players identically.

The result is that a significant portion of your training time is spent on positions you'll never see in your own games. That's not wasted time — broad pattern recognition is valuable — but it's not the most efficient use of your limited training minutes.

## What Personal Puzzles Do Differently

A personal puzzle is extracted from your own game. It shows you the exact position where you made a mistake, and asks you to find the move you should have played.

The advantages are immediate:

- **Relevance.** The position comes from an opening you play, a middlegame structure you reach, and a time control you're familiar with. You will see this type of position again.
- **Emotional weight.** You lost rating points because of this mistake. That emotional connection makes the learning stickier than solving a random stranger's position.
- **Weakness targeting.** If you keep making the same type of mistake — say, missing back-rank threats in rook endings — your personal puzzle bank will be heavy on exactly that pattern. The training naturally concentrates on your weakest areas.
- **Progression tracking.** As you solve personal puzzles and the mistakes stop recurring in your games, you can see the direct impact on your play.

## The Research on Specificity

Cognitive science research on skill acquisition consistently shows that specific, contextualised practice produces faster improvement than general practice. A basketball player improves free throws by practising free throws, not by practising random shots from all positions.

Chess is no different. A player who drills the tactical patterns from their own games will improve faster in their own games than a player who solves generic puzzles — even if the generic puzzles are excellent.

This doesn't mean Lichess puzzles are bad. They're genuinely one of the best free training resources available. But they're a complement to personal training, not a substitute for it.

## Using Both Together

The optimal training approach uses both generic and personal puzzles:

- **Generic puzzles** (Lichess, Cassandra library) for broadening your tactical vocabulary and maintaining pattern fluency across all motifs.
- **Personal puzzles** (from your own games) for targeted improvement on your specific weaknesses.

A practical split: spend 60% of your puzzle time on personal puzzles and 40% on generic ones. As a beginner, reverse that ratio — you need the broad foundation first. As you improve, shift toward personal puzzles. For a complete guide to using your blunders as training material, see [how to train on your blunders](/learn/chess-blunder-training).

## How Cassandra Bridges the Gap

Cassandra gives you both. Our general library draws from the Lichess open database. Your personal puzzle bank is built by analysing your Chess.com and Lichess games with Stockfish and extracting your blunders.

Both are free. No paywall, no daily limits. We believe the best [free chess tactics trainer](/learn/chess-tactics-trainer-free) should offer both breadth and depth.

**[Build your personal puzzle bank — free →](/connect)**`,
  },
  {
    slug: "chess-blunder-training",
    title: "How to Train on Your Chess Blunders (The Right Way)",
    metaTitle: "Chess Blunder Training — Drill Your Mistakes Until They Disappear",
    metaDescription:
      "Reviewing blunders passively does nothing. Here's the right way to train on your chess blunders so the mistakes actually stop happening in your games.",
    themes: ["fork", "hangingPiece", "pin", "backRankMate"],
    content: `Every chess player blunders. Magnus Carlsen blunders. You blunder. The difference between a 1200 and a 2000 isn't that the 2000 never blunders — it's that they blunder less often, in fewer positions, and recover better when they do.

The question isn't whether you'll make mistakes. It's whether you'll make the same mistake twice.

## What a Blunder Actually Is

In engine terms, a blunder is a move that loses significant evaluation — typically 100+ centipawns (one pawn's worth of advantage or more). But not all blunders are equal:

- **Tactical blunders** — you missed a concrete threat. A fork, a pin, a back-rank mate. These are the most trainable because they involve specific patterns.
- **Positional blunders** — you made a structurally bad decision. Wrong pawn break, misplaced piece, premature exchange. These require deeper understanding to fix.
- **Time-pressure blunders** — you knew the right move but played too fast (or too slow and panicked). These are a time management problem, not a chess problem.

For training purposes, tactical blunders give you the highest return on investment. They're concrete, pattern-based, and directly drillable.

## Why Passive Review Doesn't Work

Most players "train" on their blunders by reviewing them. They open the analysis board, click through to the mistake, see the engine's suggestion, and move on. This is reviewing, not training.

The problem with passive review is that recognition is not recall. You might recognise the correct move when the engine shows it to you. But in your next game, when you're in a similar position with no engine and a ticking clock, you won't recall it — because you never actually practised finding it yourself. For a deeper dive into this distinction, read [how to actually learn from your blunders](/learn/learn-from-chess-blunders).

## The Right Way to Train on Blunders

Active blunder training follows three steps:

**Step 1: Extract the position.** Take the position from your game where you blundered. Strip away the move list and the engine evaluation. All you have is the board and the pieces.

**Step 2: Solve it cold.** Look at the position and find the correct move yourself. No hints, no engine, no move list. This is the crucial step — you're building the neural pathway that will fire in your next game.

**Step 3: Repeat with spacing.** Solve the same position again tomorrow. Then in three days. Then in a week. Spaced repetition is the most effective memorisation technique known to cognitive science, and it applies directly to chess patterns.

## Common Blunder Patterns to Drill

Most club-level blunders fall into a small number of categories. If you can eliminate even two or three of these from your games, you'll gain 100+ rating points:

- **Hanging pieces.** You left a piece undefended and your opponent took it. Train by solving puzzles with the theme "hanging piece" — you'll start automatically scanning for undefended material.
- **Back-rank weakness.** Your king is on the back rank with no escape square, and your opponent exploits it. Drill back-rank mate puzzles until you instinctively create luft (an escape square) when castled.
- **Knight forks.** You placed your king and a high-value piece on squares that allowed a knight fork. Drill fork puzzles and you'll start seeing the vulnerable squares before you step on them.
- **Discovered attacks.** Your opponent moved a piece that revealed a hidden attack from another piece. These are the hardest to see because the threatening piece doesn't move. Volume training is the only reliable fix.

## Automating the Process

Manually extracting positions from your games, setting them up as puzzles, and scheduling spaced repetition is tedious. Most players who try it give up within a week.

Cassandra automates the entire pipeline. Connect your Chess.com or Lichess account, and we analyse every game with Stockfish. Each blunder is automatically converted into a puzzle — the position before your mistake, with you finding what you should have played.

Your personal puzzle bank grows with every game you play. The positions are sorted by severity, so your worst blunders get the most attention. And because the puzzles come from your own games, every minute of training targets patterns you'll actually encounter again.

We also offer [The Scales](/scales) — a move-ranking exercise where you order three candidate moves from best to worst — and [The Echo](/echo), a retrograde analysis mode that trains you to read positions backwards. Both complement blunder training by building different aspects of chess vision.

## How Long Until Blunders Decrease

With consistent daily training (15–20 minutes on personal puzzles), most players see a measurable reduction in blunder rate within 2–3 weeks. The specific patterns you drill disappear from your games first — if you spent a week on back-rank mates, you'll stop getting back-rank mated.

Rating improvement follows with a slight delay, typically 3–4 weeks after the blunder rate drops. This delay is normal — it takes time for better decisions to compound into more wins.

The key is consistency. A player who solves 10 personal puzzles daily for a month will improve more than one who solves 100 in a single weekend. Spacing is everything.

**[Start training on your blunders — free →](/connect)**`,
  },
  {
    slug: "chess-opening-mistakes",
    title: "Why Your Opening Mistakes Are Costing You Games (And How to Fix Them)",
    metaTitle: "Chess Opening Mistakes — Fix What Happens After Move 10",
    metaDescription:
      "Your opening isn't the real problem — the middlegame positions it leads to are. Learn how to find and fix the opening mistakes that actually cost you games.",
    themes: ["fork", "pin", "hangingPiece"],
    content: `You lose a game and check the opening. You played 1.e4, your opponent played the Sicilian, and somewhere around move 12 everything fell apart. So you study the Sicilian. You memorise lines. Next game, you reach move 12 again — and everything still falls apart.

The problem isn't your opening knowledge. The problem is what happens after the opening ends.

## The Opening Study Trap

Opening study is the most popular form of chess preparation and the least efficient for most players below 2000. Here's why: memorising moves only helps when your opponent plays the memorised responses. Below master level, opponents deviate from theory early and often. Your 15 moves of preparation are useless when they play a sideline on move 4.

What actually matters is understanding the resulting middlegame. Can you handle an isolated queen's pawn? Do you know what to do when the centre is closed? Are you comfortable in positions with opposite-side castling?

These questions aren't answered by memorising opening lines. They're answered by playing positions and learning from your mistakes in them.

## Where Opening Mistakes Actually Happen

When we analyse thousands of games from Cassandra users, a clear pattern emerges. The critical mistakes rarely happen in the first 8–10 moves. They happen in the transition zone — moves 10–20 — where theory ends and original thinking begins.

This is where players make the moves that lose games:

- **Wrong piece placement.** You develop to natural-looking squares that turn out to be terrible in the specific structure you're in. Your knight goes to c3 when it needed to go to d2. Your bishop is on e2 when it belongs on c4.
- **Premature pawn breaks.** You push d4 or f4 at the wrong moment, opening lines your position isn't ready for. The pawn break itself isn't wrong — the timing is.
- **Missing the opponent's plan.** You play your moves in isolation without asking what your opponent is preparing. They build up a kingside attack while you're shuffling pieces on the queenside.
- **Trading the wrong pieces.** You exchange your active bishop for their passive knight, eliminating the piece that was holding your position together.

These aren't opening mistakes in the traditional sense. They're middlegame mistakes that happen to occur in positions arising from your opening. And they repeat every time you play that opening — because you haven't trained on the specific positions where you go wrong.

## Why Opening Books Don't Fix This

Opening books and databases show you the best moves in the main line. But your problem isn't the main line — it's the moment you leave the main line. No book covers the specific position you'll reach after your opponent plays an unusual 6th move and you respond with a natural-looking but inaccurate 7th.

What you need is to see the positions where *you personally* went wrong, understand why your move was a mistake, and drill the correct response until it's automatic. This is exactly what [blunder training](/learn/chess-blunder-training) does — but applied specifically to your opening-gone-wrong positions.

## Training on Your Actual Opening Positions

Cassandra analyses your real games and extracts the positions where you made significant mistakes. Many of these occur in the opening-to-middlegame transition — exactly the zone where opening books stop helping and your own judgment takes over.

When you solve these puzzles, you're not memorising abstract opening theory. You're learning what to do in the specific positions your openings produce. After drilling 20 positions from your Sicilian games, you'll handle move 12 differently — not because you memorised a line, but because you've trained the judgment that line requires.

This approach works for any opening at any level. Whether you play 1.e4 or 1.d4, the Caro-Kann or the King's Indian, your mistakes happen in specific position types. Finding and drilling those positions is more valuable than memorising another 5 moves of theory.

## A Better Approach to Openings

Here's a practical framework for players under 2000:

- **Choose openings based on middlegame type,** not theoretical soundness. If you like attacking, play openings that create attacking positions. If you prefer structure, play openings that lead to clear plans.
- **Stop memorising past move 6–8.** Instead, understand the plans and piece placements for both sides. What squares do you want to control? Where should your pieces be aimed?
- **Analyse your games specifically in moves 10–20.** This is where the real improvement hides. Where did your plan go wrong? What did your opponent do that you didn't anticipate?
- **Drill the positions where you blundered.** Cassandra automates this — connect your account, and every middlegame blunder from your opening positions becomes a puzzle. For a complete approach to this kind of training, see [how to analyse your chess games](/learn/how-to-analyse-chess-games).

The players who improve fastest aren't the ones with the deepest opening preparation. They're the ones who understand what to do when preparation runs out.

**[Find your real opening weaknesses — free →](/connect)**`,
  },
  {
    slug: "chess-endgame-training",
    title: "Chess Endgame Training: The Most Neglected Part of Chess Improvement",
    metaTitle: "Chess Endgame Training — The Fastest Path to More Wins",
    metaDescription:
      "Most players skip endgame training and throw away won games. Here's why endgame drilling is the highest-leverage improvement you can make.",
    themes: ["endgame", "mateIn2", "mateIn3"],
    content: `You're up a pawn in a rook ending. The position is objectively winning. You know it's winning. Stockfish confirms it's winning. Twenty moves later, it's a draw.

This happens to club players constantly. They invest hours in openings and tactics but can't convert the advantages they create. The endgame — the phase where games are actually decided — gets almost no training time.

## Why Players Skip Endgames

Endgames feel boring compared to tactical fireworks. There's no satisfaction in a flashy queen sacrifice when you're manoeuvring a king and three pawns. Opening theory feels productive because there are concrete lines to memorise. Endgame training feels vague — where do you even start?

But this neglect is costing you games. Every time you reach a winning endgame and fail to convert, that's a full point lost. Every drawn endgame you should have won is half a point gone. Over 100 games, poor endgame technique can cost you 50–100 rating points.

## The Endgame Training Gap

Most chess training platforms focus on tactical puzzles — finding the winning combination in the middlegame. These are important, but they create a blind spot: players who are excellent at creating advantages but terrible at converting them.

The standard advice is to study Dvoretsky's Endgame Manual or work through endgame courses. These are excellent resources, but they're theoretical — they teach you positions you should know, not positions you actually face.

The gap is practical endgame training on positions from your own games. When you butcher a rook ending in a real game, the most effective training is to drill that specific ending until you can play it correctly under time pressure.

## What Endgame Training Actually Looks Like

Effective endgame training has three components:

**Theoretical knowledge.** You need to know the fundamental positions: Lucena, Philidor, opposition, the square rule, basic pawn endings, basic rook endings. These are the building blocks. Without them, you can't evaluate endgame positions correctly. Our [endgame puzzles guide](/learn/chess-endgame-puzzles) covers the core patterns.

**Practical drilling.** Once you know the theory, you need to apply it under pressure. This means solving endgame positions with a ticking clock — not studying them at leisure. The difference is enormous. Theory tells you what to do; drilling makes you do it when it counts.

**Personal game analysis.** The highest-value endgame training comes from your own games. When you botch a rook ending, that specific ending — with that specific pawn structure and piece placement — is what you need to practise. Generic rook endings from a textbook are helpful, but your rook ending from last Tuesday is more relevant.

## Your Endgame Blunders Are Trainable

Cassandra catches endgame blunders the same way it catches middlegame ones. When you connect your account, we analyse every game with Stockfish — including the endgame. If you had a winning position on move 40 and threw it away by move 55, we extract those critical positions and turn them into puzzles.

This is uniquely valuable for endgame improvement because endgame blunders are highly repetitive. If you mishandle king-and-pawn endings once, you'll mishandle them again in the same structural pattern. Drilling the specific position where you went wrong breaks the cycle.

## Common Endgame Mistakes to Watch For

**Passive rook placement.** Your rook should be active — behind passed pawns (yours or your opponent's), on open files, cutting off the enemy king. Passive rooks on the back rank lose games.

**King inactivity.** In the endgame, your king is a fighting piece. If it's sitting on g1 while pawns are being exchanged on the other side of the board, you're losing tempo that you can't recover.

**Wrong pawn exchanges.** Trading pawns in a won endgame often converts a winning position into a drawn one. Fewer pawns means fewer chances to create a passed pawn. Keep the tension unless you have a concrete reason to exchange.

**Ignoring the clock.** Endgames require precise calculation, but many players rush because they're low on time. If you consistently reach winning endgames with 30 seconds on your clock, the problem isn't your endgame technique — it's your time management. See our guide on [chess improvement plateaus](/learn/chess-improvement-plateaus) for more on this.

## Building an Endgame Routine

Spend 20% of your training time on endgames. For a 15-minute daily session, that's 3 minutes — enough for 2–3 endgame positions. Prioritise positions from your own games (available through Cassandra's personalised puzzles), then supplement with theoretical positions from the Lichess database.

The return on investment is immediate. Most club players gain 50–100 rating points from endgame improvement alone, because they stop throwing away games they should have won.

**[Find your endgame blunders — free game analysis →](/connect)**`,
  },
  {
    slug: "chess-com-alternatives",
    title: "Chess.com Alternatives: Free Tools That Actually Make You Better",
    metaTitle: "Chess.com Alternatives 2026 — Free Tools for Real Improvement",
    metaDescription:
      "Chess.com locks game analysis and unlimited puzzles behind a paywall. Here are the best free alternatives for serious chess improvement in 2026.",
    themes: ["fork", "pin", "mateIn1", "mateIn2"],
    content: `Chess.com is the biggest chess platform in the world, and for good reason. The playing experience is excellent, the community is massive, and the content library is enormous. But when it comes to improvement tools, the free tier has real limitations.

Free Chess.com users get one game review per day (with limited depth), a small number of puzzles, and no access to advanced features like game explorer or opening reports. Want more? That's $70–100 per year for a Diamond membership.

For casual players, the free tier is fine. For players trying to improve, the paywall sits right where the useful tools begin. Here are the alternatives worth knowing about.

## Lichess — The Open-Source Standard

Lichess is the most important Chess.com alternative and it's not close. Everything is free. No subscriptions, no tiers, no ads. Unlimited puzzles, unlimited game analysis, unlimited tournaments, and a clean interface with no upselling.

The puzzle database is the largest open-source collection in chess — over 4 million positions from real games. Game analysis runs Stockfish at full depth for every game. The opening explorer covers millions of positions. All of it is free, funded by donations.

If you're leaving Chess.com because of the paywall, Lichess is the first place to go. The playing pool is slightly smaller but the improvement tools are strictly superior to Chess.com's free tier.

**What Lichess doesn't do:** personalised training. Lichess gives you excellent tools, but it doesn't connect the dots between your game analysis and your puzzle training. You analyse a game, see your mistakes, and then go solve unrelated puzzles. The training gap between "knowing your weakness" and "drilling your weakness" is left for you to bridge yourself. For more on this distinction, see [Lichess puzzles vs personal puzzles](/learn/lichess-puzzles-vs-personal-puzzles).

## Cassandra — Personal Puzzle Training

Cassandra takes a different approach. Instead of being a playing platform, it focuses entirely on turning your games into targeted training.

Connect your Chess.com or Lichess account (you keep playing on whichever platform you prefer), and Cassandra analyses every game with Stockfish. Each position where you made a significant mistake becomes a puzzle. The result is a personalised puzzle bank built from your actual weaknesses.

This is the step that other platforms skip. Chess.com shows you where you blundered but doesn't turn it into active training. Lichess gives you excellent generic puzzles but can't target your specific blind spots. Cassandra closes the loop: analyse → extract → drill.

Additional training modes include [The Prophecy](/prophecy) — a daily brilliant-move challenge, [The Scales](/scales) — a move-ranking exercise that trains positional evaluation, and [The Echo](/echo) — retrograde analysis that trains you to read positions backwards.

Everything is free. No subscription, no puzzle limits, no paywalled game analysis.

## ChessTempo — Tactical Depth

ChessTempo has been around for over a decade and still offers some of the best puzzle curation available. The difficulty calibration is precise, and the comment system on puzzles provides community-sourced explanations.

The free tier is more generous than Chess.com's — you get unlimited standard puzzles. The premium tier ($30/year) adds blitz puzzles, custom problem sets, and detailed statistics.

**Best for:** players who want a large, well-calibrated puzzle database with detailed performance analytics.

## Chess24/chess24.com — Video Content

Now part of the Chess.com ecosystem, chess24 still has a library of instructional videos from top grandmasters. Some content is free; most requires a subscription.

**Best for:** players who learn well from video content and want grandmaster-level instruction.

## Which Should You Use?

The honest answer: use multiple tools for different purposes.

- **Play games** on Chess.com or Lichess (whichever community you prefer)
- **Analyse games** on Lichess (free, full-depth Stockfish) or Cassandra (automatic analysis with puzzle extraction)
- **Train tactics** on Cassandra (personal puzzles from your games) + Lichess (broad tactical vocabulary)
- **Study openings** on Lichess opening explorer (free, comprehensive)

The critical insight is that the most valuable training tool isn't the one with the most features — it's the one that targets your specific weaknesses. A [free chess tactics trainer](/learn/chess-tactics-trainer-free) that gives you positions from your own games will improve your rating faster than a premium subscription to a platform that gives you random positions from everyone's games.

**[Get free personalised training →](/connect)**`,
  },
  {
    slug: "how-to-get-better-at-chess-fast",
    title: "How to Get Better at Chess Fast: What Actually Works",
    metaTitle: "How to Get Better at Chess Fast — Proven Methods",
    metaDescription:
      "Want to improve at chess quickly? The fastest path isn't more games or more videos — it's fixing your specific mistakes with targeted training.",
    themes: ["fork", "pin", "discoveredAttack", "mateIn2"],
    content: `There are hundreds of articles about chess improvement. Most of them say the same things: solve puzzles, study openings, learn endgames, play longer time controls. This advice isn't wrong. But it's generic, and generic advice produces generic results.

If you want to improve fast — measurably, within weeks — you need to do something different from what you've been doing. Here's what the research on skill acquisition and the data from thousands of improving players actually shows.

## The 80/20 of Chess Improvement

In any complex skill, a small number of changes produce most of the improvement. For chess, the highest-leverage activities are:

**1. Stop making the same mistakes.** This sounds obvious, but most players don't do it systematically. They review their blunders, nod, and move on. The blunders come back. The fix is active drilling — putting yourself back in the position where you went wrong and finding the correct move under pressure. For the complete method, see [how to train on your blunders](/learn/chess-blunder-training).

**2. Train on YOUR positions, not random ones.** Generic puzzles improve your general tactical awareness. Personal puzzles — from your own games — improve your specific weaknesses. The difference in improvement speed is significant. A player who solves 50 personal puzzles will improve faster than one who solves 200 random ones. See [why random puzzles plateau your rating](/learn/chess-improvement-plateaus).

**3. Play, analyse, train — in a loop.** Most players do one of these but not all three in sequence. They play games without analysing them. Or they analyse but don't train on the mistakes. Or they train but don't play enough games to generate new material. The fastest improvers play a game, analyse it within 24 hours, and drill the positions where they went wrong.

## What Doesn't Work (Despite Being Popular)

**Watching chess videos for hours.** Videos are entertainment with a thin layer of education. You feel like you're learning because you're consuming information, but passive consumption doesn't build skills. Watch videos for enjoyment; don't count them as training.

**Memorising opening lines past move 8.** Below 2000 Elo, your opponents won't play the main line. The time you spend memorising move 14 of the Najdorf is time you could spend learning what to do when your opponent deviates on move 6. See [why opening mistakes aren't really about openings](/learn/chess-opening-mistakes).

**Playing hundreds of blitz games without analysis.** Playing is necessary, but unanalysed games are practice without feedback. You're reinforcing whatever habits you already have — good and bad. If you're going to play blitz, analyse at least one game per session.

**Solving puzzle rush for 30 minutes.** Puzzle rush is addictive and fun, but it optimises for speed on random positions rather than depth on your weak positions. It's better than nothing, but it's not targeted training. See [beyond puzzle rush](/learn/chess-puzzle-rush-alternatives) for why.

## The Fastest Path: A 4-Week Plan

**Week 1: Baseline.** Play 5–7 games at your normal time control. Analyse each game using the 5-step method from our [game analysis guide](/learn/how-to-analyse-chess-games). Identify your top 3 recurring mistake types.

**Week 2: Targeted drilling.** Connect your account to Cassandra and let us analyse your games. Start solving your personalised puzzles — focus on the mistake types you identified. Aim for 10–15 puzzles per day, spending 15–20 minutes total.

**Week 3: Reinforce and expand.** Continue daily personal puzzles. Add 5 minutes of generic puzzles from the Lichess database to broaden your pattern recognition. Play 3–4 games and analyse each one.

**Week 4: Measure.** Compare your blunder rate in weeks 3–4 to week 1. Most players see a 30–50% reduction in blunder frequency. Rating improvement typically follows within 1–2 weeks after the blunder rate drops.

## Realistic Expectations

With consistent daily training (15–20 minutes), most players can expect:

- **50–100 rating points** in the first month
- **100–200 rating points** over 3 months
- **Measurable reduction in blunder rate** within 2 weeks

These numbers vary based on starting level, time control, and consistency. Players below 1200 often improve faster because their mistakes are more concrete and fixable. Players above 1600 improve more slowly because the remaining mistakes are subtler.

The key variable isn't talent or study material — it's consistency. Fifteen minutes every day beats two hours once a week. Spacing is the most powerful learning principle in cognitive science, and it applies directly to chess.

## The One Thing to Do Today

If you do nothing else from this article, do this: play one game, analyse it, identify your biggest mistake, and solve that position 5 times. That single cycle — play, analyse, drill — is the engine of chess improvement. Everything else is optimising around it.

**[Start your first cycle — free game analysis →](/connect)**`,
  },
  {
    slug: "chess-puzzle-rush-alternatives",
    title: "Beyond Puzzle Rush: Why Random Puzzles Are Slowing Your Progress",
    metaTitle: "Puzzle Rush Alternatives — Train Smarter Than Random Puzzles",
    metaDescription:
      "Puzzle rush is addictive but trains you on random positions. Here's why targeted puzzle training improves your rating faster than speed-solving random tactics.",
    themes: ["fork", "pin", "skewer", "mateIn1"],
    content: `Puzzle rush is one of the most popular features in online chess. The format is simple: solve as many puzzles as you can in a time limit, with puzzles getting progressively harder. Your score is the number solved before three mistakes or time runs out.

It's engaging, competitive, and genuinely fun. It's also one of the least efficient ways to improve at chess.

## Why Puzzle Rush Feels Like It Works

Puzzle rush creates a compelling feedback loop. You see your score, you want to beat it, you try again. The leaderboard adds social motivation. The increasing difficulty creates a satisfying sense of challenge. After a 20-minute session, you feel like you've trained hard.

And you have trained — but on what? Puzzle rush serves positions from a generic database, sequenced by difficulty. The positions have no connection to your opening repertoire, your playing style, or your documented weaknesses. You might spend 5 minutes solving knight fork puzzles when you already see knight forks perfectly, while the discovered attack patterns that cost you games never appear.

The feeling of productive training isn't the same as actual productive training. Puzzle rush trains pattern recognition broadly; it doesn't fix your specific problems.

## The Random Puzzle Problem

The core issue with puzzle rush (and most generic puzzle trainers) is randomness. Each puzzle is drawn from a large database without regard to what you personally need to practice.

This is like a basketball player practising shots from every position on the court in random order. It'll improve their overall shooting, but if their free throws are the specific weakness losing them games, random practice is wildly inefficient compared to 100 focused free throws.

In chess terms: if you lose rating points because you miss back-rank threats in rook endings, you need back-rank and rook ending positions — not a random sample of forks, pins, and mates from all phases of the game.

The research on this is clear. Psychologist Anders Ericsson's work on deliberate practice shows that improvement comes from training at the edge of your specific abilities with targeted feedback — not from general volume. For more on why this plateau happens, see our article on [chess improvement plateaus](/learn/chess-improvement-plateaus).

## What Puzzle Rush Gets Right

Credit where it's due: puzzle rush does some things well.

**Speed training.** Solving under time pressure builds tactical fluency — the ability to see patterns quickly without deep calculation. This is valuable in blitz and bullet games where intuition dominates.

**Low barrier.** You don't need to prepare or choose a training plan. Open puzzle rush, click start, go. This accessibility gets people training who might not otherwise.

**Motivation.** The score and leaderboard create extrinsic motivation that keeps people coming back. Consistency is valuable even when the training is suboptimal.

## Better Alternatives

If you want the engagement of puzzle rush with the effectiveness of targeted training, here are better approaches:

**Personal puzzle bank.** Cassandra analyses your Chess.com and Lichess games and builds a puzzle bank from your actual blunders. Every puzzle is drawn from a position where you made a real mistake. This means 100% of your training time targets your documented weaknesses. Learn more in our guide to [blunder training](/learn/chess-blunder-training).

**Themed puzzle sets.** Instead of random puzzles, focus on one tactical motif per session. Spend 10 minutes on discovered attacks. Tomorrow, spend 10 minutes on pins. This controlled exposure builds depth on specific patterns rather than shallow exposure to all patterns. Lichess supports filtering puzzles by theme.

**The Scales.** Cassandra's [move-ranking mode](/scales) shows you a position with three candidate moves and asks you to rank them from best to worst. This trains positional evaluation — a skill that puzzle rush doesn't touch.

**The Echo.** Cassandra's [retrograde analysis mode](/echo) shows you a position and asks what move was just played. This trains board reading and opponent awareness — skills that complement tactical pattern recognition.

**Timed personal puzzles.** If you love the time pressure of puzzle rush, apply it to your personal puzzles. Set a 15-minute timer and solve as many personal puzzles as you can. Same adrenaline, but every position is targeting your actual weaknesses.

## When Puzzle Rush Is Fine

Puzzle rush isn't bad — it's just not optimal. Use it when:

- You're warming up before a serious training session
- You want a fun break from targeted training
- You're introducing a friend to chess puzzles
- You genuinely enjoy it and it keeps you coming back to chess

Just don't mistake it for serious improvement work. The 20 minutes you spend on puzzle rush would produce more rating gains if spent on 15 personal puzzles from your own games.

## The Bottom Line

Puzzle rush trains you to solve random positions quickly. Personal puzzle training trains you to stop making the specific mistakes that cost you games. Both are valuable, but if you're trying to improve your rating as efficiently as possible, targeted training wins every time.

The fastest path isn't solving more puzzles — it's solving the *right* puzzles. And the right puzzles are the ones from your own games, targeting your own weaknesses, drilled until the patterns become automatic.

**[Build your personal puzzle bank — free →](/connect)**`,
  },
  {
    slug: "chess-rating-improvement-plan",
    title: "Chess Rating Improvement Plan: A 30-Day Blueprint",
    metaTitle: "Chess Rating Improvement Plan — 30-Day Blueprint",
    metaDescription:
      "Most chess improvement plans focus on openings. The fastest gains come from fixing your specific recurring blunders. Here's a 30-day plan that actually works.",
    themes: ["fork", "pin", "discoveredAttack", "mateIn2"],
    content: `Most chess improvement plans read like a syllabus: study openings week one, tactics week two, endgames week three. They're structured, comprehensive, and almost entirely useless for most players.

The problem isn't the content — it's the approach. Generic plans treat every player's weaknesses the same. But a 1000-rated player who hangs pieces in the opening has completely different needs from a 1000-rated player who can't convert won endgames. Treating them identically wastes both players' time.

Here's a 30-day plan built around a different principle: find your specific mistakes and eliminate them.

## Week 1: Diagnosis (Days 1–7)

Play 5–7 games at your normal time control. After each game, analyse it with a free engine — [Lichess does this automatically](/learn/how-to-analyse-chess-games), or connect your account to Cassandra for deeper analysis.

For each game, write down:
- **Where your biggest mistake happened** (opening, middlegame, or endgame)
- **What type of mistake it was** (hanging a piece, missing a tactic, poor endgame technique, time trouble)
- **Whether you've made this type of mistake before**

By day 7, you should see patterns. Most players find that 60–70% of their losses come from 2–3 recurring mistake types. These are your training targets.

## Week 2: Targeted Drilling (Days 8–14)

Now that you know your weak spots, stop solving random puzzles. Instead, train exclusively on positions that match your mistake patterns.

If you keep missing forks, drill fork puzzles. If you blunder in rook endings, drill rook endings. If you lose pieces to discovered attacks, drill discovered attacks.

Cassandra automates this by analysing your games and generating puzzles from the exact positions where you went wrong. But even without automation, you can manually select puzzle themes on Lichess that match your documented weaknesses.

**Daily routine:** 15 minutes of targeted puzzles. That's 8–12 puzzles. Don't rush — spend time on each position before moving. After solving, review why the correct move works.

## Week 3: Reinforce and Test (Days 15–21)

Continue your daily targeted puzzles, but add 3–4 games this week. The goal is to see whether your training is transferring to real games.

After each game, ask: did I face any of my target mistake positions? If so, did I handle them better than in week 1? Even one game where you correctly avoid a recurring blunder is evidence that the training is working.

If you're still making the same mistakes, increase your puzzle volume on those specific patterns. If you've improved on your original weaknesses, identify the next tier of mistakes from your new games.

**Add variety:** supplement your targeted puzzles with 5 minutes of [general tactical training](/learn/chess-tactics-trainer) to maintain broad pattern recognition.

## Week 4: Measure and Adjust (Days 22–30)

Play 5–7 more games and analyse them the same way you did in week 1. Compare your blunder rate, your mistake types, and your results.

Most players following this plan see:
- **30–50% reduction in their primary blunder type**
- **50–100 rating point improvement** (often more for players under 1200)
- **Faster recognition** of patterns they drilled

If your rating hasn't moved but your blunder rate has dropped, keep going — rating follows blunder reduction with a 1–2 week lag.

## Why This Works Better Than Opening Study

Opening study feels productive. You memorise lines, you watch videos, you learn the theory. But below 2000 Elo, your opponent plays an unexpected move by move 6 in most games. All that memorisation is wasted.

Meanwhile, the [blunders you keep making](/learn/chess-blunder-training) are costing you 100–200 rating points right now. Fixing those is immediate, measurable, and permanent. You can always add opening study later — but the fastest gains come from not giving away the games you should be winning.

## The One Principle That Matters

Improvement isn't about studying more. It's about studying the right things. A player who solves 10 puzzles from their own blunders will improve faster than a player who watches 2 hours of grandmaster videos.

Your chess rating is a measure of your weaknesses, not your strengths. Fix the weaknesses, and the rating follows.

**[Find your weaknesses — free game analysis →](/connect)**`,
  },
  {
    slug: "chess-tactics-vs-strategy",
    title: "Chess Tactics vs Strategy: What Should You Study First?",
    metaTitle: "Chess Tactics vs Strategy — What to Study First",
    metaDescription:
      "Tactics or strategy first? The answer is clear: tactics. But the best tactics to study aren't random — they're from your own games.",
    themes: ["fork", "pin", "skewer", "discoveredAttack"],
    content: `The tactics-vs-strategy debate has been around as long as chess education. Tarrasch said strategy is thinking about what to do; tactics is thinking about what to do when there's something to do. Teichmann said chess is 99% tactics. The internet argues about it endlessly.

The answer, for any player under 2000 Elo, is straightforward: **tactics first, always.**

## Why Tactics Come First

Strategy in chess means formulating long-term plans: controlling the centre, creating pawn weaknesses, improving piece activity, targeting weak squares. These concepts matter. But they only matter when both sides play reasonably accurate moves.

Below 2000 Elo, games aren't decided by superior pawn structures or subtle piece manoeuvring. They're decided by blunders. One player hangs a piece, misses a fork, or walks into a back-rank mate. Game over.

No amount of strategic understanding helps if you're losing a piece every 15 moves. Strategy assumes a stable position where you can make plans. Tactics create (and prevent) the instability that ends games.

The data backs this up. Analysis of thousands of games on Chess.com and Lichess shows that players under 1400 make an average of 3–4 tactical blunders per game. Players between 1400–1800 make 1–2. Above 2000, it drops below 1 per game. Strategy becomes relevant when the tactical blunders stop.

## What Tactical Training Looks Like

Effective tactical training has three layers:

**Pattern recognition.** Learn the basic motifs: [forks, pins, skewers, discovered attacks](/learn/chess-tactics-trainer), back-rank threats, removal of the defender. Each pattern is a template that your brain learns to recognise automatically with enough exposure.

**Calculation.** Once you see a potential tactic, you need to calculate whether it actually works. "I think there's a fork" isn't enough — you need to verify it move by move. Puzzle training builds this calculation muscle.

**Application.** Seeing tactics in puzzles is easier than seeing them in games, because in a puzzle you know there's a tactic. In a game, you have to find it while also managing time, evaluating the position, and dealing with nerves. The bridge between puzzles and games is [training on positions from your own games](/learn/chess-blunder-training), where the context is familiar.

## When Strategy Starts Mattering

Strategy becomes relevant when your tactical game is solid enough that you're no longer losing material regularly. For most players, that's around 1600–1800 online rating.

At that level, games are more often decided by:
- **Pawn structure decisions** — creating or avoiding weaknesses
- **Piece activity** — good vs bad bishops, rook placement, knight outposts
- **Planning** — having a concrete idea versus shuffling pieces

Even here, tactics don't stop mattering. They become tools for executing your strategic plans. You create a weak pawn, then win it with a tactical shot. You activate your pieces, then use their activity to launch a combination.

## The Best Tactics to Study

Here's where most tactical training goes wrong: players solve random puzzles. Random puzzles build general pattern recognition, which is useful, but they don't target your specific blind spots.

If you always miss discovered attacks but see forks instantly, spending equal time on both is inefficient. You need 90% discovered attack puzzles and 10% fork puzzles — the exact opposite of what random training gives you.

The most efficient tactical training comes from [your own games](/learn/lichess-puzzles-vs-personal-puzzles). When you blunder in a real game, that position — with that specific piece configuration and that specific tactical pattern — is exactly what you need to drill. Cassandra extracts these positions automatically and turns them into targeted puzzles.

## A Practical Split

For players under 1600:
- **90% tactics, 10% strategy.** Solve puzzles daily. Read strategic concepts occasionally. Your games are decided by tactics.

For players 1600–2000:
- **60% tactics, 40% strategy.** Continue daily puzzles but add strategic study: pawn structures, typical plans in your openings, endgame principles.

For players above 2000:
- **50/50 or personal assessment.** At this level, you know which part of your game needs work. The answer varies by player.

## The Common Mistake

The most common mistake in chess study is studying what's interesting instead of what's useful. Strategy is intellectually appealing — it feels like real chess thinking. Tactics feel mechanical. But mechanics win games.

A player with strong tactics and weak strategy will beat a player with strong strategy and weak tactics almost every time below master level. Fix the tactics first. Strategy can wait.

**[Train your tactics — puzzles from your own games →](/connect)**`,
  },
  {
    slug: "best-chess-apps-2026",
    title: "Best Chess Apps in 2026: Ranked for Real Improvement",
    metaTitle: "Best Chess Apps 2026 — Ranked for Real Improvement",
    metaDescription:
      "An honest comparison of Chess.com, Lichess, and Cassandra in 2026 — what each is best for and where they fall short.",
    themes: ["fork", "pin", "mateIn1", "mateIn2"],
    content: `The chess app market in 2026 is dominated by two giants — Chess.com and Lichess — with a growing ecosystem of specialised tools around them. If you're trying to improve, not just play, which apps deserve your time?

Here's an honest assessment based on what each platform actually delivers for chess improvement, not what their marketing promises.

## 1. Lichess — Best Free All-Rounder

**Price:** Free. Everything. No tiers.

Lichess remains the gold standard for free chess tools. Every feature that Chess.com charges for — unlimited puzzles, full-depth game analysis, opening explorer, study tools, tournament creation — Lichess offers for free.

**Best for:** Playing, game analysis, puzzle volume, opening research.

**Strengths:**
- Full Stockfish analysis on every game, unlimited
- 4+ million puzzle database, all free
- Opening explorer with master and player databases
- Clean interface with no ads or upselling
- Open source — the community audits and improves the code

**Limitations:**
- No personalised training. Lichess gives you excellent tools but doesn't connect the dots between your analysis and your training. You see your blunders in analysis, then go solve unrelated puzzles
- Smaller playing pool than Chess.com (still large enough for instant matchmaking at all time controls)
- Study features exist but require self-directed learning

**Verdict:** If you're only going to use one platform, Lichess is the best value in chess. For how it compares to personalised training, see [Lichess puzzles vs personal puzzles](/learn/lichess-puzzles-vs-personal-puzzles).

## 2. Chess.com — Best Playing Experience

**Price:** Free tier (limited), Gold $50/year, Platinum $70/year, Diamond $100/year

Chess.com is where most of the chess world plays. The largest player pool, the best content creators, and a polished mobile app make it the default choice for online chess.

**Best for:** Playing games, watching streamers, social features, casual engagement.

**Strengths:**
- Largest player pool — fastest matchmaking, most accurate ratings
- Excellent mobile app
- Strong content ecosystem (videos, articles, courses)
- Game review with natural language explanations (paid)
- Puzzle rush and puzzle battle (engaging, if not optimal for training)

**Limitations:**
- Free tier is severely limited: 1 game review/day, limited puzzles, no opening explorer
- Full improvement tools require $70–100/year
- Game analysis is shallower than Lichess's (even on premium)
- Training tools are broad but not personalised

**Verdict:** Great for playing, adequate for improvement if you're paying. The [free alternatives](/learn/chess-com-alternatives) cover most of what the premium tier offers.

## 3. Cassandra — Best Personalised Training

**Price:** Free. No subscriptions.

Cassandra takes a different approach: it's not a playing platform. Instead, it connects to your Chess.com or Lichess account, analyses your games with Stockfish, and builds a personalised puzzle bank from your actual mistakes.

**Best for:** Targeted improvement, fixing recurring blunders, training efficiency.

**Strengths:**
- Personal puzzles from your own games — every puzzle targets a real weakness
- Free game analysis with Stockfish (same depth Chess.com charges for)
- Multiple training modes: standard puzzles, [The Prophecy](/prophecy) (daily brilliant-move challenge), [The Scales](/scales) (move-ranking), [The Echo](/echo) (retrograde analysis)
- No paywall on any feature

**Limitations:**
- Not a playing platform — you still need Chess.com or Lichess for games
- Smaller community (newer platform)
- No video content or courses

**Verdict:** The highest-leverage training tool available. Use it alongside your playing platform of choice.

## 4. ChessTempo — Best Puzzle Calibration

**Price:** Free (standard puzzles unlimited), Premium $30/year

ChessTempo has been refining its puzzle rating system for over a decade. If you want precisely calibrated puzzles with detailed statistics about your solving performance, it's the best option.

**Best for:** Players who want data-driven puzzle training with accurate difficulty ratings.

**Limitations:** Dated interface, no game analysis, puzzles are generic (not personalised).

## 5. Chess24 — Best Video Content

**Price:** Integrated into Chess.com ecosystem

Now part of Chess.com, chess24 retains its library of grandmaster-led video courses. The quality is high, but passive video watching is the [least efficient form of chess training](/learn/how-to-get-better-at-chess-fast).

**Best for:** Players who learn well from structured video instruction.

## The Optimal Stack

Most improving players benefit from using 2–3 apps for different purposes:

1. **Play games** on Chess.com or Lichess (pick your preferred community)
2. **Train weaknesses** on Cassandra (personal puzzles from your games)
3. **Supplement** with Lichess puzzles (broad tactical vocabulary)

This combination gives you the playing pool of a major platform, personalised training that targets your specific mistakes, and broad puzzle exposure for general pattern recognition.

The key insight: the best chess app isn't the one with the most features. It's the one that makes you fix the mistakes that are actually costing you rating points. For most players, that means [personalised puzzle training](/learn/chess-blunder-training) over premium subscriptions.

**[Start free personalised training →](/connect)**`,
  },
  {
    slug: "chess-study-plan-beginners",
    title: "The Complete Chess Study Plan for Beginners (0–1000 Rating)",
    metaTitle: "Chess Study Plan for Beginners — 0 to 1000 Rating",
    metaDescription:
      "A step-by-step chess study plan for beginners rated 0–1000. What to focus on at each stage, with free tools and training exercises.",
    themes: ["mateIn1", "fork", "pin", "mateIn2"],
    content: `Starting chess can be overwhelming. There are openings to learn, tactics to study, endgames to practise, and thousands of YouTube videos telling you different things. Most beginners try to learn everything at once and end up learning nothing effectively.

Here's a structured study plan that takes a complete beginner from 0 to 1000 rating. Each phase builds on the last, and you don't move on until the current phase is solid.

## Phase 1: Rules and Basic Checkmates (Rating 0–400)

**Duration:** 1–2 weeks

**Focus:** Learn how every piece moves, what check and checkmate mean, and how to deliver basic checkmates.

**What to study:**
- How each piece moves and captures (including en passant and castling)
- The difference between check, checkmate, and stalemate
- King + Queen vs King mate
- King + Rook vs King mate
- How to avoid stalemate when you're winning

**How to practise:** Play games against the computer on the lowest setting. Don't worry about winning — focus on making legal moves confidently and recognising when the king is in check.

**When to move on:** You can consistently deliver checkmate with King + Queen vs King in under 20 moves, and you never make an illegal move.

## Phase 2: Piece Safety (Rating 400–600)

**Duration:** 2–3 weeks

**Focus:** Stop giving away pieces for free. This single skill separates 400-rated players from 600-rated players.

**What to study:**
- Before every move, ask: "Is my piece safe on that square?"
- Before every move, ask: "Is my opponent's last move threatening any of my pieces?"
- Learn the point values: pawn = 1, knight = 3, bishop = 3, rook = 5, queen = 9

**How to practise:** Start solving [mate-in-1 puzzles](/learn/chess-puzzles-for-beginners). These train you to see when a king is vulnerable, which is the foundation of all tactics. Aim for 5 puzzles per day.

**When to move on:** You rarely hang pieces in one move (you might still miss two-move threats, and that's fine). You can find mate-in-1 in most positions within 30 seconds.

## Phase 3: Basic Tactics (Rating 600–800)

**Duration:** 3–4 weeks

**Focus:** Learn the four fundamental tactical patterns that win material.

**What to study:**
- **Forks** — one piece attacks two targets. [Knights are the best forking pieces](/learn/chess-tactics-trainer).
- **Pins** — a piece can't move because it would expose something more valuable behind it.
- **Skewers** — the reverse of a pin; the valuable piece is in front and must move.
- **Discovered attacks** — move one piece to reveal an attack from another.

**How to practise:** Solve 10 tactical puzzles per day, focusing on one theme per session. Cassandra's puzzle bank draws from real games and sorts by theme, so you can drill forks one day and pins the next.

**Daily routine (15 minutes):**
- 5 minutes: solve puzzles on your weakest theme
- 5 minutes: solve mixed tactical puzzles
- 5 minutes: play one 10-minute game and review the biggest mistake

**When to move on:** You can spot forks and pins in puzzles within 15 seconds. Your blunder rate in games has dropped noticeably.

## Phase 4: Opening Principles and Game Analysis (Rating 800–1000)

**Duration:** 4–6 weeks

**Focus:** Learn opening principles (not memorised lines) and start analysing your games.

**What to study:**
- **Control the centre** with pawns (e4/d4 or e5/d5) and develop pieces toward it
- **Develop all pieces before attacking** — move each piece once before moving any piece twice
- **Castle early** to protect your king
- **Don't move your queen out early** — it'll get chased around and you'll lose tempo

**Do NOT study:** Specific opening theory. At this level, your opponents won't play theory, so memorising lines is wasted effort. See [why opening mistakes aren't really about openings](/learn/chess-opening-mistakes).

**How to practise:**
- Continue 10 tactical puzzles per day
- After every game, use free analysis (Lichess or Cassandra) to find your biggest mistake
- Connect your account to Cassandra to build a [personal puzzle bank from your blunders](/learn/chess-blunder-training)

**Daily routine (20 minutes):**
- 10 minutes: solve personal puzzles from your own games
- 5 minutes: play one 10-minute game
- 5 minutes: analyse that game, identify the turning point

**When to move on:** You consistently reach 1000 rating. Your games last longer than 25 moves on average. You can articulate why you lost each game.

## What NOT to Study Below 1000

- **Opening theory.** Principles only. Lines are for 1400+.
- **Endgame theory beyond basic mates.** You won't reach complex endgames often enough for it to matter yet.
- **Positional chess and strategy.** [Tactics decide your games right now](/learn/chess-tactics-vs-strategy). Strategy comes later.
- **Master games.** You won't understand why they're making the moves they make. It's entertainment, not education, at this stage.

## The Most Important Habit

Whatever else you do, build one habit: **analyse every game you play.** Not the next day. Not when you feel like it. Immediately after the game, spend 2 minutes looking at the position where the game turned.

This single habit — play, review, learn — is what separates players who improve from players who stay at the same rating for years. Tools like Cassandra automate the hardest part by turning your mistakes into targeted training.

**[Start your training plan — connect your account free →](/connect)**`,
  },
  {
    slug: "chess-mistakes-beginners-make",
    title: "The 7 Biggest Chess Mistakes Beginners Make (And How to Fix Them)",
    metaTitle: "7 Biggest Chess Mistakes Beginners Make — And Fixes",
    metaDescription:
      "These 7 common beginner chess mistakes cost you the most rating points. Each one has a specific fix and training approach.",
    themes: ["mateIn1", "fork", "pin", "hangingPiece"],
    content: `Every chess beginner makes mistakes. That's expected. But some mistakes cost far more rating points than others, and most beginners don't know which ones to fix first.

Here are the seven mistakes that cost beginners the most games, ranked by impact, with a specific fix for each one.

## 1. Hanging Pieces

**What it is:** Leaving a piece where your opponent can capture it for free. No trade, no compensation — you just lose material.

**Why it's #1:** Hanging a piece is an instant losing position in most games. A full piece advantage (knight or bishop) is enough to win at any level with reasonable technique. Below 1000 rating, hanging pieces decides roughly 40% of games.

**The fix:** Before every move, count the attackers and defenders on your destination square. If there are more attackers than defenders, don't go there unless you've calculated a specific reason. After you move, scan the board for any of your pieces that are now undefended.

**Training:** Solve [beginner puzzles](/learn/chess-puzzles-for-beginners) daily. The pattern recognition transfers directly to spotting hanging pieces in games.

## 2. Moving the Queen Out Early

**What it is:** Bringing the queen into the opponent's side of the board in the first 5–6 moves, usually chasing pawns.

**Why it matters:** The queen is your most valuable piece and your opponent's best target. When you move it out early, your opponent develops pieces with tempo by attacking it. You end up with a wandering queen and no developed pieces while your opponent has a fully coordinated army.

**The fix:** Don't move your queen past your third rank before all your minor pieces (knights and bishops) are developed and you've castled. The only exception is if there's a forced checkmate.

**Training:** Follow the opening principles in our [beginner study plan](/learn/chess-study-plan-beginners): develop knights and bishops, castle, then consider queen activity.

## 3. Ignoring Opponent Threats

**What it is:** Making your own plans without checking what your opponent is threatening.

**Why it matters:** Chess is a two-player game, but beginners often play it like solitaire. They have a plan — attack the f7 pawn, push the h-pawn, trap the bishop — and execute it without noticing their opponent is threatening checkmate.

**The fix:** Before every move, ask one question: **"What is my opponent's threat?"** If their last move attacks something, deal with the threat before continuing your plan. This single habit eliminates more losses than any amount of tactical study.

**Training:** [The Echo](/echo) trains you to read positions by asking what move was just played — building the habit of paying attention to your opponent's last move.

## 4. Not Castling (or Castling Too Late)

**What it is:** Leaving your king in the centre for 15+ moves, usually because you're focused on attacking.

**Why it matters:** The centre is where files open first. An uncastled king on e1 (or e8) is exposed to attacks along the e-file and diagonals. Castling moves your king to safety and connects your rooks — two benefits in one move.

**The fix:** Make castling a priority by move 8–10. Develop your kingside knight and bishop first, then castle. If you find yourself on move 12 without having castled, alarm bells should ring.

## 5. Trading Without a Reason

**What it is:** Exchanging pieces just because you can. "His bishop is near my knight, I'll take it."

**Why it matters:** Every trade changes the position, and not always in your favour. Trading pieces when you're ahead in development helps your opponent by simplifying the position. Trading pieces when you're behind in material makes it easier for your opponent to convert.

**The fix:** Before every capture, ask: "Does this trade help me or my opponent?" Trade when you're ahead in material (simplification favours the side with more material). Avoid trades when you're behind or when you have more active pieces.

## 6. Pawn Grabbing on the Flanks

**What it is:** Chasing pawns on the a- and h-files with your queen or bishop while your opponent develops and attacks the centre.

**Why it matters:** The centre is where games are won and lost. Pawns on the edges of the board are worth the same one point as centre pawns, but grabbing them costs tempo and pulls your pieces to the side of the board. Meanwhile, your opponent builds a menacing centre and starts an attack.

**The fix:** Only capture flank pawns when (1) you can do it without losing tempo, (2) your development is already complete, or (3) the pawn creates a specific problem for your opponent (like a passed pawn).

## 7. Not Learning From Losses

**What it is:** Losing a game and immediately starting another one without understanding why you lost.

**Why it matters:** This is the mistake that keeps all the other mistakes alive. If you don't review your games, you'll make the same errors for months or years. Every unanalysed loss is a wasted learning opportunity.

**The fix:** After every loss (and every win where you were in trouble), spend 2 minutes in analysis. Find the move where the game turned. Understand why it was a mistake. Better yet, connect your account to Cassandra and let us [turn your mistakes into puzzles](/learn/chess-blunder-training) automatically.

## How to Prioritise

Don't try to fix all seven at once. Focus on one per week:

**Week 1:** Stop hanging pieces (count attackers and defenders).
**Week 2:** Keep your queen home until developed.
**Week 3:** Check opponent threats before every move.
**Week 4:** Castle by move 10.
**Weeks 5–6:** Trade purposefully. Avoid flank pawn grabbing.
**Ongoing:** Analyse every game.

Each fix builds on the previous one. By the end of six weeks, you'll have eliminated the mistakes that cost beginners the most rating points.

## The Compound Effect

Fixing these mistakes doesn't just prevent losses — it creates wins. When you stop hanging pieces, you win games against opponents who still hang theirs. When you castle early and they don't, you get attacking chances. When you check their threats and they ignore yours, you land tactics.

The path from beginner to intermediate isn't about learning brilliant moves. It's about stopping bad ones. Fix the leaks, and the rating takes care of itself.

**[Find your specific mistakes — free game analysis →](/connect)**`,
  },
  {
    slug: "retrograde-analysis-chess-training",
    title: "Retrograde Analysis: The Lesser-Known Training Method That Sharpens Your Chess Intuition",
    metaTitle: "Retrograde Analysis Chess Training — The Echo | Cassandra",
    metaDescription:
      "Most chess players have never tried retrograde analysis. Here's why it's one of the most effective ways to build positional intuition — and how to train with it.",
    themes: ["retrograde"],
    content: `Most chess training asks the same question: what's the best move from here?

Retrograde analysis asks the opposite: what move just happened?

It's a lesser-known training format — more common in chess composition circles than in regular study routines. But the cognitive skill it builds is genuinely different from standard puzzle training, and that difference is worth understanding.

## What retrograde analysis actually is

In a standard chess puzzle, you're given a position and asked to find the winning continuation. The position is the starting point, and you reason forward.

In retrograde analysis, you're shown a position and asked to work backwards. Given this board state — what was the last move? Which piece moved, from where, and why does it matter?

It sounds simple. It isn't. The moment you try it seriously, you realise how much of your chess thinking is forward-only. You know how to look for threats. You know how to evaluate plans. But reading a position backwards — understanding how it was constructed — is a completely different cognitive mode.

## Why it makes you better

The skill retrograde analysis builds is positional reading. When you can look at a board and immediately understand its history — which pieces have moved, what exchanges happened, what the pawn structure implies about the middlegame that led here — you're reading chess at a deeper level than most players ever reach.

Strong players do this automatically. They look at a position and understand it structurally, not just tactically. Retrograde training builds exactly that skill.

## The Echo

Cassandra's Echo mode is built entirely around retrograde analysis. You're shown a position and asked to identify the move that was just played. Not the best move from here — the move that created this position.

The positions come from real games. The moves are meaningful — not random, but instructive. Each one teaches you something about how positions are constructed and why certain structures appear.

It's the training method serious players have used for generations, now available as an interactive mode you can do in five minutes a day.

**[Start training with The Echo →](/echo)**`,
  },
  {
    slug: "chess-move-ranking-training",
    title: "Move Ranking: The Training Method That Teaches You to Think Like a Chess Engine",
    metaTitle: "Chess Move Ranking Training — The Scales | Cassandra",
    metaDescription:
      "Most puzzles are binary — right or wrong. Move ranking trains the skill that actually matters in real games: evaluating which moves are better than others.",
    themes: ["move_ranking"],
    content: `Most chess puzzles have one right answer.

Real chess doesn't work that way.

In a real game, you're rarely choosing between a brilliant move and a blunder. You're choosing between three or four reasonable moves — and the skill is knowing which one is best, and why.

## The problem with binary puzzle training

Standard tactics training is binary: you either find the winning move or you don't. That's a valuable skill. Pattern recognition matters. But it trains a narrow version of chess thinking — the kind that works when there's a forcing sequence available.

Most positions don't have a forcing sequence. Most positions require you to evaluate candidate moves, weigh their merits, and choose the strongest plan. Binary puzzles don't train that at all.

## Move ranking as a training format

The Scales works like this: you're given a position and asked to find your three best moves. Not from a pre-selected list — from scratch, the same way you'd think in a real game.

Your three candidates are then compared against Stockfish's top three moves, with centipawn evaluations showing exactly how close your choices were to the engine's assessment. Did you find the best move? Did you find it but rank it third? Did you miss it entirely in favour of something reasonable but weaker?

The feedback is immediate and precise. You're not just told you were wrong — you're shown the centipawn score for each of your candidates, how they compare to Stockfish's top three, and the follow up Stockfish would do.

## What The Scales trains

This is a fundamentally harder task than standard puzzle training. You're not pattern matching to a known tactic. You're generating a candidate list from the position itself — which is exactly what you do in every real game you play.

Over time it builds the evaluative instinct that separates improving players from plateauing ones. Not just what the best move is, but how to think about everything around it.

That's the skill that wins games.

**[Train with The Scales →](/scales)**`,
  },
  {
    slug: "why-chess-accuracy-scores-dont-make-you-better",
    title: "Why Chess Accuracy Scores Don't Make You Better (And What Does)",
    metaTitle: "Why Chess Accuracy Scores Don't Make You Better — Cassandra",
    metaDescription:
      "Everyone checks their accuracy score after a game. But does it actually help you improve? Here's what the research says — and what to do instead.",
    themes: ["improvement", "analysis", "training"],
    content: `Every chess player knows the ritual. The game ends, you click "Analysis," and the first thing you look at is your accuracy score. 94% — great game. 71% — rough one. You nod, close the tab, and queue another game.

But here's the thing: that number didn't make you any better.

## The accuracy score trap

Accuracy scores tell you what happened — but not what to do about it. Seeing a red move on the analysis board doesn't mean you'll recognise that pattern next time it appears. Recognition in review and recognition under game pressure are completely different cognitive skills.

The score gives you a feeling — satisfaction or frustration — but feelings aren't training. You can check your accuracy after a thousand games and still make the same mistakes in the same types of positions.

The trap is that it *feels* like you're learning. You saw the mistake. You understand why it was wrong. Surely that counts for something? It does — but far less than you think.

## The problem with move-by-move review

Most players' post-game routine looks like this: click through the moves, pause on the red ones, read the engine's suggestion, think "ah, I should have seen that," and move on.

This is passive review. It's the chess equivalent of re-reading your textbook highlights before an exam. Research on learning and memory is unambiguous: passive review produces a feeling of familiarity, not actual recall ability.

The difference matters enormously. Familiarity means you recognise the pattern when someone shows it to you. Recall means you spot it yourself, under time pressure, with no hint that it's there. Every blunder you make in a real game is a recall failure — and passive review doesn't fix recall failures.

## What actually makes you better

The research on skill acquisition — from Ericsson's deliberate practice to Bjork's desirable difficulties — points to one mechanism that reliably converts mistakes into improvement: active recall with spaced repetition.

The process is simple:

- Take a position where you made a mistake
- Turn it into a puzzle — the position is the prompt, the correct move is the answer
- Solve it. Not today, when you still remember it. Solve it three days later, then a week later, then a month later
- Each time you solve it, the pattern gets encoded more deeply

This is how flashcards work for language learning, and it's how chess patterns get fixed. The key is that you're actively retrieving the answer from memory, not passively recognising it when shown.

## How to actually use your game analysis

Stop checking your accuracy score. Or check it if you want — but don't confuse that with training.

Instead, take your three worst mistakes from each game and turn them into puzzles. Come back to them. Solve them again when you've forgotten the answer. That's when the real learning happens — at the point of difficulty, not the point of comfort.

Over time, you build a personal puzzle bank weighted toward your specific weaknesses. Not random tactics from a generic database — your tactics, from your games, targeting the exact patterns you struggle with.

## Cassandra does this automatically

Connect your Chess.com or Lichess account, and Cassandra scans your games for mistakes — missed tactics, miscalculations, positions that slipped away. Each one becomes a personalised puzzle that you train on until the pattern sticks.

No accuracy scores. No passive review. Just the positions where you went wrong, drilled until you get them right.

**[Connect your account — free, no paywall →](/connect)**`,
  },
];

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

/**
 * Returns a localised copy of the article if a translation exists,
 * otherwise falls back to the English original.
 */
export function getLocalizedArticle(slug: string, locale: string): Article | undefined {
  const base = ARTICLES.find((a) => a.slug === slug);
  if (!base || locale === "en") return base;

  // Lazy-import to keep the main bundle small when locale is "en"
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ARTICLE_TRANSLATIONS } = require("./articles-i18n") as typeof import("./articles-i18n");
  const override = ARTICLE_TRANSLATIONS[`${locale}:${slug}`];
  if (!override) return base;

  return { ...base, ...override };
}

/**
 * Returns all articles with localised overrides applied.
 */
export function getLocalizedArticles(locale: string): Article[] {
  if (locale === "en") return ARTICLES;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ARTICLE_TRANSLATIONS } = require("./articles-i18n") as typeof import("./articles-i18n");

  return ARTICLES.map((a) => {
    const override = ARTICLE_TRANSLATIONS[`${locale}:${a.slug}`];
    return override ? { ...a, ...override } : a;
  });
}
