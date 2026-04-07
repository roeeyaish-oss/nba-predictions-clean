// 2024-25 NBA Playoffs — First Round matchups
// Team names must match exactly what nba_playoffs_to_supabase.py writes to results.winner
// ESPN logo abbreviations match src/lib/nbaTeams.js

export const PLAYOFF_BRACKET = {
  east: [
    { id: "e1v8", seed1: 1, team1: "Cleveland Cavaliers",  abbr1: "cle", seed2: 8, team2: "Miami Heat",        abbr2: "mia" },
    { id: "e2v7", seed1: 2, team1: "Boston Celtics",       abbr1: "bos", seed2: 7, team2: "Orlando Magic",     abbr2: "orl" },
    { id: "e3v6", seed1: 3, team1: "New York Knicks",      abbr1: "ny",  seed2: 6, team2: "Detroit Pistons",   abbr2: "det" },
    { id: "e4v5", seed1: 4, team1: "Indiana Pacers",       abbr1: "ind", seed2: 5, team2: "Milwaukee Bucks",   abbr2: "mil" },
  ],
  west: [
    { id: "w1v8", seed1: 1, team1: "Oklahoma City Thunder", abbr1: "okc", seed2: 8, team2: "Memphis Grizzlies",       abbr2: "mem" },
    { id: "w2v7", seed1: 2, team1: "Houston Rockets",       abbr1: "hou", seed2: 7, team2: "Golden State Warriors",   abbr2: "gs"  },
    { id: "w3v6", seed1: 3, team1: "Los Angeles Lakers",    abbr1: "lal", seed2: 6, team2: "Minnesota Timberwolves",  abbr2: "min" },
    { id: "w4v5", seed1: 4, team1: "Denver Nuggets",        abbr1: "den", seed2: 5, team2: "Los Angeles Clippers",    abbr2: "lac" },
  ],
};

export function teamLogo(abbr) {
  return `https://a.espncdn.com/i/teamlogos/nba/500/${abbr}.png`;
}
