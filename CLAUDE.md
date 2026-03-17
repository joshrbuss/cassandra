# Cassandra — Claude Code Guide

## Project Overview

Cassandra is a chess analytics engine that recommends moves exploiting common human mistakes at specific rating brackets, rather than purely optimal play. It generates personalized tactical puzzles from a player's own games and provides opening/position analysis backed by 100K+ real games.

## Architecture

**Two-part system:**
- **Python backend** (`cassandra/`) — FastAPI server, SQLite database, Stockfish integration, data pipeline
- **Static frontend** (`frontend/`) — Pure vanilla HTML/JS, no build step, deployed to Vercel CDN

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, FastAPI, Uvicorn |
| Chess logic | python-chess, Stockfish |
| Database | SQLite + SQLAlchemy ORM 2.0 + Alembic |
| Data pipeline | requests, aiohttp, NumPy, Pandas, SciPy |
| Frontend | Vanilla HTML/JS (no framework, no bundler) |
| Chess UI | Chess.js 0.10.3 |
| Deployment | Vercel (frontend static), local (backend + DB) |

## Key Commands

```bash
# Frontend dev server
npm run dev        # serves frontend/ on localhost

# Backend
uvicorn cassandra.api.routes:app --reload

# Data pipeline
python scripts/bulk_ingest.py       # batch ingest from Chess.com/Lichess
python scripts/ingest_lichess.py    # import from Lichess PGN
python scripts/my_puzzles.py        # regenerate personal puzzle bank

# Analysis scripts
python scripts/analyze_database.py  # database stats and validation
```

## Project Structure

```
cassandra/
├── api/routes.py              # FastAPI REST endpoints
├── data/
│   ├── db.py                  # SQLAlchemy models + session management
│   ├── chesscom_client.py     # Chess.com API (rate-limited)
│   └── game_parser.py         # PGN → position records
├── engine/
│   ├── cassandra_engine.py    # Main move selector (4-step strategy)
│   ├── markov_model.py        # P(move | position, elo_bracket)
│   └── stockfish_eval.py      # Stockfish wrapper
└── analysis/
    ├── personal_puzzles.py    # Puzzle generation from blunders
    ├── elo_profiler.py        # Error profiling by rating bracket
    ├── opening_analysis.py    # Transposition-aware opening stats
    ├── transposition_graph.py # Position relationship tracking
    └── tactical_reachability.py

frontend/
├── puzzles.html               # Main puzzle bank + spaced repetition
├── puzzle-viewer.html         # Single puzzle interface
├── dashboard.html             # Analytics dashboard
├── explorer.html              # Position explorer by ELO
├── report.html                # Personal performance card
├── highlights.html            # Home page
└── data/analysis.json         # Precomputed analysis (134KB, checked in)

scripts/                       # One-off data pipeline scripts
data/                          # Raw PGN archives (gitignored, ~30GB)
cassandra.db                   # SQLite database (gitignored, ~1.7GB)
puzzles_J_R_B_01.json          # Personal puzzle bank (checked in)
ingestion_state.json           # Ingestion metadata/progress tracking
```

## Database Schema

Three core tables in SQLite:

- **`games`** — One row per game: URL (unique), players, ELOs, result, time_class, ECO opening, PGN
- **`positions`** — One row per move: position_hash (Zobrist-like), FEN, move (UCI + SAN), player/opponent ELO, Stockfish eval before/after, blunder/mistake/inaccuracy flags, game result from moving player's perspective
- **`position_stats`** — Materialized: position_hash + elo_bracket → win rates, top 3 moves + frequencies, avg eval loss

Key indexes: `position_hash`, `(position_hash, elo_bracket)`, `game_opening`.

## Core Architectural Concepts

**Elo bracket segmentation** — Humans play differently at different ratings. Brackets: 0-800, 800-1000, 1000-1200, 1200-1400, 1400-1600, 1600-1800, 1800-2000, 2000-2200, 2200-2500, 2500+. All analysis is filtered by bracket.

**Markov move model** — `HumanMoveModel` learns P(move | position, elo_bracket) from historical games to predict likely opponent responses and find positions where the likely response is a blunder.

**Transposition tracking** — `TranspositionGraph` identifies when different openings (ECO codes) converge to the same middlegame position, correcting biased win-rate attribution.

**Position-centric storage** — Games are decomposed into position sequences. `position_hash` enables fast lookup of all games that passed through a given position.

## Frontend Conventions

- No build step — edit HTML/JS files directly
- URL routing is handled by `vercel.json` rewrites (e.g., `/puzzles` → `puzzles.html`)
- `frontend/data/analysis.json` is precomputed and checked in — regenerate with analysis scripts when data changes
- Vercel Analytics is embedded in `puzzles.html`

## Files Not in Git

- `cassandra.db` — live SQLite database (~1.7GB)
- `data/*.pgn`, `data/*.zst` — raw Lichess archives (~30GB)
- `.env` — environment variables
- `node_modules/`, `__pycache__/`, `*.pyc`

## platform/ — Next.js Chess Puzzle App (Phase 1+)

A separate Next.js application built per `chess_puzzle_platform.md`. Lives in `platform/`.

**Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS, Prisma + SQLite, chess.js, react-chessboard v5

**Key commands (run from `platform/`):**
```bash
npm run dev          # dev server on localhost:3000
npm run build        # production build
npm run db:seed      # seed sample Lichess puzzles
npm run db:seed -- --csv /path/to/lichess_db_puzzle.csv  # bulk import
npm run db:studio    # Prisma Studio UI
```

**Structure:**
```
platform/
├── app/
│   ├── page.tsx                          # Home with puzzle counts
│   ├── puzzles/[id]/page.tsx             # Server component — fetches puzzle
│   ├── puzzles/[id]/PuzzleShell.tsx      # Client: retrograde→standard flow
│   └── api/puzzles/[id]/
│       ├── route.ts                      # GET puzzle by ID
│       └── last-move-options/route.ts    # GET 4 MCQ options
├── components/
│   ├── ChessBoardWrapper.tsx             # react-chessboard v5 wrapper
│   ├── RetrogradePuzzle.tsx              # "What was the last move?" MCQ
│   ├── StandardPuzzle.tsx                # Drag-and-drop puzzle
│   ├── MoveOption.tsx                    # MCQ button with hover board preview
│   └── Skeleton.tsx                     # Loading skeletons
├── lib/
│   ├── prisma.ts                         # Prisma client singleton
│   └── distractor.ts                     # Distractor generation (chess.js)
└── prisma/
    ├── schema.prisma                     # Puzzle, PuzzleAttempt, SiteStats
    └── seed.ts                           # Seed (bundled samples + CSV import)
```

**Notes:**
- `platform.db` is gitignored — run `npm run db:seed` to populate
- `react-chessboard v5` uses `<Chessboard options={{ position, ... }} />` (not flat props like v4)
- Board size is CSS-driven (no `boardWidth` prop)
- Puzzle `type` tagging: `retrograde` = last move is capture or check

## Development Notes

- The backend is local-only; only the frontend deploys to Vercel
- No formal test suite — `tests/` is empty; validation scripts are in `scripts/`
- `puzzles_J_R_B_01.json` is the personal puzzle bank for user `J_R_B_01`; regenerate with `scripts/my_puzzles.py`
- Stockfish must be installed and available on PATH for eval features
- `ingestion_state.json` tracks ingestion progress to support resumable bulk imports

## Resources Folder
- Please use the .resources folder to refer to past build prompts I've used for building new features