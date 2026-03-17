# Chess Puzzle Platform — Phase 2 Claude Code Prompt

## BEFORE YOU START
1. Read `CLAUDE.md` — follow its auth, DB, and ORM conventions exactly. Do not deviate.
2. Run `cat package.json` — check what is already installed before adding any dependency.
3. Check which board library is active: `react-chessboard` or `chessground`. Use whichever exists. Do not install the other.
4. All work is additive. Do not modify or delete any existing puzzle logic.
5. Execute one section at a time. Stop after each section and wait for confirmation before proceeding.

---

## SECTION 1 — Tactic Filtering + Per-Tactic Accuracy Stats
**Execute this first. It unblocks sections 2, 3, and 8.**

### 1a — Migration
```sql
-- Add to puzzle_attempts (already exists from Phase 3)
ALTER TABLE puzzle_attempts ADD COLUMN IF NOT EXISTS tactic_type TEXT;

-- Index for stats queries
CREATE INDEX IF NOT EXISTS idx_puzzle_attempts_tactic ON puzzle_attempts (user_id, tactic_type);
```

### 1b — Tactic constants
Create `lib/tactics.ts`:
```ts
export const TACTICS = [
  'fork', 'pin', 'skewer', 'discoveredAttack', 'backRankMate',
  'mateIn1', 'mateIn2', 'mateIn3', 'endgame', 'opening',
  'sacrifice', 'deflection', 'zwischenzug', 'brilliant'
] as const;

export type Tactic = typeof TACTICS[number];

// Maps our tactic keys to Lichess theme tag strings
export const LICHESS_THEME_MAP: Record<Tactic, string> = {
  fork: 'fork',
  pin: 'pin',
  skewer: 'skewer',
  discoveredAttack: 'discoveredAttack',
  backRankMate: 'backRankMate',
  mateIn1: 'mateIn1',
  mateIn2: 'mateIn2',
  mateIn3: 'mateIn3',
  endgame: 'endgame',
  opening: 'opening',
  sacrifice: 'sacrifice',
  deflection: 'deflection',
  zwischenzug: 'zwischenzug',
  brilliant: 'brilliant',
};
```

### 1c — API routes
Create `app/api/puzzles/route.ts` (or add to existing puzzle list route):
- Accept query param `?tactics=fork,pin` (comma-separated)
- Filter puzzles WHERE `theme_tags && ARRAY['fork','pin']` (Postgres array overlap)
- Return puzzles with `tactic_type` populated from `theme_tags[0]`

Create `app/api/users/[id]/stats/route.ts`:
- `GET` — return per-tactic breakdown for authenticated user:
```ts
// Response shape
type TacticStat = {
  tactic: Tactic;
  attempted: number;
  correct: number;
  accuracy: number; // 0–100
  avg_time_ms: number;
};
type StatsResponse = {
  overall_accuracy: number;
  by_tactic: TacticStat[];
  weakest_tactic: Tactic; // lowest accuracy with >= 5 attempts
};
```
- Query: `SELECT tactic_type, COUNT(*), SUM(CASE WHEN success THEN 1 ELSE 0 END), AVG(solve_time_ms) FROM puzzle_attempts WHERE user_id = $1 GROUP BY tactic_type`

### 1d — UI components
Create `components/puzzles/TacticFilter.tsx`:
- Renders a multi-select pill group, one pill per tactic in `TACTICS`
- Selected tactics highlighted, unselected muted
- On change: update URL query param `?tactics=fork,pin` — use `useRouter` and `useSearchParams`
- Persist selection to `localStorage` key `tactic_filter_prefs`
- Mobile: renders as a horizontally scrollable row, not a dropdown

Create `components/stats/TacticBreakdownTable.tsx`:
- Table columns: Tactic | Attempted | Accuracy | Avg Time
- Row with lowest accuracy (>= 5 attempts) renders with red left border
- That row includes a button: "Train this weakness" — links to `/puzzles?tactics=[weakest]`
- Show skeleton rows while loading (use existing skeleton pattern from codebase)

Add `TacticFilter` to the puzzle browser page above the puzzle grid.
Add `TacticBreakdownTable` to the user profile/stats page.

