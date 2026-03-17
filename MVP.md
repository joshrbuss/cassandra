   # Chess Puzzle Platform — MVP

## NORTH STAR
A user signs up, connects their Chess.com or Lichess account, and immediately gets puzzles
generated from their own blunders — in three modes. Nothing else ships until this loop works
end-to-end and feels good.

## BEFORE YOU WRITE ANY CODE
1. Read `CLAUDE.md` — follow its auth, DB, ORM, and file conventions exactly
2. Run `cat package.json` — do not install any package that already exists
3. Check which board library is active: `react-chessboard` or `chessground` — use it, don't add the other
4. All features are additive — do not touch existing code unless directly required

---

## THE ONLY USER FLOW THAT MATTERS

```
Sign up / Log in
      ↓
Connect Chess.com OR Lichess (OAuth)
      ↓
We fetch last 20 games → extract blunder positions → store as personal puzzles
      ↓
User lands on dashboard → picks a puzzle mode → plays
      ↓
Result screen → accuracy tracked → next puzzle
```

Do not build anything that isn't in this flow.

---

## PHASE 1 — Auth + OAuth Connection
**Stop and confirm this works before Phase 2.**

### 1a — Migration
```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS chess_com_username  TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS lichess_username    TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS chess_com_token     TEXT,
  ADD COLUMN IF NOT EXISTS lichess_token       TEXT,
  ADD COLUMN IF NOT EXISTS raw_elo             INTEGER,  -- what the platform reports, shown in UI
  ADD COLUMN IF NOT EXISTS normalized_elo      INTEGER,  -- Lichess-scale, used for puzzle matching
  ADD COLUMN IF NOT EXISTS elo_platform        TEXT CHECK (elo_platform IN ('chess_com', 'lichess')),
  ADD COLUMN IF NOT EXISTS avatar_url          TEXT,
  ADD COLUMN IF NOT EXISTS is_paid             BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_at             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_customer_id  TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS puzzles_solved_session INTEGER NOT NULL DEFAULT 0; -- resets on new session
```

### 1b — Environment variables
Add to `.env.local`, document in `.env.example`:
```
LICHESS_CLIENT_ID=
LICHESS_CLIENT_SECRET=
CHESS_COM_CLIENT_ID=
CHESS_COM_CLIENT_SECRET=
NEXT_PUBLIC_APP_URL=
```

### 1c — Elo normalization
Create `lib/elo/normalizeElo.ts`:
```ts
/**
 * Chess.com ratings are inflated vs Lichess by roughly 100–150 points.
 * We normalize everything to Lichess scale for internal puzzle matching.
 * Always store both: raw_elo (shown to user) and normalized_elo (used internally).
 */
export function normalizeElo(elo: number, platform: 'chess_com' | 'lichess'): number {
  if (platform === 'lichess') return elo;
  // Approximate Chess.com → Lichess conversion
  // Based on community cross-platform data — adjust if empirically off
  return Math.max(400, Math.round(elo * 0.88 - 50));
}
```

Always use `normalized_elo` when selecting or filtering puzzles by difficulty.
Always display `raw_elo` in the UI so users recognize their own number.
Store `elo_platform` so you know which scale the raw number came from.

### 1d — Lichess OAuth
- `app/api/auth/lichess/route.ts` — initiates flow, uses PKCE (required by Lichess)
  - Auth URL: `https://lichess.org/oauth`
  - Scopes: `email:read games:read`
  - Store `code_verifier` in server session before redirecting
- `app/api/auth/lichess/callback/route.ts`
  - Exchange code at `https://lichess.org/api/token`
  - Fetch profile: `GET https://lichess.org/api/account`
  - Extract `username`, `perfs.blitz.rating` as `raw_elo`
  - Call `normalizeElo(raw_elo, 'lichess')` → store as `normalized_elo`
  - Set `elo_platform = 'lichess'`
  - Upsert user, set session, redirect to `/dashboard`

