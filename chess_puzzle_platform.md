# Chess Puzzle Platform — Claude Code Spec

> **How to use this file:** Work through one phase at a time. Complete each phase fully, run the app, and confirm it works before proceeding to the next. Do not begin a new phase until the current one is reviewed. Read `CLAUDE.md` first to understand the auth and DB stack before writing any code.

---

## Project Context

- **Stack:** React / Next.js
- **Chess data source:** Lichess open puzzle database — https://database.lichess.org/#puzzles
- **Chess libraries:** Use `chess.js` for move validation/logic. Use `react-chessboard` or `chessground` for board rendering — check what is already installed before adding new dependencies.
- **Auth and DB:** Defined in `CLAUDE.md` — read this before writing any schema or API routes.
- **Guiding principle:** All features are additive. Do not break or replace existing puzzle functionality.

---

## Phase 1: Retrograde Analysis Puzzles

### What this is
Before the user plays their move in a standard puzzle, they must first identify **what move the opponent just played** to reach the current position.

### Implementation

**Puzzle flow:**
1. Board loads showing the puzzle position
2. User is asked: *"What was [White/Black]'s last move?"*
3. Four multiple-choice options are displayed — one correct, three plausible distractors
4. User selects an answer
5. If correct: the standard puzzle continuation unlocks and proceeds as normal
6. If incorrect: show the correct last move with a brief explanation, then allow retry or skip

**Distractor generation logic:**
- Generate all legal moves from the position *prior* to the puzzle start position (reconstruct using the PGN/FEN history from Lichess data)
- Filter to 3 distractors weighted toward: captures, checks, and moves involving the same piece as the correct answer
- Avoid obviously illegal or nonsensical moves as distractors

**Data tagging:**
- Add a `type` column to the puzzles table: `"retrograde" | "opponent_prediction" | "standard"`
- Tag Lichess puzzles as `retrograde` where the last move is tactically meaningful — use puzzles where the `Moves` field begins with a capture or check as a proxy filter on import

**UI requirements:**
- Multiple choice buttons must be touch-friendly (minimum 44px tap target)
- Show a small board preview of each candidate move on hover (desktop) or on tap-to-expand (mobile)
- Loading skeleton while options generate

**API route needed:**
- `GET /api/puzzles/[id]/last-move-options` — returns the correct last move plus 3 distractors for a given puzzle

---

## Phase 2: Opponent Prediction Puzzles

### What this is
A standalone puzzle type where the user predicts **what the opponent will play**, not finds the best move. This trains defensive awareness and pattern recognition of opponent threats.

### Implementation

**Puzzle flow:**
1. Show a position and ask: *"What will your opponent play next?"*
2. Four multiple-choice options, each showing a candidate move
3. Optional: after the first move, ask for the opponent's follow-up (2–3 moves ahead for advanced puzzles)
4. Scoring:
   - Full points: correct full sequence
   - Partial points: correct first move only
5. After completion, display: *"Your opponent was threatening [X]"* — a one-line explanation of the idea

**Sourcing from Lichess:**
- Source from puzzles where the opponent's response is forcing or thematic
- Good candidate themes from Lichess tags: `deflection`, `backRankMate`, `zwischenzug`, `pin`, `fork`
- Tag these as `type: "opponent_prediction"` on import

**Distractor generation:**
- Same logic as Phase 1 — legal moves weighted toward captures and checks
- Avoid the puzzle's *best* move as a distractor (that would be misleading)

**UI requirements:**
- Board previews on each option (hover/tap)
- Sequence view for multi-move predictions: show move 1 result board before asking move 2
- Touch-friendly, mobile-first layout

**API routes needed:**
- `GET /api/puzzles/opponent-prediction` — returns a random opponent prediction puzzle
- `POST /api/puzzles/[id]/predict` — accepts the user's predicted sequence, returns scoring and explanation

---

## Phase 3: Timer and Player Comparison

### What this is
Every puzzle is timed. After solving, the user sees how their time compares to other players — similar to chess.com's move accuracy feedback.

### Implementation

**Timer behavior:**
- Start automatically when the puzzle board finishes loading
- Stop on: correct solution, incorrect attempt (show time taken before retry), or user skipping
- Display as a live countdown or count-up — match whichever convention is already used in the UI

**Storing solve times:**
- Create a `puzzle_attempts` table (see Schema section below)
- Write on every puzzle completion: `user_id`, `puzzle_id`, `solve_time_ms`, `success`, `created_at`

**Post-solve comparison UI:**
- After solving, show a result card:
  - *"You solved this in 14s"*
  - *"Average solve time: 23s"*
  - *"Top 10% solve in under 9s"*
- Percentile buckets: Top 10% / Top 25% / Average / Below Average
- Pull aggregate stats from DB on solve (or cache per puzzle)

**Time control context:**
- Add `time_control_preference` to the user profile: `Bullet | Blitz | Rapid | Classical`
- Display a contextual note beneath the timer result: *"For a Blitz player, this type of position should take ~10–15 seconds"*
- Benchmark thresholds per time control per puzzle theme — define reasonable defaults (e.g. Bullet: <8s, Blitz: 8–20s, Rapid: 20–45s)