When a puzzle attempt is recorded in the existing `POST /api/puzzles/[id]/attempt` route, populate `tactic_type` from `puzzles.theme_tags[0]`.

---

## SECTION 2 — Opening-Aware Puzzles

### 2a — Migration
```sql
ALTER TABLE puzzles
  ADD COLUMN IF NOT EXISTS eco_code TEXT,
  ADD COLUMN IF NOT EXISTS opening_name TEXT,
  ADD COLUMN IF NOT EXISTS elo_range_min INTEGER,
  ADD COLUMN IF NOT EXISTS elo_range_max INTEGER,
  ADD COLUMN IF NOT EXISTS subtype TEXT CHECK (subtype IN ('out_of_book', 'standard', 'brilliant'));

CREATE INDEX IF NOT EXISTS idx_puzzles_eco ON puzzles (eco_code);
CREATE INDEX IF NOT EXISTS idx_puzzles_elo_range ON puzzles (elo_range_min, elo_range_max);
```

### 2b — Lichess import enrichment
Create `scripts/enrich_openings.ts`:
- Reads existing puzzles from DB where `eco_code IS NULL` and `theme_tags` contains any opening theme
- Lichess puzzle CSV columns include `OpeningTags` — parse ECO code and name from this field
- Elo range assignment logic:
```ts
function eloRange(puzzleRating: number): { min: number; max: number } {
  const bands = [
    { min: 600,  max: 999  },
    { min: 1000, max: 1199 },
    { min: 1200, max: 1399 },
    { min: 1400, max: 1599 },
    { min: 1600, max: 1799 },
    { min: 1800, max: 9999 },
  ];
  return bands.find(b => puzzleRating >= b.min && puzzleRating <= b.max) ?? bands[0];
}
```
- Mark puzzles as `subtype = 'out_of_book'` where `OpeningTags` is non-empty (these are positions after theory ends)
- Run with: `npx ts-node scripts/enrich_openings.ts`

### 2c — API
Update `app/api/puzzles/route.ts`:
- Accept `?eco=B90` and `?elo_range=1200-1399` query params
- If authenticated user has `elo` set and no explicit filter, default to their elo range

### 2d — UI
Update puzzle filter UI (`TacticFilter.tsx` or a sibling `OpeningFilter.tsx`):
- Add an "Openings" tab/section in the filter panel
- Dropdown or search input for ECO code / opening name
- On each puzzle card, if `eco_code` is set, render a small badge: `"Sicilian — B90"` below the puzzle title

---

## SECTION 3 — Brilliant Move Puzzles

### 3a — Data
In `scripts/enrich_openings.ts` or a new `scripts/tag_brilliant.ts`:
- Set `subtype = 'brilliant'` where `theme_tags` contains `'brilliantMove'`
- Backfill existing puzzles in DB

### 3b — Route
Create `app/puzzles/brilliant/page.tsx`:
- Server component — fetches puzzles WHERE `subtype = 'brilliant'` ORDER BY RANDOM() LIMIT 1
- Passes puzzle to the existing puzzle player component
- Add to site nav and homepage as a featured entry point

### 3c — Visual treatment
Create `components/puzzles/BrilliantPuzzleWrapper.tsx`:
- Wraps the existing puzzle player
- Dark background (`bg-zinc-900` or equivalent in current theme)
- Header: diamond emoji + `"Find the Brilliant Move"` in large type
- After correct solve: reveal the engine continuation line (use `puzzle.solution_line` field or compute from existing data)
- Render this wrapper only when `puzzle.subtype === 'brilliant'`

Add a "Brilliant Puzzle of the Day" card to the homepage. Pick one brilliant puzzle per day using `DATE_TRUNC('day', NOW())` as a seed for deterministic random selection.

---

## SECTION 4 — Move Ranking Puzzle

