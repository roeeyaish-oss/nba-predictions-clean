# NBA Playoff Predictions App

## Stack
React + Vite + JavaScript + UnoCSS + React Router | Vercel | Supabase

## Architecture
- src/App.jsx — auth, routing, background
- src/components/AppLayout.jsx — fixed background, top bar, bottom nav
- src/pages/ — HomePage, LeaderboardPage, ProfilePage, HistoryPage
- src/components/ — Scoreboard, DailyPredictions, ui/
- api/ — Vercel serverless functions (submit, dailyPredictions)
- scripts/nba_playoffs_to_supabase.py — runs locally, fetches NBA data → Supabase

## Backend
- Database: Supabase PostgreSQL
- Tables: users, games, predictions, results, scores
- Auth: Google OAuth via Supabase Auth + email whitelist (VITE_ALLOWED_EMAILS)

## Environment Variables
- SUPABASE_URL, SUPABASE_SERVICE_KEY — server (api/)
- VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY — client (src/)
- VITE_ALLOWED_EMAILS — comma-separated whitelist

## Theme
- Background: public/court-bg.png (NBA court, fixed/non-scrolling)
- Accent: #C9B037 (gold)
- Cards: glassmorphism, rgba(8,5,0,0.65), gold border

## Rules
- Mobile-first, PWA compatible
- Plan before implementing — never code without a plan
- Use inline styles for complex CSS effects
- Never push sensitive keys to git
- npm run lint + npm run build must pass before every commit
