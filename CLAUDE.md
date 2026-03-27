# NBA Playoff Predictions App

## Project Overview
PWA for predicting NBA playoff game results among a closed group of friends.
Stack: React + Vite + JavaScript + UnoCSS
Deployment: Vercel
Current Backend: Google Apps Script + Google Sheets (migrating to Supabase)

## Architecture
- src/App.jsx — main page, prediction form
- src/components/Scoreboard.jsx — leaderboard
- src/components/DailyPredictions.jsx — daily picks view
- src/components/ui/ — button, card, select primitives
- api/ — Vercel serverless functions

## Active Migration
Moving from Google Sheets backend to Supabase.
Auth: Google OAuth via Supabase Auth.

## Rules
- Always maintain PWA compatibility
- Mobile-first design
- Never break existing prediction/scoring logic during migration
- All external services must have a free tier
- Always use Plan Mode before implementing any feature
- One sub-agent per task — never mix concerns

## Commands
- npm run dev
- npm run build
- npm run lint
- NBA data script runs locally via Windows Task Scheduler, not via CI/CD