### 4a — Migration
```sql
-- puzzles.type already has a CHECK constraint from Phase 1
-- Extend it:
ALTER TABLE puzzles DROP CONSTRAINT IF EXISTS puzzles_type_check;
ALTER TABLE puzzles ADD CONSTRAINT puzzles_type_check
  CHECK (type IN ('standard', 'retrograde', 'opponent_prediction', 'move_ranking', 'weakness_spot'));

-- Store the three candidate moves and their engine grades
ALTER TABLE puzzles
  ADD COLUMN IF NOT EXISTS candidate_moves JSONB;
-- Shape: [{ uci: "e2e4", san: "e4", grade: "good", eval_cp: 30 }, ...]
```

### 4b — Types
Add to `lib/types.ts`:
```ts
export type MoveGrade = 'brilliant' | 'great' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

export const GRADE_LABELS: Record<MoveGrade, { label: string; symbol: string; color: string }> = {
  brilliant:  { label: 'Brilliant',  symbol: '💎', color: 'text-cyan-400' },
  great:      { label: 'Great Move', symbol: '!',  color: 'text-blue-400' },
  good:       { label: 'Good',       symbol: '✓',  color: 'text-green-400' },
  inaccuracy: { label: 'Inaccuracy', symbol: '~',  color: 'text-yellow-400' },
  mistake:    { label: 'Mistake',    symbol: '?',  color: 'text-orange-400' },
  blunder:    { label: 'Blunder',    symbol: '??', color: 'text-red-500' },
};

export type CandidateMove = {
  uci: string;
  san: string;
  grade: MoveGrade;
  eval_cp: number; // centipawn evaluation
};
```

### 4c — Component
Create `components/puzzles/MoveRankingPuzzle.tsx`:
- Props: `puzzle: Puzzle` where `puzzle.type === 'move_ranking'` and `puzzle.candidate_moves` is populated
- Renders three draggable move cards (A, B, C) using existing drag library or `@hello-pangea/dnd` if not present
- Each card shows the SAN notation and a mini board preview (use existing board component at small size)
- On submit: compare user ordering to correct ordering (sorted by `eval_cp` descending)
- Scoring:
  - All three correct order: full points
  - Best move correct only: half points
  - Wrong: zero
- After submit: reveal each card's grade badge using `GRADE_LABELS`, show eval bar

### 4d — Fallback for no drag support
On mobile if drag-and-drop is unreliable: render three buttons labeled 1st / 2nd / 3rd, and let user tap each move in order.

---

## SECTION 5 — Weakness Spotting Puzzle

### 5a — Migration
```sql
-- Store the correct weakness squares and explanation
ALTER TABLE puzzles
  ADD COLUMN IF NOT EXISTS weakness_squares TEXT[], -- e.g. ['d5', 'f7']
  ADD COLUMN IF NOT EXISTS weakness_explanation TEXT;
```

### 5b — Board interaction
In `components/puzzles/WeaknessSpotPuzzle.tsx`:
- Check the active board library for square highlight API:
  - `react-chessboard`: use `customSquareStyles` prop
  - `chessground`: use `highlight` config option
- Use whichever is available. Do not build a custom SVG overlay.
- User clicks a square → it toggles highlighted (yellow overlay)
- User can select up to 3 squares, then clicks "Submit"
- Scoring: exact match on all squares = full points; any correct square in selection = partial
- After submit: show correct squares in red, reveal `weakness_explanation` text

### 5c — Data note
Create `scripts/seed_weakness_puzzles.ts`:
- Seeds 20 sample weakness-spotting positions as a starting dataset
- Each entry: FEN, `weakness_squares`, `weakness_explanation`
- These are manually authored — write 20 representative positions covering: weak pawns, exposed king, weak outpost squares, color complex weaknesses
- Run with: `npx ts-node scripts/seed_weakness_puzzles.ts`

---

## SECTION 6 — Timeout Weakness Trainer

**Depends on Section 1 (tactic_type on puzzle_attempts) being complete and having accumulated data.**

### 6a — Query
Create `lib/queries/weakTimeTactics.ts`:
```ts
// Returns tactics where user's avg solve time > 2x the global average for that tactic
export async function getSlowTactics(userId: string): Promise<{ tactic: Tactic; userAvg: number; globalAvg: number }[]>
```
- Query: join user averages against global averages per tactic type
- Only return tactics with >= 3 user attempts (avoid noise)