### 1e — Chess.com OAuth
- `app/api/auth/chesscom/route.ts` — initiates flow
  - Docs: https://www.chess.com/club/chess-com-developer-community
- `app/api/auth/chesscom/callback/route.ts`
  - After token exchange, fetch: `GET https://api.chess.com/pub/player/{username}/stats`
  - Extract `chess_blitz.last.rating` as `raw_elo`, avatar from profile endpoint
  - Call `normalizeElo(raw_elo, 'chess_com')` → store as `normalized_elo`
  - Set `elo_platform = 'chess_com'`
  - Upsert user, set session, redirect to `/dashboard`

### 1e — Connection UI
- On the onboarding screen after signup, show two buttons:
  - "Connect Chess.com" → hits `app/api/auth/chesscom/route.ts`
  - "Connect Lichess" → hits `app/api/auth/lichess/route.ts`
- User must connect at least one to proceed
- After connecting: show username + avatar + "Connected ✓", offer to connect the second
- "Continue to my puzzles →" button becomes active once one account is linked

### 1f — Verify before moving on
- User can sign up, connect at least one account, and reach the dashboard
- Username and elo are stored in DB
- Session persists on refresh

---

## PHASE 2 — Game Import + Puzzle Extraction
**Stop and confirm this works before Phase 3.**

### 2a — Migration
```sql
CREATE TABLE IF NOT EXISTS user_puzzles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fen             TEXT NOT NULL,
  solution_uci    TEXT NOT NULL,   -- correct move in UCI format e.g. "e2e4"
  solution_san    TEXT NOT NULL,   -- correct move in SAN format e.g. "e4"
  pgn_source      TEXT,            -- original game PGN for reference
  game_url        TEXT,            -- link back to the original game
  source_platform TEXT NOT NULL CHECK (source_platform IN ('chess_com', 'lichess')),
  blunder_cp_loss INTEGER,         -- centipawn loss that flagged this position
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, fen)            -- no duplicate positions per user
);

CREATE INDEX IF NOT EXISTS idx_user_puzzles_user ON user_puzzles (user_id);

CREATE TABLE IF NOT EXISTS puzzle_attempts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  puzzle_id     UUID NOT NULL REFERENCES user_puzzles(id) ON DELETE CASCADE,
  mode          TEXT NOT NULL CHECK (mode IN ('solve_it', 'rewind', 'rank_it')),
  success       BOOLEAN NOT NULL,
  solve_time_ms INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attempts_user ON puzzle_attempts (user_id);
```

### 2b — Game fetcher: Lichess
Create `lib/import/fetchLichessGames.ts`:
```ts
export async function fetchLichessGames(username: string, token: string): Promise<string[]>
// GET https://lichess.org/api/games/user/{username}?max=20&moves=true&opening=false
// Header: Accept: application/x-ndjson
// Header: Authorization: Bearer {token}
// Returns array of PGN strings
// Rate limit: max 1 request per second — add 1000ms delay if batching
```

### 2c — Game fetcher: Chess.com
Create `lib/import/fetchChessComGames.ts`:
```ts
export async function fetchChessComGames(username: string): Promise<string[]>
// GET https://api.chess.com/pub/player/{username}/games/{YYYY}/{MM}
// Use current month, fall back to previous month if < 5 games returned
// Returns games[].pgn array
// Chess.com public API — no auth required for game history
```

### 2d — Puzzle extractor
Create `lib/import/extractPuzzles.ts`:
```ts
import { Chess } from 'chess.js';

type PuzzleCandidate = {
  fen: string;
  solution_uci: string;
  solution_san: string;
  blunder_cp_loss: number;
  pgn_source: string;
};

export async function extractPuzzlesFromPGN(pgn: string): Promise<PuzzleCandidate[]>
// 1. Parse PGN with chess.js
// 2. For each position, check if [%eval] annotations exist in the PGN
//    - Lichess exports include eval annotations — parse them directly
//    - Chess.com exports may not — skip positions without evals rather than running Stockfish
// 3. Flag positions where eval drops >= 150cp between consecutive moves (blunder threshold)
// 4. The move BEFORE the blunder is the puzzle start position (FEN)
// 5. The best move (highest eval) is the solution
// 6. Return max 3 puzzles per game (the worst 3 blunders by cp loss)
```

