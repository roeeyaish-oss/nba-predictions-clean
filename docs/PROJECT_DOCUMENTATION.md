# Court Night — NBA Predictions App: Project Documentation

> **Definitive reference for the entire project. Last updated: 2026-04-10.**

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Overview](#2-architecture-overview)
3. [Database Schema](#3-database-schema-supabase)
4. [File Structure](#4-file-structure)
5. [Pages](#5-pages-srcpages)
6. [Components](#6-components-srccomponents)
7. [Hooks](#7-hooks-srchooks)
8. [API Endpoints](#8-api-endpoints-api)
9. [Python Script](#9-python-script-scriptsnba_playoffs_to_supabasepy)
10. [Scoring System](#10-scoring-system-system-b--round-multiplier)
11. [Key Business Logic](#11-key-business-logic)
12. [External Services & Integrations](#12-external-services--integrations)
13. [User Flows](#13-user-flows)
14. [Known Limitations & Future Work](#14-known-limitations--future-work)
15. [Deployment & Operations](#15-deployment--operations)

---

## 1. Project Overview

### What the App Does

**Court Night** is a private NBA playoff prediction pool for a fixed group of 4 friends. Users predict:

- **Game-by-game winners** for each day's playoff games (locked when the game tips off)
- **Playoff series winners** for each first-round, second-round, conference finals, and NBA Finals matchup (locked when the first game of the series starts)
- **NBA Championship pick** (one-time pick, locked April 18, 2026)

Scores accumulate with a round multiplier — harder rounds pay more points. A real-time leaderboard tracks standings. After each day's games complete, an AI-generated "Oracle" recap is delivered in the voice of Mike Breen or Gil Barak.

### Audience

Private group of 4 users, controlled via email allowlist:

| Display Name | Email |
|---|---|
| Roee | roeeyaish@gmail.com |
| Dagan | yuvaldagan95@gmail.com |
| Saban | yuvalsaban9@gmail.com |
| Doron | doronnoam3@gmail.com |

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 6 + JavaScript |
| Styling | UnoCSS (Tailwind preset) + inline styles |
| Routing | React Router v7 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Google OAuth) |
| Backend API | Vercel Serverless Functions (Node.js) |
| AI / Oracle | Claude API (claude-sonnet-4-6) |
| Data ingestion | Python (`nba_api` library) + Windows Task Scheduler |
| Deployment | Vercel (auto-deploy from `main` branch) |
| Email reminders | Python (`smtplib` / Gmail SMTP) |

### Environment Variables

#### Client-side (prefixed `VITE_`, available in browser)

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL (used in `src/lib/supabase.js`) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key for client-side queries |
| `VITE_ALLOWED_EMAILS` | Comma-separated list of authorized Google account emails |

#### Server-side (Vercel environment, `api/` functions only)

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL (same value as `VITE_SUPABASE_URL`) |
| `SUPABASE_SERVICE_KEY` | Supabase service-role key (bypasses RLS; used only server-side) |
| `ANTHROPIC_API_KEY` | Claude API key for Oracle and Welcome endpoints |

#### Python script (`.env` or Windows environment)

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` or `VITE_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Service-role key (required — script won't run without it) |
| `GMAIL_USER` | Gmail address for sending reminder emails |
| `GMAIL_APP_PASSWORD` | Gmail app password (not regular password) |

### Deployment

- **Platform**: Vercel
- **Auto-deploy**: Every push to `main` triggers a Vercel build + deploy
- **Live URL**: Set in Vercel project settings (not stored in repo)

---

## 2. Architecture Overview

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                           │
│                                                                 │
│  React + Vite SPA                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ HomePage │  │Leaderboard│  │ Profile  │  │Results/History│  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────┘  │
│       │               │            │                │           │
│  ┌────┴───────────────┴────────────┴────────────────┴────────┐ │
│  │          Hooks: useLeaderboard, useTodayGames,            │ │
│  │          usePlayoffSeries  (client-side caching)          │ │
│  └────────────────────────────┬──────────────────────────────┘ │
└───────────────────────────────┼────────────────────────────────┘
                                │ HTTPS
         ┌──────────────────────┼──────────────────────┐
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────┐   ┌─────────────────┐   ┌──────────────────┐
│  Vercel          │   │  Supabase       │   │  Claude API      │
│  Serverless Fns  │   │  (PostgreSQL    │   │  (Anthropic)     │
│                  │   │  + Auth)        │   │                  │
│  /api/submit     │   │                 │   │  Oracle recaps   │
│  /api/submitSeries│  │  Tables:        │   │  Welcome msgs    │
│  /api/dailyPreds │   │  users          │   │                  │
│  /api/oracle     │   │  games          │   │  Model:          │
│  /api/welcome    │   │  predictions    │   │  claude-sonnet   │
│                  │   │  results        │   │  -4-6            │
│  Auth: Bearer    │   │  series         │   └──────────────────┘
│  token (Supabase)│   │  series_preds   │
└─────────────────┘   │  scores         │
                      └────────┬────────┘
                               │
                               │ Python writes via service key
                               ▼
                    ┌──────────────────────┐
                    │  Windows Task        │
                    │  Scheduler           │
                    │                      │
                    │  nba_playoffs_to_    │
                    │  supabase.py         │
                    │  (runs 08:00 + 15:00 │
                    │   Israel time)       │
                    │                      │
                    │  Calls NBA API →     │
                    │  updates games,      │
                    │  results, series,    │
                    │  scores              │
                    └──────────────────────┘
```

### Data Flow: User Makes a Game Pick

1. User selects a team on **HomePage** (Game Picks tab)
2. React state updates locally
3. User hits **Submit** → `POST /api/submit` with `[{gameId, pick}]` + Bearer token
4. Serverless function validates token via `supabase.auth.getUser(token)`
5. Function checks each game's start time in Israel timezone — rejects locked games
6. Valid picks are upserted to `predictions` table (`onConflict: "user_id,game_id"`)
7. Response `{ok: true}` received by frontend → toast shown

### Data Flow: Scores Update

1. **nba_playoffs_to_supabase.py** runs on schedule (08:00 and 15:00 Israel time)
2. Fetches yesterday/today/tomorrow from `ScoreboardV3` NBA API
3. For each game with `gameStatusText === "Final"`, calls `BoxScoreTraditionalV3` to get winner
4. Upserts `results` table with winner + scores
5. Calls `CommonPlayoffSeries` to update `series` table (wins, status, first_game_time)
6. Calls `recalculate_all_scores()` which reads predictions + results + series + users → writes `scores` table

### Authentication Flow

```
User clicks "Sign in with Google"
        ↓
supabase.auth.signInWithOAuth({ provider: "google" })
        ↓
Google OAuth consent screen
        ↓
Supabase Auth callback → session created
        ↓
App.jsx onAuthStateChange fires
        ↓
Email checked against VITE_ALLOWED_EMAILS
  → Not in list? signOut() + show "Access Denied"
  → In list? Continue
        ↓
supabase.from("users").upsert({id, email, name})  ← idempotent
        ↓
Fetch user profile (avatar_url, display_name, onboarding_complete)
        ↓
avatar_url resolved: EMAIL_AVATAR_MAP takes priority
        ↓
profile.onboardingComplete === false?
  → Redirect to /onboarding
  → After onboarding, redirect to /
        ↓
Oracle check: fetch /api/oracle, cache in localStorage
  → New content? Show OraclePopup
```

### How the Python Script Fits In

The Python script is the **sole data-ingestion pipeline**. Vercel serverless functions are read/write for user interactions only — they never call the NBA API. The script:

- Runs locally on a Windows machine via Task Scheduler
- Uses `SUPABASE_SERVICE_KEY` (bypasses Row-Level Security)
- Is the only thing that writes to `games`, `results`, `series`, and `scores` tables
- Must be run at least once per day during playoffs for data to be fresh

---

## 3. Database Schema (Supabase)

### `users`

**Purpose**: One row per authenticated user. Stores profile information and championship pick.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY | Matches Supabase Auth `user.id` |
| `email` | text | | Google account email |
| `name` | text | | Full name from Google OAuth metadata |
| `display_name` | text | nullable | User-chosen display name (set in onboarding) |
| `avatar_url` | text | nullable | URL to avatar image in Supabase Storage |
| `onboarding_complete` | boolean | default false | Set to true after onboarding flow |
| `championship_pick` | text | nullable | ESPN short team ID (e.g. `"BOS"`, `"LAL"`) |

**Relationships**: Referenced by `predictions.user_id`, `series_predictions.user_id`, `scores.user_id`

---

### `games`

**Purpose**: One row per NBA game (regular season or playoff). Populated and updated by the Python script.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | text | PRIMARY KEY | NBA game ID (e.g. `"0042500101"`) |
| `date` | text | | Date in Israel timezone, format `YYYY-MM-DD` |
| `home_team` | text | | Full team name (e.g. `"Boston Celtics"`) |
| `away_team` | text | | Full team name |
| `home_img` | text | | NBA CDN SVG logo URL |
| `away_img` | text | | NBA CDN SVG logo URL |
| `game_time` | text | | Tip-off time in Israel timezone, format `HH:MM` |
| `playoff_round` | integer | nullable | 1–4, set when game is tagged as playoff |
| `series_id` | text | nullable | FK → `series.id`, set when game is tagged |

**Relationships**: Referenced by `predictions.game_id`, `results.game_id`

**Playoff game ID format**: `0042YYRRSGG`
- `004` = playoff prefix
- `YY` = season year (e.g. `25` for 2025-26)
- `RR` = round number (e.g. `01` = Round 1)
- `S` = series number within round
- `GG` = game number within series

---

### `results`

**Purpose**: One row per completed game. Winner and final scores.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `game_id` | text | PRIMARY KEY, FK → `games.id` | |
| `winner` | text | | Full winning team name |
| `home_score` | integer | nullable | Final home team score |
| `away_score` | integer | nullable | Final away team score |
| `updated_at` | timestamp | | ISO timestamp of last update (used for Oracle content version) |

**Relationships**: Joins to `games` via `game_id` in Oracle query

---

### `predictions`

**Purpose**: Each user's game-by-game picks.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `user_id` | UUID | PK (composite), FK → `users.id` | |
| `game_id` | text | PK (composite), FK → `games.id` | |
| `pick` | text | | Full team name the user picked |
| `created_at` | timestamp | | Upsert creation timestamp |

**Primary key**: `(user_id, game_id)` — one pick per user per game, overwrite on re-submit

---

### `series`

**Purpose**: One row per playoff series. Tracks win counts and series status.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | text | PRIMARY KEY | NBA series ID (e.g. `"0042500101"`) |
| `round` | integer | | 1 = First Round, 2 = Second Round, 3 = Conf Finals, 4 = NBA Finals |
| `home_team` | text | | Full team name (higher seed) |
| `away_team` | text | | Full team name (lower seed) |
| `home_wins` | integer | | Current wins for home team |
| `away_wins` | integer | | Current wins for away team |
| `winner` | text | nullable | Full winning team name, set when either team reaches 4 wins |
| `status` | text | | `"active"` or `"completed"` |
| `first_game_time` | timestamp | nullable | UTC ISO timestamp of Game 1; used for pick locking |
| `updated_at` | timestamp | | ISO timestamp of last Python script update |

**Series lock logic**: If `first_game_time` is `"1970-01-01T00:00:00Z"` it means the series had games played before the script's 3-day window — picks are locked regardless.

**Relationships**: Referenced by `series_predictions.series_id`, `games.series_id`

---

### `series_predictions`

**Purpose**: Each user's series winner picks.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `user_id` | UUID | PK (composite), FK → `users.id` | |
| `series_id` | text | PK (composite), FK → `series.id` | |
| `pick` | text | | Full team name of predicted series winner |
| `round` | integer | | Round number (denormalized from series for convenience) |
| `updated_at` | timestamp | | Last upsert time |

**Primary key**: `(user_id, series_id)` — one pick per user per series

---

### `scores`

**Purpose**: Materialized score totals per user. Fully recalculated by Python script each run.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `user_id` | UUID | PRIMARY KEY, FK → `users.id` | |
| `score` | integer | | Total points = game_score + series_score + championship_score |
| `game_score` | integer | | Points from correct game picks |
| `series_score` | integer | | Points from correct series picks |
| `championship_score` | integer | | 0 or 25 (championship pick) |

**Note**: This table is a write-through cache. It is never incremented — always fully recalculated from scratch on each script run.

---

### RLS Policies

Supabase Row-Level Security is in effect. The Python script uses `SUPABASE_SERVICE_KEY` (service role) which bypasses all RLS. Client-side uses `VITE_SUPABASE_ANON_KEY` which is subject to RLS. Vercel API functions use `SUPABASE_SERVICE_KEY` for all writes after validating the user's Bearer token manually.

---

## 4. File Structure

```
nba-predictions/
│
├── api/                          # Vercel serverless functions
│   ├── _constants.js             # Shared: CLAUDE_MODEL constant
│   ├── dailyPredictions.js       # GET — today/tomorrow predictions board
│   ├── oracle.js                 # GET — AI-generated game recap (Claude)
│   ├── submit.js                 # POST — upsert game picks
│   ├── submitSeries.js           # POST — upsert series picks
│   └── welcome.js                # GET — onboarding welcome message (Claude)
│
├── docs/
│   └── PROJECT_DOCUMENTATION.md  # This file
│
├── public/                       # Static assets served by Vite
│   ├── court-bg.png              # NBA court background image (7.9 MB, fixed)
│   ├── icon-192.png              # PWA icon 192×192
│   ├── icon-512.png              # PWA icon 512×512
│   ├── logo-192x192.png          # App logo
│   ├── logo-512x512.png          # App logo large
│   ├── nba-logo.png              # NBA logo
│   └── vite.svg                  # Vite default asset
│
├── scripts/
│   ├── nba_playoffs_to_supabase.py  # Main data pipeline (run via Task Scheduler)
│   └── send_reminder.py             # Email reminder script for unpicked games
│
├── src/
│   ├── main.jsx                  # React entry point, BrowserRouter setup
│   ├── App.jsx                   # Root component: auth, routing, Oracle logic
│   ├── index.css                 # Global CSS (animations, skeleton, fonts)
│   │
│   ├── components/
│   │   ├── AppLayout.jsx         # Shell: sticky header, bottom nav, user dropdown
│   │   ├── AvatarModal.jsx       # Full-screen modal to display user avatar
│   │   ├── DailyPredictions.jsx  # Live board of today's user picks
│   │   ├── FadeIn.jsx            # Page transition wrapper component
│   │   ├── OraclePopup.jsx       # AI recap modal (Mike Breen / Gil Barak)
│   │   ├── Scoreboard.jsx        # Leaderboard table with rank/score display
│   │   ├── SkeletonBlock.jsx     # Generic skeleton loader div
│   │   ├── UserAvatar.jsx        # Reusable avatar (image or initials fallback)
│   │   └── ui/
│   │       ├── button.jsx        # Radix Slot-based styled button
│   │       ├── card.jsx          # Glassmorphism card + CardContent wrapper
│   │       └── select.jsx        # Radix Select with custom dark theme styling
│   │
│   ├── hooks/
│   │   ├── useLeaderboard.js     # Fetches scores table; 60s TTL cache
│   │   ├── usePlayoffSeries.js   # Fetches active series + user's series picks
│   │   └── useTodayGames.js      # Fetches today/tomorrow games; 5min TTL cache
│   │
│   ├── lib/
│   │   ├── constants.js          # URLs, model name, lock date constants
│   │   ├── nbaTeams.js           # All 30 NBA teams with ESPN logo URLs
│   │   ├── playoffBracket.js     # Bracket layout, team abbreviations, 2025-26 matchups
│   │   ├── storage.js            # Safe localStorage helpers (lsGet, lsSet, lsGetJson)
│   │   ├── supabase.js           # Supabase client singleton
│   │   ├── time.js               # Israel timezone helpers, isGameStarted()
│   │   └── utils.ts              # cn() classname utility
│   │
│   └── pages/
│       ├── HistoryPage.jsx       # All users' picks vs results for all completed games
│       ├── HomePage.jsx          # Main picks page: game picks + series picks tabs
│       ├── LeaderboardPage.jsx   # Wrapper around Scoreboard component
│       ├── OnboardingPage.jsx    # First-time user setup (name + championship pick)
│       ├── ProfilePage.jsx       # Personal stats, avatar, championship pick, history
│       └── ResultsPage.jsx       # Playoff bracket tree + game results table
│
├── .env                          # Local environment variables (not in git)
├── .gitignore
├── index.html                    # Vite HTML entry point
├── package.json                  # Dependencies and scripts
├── uno.config.js                 # UnoCSS config (Tailwind preset)
├── vite.config.js                # Vite config (PWA plugin, path aliases)
└── vercel.json                   # Vercel routing config (if present)
```

---

## 5. Pages (`src/pages/`)

### `HomePage.jsx`

**Purpose**: Primary interaction page. Users make daily game picks and playoff series picks.

**Data fetched**:
- `useTodayGames(supabase)` — games for today and tomorrow (Israel TZ), 5-min cache
- `usePlayoffSeries(supabase, user.id)` — active series + user's existing series picks
- `DailyPredictions` sub-component polls `/api/dailyPredictions` every 30s

**Key state**:

| State var | Type | Purpose |
|---|---|---|
| `picks` | `{[gameId]: teamName}` | Current user's unsaved game picks |
| `savedPicks` | `{[gameId]: teamName}` | Last submitted game picks (from DB) |
| `seriesPicks` | `{[seriesId]: teamName}` | Current user's unsaved series picks |
| `savedSeriesPicks` | `{[seriesId]: teamName}` | Last submitted series picks (from DB) |
| `activeTab` | `"games" \| "series"` | Which tab is displayed |
| `submitting` | boolean | Submit button loading state |

**User interactions**:
- Toggle between **GAME PICKS** and **SERIES PICKS** tabs (color changes: gold vs indigo)
- Click team card to set pick → highlighted with team-colored border
- Submit button sends all picks via API
- Oracle FAB button in bottom-right reopens the daily recap popup

**Special logic**:
- `isGameStarted(game.game_time, game.date)` — disables cards for started games
- Series lock: `first_game_time` has passed OR `home_wins + away_wins > 0`
- Championship lock: April 18, 2026 04:00 UTC (`CHAMPIONSHIP_LOCK_DATE`)
- Picks are pre-loaded from DB on mount so existing picks show as selected

---

### `ProfilePage.jsx`

**Purpose**: Personal dashboard — view/edit avatar, display name, championship pick; see personal prediction history.

**Data fetched**:
- User profile from `users` table on mount
- Personal game predictions + results (joined query) for history table
- Personal series predictions + series data for series history
- Scores breakdown from `scores` table

**Key state**:

| State var | Purpose |
|---|---|
| `editName` | Whether name edit field is shown |
| `champPick` | Currently selected championship team (ESPN short ID) |
| `champLocked` | Boolean — true if past `CHAMPIONSHIP_LOCK_DATE` |
| `personalHistory` | Array of `{game, result, pick, correct}` |
| `seriesHistory` | Array of `{series, pick, correct, points}` |

**User interactions**:
- Edit display name (max 40 chars) → saves to `users.display_name`
- Select championship pick from 30-team grid → saves to `users.championship_pick`
- View avatar (click → AvatarModal)

**Score breakdown display**: `{gameScore}g · {seriesScore}s · {championshipScore}c`

---

### `ResultsPage.jsx`

**Purpose**: Shows the full playoff bracket as a visual tree + scrollable game results table.

**Data fetched**:
- `series` table (all rounds, status, win counts, winner)
- `results` table joined to `games` for scores and dates

**Bracket layout** (`src/lib/playoffBracket.js`):
- Hardcoded 2025-26 first-round matchups (8 series, West + East)
- SVG-described bracket: 1051px × 390px body
- West: OKC/MEM, DEN/LAC, LAL/MIN, HOU/GSW
- East: CLE/MIA, IND/MIL, NYK/DET, BOS/ORL
- Completed series colored gold (`#C9B037`)

**Game results table**: Grouped by date; columns: Date, Home, Score, Away, Winner. Only games with a result (non-null winner) shown.

---

### `HistoryPage.jsx`

**Purpose**: Full prediction transparency — every user's pick for every completed game, color-coded correct/incorrect.

**Data fetched**:
- All completed games with results (joined)
- All predictions for those games (all users)
- All series + series_predictions (all users) for series rows
- Championship picks from users table

**Layout**:
- **Game predictions table**: Rows = games (grouped by date), Columns = [Roee, Dagan, Saban, Doron]
  - Green cell (`#4ade80`) = correct pick
  - Red cell (`#f87171`) = incorrect pick
  - Empty = no pick submitted
- **Series predictions table**: One row per series per round
  - Same color coding; only shows after series has a winner
- **Championship row**: 25pt row at bottom; shows correctness when champion is known

---

### `LeaderboardPage.jsx`

**Purpose**: Minimal wrapper — renders the `Scoreboard` component with a "Leaderboard / Standings" header.

**Data**: Delegated entirely to `Scoreboard` component (which uses `useLeaderboard` hook).

---

### `OnboardingPage.jsx`

**Purpose**: First-time setup flow for new users. Required before accessing any other page.

**Steps**:
1. Display name input (max 40 chars; pre-populated with Google full name)
2. Championship pick from 30-team grid (required to proceed)
3. Avatar preview (read-only, pulled from `EMAIL_AVATAR_MAP`)
4. Submit → saves `display_name`, `championship_pick`, `onboarding_complete=true` to `users` table
5. Triggers `GET /api/welcome?name={displayName}` → shows personalized Oracle welcome popup

---

## 6. Components (`src/components/`)

### `AppLayout.jsx`

**Purpose**: Persistent shell wrapping all authenticated pages. Contains header and bottom nav.

**Props**: `{ onSignOut, backgroundStyle, avatarUrl, displayName }`

**Renders**:
- **Fixed top header**: User avatar + display name (clickable → dropdown), refresh button
- **User dropdown**: "View Avatar" (opens AvatarModal), "Regenerate Oracle" (confirmation → clears localStorage oracle cache + triggers re-fetch), "Sign Out"
- **Bottom nav** (5 icons using `NavLink` with gold active state):

| Icon | Route | Label |
|---|---|---|
| Home | `/` | Home |
| Trophy | `/leaderboard` | Leaderboard |
| Grid | `/results` | Results |
| User | `/profile` | Profile |
| Clock | `/history` | History |

Uses `<Outlet />` from React Router to render child pages.

---

### `Scoreboard.jsx`

**Purpose**: Leaderboard table.

**Props**: None (fetches own data via `useLeaderboard`)

**Columns**: Rank (with change indicator), User (avatar + name), Score breakdown (`{g}g · {s}s · {c}c`), Total

**Rank change indicators**:
- `↑` green — rank improved since last render
- `↓` red — rank dropped
- `=` gray — no change

**Scoring tooltip**: Hoverable `?` button showing full point breakdown table.

---

### `DailyPredictions.jsx`

**Purpose**: Real-time board showing all users' picks for today's games.

**Props**: `{ supabase, currentUserId, games }`

**Behavior**:
- Polls `GET /api/dailyPredictions` every 30 seconds when mounted
- Groups picks by user
- **Visibility rule**: Own picks always visible. Other users' picks hidden until game has started (prevents cheating)
- Displays team logos as pick indicators

---

### `OraclePopup.jsx`

**Purpose**: Modal displaying the Claude-generated daily game recap.

**Props**: `{ data: { title, recap, avatarUrl, announcer, contentVersion }, onClose }`

**Behavior**:
- Dimmed fullscreen backdrop
- Announcer avatar image (Mike Breen or Gil Barak) with skeleton while loading
- Title in gold (e.g. `"BANG!"`, `"CALLED IT"`)
- Recap text supports `**bold**` syntax → rendered as `<strong>` tags
- Close via X button or Escape key
- On close: calls `lsSet("oracle_last_seen_version", contentVersion)` so popup doesn't reappear for same content

---

### `UserAvatar.jsx`

**Purpose**: Reusable avatar component used throughout the app.

**Props**:

| Prop | Type | Default | Purpose |
|---|---|---|---|
| `avatarUrl` | string \| null | | Image URL |
| `name` | string | | Used for initials fallback |
| `size` | number | 36 | Diameter in px |
| `textSize` | number | 14 | Font size for initials |
| `border` | string | `"2px solid #C9B037"` | Border style |
| `boxShadow` | string | | Optional shadow |
| `onClick` | function | | Click handler |

**Initials logic**: `name.split(/\s+/).map(w => w[0]).join("").slice(0,2).toUpperCase()`

---

### `AvatarModal.jsx`

**Purpose**: Full-screen modal displaying a user's avatar image (or large initials).

**Props**: `{ avatarUrl, name, onClose }`

**Behavior**: Click backdrop or press Escape to close.

---

### `FadeIn.jsx`

**Purpose**: Wraps children in a div with `contentFadeIn` CSS animation class for page transitions.

---

### `SkeletonBlock.jsx`

**Purpose**: Single `<div className="skeleton-block" />` — renders an animated loading placeholder.

---

### `ui/card.jsx`

**Purpose**: Glassmorphism card with gold border.

Components exported: `Card`, `CardContent`

Style: `background: rgba(8,5,0,0.65)`, `border: 1.5px solid rgba(201,176,55,0.8)`, `backdropFilter: blur(16px)`

---

### `ui/button.jsx`

**Purpose**: Styled button using Radix `Slot` for polymorphic rendering.

---

### `ui/select.jsx`

**Purpose**: Dark-themed dropdown select built on Radix UI Select primitive.

Exports: `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`

---

## 7. Hooks (`src/hooks/`)

### `useLeaderboard.js`

**Purpose**: Fetches all user scores for the leaderboard, with caching.

**Parameters**: None (uses module-level Supabase client from `src/lib/supabase.js`)

**Query**:
```javascript
supabase
  .from("scores")
  .select("score, game_score, series_score, championship_score, users(*)")
```

**Returns**:
```javascript
{
  scores: [
    {
      user: { id, email, name, display_name, avatar_url },
      avatarUrl: string,
      score: number,         // total
      gameScore: number,
      seriesScore: number,
      championshipScore: number,
    }
  ],
  loading: boolean,
  refresh: () => void,
}
```

**Caching**: Module-level `leaderboardCache = { data, timestamp }`. TTL: **60 seconds**. Cache key: none (global). Invalidated on `refresh()` call or TTL expiry.

---

### `useTodayGames.js`

**Purpose**: Fetches today's and tomorrow's games (Israel timezone).

**Parameters**: `supabase` — Supabase client instance

**Query**:
```javascript
supabase
  .from("games")
  .select("id, date, home_team, away_team, home_img, away_img, game_time")
  .in("date", [todayIL, tomorrowIL])
  .order("date", { ascending: true })
  .order("game_time", { ascending: true })
```

**Returns**:
```javascript
{
  games: [
    {
      gameId: string,       // maps from 'id'
      date: string,         // YYYY-MM-DD Israel TZ
      home: string,         // home_team
      away: string,         // away_team
      homeImg: string,      // home_img
      awayImg: string,      // away_img
      gameTimeIL: string,   // HH:MM Israel TZ
    }
  ],
  loading: boolean,
  refresh: () => void,
}
```

**Caching**: Module-level `gamesCache = { data, date }`. TTL: **5 minutes**. Cache key: today's Israel date. Resets when date changes or TTL expires.

---

### `usePlayoffSeries.js`

**Purpose**: Fetches active playoff series and the current user's existing series picks.

**Parameters**: `supabase`, `userId: string`

**Queries** (parallel `Promise.all`):
```javascript
// Active series
supabase.from("series")
  .select("id, round, home_team, away_team, home_wins, away_wins, first_game_time, status")
  .eq("status", "active")
  .order("round", { ascending: true })

// User's existing picks
supabase.from("series_predictions")
  .select("series_id, pick")
  .eq("user_id", userId)
```

**Returns**:
```javascript
{
  series: [
    {
      id: string,
      round: number,        // 1-4
      home_team: string,
      away_team: string,
      home_wins: number,
      away_wins: number,
      first_game_time: string | null,  // UTC ISO
      status: "active" | "completed",
    }
  ],
  userPicks: { [seriesId]: teamName },
  loading: boolean,
  refresh: () => void,
}
```

**Fallback**: If no active series exist in DB, returns a single test series:
```javascript
{
  id: "TEST_R1_S1",
  round: 1,
  home_team: "Oklahoma City Thunder",
  away_team: "Memphis Grizzlies",
  home_wins: 0, away_wins: 0,
  status: "active", first_game_time: null
}
```

> ⚠️ **Important**: This mock must be removed before the real playoffs start. See [Section 14](#14-known-limitations--future-work).

**Caching**: No module-level cache. Re-fetches on mount and whenever `userId` changes.

---

## 8. API Endpoints (`api/`)

All endpoints validate the Bearer token via `supabase.auth.getUser(token)` before processing. The Supabase client in API functions uses `SUPABASE_SERVICE_KEY` (service role).

---

### `GET /api/dailyPredictions`

**Auth**: Required (Bearer token)

**Purpose**: Returns all user predictions for today's and tomorrow's games (Israel TZ).

**Response**:
```json
[
  {
    "user": "display_name or name",
    "display_name": "string",
    "avatar_url": "string",
    "user_id": "uuid",
    "pick": "Full Team Name",
    "game_id": "string",
    "game_time": "HH:MM",
    "date": "YYYY-MM-DD",
    "created_at": "ISO timestamp"
  }
]
```

**Business logic**: Joins `predictions` with `games` (filtering by today/tomorrow Israel dates) and `users`.

---

### `POST /api/submit`

**Auth**: Required (Bearer token)

**Purpose**: Saves (upserts) the user's game-by-game picks.

**Request body**:
```json
[
  { "gameId": "0042500101", "pick": "Boston Celtics" },
  { "gameId": "0042500201", "pick": "Oklahoma City Thunder" }
]
```

**Validation**:
- Each game must not have started (`isGameStarted()` check using Israel TZ)
- Invalid/started games are silently skipped (not error); only valid picks are upserted

**Upsert**:
```javascript
supabase.from("predictions").upsert(
  [{ user_id, game_id, pick }],
  { onConflict: "user_id,game_id" }
)
```

**Response**: `{ ok: true, saved: N }` or `{ error: "..." }` with 4xx/5xx

---

### `POST /api/submitSeries`

**Auth**: Required (Bearer token)

**Purpose**: Saves the user's series winner picks.

**Request body**:
```json
[
  { "seriesId": "0042500101", "pick": "Boston Celtics" },
  { "seriesId": "0042500201", "pick": "Oklahoma City Thunder" }
]
```

**Validation**:
- Series must exist and have `status !== "completed"`
- Series must not have started: `first_game_time` is null or in the future AND `home_wins + away_wins === 0`

**Upsert**:
```javascript
supabase.from("series_predictions").upsert(
  [{ user_id, series_id, pick, round, updated_at }],
  { onConflict: "user_id,series_id" }
)
```

**Response**: `{ ok: true, saved: N }` or error

---

### `GET /api/oracle`

**Auth**: Required (Bearer token)

**Purpose**: Generates (or serves cached) an AI recap of yesterday's games.

**Query params**: `?announcer=barak` (optional; defaults to `"breen"`)

**Logic**:
1. Compute yesterday's date in Israel TZ
2. Fetch `results` joined with `games` for yesterday
3. If no results → `{ ready: false }`
4. Build `content_version = "oracle:{yesterday}:{latestUpdatedAt}"`
5. Fetch all predictions for yesterday's game IDs
6. Build context string: each game's matchup, winner, and each user's pick (with ✓/✗)
7. Call Claude API with announcer-specific system prompt
8. Parse JSON from Claude response
9. Return `{ ready: true, content_version, title, recap, announcer }`

**Claude prompts**:
- **breen**: Mike Breen style — `"BANG!"`, `"tough night at the office"`, English only
- **barak**: Gil Barak style — Israeli sports energy in English, `"SPECTACLE!"`, `"I don't BELIEVE it!"`

**Possible titles** (chosen by Claude based on content):
`BANG!` | `CALLED IT` | `RAK RESHETTTT` | `DAME TIME` | `NOTHING BUT NET` | `SPLASH NIGHT` | `AND ONE` | `BUCKETS`

**Error handling**: If Claude API fails or JSON parse fails → `{ ready: false }`

---

### `GET /api/welcome`

**Auth**: Required (Bearer token)

**Purpose**: Generates a personalized welcome message for new users after onboarding.

**Query params**: `?name={displayName}`

**Logic**:
1. Calls Claude with a friendly welcome prompt mentioning the user's name
2. Returns `{ title: "WELCOME TO THE COURT", recap: "personalized message" }`

**Only fires once per user**: Frontend checks `lsGet("welcome_shown")` before calling.

---

### `api/_constants.js`

Not an endpoint — shared constant file:
```javascript
export const CLAUDE_MODEL = "claude-sonnet-4-6";
```

---

## 9. Python Script (`scripts/nba_playoffs_to_supabase.py`)

### Overview

The sole data pipeline for the app. Fetches live NBA data and writes it to Supabase. Designed to run twice daily via Windows Task Scheduler.

### Step-by-Step Execution

#### Step 1 — Fetch scoreboard data

```python
from nba_api.stats.endpoints import scoreboardv3

# Fetches yesterday, today, and tomorrow (US/Eastern time)
sb = scoreboardv3.ScoreboardV3(game_date="04/09/2026", timeout=60)
games_df = sb.get_data_frames()[1]   # one row per game
teams_df = sb.get_data_frames()[2]   # two rows per game (away=0, home=1)
```

All three date scoreboards are concatenated into `all_games` and `all_teams`.

#### Step 2 — Reconstruct home/away from teams_df

`teams_df` has two rows per game: index 0 = away, index 1 = home. Extracted via `groupby('gameId').nth(0/1)`.

#### Step 3 — Time conversion

UTC → Israel timezone using `pytz`:
```python
dt_utc = datetime.strptime(utc_str, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=utc)
dt_il = dt_utc.astimezone(il)
# returns (YYYY-MM-DD, HH:MM)
```

#### Step 4 — Upsert `games` table

Upserts rows: `{ id, date, home_team, away_team, home_img, away_img, game_time }`.
Team names resolved via `team_id_to_name` dict (30 team IDs → full names).
Team images: `https://cdn.nba.com/logos/nba/{teamId}/global/L/logo.svg`

#### Step 5 — Update `results` for finished games

For each game with `gameStatusText == "Final"`:
```python
from nba_api.stats.endpoints import boxscoretraditionalv3

boxscore = boxscoretraditionalv3.BoxScoreTraditionalV3(game_id=game_id)
df = boxscore.get_data_frames()[2]   # team totals (2 rows)
# Higher score = winner; home/away determined by matching teamId
```

Upserts to `results`: `{ game_id, winner, home_score, away_score, updated_at }`.
1.5-second sleep between each box score call to avoid NBA API rate limiting.

#### Step 6 — Fetch and upsert playoff series

```python
from nba_api.stats.endpoints import commonplayoffseries

endpoint = commonplayoffseries.CommonPlayoffSeries(season="2025-26")
df = endpoint.get_data_frames()[0]
```

Builds `series_map` keyed by `SERIES_ID`, accumulating `HOME_TEAM_WINS` / `VISITOR_TEAM_WINS`.

`first_game_time` logic:
- Found in 3-day window → uses earliest game UTC time
- Not found but wins > 0 → sentinel `"1970-01-01T00:00:00Z"` (series already started)
- Not found and wins = 0 → `None` (series not yet started)

After upserting series, tags all game rows in `games` table with `playoff_round` and `series_id`.

#### Step 7 — Recalculate all scores

Full recalculation from scratch (not incremental):

```python
GAME_POINTS       = {1: 1, 2: 2, 3: 3, 4: 4}
SERIES_POINTS     = {1: 5, 2: 9, 3: 14, 4: 20}
CHAMPIONSHIP_POINTS = 25
```

1. **Game scores**: For each prediction where `pick == results_map[game_id]`, add `GAME_POINTS[playoff_round]` (defaults to 1pt for untagged/regular season games)
2. **Series scores**: For each series prediction where `pick == series.winner`, add `SERIES_POINTS[series.round]`
3. **Championship score**: Find `series` with `round == 4` and a winner. For each user, map `championship_pick` (short ID like `"BOS"`) to full name via `TEAM_SHORT_ID_TO_NAME`. If match → 25 pts
4. Writes `{ user_id, score, game_score, series_score, championship_score }` to `scores` table

### Retry Logic

All NBA API calls wrapped in `call_with_retry()`:
- 3 attempts (`NBA_RETRIES = 3`)
- 5-second delay between retries (`NBA_RETRY_DELAY = 5`)
- 60-second timeout per call (`NBA_TIMEOUT = 60`)

### How to Run Manually

```bash
cd "C:\Users\RoeeYaish\Python Projects\nba-predictions\scripts"
python nba_playoffs_to_supabase.py
```

Requires `.env` file in `scripts/` directory (or parent) with:
```
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=...
```

### Task Scheduler Setup (Windows)

Two triggers: **08:00 Israel time** and **15:00 Israel time** (adjusting for DST relative to UTC).

```
Action:      Start a program
Program:     C:\path\to\python.exe
Arguments:   C:\Users\RoeeYaish\Python Projects\nba-predictions\scripts\nba_playoffs_to_supabase.py
Start in:    C:\Users\RoeeYaish\Python Projects\nba-predictions\scripts
```

---

### `send_reminder.py`

**Purpose**: Email reminders to users who haven't submitted picks for upcoming games.

**How it works**:
1. Fetches games that haven't started yet (using Israel TZ)
2. For each upcoming game, checks which users have no prediction
3. Sends personalized email via Gmail SMTP with list of unpicked games

**Required env vars**: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`

---

## 10. Scoring System (System B — Round Multiplier)

### Game Picks

| Round | Games | Points per Correct Pick |
|---|---|---|
| Round 1 | First Round (16 teams) | **1 pt** |
| Round 2 | Second Round (8 teams) | **2 pt** |
| Round 3 | Conference Finals | **3 pt** |
| Round 4 | NBA Finals | **4 pt** |

### Series Winner Picks

| Round | Points for Correct Pick |
|---|---|
| Round 1 | **5 pt** |
| Round 2 | **9 pt** |
| Conference Finals | **14 pt** |
| NBA Finals | **20 pt** |

### Championship Pick

- **25 points** for correctly picking the NBA champion
- One pick per user, locked on **April 18, 2026 at 04:00 UTC**
- Stored as ESPN short ID (e.g. `"BOS"`); compared to `series.winner` (full name) via `TEAM_SHORT_ID_TO_NAME` map

### Score Columns

| Column | Contains |
|---|---|
| `game_score` | Sum of all correct game pick points |
| `series_score` | Sum of all correct series pick points |
| `championship_score` | 0 or 25 |
| `score` | `game_score + series_score + championship_score` |

### Display Format

Throughout the UI: `{gameScore}g · {seriesScore}s · {championshipScore}c`

Example: `7g · 14s · 0c` = 7 points from games, 14 from series, 0 from championship

---

## 11. Key Business Logic

### Game Pick Locking

**Function**: `isGameStarted(gameTimeIL, gameDate)` in `src/lib/time.js`

```javascript
// Returns true if the game's tip-off time has passed
// in the Israel timezone (Asia/Jerusalem)
```

- Compares current Israel time against `gameDate + gameTimeIL`
- Game cards become unclickable and dimmed when `isGameStarted()` returns `true`
- Server-side: `api/submit.js` re-validates the same check before upserting

### Series Pick Locking

A series is locked (picks cannot be submitted/changed) if:
- `first_game_time` is in the past (Game 1 has tipped off), **OR**
- `home_wins + away_wins > 0` (games have been played regardless of `first_game_time`)

The sentinel `first_game_time = "1970-01-01T00:00:00Z"` is used when wins > 0 but the game is outside the 3-day scoreboard window.

### Championship Pick Locking

```javascript
// src/lib/constants.js
export const CHAMPIONSHIP_LOCK_DATE = "2026-04-18T04:00:00Z";
```

- Profile page checks `new Date() > new Date(CHAMPIONSHIP_LOCK_DATE)` — disables the team grid if true
- Onboarding page always allows pick (onboarding happens before lock date)

### Prediction Visibility

**Game picks**: Own picks always visible. Other users' picks hidden in `DailyPredictions` until `isGameStarted()` returns `true` for that game. This prevents pick-copying.

**Series picks**: Not shown in real-time. History (`HistoryPage`) only reveals series predictions after `series.status === 'completed'` (series has a winner).

### Oracle Popup Versioning

- `content_version = "oracle:{yesterday}:{latestUpdatedAt}"`
- Stored in `localStorage` as `oracle_data_today` with `{ date, ready, title, recap, announcer, contentVersion }`
- On login: compare `oracle_last_seen_version` vs stored `contentVersion`
  - Different → show popup (new content)
  - Same → don't show (already seen)
- Module-level guard `oracleLastFetchedDate` prevents double-fetching during React re-renders

### Avatar Assignment

Priority order in `App.jsx`:
1. `EMAIL_AVATAR_MAP[email]` — hardcoded per-user avatar URLs from Supabase Storage
2. If no email mapping but `avatar_url` starts with Supabase Storage base URL → use stored URL
3. Otherwise → `null` (shows initials in `UserAvatar`)

If email mapping exists and DB doesn't match → auto-updates DB to keep it in sync.

```javascript
const EMAIL_AVATAR_MAP = {
  "roeeyaish@gmail.com":    ".../avatars/roee.png",
  "yuvaldagan95@gmail.com": ".../avatars/dagan.png",
  "yuvalsaban9@gmail.com":  ".../avatars/saban.png",
  "doronnoam3@gmail.com":   ".../avatars/doron.png",
};
```

---

## 12. External Services & Integrations

### Supabase

- **URL**: `https://mdllwtozvzjrlkexrdwk.supabase.co`
- **Auth**: Google OAuth provider enabled in Supabase dashboard
- **Database**: PostgreSQL with RLS enabled
- **Storage**: `avatars` bucket containing `roee.png`, `dagan.png`, `saban.png`, `doron.png`
- **Client-side**: Uses `VITE_SUPABASE_ANON_KEY` (subject to RLS)
- **Server-side / Python**: Uses `SUPABASE_SERVICE_KEY` (bypasses RLS)

### Vercel

- Auto-deploy on push to `main`
- Hosts React SPA (static build output from `npm run build`)
- Hosts serverless functions from `api/` directory
- Environment variables set in Vercel project dashboard

### NBA API (`nba_api` Python library)

| Endpoint class | Used for | Key data frames |
|---|---|---|
| `ScoreboardV3` | Daily game schedule + status | `[1]` = games, `[2]` = teams |
| `BoxScoreTraditionalV3` | Final scores + winner | `[2]` = team totals |
| `CommonPlayoffSeries` | Series win counts | `[0]` = series rows |

### Claude API (Anthropic)

- **Model**: `claude-sonnet-4-6`
- **Used in**: `api/oracle.js` (daily recap), `api/welcome.js` (onboarding welcome)
- **Auth**: `ANTHROPIC_API_KEY` in Vercel environment
- **Direct HTTP**: `POST https://api.anthropic.com/v1/messages` with `anthropic-version: 2023-06-01`
- **Max tokens**: 300 per oracle call
- **Response format**: Enforced JSON with `title` and `recap` fields

### ESPN CDN (Team Logos)

Used in `src/lib/nbaTeams.js` for the championship picker and onboarding grid:
```
https://a.espncdn.com/i/teamlogos/nba/500/{abbr}.png
```

Used in Python script for game/scoreboard logos (NBA CDN):
```
https://cdn.nba.com/logos/nba/{teamId}/global/L/logo.svg
```

### Supabase Storage (Avatars)

- **Bucket**: `avatars` (public)
- **Base URL**: `https://mdllwtozvzjrlkexrdwk.supabase.co/storage/v1/object/public/avatars/`
- **Files**: `roee.png`, `dagan.png`, `saban.png`, `doron.png`
- Also stores announcer images (Mike Breen, Gil Barak) referenced via `ANNOUNCER_URL` / `ANNOUNCER_HE_URL` in `src/lib/constants.js`

---

## 13. User Flows

### Flow 1: New User First Login → Onboarding → Home

```
1. Visit app URL → "Court Night" login screen
2. Click "Sign in with Google"
3. Google OAuth consent → redirect back to app
4. App.jsx: email checked against VITE_ALLOWED_EMAILS
   → Not in list: "Access Denied" screen shown
   → In list: continue
5. User upserted to `users` table (id, email, name)
6. Profile fetched: onboarding_complete = false
7. Redirect to /onboarding
8. Enter display name (max 40 chars)
9. Select championship pick from 30-team grid (required)
10. Click "Let's Play" → saves display_name, championship_pick, onboarding_complete=true
11. GET /api/welcome?name={name} called once (localStorage guard)
12. OraclePopup shown with personalized welcome message
13. Redirect to / (HomePage)
```

### Flow 2: Returning User → Game Picks → Submit

```
1. Login (or session persists) → HomePage
2. "GAME PICKS" tab active by default
3. useTodayGames hook loads today/tomorrow games
4. Existing picks (from predictions table) pre-selected
5. Click team card to select a pick
   → Started games are disabled/dimmed
6. Change mind: click other team in same game → pick updates
7. Click "Submit Picks" button
8. POST /api/submit with [{gameId, pick}, ...]
9. Server validates: re-checks start times
10. Upserts to predictions table
11. Toast: "Picks saved!"
12. DailyPredictions board refreshes
```

### Flow 3: Returning User → Series Picks → Submit

```
1. HomePage → tap "SERIES PICKS" tab (indigo/purple theme)
2. usePlayoffSeries hook loads active series
3. Each series card shows: teams, logos, current win counts
4. Lock indicator shown if series has started
5. Click team to pick series winner
   → Locked series: no interaction possible
6. Click "Submit Series Picks"
7. POST /api/submitSeries with [{seriesId, pick}, ...]
8. Server validates: checks first_game_time + wins
9. Toast: "Series picks saved!"
```

### Flow 4: Viewing History (After Games Complete)

```
1. Navigate to /history
2. HistoryPage loads:
   - All games with results
   - All predictions for all users
   - All series predictions (only revealed when series completed)
3. Game table: rows = dates/games, columns = users
   - Green = correct pick
   - Red = wrong pick
   - Empty = no pick
4. Series table: shows round, series matchup, each user's pick
   - Revealed only after series.status === 'completed'
5. Championship row: shows each user's pick (revealed after Finals winner)
```

### Flow 5: Viewing Leaderboard

```
1. Navigate to /leaderboard (or tap Trophy icon in bottom nav)
2. Scoreboard component mounts
3. useLeaderboard hook fetches scores table
4. Table renders: Rank, Avatar+Name, {g}g·{s}s·{c}c, Total
5. Rank change indicators shown (↑/↓/=)
6. "?" tooltip shows full scoring breakdown
7. Data auto-refreshes via 60s cache TTL
```

### Flow 6: Editing Profile (Before April 18)

```
1. Navigate to /profile
2. Profile loads: avatar, display name, score breakdown, history tables
3. Click edit icon next to display name
   → Text field appears, type new name
   → Save: updates users.display_name
4. Championship pick grid shown (locked indicator after April 18)
   → Click team to change pick (if unlocked)
   → Auto-saves to users.championship_pick
5. Personal game history table: own picks vs results
6. Personal series history table: own series picks + correctness
```

### Flow 7: Oracle Popup Appearance

```
1. User logs in after games completed yesterday
2. App.jsx: profile.onboarding_complete === true
3. Check localStorage "oracle_data_today"
   Case A: Cached + date matches today
     → Compare oracle_last_seen_version vs contentVersion
     → Different → show OraclePopup immediately
     → Same → don't show
   Case B: No cache or stale date
     → Fetch GET /api/oracle
     → ready: false → don't show, clear localStorage
     → ready: true → cache in localStorage, set oracleData state
       → Compare versions → show if new
4. OraclePopup displays title + recap + announcer image
5. User closes popup → lsSet("oracle_last_seen_version", contentVersion)
   → Won't show again unless content_version changes
6. Reopen: AppLayout dropdown → "Regenerate Oracle"
   → Confirmation modal
   → Clears localStorage oracle cache
   → Triggers re-fetch → new version generated
   → Popup shows again
```

---

## 14. Known Limitations & Future Work

### Active Issues

| Issue | Location | Action Required |
|---|---|---|
| **Mock series in `usePlayoffSeries.js`** | `src/hooks/usePlayoffSeries.js:36–49` | **Must remove before playoffs.** The fallback test series (OKC vs MEM, `TEST_R1_S1`) is shown when no active series exist in DB. This could show fake data if Python script hasn't run yet. Remove the fallback or replace with a "no active series" empty state. |

### Not Implemented

| Feature | Notes |
|---|---|
| **Push Notifications** | Planned for game-start reminders; currently using email (`send_reminder.py`) |
| **AI Insights** | Placeholder in UI — deeper AI analysis of prediction patterns |
| **Architecture Documentation infographic** | Visual diagram of the system (referenced in early planning) |
| **Avatar upload** | Users cannot upload custom avatars — only pre-mapped images from Supabase Storage |
| **Admin panel** | No UI for managing users, manually triggering score recalcs, etc. |

### Technical Debt

| Area | Notes |
|---|---|
| `playoff_round` tagging | Relies on Python script having run recently; games without `playoff_round` default to 1pt for scoring |
| `series_id` in games | Only populated when Python script runs with playoff data active |
| `scores` table is a cache | Full recalculation on every script run is safe but inefficient at scale |

---

## 15. Deployment & Operations

### Deploying the App

```bash
# Any push to main triggers Vercel auto-deploy
git push origin main
```

Vercel build command: `npm run build`
Vercel output directory: `dist`

### Required Vercel Environment Variables

Set these in Vercel Dashboard → Project → Settings → Environment Variables:

```
SUPABASE_URL          = https://mdllwtozvzjrlkexrdwk.supabase.co
SUPABASE_SERVICE_KEY  = <service role key from Supabase dashboard>
ANTHROPIC_API_KEY     = <key from console.anthropic.com>
```

> Note: `VITE_*` variables are build-time; they must also be set in Vercel for production builds to work.

```
VITE_SUPABASE_URL       = https://mdllwtozvzjrlkexrdwk.supabase.co
VITE_SUPABASE_ANON_KEY  = <anon key from Supabase dashboard>
VITE_ALLOWED_EMAILS     = roeeyaish@gmail.com,Yuvaldagan95@gmail.com,Yuvalsaban9@gmail.com,doronnoam3@gmail.com
```

### Running the Python Script Manually

```bash
# Navigate to scripts directory
cd "C:\Users\RoeeYaish\Python Projects\nba-predictions\scripts"

# Ensure .env has SUPABASE_URL and SUPABASE_SERVICE_KEY
python nba_playoffs_to_supabase.py

# For email reminders
python send_reminder.py
```

Required Python packages:
```bash
pip install nba_api pandas pytz supabase python-dotenv
```

### Task Scheduler Setup (Windows)

1. Open **Task Scheduler** → Create Basic Task
2. Name: `NBA Predictions Sync`
3. Trigger: Daily → set time (adjust for Israel TZ vs local TZ)
4. Repeat: Add second trigger for 15:00 Israel time
5. Action: Start a program
   - Program: `C:\Python311\python.exe` (adjust path)
   - Arguments: `"C:\Users\RoeeYaish\Python Projects\nba-predictions\scripts\nba_playoffs_to_supabase.py"`
   - Start in: `C:\Users\RoeeYaish\Python Projects\nba-predictions\scripts`
6. Ensure machine is awake at scheduled times

**Israel timezone offsets**: UTC+2 (winter) / UTC+3 (summer, DST). Check DST when setting Windows Task Scheduler times.

### Resetting Test Data (SQL)

```sql
-- Clear all predictions
DELETE FROM predictions;
DELETE FROM series_predictions;

-- Reset scores
UPDATE scores SET score = 0, game_score = 0, series_score = 0, championship_score = 0;

-- Clear results (caution: re-running script will repopulate)
DELETE FROM results;

-- Reset championship picks for all users
UPDATE users SET championship_pick = NULL;

-- Reset onboarding (forces all users through onboarding again)
UPDATE users SET onboarding_complete = FALSE;
```

### Local Development

```bash
npm install
npm run dev        # starts Vite dev server at http://localhost:5173
npm run lint       # ESLint check
npm run build      # production build (must pass before commit)
```

> Per `CLAUDE.md`: `npm run lint` and `npm run build` must both pass before every commit.