### 6b — Timeout blunder logic
In the existing `POST /api/puzzles/[id]/attempt` route:
- After recording the attempt, check: is `solve_time_ms > 2 * global_avg_for_tactic`?
- If yes: set `success = false` regardless of whether the move was correct
- Return `{ timeout_blunder: true }` in the response so the client can show appropriate feedback

### 6c — UI
Create `components/stats/SlowSpotsPanel.tsx`:
- Shows top 3 tactics where user is slowest relative to global average
- Each row: tactic name, user avg time, global avg time, a "Drill this" button
- "Drill this" links to `/puzzles?tactics=[tactic]&mode=timed`

Add `SlowSpotsPanel` to user profile/stats page below `TacticBreakdownTable`.

Add drill mode to puzzle page: when `?mode=timed` is in URL, show a tighter countdown (use 0.75× the global average for that tactic as the target) displayed prominently above the board.

---

## SECTION 7 — OAuth Login (Chess.com + Lichess)

**Prerequisite: confirm existing auth provider in `CLAUDE.md` before starting. This section wraps around whatever auth is already in place.**

### 7a — Environment variables
Add to `.env.local` (document in `.env.example`, never commit values):
```
LICHESS_CLIENT_ID=
LICHESS_CLIENT_SECRET=
CHESS_COM_CLIENT_ID=
CHESS_COM_CLIENT_SECRET=
```

### 7b — Migration
```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS chess_com_username TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS lichess_username TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS chess_com_linked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lichess_linked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS elo INTEGER,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;
```

### 7c — Lichess OAuth
Create `app/api/auth/lichess/route.ts` — initiates OAuth flow:
- Endpoint: `https://lichess.org/oauth`
- Scopes needed: `email:read`, `games:read`
- Use PKCE (Lichess requires it): generate `code_verifier` and `code_challenge`, store `code_verifier` in server-side session

Create `app/api/auth/lichess/callback/route.ts`:
- Exchange code for token at `https://lichess.org/api/token`
- Fetch user profile: `GET https://lichess.org/api/account` with Bearer token
- Fetch ratings from profile response (`perfs` field)
- Upsert into `users`: set `lichess_username`, `elo` (use blitz rating as default), `avatar_url`
- Link to existing account if user is already logged in, otherwise create new session

### 7d — Chess.com OAuth
Create `app/api/auth/chesscom/route.ts` and `.../callback/route.ts`:
- Chess.com OAuth 2.0 docs: https://www.chess.com/club/chess-com-developer-community
- After token exchange, fetch: `GET https://api.chess.com/pub/player/{username}/stats`
- Extract `chess_blitz.last.rating` as the default elo
- Same upsert pattern as Lichess

### 7e — UI
Add to login page and user settings page:
- Two buttons: `"Connect Lichess"` and `"Connect Chess.com"`
- If already linked, show username + "Unlink" option
- On first link: show a one-time prompt — "We've set your rating to [elo]. Update it?" with an inline edit field

---

## SECTION 8 — Auto Puzzle Generation from Imported Games

**Depends on Section 7 (OAuth) being complete.**

### 8a — Background job
Create `lib/jobs/importGames.ts`:
```ts
export async function importGamesForUser(userId: string): Promise<void>
// 1. Fetch linked usernames from DB
// 2. Call Lichess and Chess.com APIs for last 10 games
// 3. Run extractPuzzlesFromGame() on each
// 4. Deduplicate by FEN against existing puzzles table
// 5. Insert new puzzles with source='user_import', source_user_id=userId, is_public=false
```

Create `lib/jobs/extractPuzzles.ts`:
```ts
export async function extractPuzzlesFromGame(pgn: string, userId: string): Promise<PuzzleCandidate[]>
// 1. Parse PGN with chess.js
// 2. For each position: run Stockfish analysis (see note below)
// 3. Identify positions where eval drops >= 150cp (blunder threshold)
// 4. Extract FEN, correct move, theme guess from material/position
// 5. Return array of PuzzleCandidates
```