**Leaderboard per puzzle:**
- Show top 10 fastest solves for each puzzle: username + time
- API route: `GET /api/puzzles/[id]/leaderboard`

**API routes needed:**
- `POST /api/puzzles/[id]/attempt` — records solve time and success, returns percentile result
- `GET /api/puzzles/[id]/leaderboard` — returns top 10 solve times for the puzzle

---

## Phase 4: Homepage Stats, SEO, and Forum Scraping

### 4a — Homepage Trust Signals

**What to build:**
- Two live counters displayed prominently on the homepage (not in the footer):
  - *"X puzzles solved"*
  - *"X registered players"*
- Pull from DB aggregates on page load
- Style as large typographic numbers — prominent, not subtle

**Implementation:**
- Create a `site_stats` table (see Schema section)
- Increment `total_puzzles_solved` on each successful puzzle attempt (can use DB trigger or application logic)
- `total_registered_users` is a count query on the users table — cache with a 60-second TTL
- API route: `GET /api/stats` — returns both values

---

### 4b — SEO Puzzle Articles

**What to build:**
- A `/learn` route with statically rendered guide articles targeting high-intent search queries
- Each article embeds 2–3 interactive puzzles inline, pulled from the Lichess DB by theme tag

**Target search queries to build content around:**
- `"chess puzzles for beginners"`
- `"chess tactics trainer"`
- `"retrograde analysis chess"`
- `"chess endgame puzzles"`
- `"daily chess puzzles"`
- `"chess puzzle timer"`
- `"predict opponent moves chess"`

**Implementation:**
- Use Next.js `getStaticProps` or React Server Components for pre-rendering
- Each article is an MDX file or a DB-driven content entry with:
  - Title and meta description optimized for the target query
  - 400–600 words of original instructional content
  - 2–3 embedded interactive puzzle components (pass puzzle IDs as props)
  - Internal links to other articles and to the main puzzle trainer
- Add `sitemap.xml` and `robots.txt` if not already present
- Add Open Graph and Twitter card meta tags to article pages

---

### 4c — Forum Complaint Scraping (Standalone Research Script)

> **Important:** This is a standalone Node.js script, not part of the Next.js app. Place it in `scripts/scrape_chess_complaints.js`. Do not integrate it into the application.

**What it does:**
- Queries Reddit's public JSON API for posts mentioning chess puzzle frustrations
- Targets: `r/chess`, `r/chessbeginners`, `r/chesscom`
- Search terms: `"chess puzzles are"`, `"hate chess puzzles"`, `"puzzle trainer is"`, `"tactics trainer"`, `"chess puzzle complaints"`
- Outputs a structured `complaints_report.json`

**Output schema:**
```json
[
  {
    "source": "r/chess",
    "post_title": "...",
    "url": "...",
    "upvotes": 142,
    "created_utc": "2024-11-03",
    "key_complaint": "..."
  }
]
```

**Implementation requirements:**
- Use Reddit's public JSON API: `https://www.reddit.com/r/chess/search.json?q=QUERY&sort=top&limit=25`
- No auth required for public read — use a descriptive `User-Agent` header
- Rate limit: 1 request per second minimum between calls
- Wrap all requests in try/catch with graceful error logging
- Run with: `node scripts/scrape_chess_complaints.js`
- Output file: `scripts/complaints_report.json`

**This output is for manual review and outreach strategy — it is not displayed in the app.**

---

## Schema Additions

Read `CLAUDE.md` for the existing schema and ORM conventions before writing migrations. Add the following:

```sql
-- Extend puzzles table
ALTER TABLE puzzles
  ADD COLUMN type TEXT NOT NULL DEFAULT 'standard'
    CHECK (type IN ('standard', 'retrograde', 'opponent_prediction')),
  ADD COLUMN theme_tags TEXT[];

-- New: puzzle attempt tracking
CREATE TABLE puzzle_attempts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  puzzle_id   TEXT NOT NULL,
  solve_time_ms INTEGER,
  success     BOOLEAN NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON puzzle_attempts (puzzle_id);
CREATE INDEX ON puzzle_attempts (user_id);

-- Extend users table
ALTER TABLE users
  ADD COLUMN time_control_preference TEXT
    CHECK (time_control_preference IN ('bullet', 'blitz', 'rapid', 'classical')),
  ADD COLUMN puzzles_solved_count INTEGER NOT NULL DEFAULT 0;

-- New: site-wide aggregate stats
CREATE TABLE site_stats (
  id                    INT PRIMARY KEY DEFAULT 1,
  total_puzzles_solved  BIGINT NOT NULL DEFAULT 0,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO site_stats (id) VALUES (1) ON CONFLICT DO NOTHING;
```

---

## Completion Checklist

Before closing each phase, confirm:

- [ ] All new UI components render correctly on mobile (375px width minimum)
- [ ] Loading skeletons are in place for any async data (timer stats, leaderboard, options)
- [ ] New API routes return appropriate error responses (400, 404, 500)
- [ ] Existing puzzle functionality is unchanged
- [ ] No new npm packages added without checking if an equivalent is already installed
- [ ] TypeScript types added for all new data structures