**Important:** Do not run Stockfish in this MVP. Lichess PGNs include engine annotations — use those. Chess.com PGNs often do not — for Chess.com, only extract puzzles from games where the user requested analysis (these include eval annotations). If no annotations exist in a game, skip it silently.

### 2e — Import API route
Create `app/api/import/route.ts`:
- `POST` — authenticated, no body required
- Reads linked accounts from session user
- Calls `fetchLichessGames` and/or `fetchChessComGames` based on what's linked
- Runs `extractPuzzlesFromPGN` on each game
- Deduplicates by FEN against existing `user_puzzles` for this user
- Inserts new puzzles, returns `{ imported: number, total: number }`
- If already imported in last 24 hours: return cached count, don't re-fetch

### 2f — Trigger import on first login
In the OAuth callback routes (Phase 1c and 1d), after successful upsert:
- Fire `POST /api/import` non-blocking (don't await — let it run in background)
- Set a flag `import_status: 'pending' | 'done' | 'error'` on the user record

### 2g — Verify before moving on
- After connecting an account, user eventually has rows in `user_puzzles`
- At least some of their actual blunder positions are correctly identified
- Duplicate positions are not inserted on re-import

---

## PHASE 2B — Lichess Fallback Library (Two-Tier Puzzle System)
**Run after Phase 2 is confirmed working. This is what keeps users with few games from hitting a wall.**

### Why this exists
A new user with 5 games gets ~15 personal puzzles. That's 15 minutes of content.
The Lichess puzzle database has 5.8 million puzzles released under CC0 — free for any use
including commercial. We seed a subset into our DB as a fallback tier.

The user never sees "no more puzzles." The transition between tiers is seamless.
UI labels distinguish them: **"From your games"** vs **"Curated for your level"**.

### 2b-i — Migration
```sql
CREATE TABLE IF NOT EXISTS library_puzzles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lichess_id      TEXT UNIQUE NOT NULL,   -- original PuzzleId from Lichess CSV
  fen             TEXT NOT NULL,
  moves_uci       TEXT NOT NULL,          -- space-separated UCI move sequence
  solution_uci    TEXT NOT NULL,          -- first player move in the solution
  solution_san    TEXT NOT NULL,
  rating          INTEGER NOT NULL,
  rating_deviation INTEGER NOT NULL,
  popularity      INTEGER NOT NULL,       -- -100 to 100
  themes          TEXT[] NOT NULL,        -- e.g. ['fork', 'mateIn2']
  opening_tags    TEXT,
  game_url        TEXT,
  candidate_moves JSONB,                  -- populated for Rank It mode where eval data exists
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_library_rating ON library_puzzles (rating);
CREATE INDEX IF NOT EXISTS idx_library_themes ON library_puzzles USING gin (themes);
CREATE INDEX IF NOT EXISTS idx_library_popularity ON library_puzzles (popularity);
```

### 2b-ii — Seed script
Create `scripts/seedLichessPuzzles.ts`:
- Downloads puzzle CSV from `https://database.lichess.org/lichess_db_puzzle.csv.zst`
- Decompresses (use `zstd` npm package or shell command)
- Parses CSV — columns: `PuzzleId, FEN, Moves, Rating, RatingDeviation, Popularity, NbPlays, Themes, GameUrl, OpeningTags`
- Filters to import only:
  - `Popularity >= 50` (quality filter — well-received puzzles only)
  - `NbPlays >= 100` (battle-tested puzzles only)
  - Covers full rating range: ensure at least 200 puzzles per 200-point Elo band from 600–2400
- Target: **50,000 puzzles total** — enough depth at every level without bloating the DB
- Parses `Moves` field: first move is the opponent's move (apply to FEN to get puzzle position), second move is `solution_uci`
- Convert solution UCI to SAN using `chess.js`
- Batch insert in chunks of 1,000 rows
- Run with: `npx ts-node scripts/seedLichessPuzzles.ts`
- Idempotent: use `ON CONFLICT (lichess_id) DO NOTHING`
- Add a footer credit in the app: "Puzzles sourced from the Lichess open database (CC0)"

### 2b-iii — Fallback API logic
Update `app/api/puzzles/next/route.ts` (create if not exists):
```ts
// Two-tier puzzle selection logic
async function getNextPuzzle(userId: string, mode: PuzzleMode): Promise<Puzzle> {
  // Tier 1: unsolved personal puzzles from user's own games
  const personal = await db.userPuzzles.findFirst({
    where: {
      user_id: userId,
      // not yet attempted in this mode, or previously failed
      NOT: { attempts: { some: { mode, success: true } } }
    },
    orderBy: { blunder_cp_loss: 'desc' } // worst blunders first
  });

  if (personal) return { ...personal, source: 'your_games' };

  // Tier 2: Lichess library puzzle matched to user's normalized_elo
  const user = await db.users.findById(userId);
  const library = await db.libraryPuzzles.findFirst({
    where: {
      rating: {
        gte: user.normalized_elo - 150,
        lte: user.normalized_elo + 150,
      },
      popularity: { gte: 50 },
      // not already played by this user
      NOT: { played_by: { some: { user_id: userId } } }
    },
    orderBy: { popularity: 'desc' }
  });

  if (library) return { ...library, source: 'curated' };

  // Fallback: widen elo range if nothing found
  return db.libraryPuzzles.findFirst({
    where: { rating: { gte: user.normalized_elo - 300, lte: user.normalized_elo + 300 } },
    orderBy: [{ popularity: 'desc' }]
  });
}
```

Track library puzzle plays to avoid repeats:
```sql
CREATE TABLE IF NOT EXISTS library_puzzle_plays (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  puzzle_id  UUID NOT NULL REFERENCES library_puzzles(id) ON DELETE CASCADE,
  mode       TEXT NOT NULL,
  success    BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, puzzle_id, mode)
);
```

### 2b-iv — UI source label
In `PuzzleShell.tsx`, show a subtle source badge beneath the mode label:
- Personal puzzle: `"From your games"` — slightly highlighted, feels special
- Library puzzle: `"Curated for your level"` — neutral, no negative framing
- Never say "fallback" or "you've run out of personal puzzles" in the UI

### 2b-v — Onboarding copy
On the dashboard, for users with few personal puzzles, show:
> *"You have X puzzles from your games. We've added 1,000+ more matched to your level —
> so you never run out. Connect more accounts or play more games to keep growing your personal set."*

### Marketing copy to use site-wide
These lines should appear on the homepage and onboarding:
- *"Chess.com charges for puzzles. Ours are unlimited — including 5 million from Lichess's open database."*
- *"The only puzzle trainer that connects Chess.com and Lichess in one place."*
- *"Your blunders. Their puzzles. One trainer."*

---

## PHASE 3 — The Three Puzzle Modes
**This is the product. Get each mode feeling right before the next.**

### Shared puzzle player setup
Create `components/puzzle/PuzzleBoard.tsx`:
- Wraps the existing board library
- Props: `fen: string`, `onMove: (uci: string) => void`, `orientation: 'white' | 'black'`
- Derives orientation from FEN (whose turn it is = the player to move)
- Handles move input via the board library's existing move event
- Does not contain any mode-specific logic — that lives in mode wrappers

Create `components/puzzle/PuzzleShell.tsx`:
- Common wrapper for all three modes
- Shows: mode badge (Solve It / Rewind / Rank It), timer, puzzle number out of total
- Bottom area is a slot — each mode renders its own controls there

---

### Mode 1: Solve It
**Standard puzzle. Play the best move.**

Create `components/puzzle/modes/SolveIt.tsx`:
- Renders `PuzzleBoard` — board is interactive
- User drags/clicks a move
- On move: compare UCI string to `puzzle.solution_uci`
  - Correct: green flash on board, show "✓ Best move!" — auto-advance after 1.5s
  - Wrong: red flash, show "✗ Try again" — board resets to puzzle FEN, allow retry
  - After 2 wrong attempts: show the solution and a "See why" explanation (just the SAN move for MVP)
- Record attempt via `POST /api/puzzles/[id]/attempt` with `mode: 'solve_it'`

---

### Mode 2: Rewind
**Before you play, identify what the opponent just did.**

Create `components/puzzle/modes/Rewind.tsx`:

**The question:** "What move did your opponent just play to reach this position?"

**Data needed:** The move immediately before the puzzle FEN. This is available from the PGN — store it during extraction:
```sql
ALTER TABLE user_puzzles ADD COLUMN IF NOT EXISTS last_move_uci TEXT; -- opponent's last move
ALTER TABLE user_puzzles ADD COLUMN IF NOT EXISTS last_move_san TEXT;
ALTER TABLE user_puzzles ADD COLUMN IF NOT EXISTS pre_puzzle_fen TEXT; -- position before last move
```
Update `extractPuzzlesFromPGN` to populate these fields.

**Distractor generation** — create `lib/puzzles/generateDistractors.ts`:
```ts
export function generateRewindDistractors(prePuzzleFen: string, correctUci: string): string[]
// 1. Use chess.js to get all legal moves from prePuzzleFen
// 2. Remove the correct move
// 3. Prioritize: captures first, then checks, then other moves
// 4. Return 3 distractors as SAN strings
```

**UI flow:**
1. Show the puzzle FEN on the board (non-interactive)
2. Show 4 buttons: one correct last move (SAN), three distractors — shuffled
3. User taps a button
   - Correct: highlight the correct move on the board briefly, then unlock the board for Solve It
   - Wrong: shake the button, show correct answer, then unlock board anyway (don't gate forever)
4. After answering: play the puzzle as normal (Solve It mode)
5. Record attempt with `mode: 'rewind'` — success = true only if both the rewind AND the solve were correct

**Important:** Each button should show the move in SAN notation. On hover/tap-hold, show a mini board preview of the resulting position using the existing board component at small size (150×150px).

---

### Mode 3: Rank It
**Given three candidate moves, rank them best to worst.**

**Data needed:** Three candidate moves with engine evaluations. Store during extraction:
```sql
ALTER TABLE user_puzzles
  ADD COLUMN IF NOT EXISTS candidate_moves JSONB;
-- Shape: [{ uci: "e2e4", san: "e4", eval_cp: 30 }, { uci: "d2d4", san: "d4", eval_cp: -20 }, ...]
```

For Lichess games with eval annotations: extract the top 3 moves from the position using the existing eval data. For Chess.com: skip this mode if eval data isn't available — show Solve It instead.

Update `extractPuzzlesFromPGN` to populate `candidate_moves` where eval data exists.

**Grade assignment** in `lib/puzzles/gradeMove.ts`:
```ts
type MoveGrade = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

export function gradeMove(evalCp: number, bestEvalCp: number): MoveGrade {
  const loss = bestEvalCp - evalCp;
  if (loss <= 10)  return 'best';
  if (loss <= 50)  return 'good';
  if (loss <= 100) return 'inaccuracy';
  if (loss <= 200) return 'mistake';
  return 'blunder';
}
```

Create `components/puzzle/modes/RankIt.tsx`:
- Show the board position (non-interactive)
- Show 3 move cards: each displays the SAN notation + a mini board preview
- User drags cards into order (1st = best, 3rd = worst)
  - On mobile fallback: three "tap to rank" buttons — first tap = 1st place, etc.
- On submit: compare to correct order (sorted by eval_cp descending)
- Scoring:
  - All correct: full points, show each card's grade badge
  - Best move correct only: partial, still show all grades
  - Wrong: show correct order with grade badges
- Grade badges: Best ✓ (green), Good (blue), Inaccuracy ~ (yellow), Mistake ? (orange), Blunder ?? (red)
- Record attempt with `mode: 'rank_it'`

---

## PHASE 4 — Dashboard + Accuracy Tracking
**The glue that makes the loop feel complete.**

### 4a — Dashboard page (`app/dashboard/page.tsx`)
Show:
- User avatar + username + elo (from linked account)
- Puzzle count: "X puzzles ready from your games"
- If import still pending: show a loading state — "Analyzing your games..." with a spinner
- If 0 puzzles after import: show "No analyzed games found — play some games on [platform] and come back"
- Three mode cards: Solve It / Rewind / Rank It — each with a brief one-line description and a "Play" button
- Overall accuracy: `correct attempts / total attempts * 100` — show as a percentage with a progress ring
- "Import new games" button — triggers `POST /api/import` and refreshes

### 4b — Accuracy API
Create `app/api/users/me/stats/route.ts`:
- `GET` — authenticated
- Returns:
```ts
type UserStats = {
  total_puzzles: number;
  attempted: number;
  accuracy: number;          // 0–100
  by_mode: {
    solve_it:  { attempted: number; accuracy: number };
    rewind:    { attempted: number; accuracy: number };
    rank_it:   { attempted: number; accuracy: number };
  };
};
```

### 4c — Attempt recording
Create `app/api/puzzles/[id]/attempt/route.ts`:
- `POST` — body: `{ mode, success, solve_time_ms }`
- Insert into `puzzle_attempts`
- Return updated user stats

---

## PHASE 5 — Monetization + Coming Soon Teasers

### 5a — Stripe one-time payment
Add to `.env.local` and `.env.example`:
```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_STRIPE_PRICE_ID=
NEXT_PUBLIC_ADSENSE_CLIENT=
NEXT_PUBLIC_ADSENSE_SLOT=
```

Install Stripe if not present: check `package.json` first — `npm install stripe @stripe/stripe-js`

Create `lib/stripe.ts`:
```ts
import Stripe from 'stripe';
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });
```

Create `app/api/payments/checkout/route.ts`:
- `POST` — authenticated
- Creates a Stripe Checkout session with `mode: 'payment'` (one-time, not subscription)
- `success_url`: `/dashboard?upgraded=true`
- `cancel_url`: `/dashboard`
- Store `user_id` in `metadata`
- Return `{ url: session.url }` — client does `window.location.href = url`

Create `app/api/payments/webhook/route.ts`:
- Verifies Stripe signature — reject any request that fails verification with 400
- On `checkout.session.completed`: set `is_paid = true`, `paid_at = now()`, `stripe_customer_id`
- Respond 200 immediately — no slow operations before response

### 5b — Ad logic
Create `lib/ads/shouldShowAd.ts`:
```ts
export function shouldShowAd(puzzlesSolvedThisSession: number, isPaid: boolean): boolean {
  if (isPaid) return false;
  return puzzlesSolvedThisSession > 0 && puzzlesSolvedThisSession % 10 === 0;
}
```

Track `puzzlesSolvedThisSession` in React state at the puzzle player level.
Increment on every successful attempt. Reset to 0 on page load — session-based only, not persisted.

Create `components/ads/AdInterstitial.tsx`:
- Renders on the **result screen only** — never mid-puzzle
- Only renders when `shouldShowAd` returns true
- Layout: clearly labelled "Advertisement" area + "Go ad-free — pay once" CTA button
- CTA calls `POST /api/payments/checkout` then redirects to Stripe URL
- Ad unit using Google AdSense:
  ```tsx
  <ins className="adsbygoogle"
    style={{ display: 'block' }}
    data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT}
    data-ad-slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT}
    data-ad-format="auto"
  />
  ```
- **If AdSense not yet approved:** render a placeholder div with the "Go ad-free" CTA only.
  Do not block the launch on AdSense approval. The Stripe flow must work regardless.

### 5c — Dashboard upgrade prompt
- Free users: show a subtle persistent banner — *"Ad-free forever — one-time payment, no subscription."*
- On load with `?upgraded=true`: show a toast — *"You're ad-free! Thanks for supporting the platform 🎉"* — then strip the query param from the URL

### 5d — Coming Soon teasers
Create `components/marketing/LockedFeature.tsx`:
```tsx
type Props = {
  headline: string;
  description: string;
  source: string;
};

export function LockedFeature({ headline, description, source }: Props) {
  return (
    <div className="relative rounded-xl overflow-hidden border border-white/10">
      <div className="blur-sm pointer-events-none opacity-50 p-6 select-none">
        <h3 className="text-lg font-semibold">{headline}</h3>
        <p className="text-sm mt-1">{description}</p>
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 p-4 text-center">
        <span className="text-xs uppercase tracking-widest text-white/60 mb-1">Coming soon</span>
        <p className="text-white font-semibold mb-3">{headline}</p>
        <EmailSignup source={source} cta="Notify me when it's live" />
      </div>
    </div>
  );
}
```

Create `components/marketing/EmailSignup.tsx`:
- Props: `source: string`, `cta?: string`
- Email input + submit button
- Calls `POST /api/subscribe` — create this route: insert into `subscribers` table, no confirmation email needed for MVP
- On success: replace form with *"You're on the list ✓"*

```sql
CREATE TABLE IF NOT EXISTS subscribers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL,
  source     TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Add to the dashboard below the three active mode cards:
```tsx
<LockedFeature
  headline="Duels"
  description="Challenge anyone to a puzzle duel. ELO-rated rankings."
  source="teaser_duels"
/>
<LockedFeature
  headline="Opening Trainer"
  description="Puzzles from the exact openings you play, calibrated to your Elo."
  source="teaser_openings"
/>
<LockedFeature
  headline="Weakness Spotter"
  description="Click the weakness on the board before your opponent exploits it."
  source="teaser_weakness"
/>
```

**Do not delete any existing code for unbuilt features. Leave it in place, unused.
Comment with `// MVP: not active yet` where needed.**

---

## WHAT IS EXPLICITLY OUT OF SCOPE FOR THIS MVP

Do not build any of the following — they are in a separate spec for later:

- Duels
- Streak leaderboard
- Language toggle / i18n
- SEO articles
- Homepage stats counters
- Opening-aware puzzles
- Weakness spotting puzzle mode
- Timeout weakness trainer
- Creator profile / Chess.com public page
- Brilliant move puzzles
- Guinness record page
- Opponent prediction mode
- Any sharing or social features

---

## DONE MEANS
The MVP is complete when a real user can:
1. Sign up with email/password
2. Connect Chess.com or Lichess — Elo is correctly normalized regardless of platform
3. See puzzles generated from their own games within 60 seconds
4. Play all three modes (Solve It, Rewind, Rank It) without errors
5. See an ad on the result screen every 10 puzzles (free users only)
6. Click "Go ad-free", pay once via Stripe, never see an ad again
7. See their accuracy on the dashboard after playing
8. Come back the next day, import new games, and see new puzzles
9. See Coming Soon teasers with email capture on the dashboard

That is the entire product for now. Ship that. Everything else follows.

---

## UI COPY CONSTANTS

Create `lib/copy.ts` — all user-facing strings live here.
Claude Code must import from this file everywhere. No hardcoded strings in components.

```ts
export const COPY = {
  // Brand
  tagline: 'Train smarter. Chess On.',
  signoff: 'Chess On!',

  // Onboarding
  onboarding: {
    connectPrompt: 'Connect your account to get puzzles from your own games.',
    connectSubtext: 'The only trainer that works with both Chess.com and Lichess.',
    connected: 'Connected ✓',
    continueButton: 'Continue to my puzzles →',
    complete: "You're all set. Chess On!",
  },

  // Dashboard
  dashboard: {
    emptyState: "Connect your account and let's go. Chess On!",
    fewPuzzles: (count: number) =>
      `You have ${count} puzzle${count === 1 ? '' : 's'} from your games. We've added 1,000+ more matched to your level — so you never run out.`,
    importButton: 'Import new games',
    importing: 'Analysing your games...',
    importDone: (count: number) => `${count} new puzzle${count === 1 ? '' : 's'} added from your games.`,
    noGamesFound: "No analysed games found yet. Play some games and come back. Chess On!",
    upgradePrompt: 'Ad-free forever — one-time payment, no subscription.',
  },

  // Puzzle source labels
  puzzle: {
    sourcePersonal: 'From your games',
    sourceCurated: 'Curated for your level',
    correct: '✓ Best move!',
    incorrect: '✗ Try again',
    solutionReveal: 'The best move was',
  },

  // Result screen
  result: {
    correct: (mode: string) => `Nice! Chess On!`,
    incorrect: "Not quite — but that's how you improve.",
    adLabel: 'Advertisement',
    adRemovePrompt: 'Go ad-free — pay once, no subscription.',
  },

  // Modes
  modes: {
    solveIt: {
      name: 'Solve It',
      description: 'Find the best move from your own blunders.',
      prompt: 'Find the best move',
    },
    rewind: {
      name: 'Rewind',
      description: "Identify what your opponent just played before you respond.",
      prompt: "What was your opponent's last move?",
    },
    rankIt: {
      name: 'Rank It',
      description: 'Order these three moves from best to worst.',
      prompt: 'Rank these moves: best to worst',
    },
  },

  // Payment
  payment: {
    cta: 'Go ad-free — £4.99, one time',
    successToast: "You're ad-free. Chess On! 🎉",
    cancelMessage: 'No worries — you can upgrade anytime.',
  },

  // Email signup
  email: {
    successMessage: "You're on the list. Chess On!",
    placeholder: 'Your email address',
  },

  // Marketing (homepage + onboarding)
  marketing: {
    hero: 'Puzzles from your own games. Unlimited. Free.',
    subhero: 'Chess.com charges for puzzles. Ours are unlimited — including 5 million from the Lichess open database.',
    connector: 'The only puzzle trainer that connects Chess.com and Lichess in one place.',
    pitch: 'Your blunders. Their puzzles. One trainer.',
  },

  // Coming soon teasers
  teasers: {
    duels: {
      headline: 'Duels',
      description: 'Challenge anyone to a puzzle duel. ELO-rated rankings.',
    },
    openings: {
      headline: 'Opening Trainer',
      description: 'Puzzles from the exact openings you play, calibrated to your Elo.',
    },
    weakness: {
      headline: 'Weakness Spotter',
      description: 'Click the weakness on the board before your opponent exploits it.',
    },
  },

  // Footer
  footer: {
    lichessCredit: 'Puzzles sourced from the Lichess open database (CC0)',
  },
} as const;
```

**Rules for Claude Code:**
- Import `COPY` from `lib/copy.ts` in every component that renders user-facing text
- Never write a user-facing string directly in a component — always use a `COPY` key
- If a new string is needed that isn't in `COPY`, add it to `lib/copy.ts` first, then use it
- `COPY` is the single source of truth for all copy — this makes future edits (translations, A/B tests) trivial

---

## GLOBAL CONSTRAINTS
- **TypeScript:** No `any`. All functions and API responses fully typed.
- **Error handling:** Every API route returns `{ error: string }` on failure with correct HTTP status
- **Mobile:** Every screen works at 375px. Test each phase on mobile before marking done.
- **Loading states:** Every async operation shows a skeleton or spinner — no blank states
- **No regressions:** Verify existing code still works after each phase