**Stockfish note:** Use `stockfish` npm package for WASM-based analysis in Node. Do not run this in an API route — attach it to a scheduled job or a queue. If a job queue (Bull, pg-boss) is already configured per `CLAUDE.md`, use it. If not, create a Next.js route at `app/api/internal/import-games/route.ts` that is triggered by a cron (Vercel Cron or external) and protected by a `CRON_SECRET` header check.

### 8b — Game fetch functions
Create `lib/chess-apis/lichess.ts`:
```ts
export async function fetchRecentGames(username: string, token: string, count = 10): Promise<string[]>
// Returns array of PGN strings
// GET https://lichess.org/api/games/user/{username}?max=10&analysed=true&moves=true
// Set Accept: application/x-ndjson header
```

Create `lib/chess-apis/chesscom.ts`:
```ts
export async function fetchRecentGames(username: string, count = 10): Promise<string[]>
// GET https://api.chess.com/pub/player/{username}/games/{year}/{month}
// Returns games[].pgn array
```

### 8c — UI
On user dashboard, add a "Your Imported Puzzles" section:
- Shows count of puzzles generated from their games this week
- "Practice your mistakes" CTA — links to `/puzzles?source=user_import`
- Runs import on first visit after OAuth link (trigger via API route, non-blocking)

---

## SECTION 9 — Head-to-Head Puzzle Battles

**Most complex section. Do this last among core features.**

### 9a — Migration
```sql
CREATE TABLE IF NOT EXISTS battles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_1_id   UUID NOT NULL REFERENCES users(id),
  player_2_id   UUID REFERENCES users(id), -- NULL until opponent joins
  winner_id     UUID REFERENCES users(id),
  rounds        JSONB NOT NULL DEFAULT '[]',
  -- rounds shape: [{ puzzle_id, player_1_time_ms, player_2_time_ms, winner_id }]
  status        TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS battle_rating INTEGER NOT NULL DEFAULT 1200;

CREATE INDEX IF NOT EXISTS idx_battles_status ON battles (status);
```

### 9b — Real-time layer
Check `CLAUDE.md` for whether Supabase Realtime, Pusher, or raw WebSockets are available:
- **If Supabase:** use `supabase.channel()` to subscribe to `battles` table changes filtered by `id`
- **If none configured:** implement using Next.js route handlers with Server-Sent Events as a fallback (simpler than raw WS for this use case)

Create `lib/battles/battleService.ts`:
```ts
export async function createBattle(player1Id: string): Promise<Battle>
export async function joinBattle(battleId: string, player2Id: string): Promise<Battle>
export async function submitRoundResult(battleId: string, playerId: string, puzzleId: string, solveTimeMs: number): Promise<RoundResult>
export async function completeBattle(battleId: string): Promise<Battle>
```

`submitRoundResult` logic:
- Record the player's solve time for the current round
- Once both players have submitted: determine round winner (fastest correct solve)
- After 5 rounds: call `completeBattle`, update `winner_id`, recalculate `battle_rating` using Glicko-2

### 9c — Glicko-2 rating
Install `glicko2` npm package if not present, or implement the simplified update formula:
```ts
// Simplified Elo-style update as fallback (use Glicko-2 if package available)
const K = 32;
function updateRating(rating: number, opponentRating: number, won: boolean): number {
  const expected = 1 / (1 + Math.pow(10, (opponentRating - rating) / 400));
  const score = won ? 1 : 0;
  return Math.round(rating + K * (score - expected));
}
```

### 9d — UI
Create `app/battles/page.tsx` — lobby:
- "Challenge a friend" (input username) or "Find random opponent" button
- Live list of open battles waiting for a second player
- Active battles count (pull from DB WHERE status = 'active')

Create `app/battles/[id]/page.tsx` — battle arena:
- Both players see the same puzzle simultaneously
- Countdown "3... 2... 1... Go!" before puzzle reveals
- Score tracker in header: "You 2 — 1 Opponent"
- After each round: brief result flash ("You solved it in 8s! Opponent took 14s"), then next puzzle auto-loads
- After 5 rounds: show winner modal with rating change

---

## SECTION 10 — Daily Streak Leaderboard

### 10a — Migration
```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS current_streak INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_puzzle_date DATE;
```

### 10b — Streak update logic
Add to the existing `POST /api/puzzles/[id]/attempt` route, after recording a successful attempt:
```ts
async function updateStreak(userId: string, db: DB): Promise<void> {
  const user = await db.users.findById(userId);
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD in UTC
  
  if (user.last_puzzle_date === today) return; // already solved today
  
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const isConsecutive = user.last_puzzle_date === yesterday;
  
  const newStreak = isConsecutive ? user.current_streak + 1 : 1;
  const newLongest = Math.max(newStreak, user.longest_streak);
  
  await db.users.update(userId, {
    current_streak: newStreak,
    longest_streak: newLongest,
    last_puzzle_date: today,
  });
}
```

### 10c — API
Add `app/api/leaderboard/streaks/route.ts`:
- `GET` — returns top 100 by `current_streak` and top 100 by `longest_streak` (two separate arrays)
- Response: `{ current: LeaderboardEntry[], allTime: LeaderboardEntry[] }`
- Cache with 60-second TTL

### 10d — UI
Create `app/leaderboard/page.tsx`:
- Two tabs: "Current Streaks" and "All-Time"
- Table: Rank | Username | Avatar | Streak (days) | Badges
- Streak milestone badges rendered inline: 🔥7 🔥30 🔥100 🔥365

Add a leaderboard widget to homepage showing top 5 current streaks.

---

## SECTION 11 — Email Capture

### 11a — Migration
```sql
CREATE TABLE IF NOT EXISTS subscribers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  confirmed   BOOLEAN NOT NULL DEFAULT false,
  source      TEXT NOT NULL, -- 'homepage' | 'post_solve' | 'event'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 11b — API
Create `app/api/subscribe/route.ts`:
- `POST` — accepts `{ email: string, source: string }`
- Validate email format server-side
- Insert into `subscribers` with `confirmed = false`
- Send confirmation email (use existing email provider from `CLAUDE.md`, or Resend if none configured)
- Return `{ success: true }` — never expose whether email already exists (prevents enumeration)

Create `app/api/subscribe/confirm/route.ts`:
- `GET ?token=...` — validates a signed token (use `jose` or existing JWT lib)
- Sets `confirmed = true`
- Redirects to homepage with `?confirmed=true` query param
- Homepage detects this and shows a one-time toast: "You're subscribed!"

### 11c — UI components
Create `components/marketing/EmailSignup.tsx`:
- Props: `source: string`, `headline?: string`, `cta?: string`
- Renders: headline, email input, submit button, success/error state
- On success: replace form with "Check your inbox to confirm"

Place `<EmailSignup source="homepage" headline="Get weekly puzzle picks" />` in the homepage hero section.

Place `<EmailSignup source="post_solve" headline="Get your weekly puzzle digest" />` in the post-solve result card (show after the 3rd solved puzzle in a session, not on every solve).

---

## SECTION 12 — Creator Profile Page (Chess.com Integration)

### 12a — Route
Create `app/creator/page.tsx` (or `/about` — match existing site nav):
- Server component
- Fetches from Chess.com public API at build time + revalidate every 3600 seconds:
  ```
  GET https://api.chess.com/pub/player/[YOUR_USERNAME]/stats
  GET https://api.chess.com/pub/player/[YOUR_USERNAME]/games/archives (latest month)
  ```
- Store your Chess.com username in an env var: `NEXT_PUBLIC_CREATOR_CHESSCOM_USERNAME`

### 12b — Page content
Display:
- Username, avatar (from Chess.com API `avatar` field)
- Current ratings: Bullet / Blitz / Rapid / Classical — pulled from `stats` endpoint
- Last 5 game results (W/L/D) with opponent username and time control
- "Follow me on Chess.com" button — links to `https://www.chess.com/member/[username]`
- "Challenge me" button — links to `https://www.chess.com/play/[username]`

### 12c — Share button
On this page, the share button pre-fills:
```
https://twitter.com/intent/tweet?text=Play%20chess%20puzzles%20with%20%40behavior_by_design%20at%20[SITE_URL]&url=[PAGE_URL]
```
Use `encodeURIComponent` on all values. Pull `@behavior_by_design` from env var `NEXT_PUBLIC_TWITTER_HANDLE`.

Apply the same share URL pattern to all share buttons site-wide (puzzle solved, battle won, streak milestone).

---

## SECTION 13 — Multilingual UI + SEO

**Do this after all other sections are stable. Internationalizing an unstable UI wastes effort.**

### 13a — i18n setup
Use Next.js built-in i18n routing (not `next-i18next` unless already installed):

In `next.config.js`:
```js
i18n: {
  locales: ['en', 'es', 'fr', 'de', 'pt', 'ru'],
  defaultLocale: 'en',
}
```

Create `lib/i18n/translations/` directory with one JSON file per locale: `en.json`, `es.json`, etc.

Create `lib/i18n/useTranslation.ts` — a thin hook wrapping `next/router`'s `locale` to return the right strings. Do not over-engineer this; a simple key lookup is sufficient.

### 13b — String extraction
Go through every hardcoded UI string in the codebase. Replace with translation keys:
```ts
// Before
<p>Find the Brilliant Move</p>

// After  
<p>{t('puzzle.brilliant.heading')}</p>
```
Add English baseline to `en.json`. Leave other locale files with English fallbacks — translation will be filled in separately.

### 13c — hreflang
In `app/layout.tsx` or the Head component:
```tsx
{locales.map(locale => (
  <link key={locale} rel="alternate" hrefLang={locale} href={`https://[SITE_URL]/${locale}${pathname}`} />
))}
```

Update `sitemap.xml` generation to include all locale variants of each URL.

### 13d — Language toggle
Add to nav component:
- A dropdown showing current language with flag emoji
- Options: 🇬🇧 English, 🇪🇸 Español, 🇫🇷 Français, 🇩🇪 Deutsch, 🇧🇷 Português, 🇷🇺 Русский
- On select: call `router.push(router.asPath, router.asPath, { locale: selectedLocale })`
- Persist choice in `localStorage` key `preferred_locale`

---

## SECTION 14 — Homepage Stats (Extended)

**Extend the stats block from Phase 4a to show 5 counters.**

### 14a — Update `GET /api/stats`
Return:
```ts
type SiteStats = {
  puzzles_solved: number;       // existing
  registered_players: number;   // existing
  puzzles_in_library: number;   // SELECT COUNT(*) FROM puzzles
  active_battles: number;        // SELECT COUNT(*) FROM battles WHERE status = 'active'
  longest_current_streak: number; // SELECT MAX(current_streak) FROM users
};
```
Cache full response for 60 seconds.

### 14b — UI
Update the homepage stats component to render all 5 counters in a horizontal row.
Each counter: large number (use existing typographic style), label beneath.
On mobile: wrap to 2–3 per row rather than truncating.

---

## GLOBAL CONSTRAINTS — apply to every section

- **TypeScript:** Every new function, component, and API response must be fully typed. No `any`.
- **Error handling:** Every API route returns `{ error: string }` with appropriate HTTP status on failure (400 for bad input, 401 for unauth, 404 for not found, 500 for server error). Never let unhandled exceptions reach the client.
- **Mobile:** Every component must render correctly at 375px viewport width. Test each section before marking complete.
- **Loading states:** Every component that fetches async data must show a skeleton while loading. Match the skeleton pattern already used in the codebase.
- **No regressions:** Run the existing test suite (if present) after each section. If no tests exist, manually verify existing puzzle flow still works.
- **Dependencies:** Check `package.json` before `npm install`. Only install a package if no existing package covers the need.
- **Environment variables:** Any new env var must be documented in `.env.example` with a comment explaining what it is and where to get it.

---

## DEFERRED — do not implement in this session

- "Play my style" bot — requires ML infrastructure. Use Maia Chess integration when ready.
- Guinness World Record event page — build when platform has >1,000 active users.
- Paywall comparison page (`/vs-chess-com`) — copywriting task, handle outside of Claude Code.
- Full puzzle translations — string extraction in Section 13 is sufficient for now; actual translation copy comes later.
