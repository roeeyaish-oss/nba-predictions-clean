// 2024-25 NBA Playoffs
// Team names must exactly match what nba_playoffs_to_supabase.py writes (team_id_to_name)
// ESPN logo abbreviations: https://a.espncdn.com/i/teamlogos/nba/500/{abbr}.png
import { ESPN_LOGO_BASE } from "@/lib/constants";

export const TEAM_ABBR = {
  "Atlanta Hawks":            "atl",
  "Boston Celtics":           "bos",
  "Brooklyn Nets":            "bkn",
  "Charlotte Hornets":        "cha",
  "Chicago Bulls":            "chi",
  "Cleveland Cavaliers":      "cle",
  "Dallas Mavericks":         "dal",
  "Denver Nuggets":           "den",
  "Detroit Pistons":          "det",
  "Golden State Warriors":    "gs",
  "Houston Rockets":          "hou",
  "Indiana Pacers":           "ind",
  "LA Clippers":              "lac",
  "Los Angeles Lakers":       "lal",
  "Memphis Grizzlies":        "mem",
  "Miami Heat":               "mia",
  "Milwaukee Bucks":          "mil",
  "Minnesota Timberwolves":   "min",
  "New Orleans Pelicans":     "no",
  "New York Knicks":          "ny",
  "Oklahoma City Thunder":    "okc",
  "Orlando Magic":            "orl",
  "Philadelphia 76ers":       "phi",
  "Phoenix Suns":             "phx",
  "Portland Trail Blazers":   "por",
  "Sacramento Kings":         "sac",
  "San Antonio Spurs":        "sa",
  "Toronto Raptors":          "tor",
  "Utah Jazz":                "utah",
  "Washington Wizards":       "wsh",
};

// Short display names for bracket cards (space is limited)
export const TEAM_SHORT = {
  "Oklahoma City Thunder":   "Thunder",
  "Memphis Grizzlies":       "Grizzlies",
  "Denver Nuggets":          "Nuggets",
  "LA Clippers":             "Clippers",
  "Los Angeles Lakers":      "Lakers",
  "Minnesota Timberwolves":  "Wolves",
  "Houston Rockets":         "Rockets",
  "Golden State Warriors":   "Warriors",
  "Cleveland Cavaliers":     "Cavaliers",
  "Miami Heat":              "Heat",
  "Indiana Pacers":          "Pacers",
  "Milwaukee Bucks":         "Bucks",
  "New York Knicks":         "Knicks",
  "Detroit Pistons":         "Pistons",
  "Boston Celtics":          "Celtics",
  "Orlando Magic":           "Magic",
};

export function teamLogo(teamName) {
  const abbr = TEAM_ABBR[teamName] ?? teamName;
  return `${ESPN_LOGO_BASE}/${abbr}.png`;
}

// First round matchups ordered for bracket tree layout.
// West/East order: [1v8 (top), 4v5, 3v6, 2v7 (bottom)]
// Bracket pairings: indices (0,1) → Semi 1 (top);  indices (2,3) → Semi 2 (bottom)
export const FIRST_ROUND = {
  west: [
    { id: "w1v8", seed1: 1, team1: "Oklahoma City Thunder",  seed2: 8, team2: "Memphis Grizzlies"      },
    { id: "w4v5", seed1: 4, team1: "Denver Nuggets",         seed2: 5, team2: "LA Clippers"            },
    { id: "w3v6", seed1: 3, team1: "Los Angeles Lakers",     seed2: 6, team2: "Minnesota Timberwolves" },
    { id: "w2v7", seed1: 2, team1: "Houston Rockets",        seed2: 7, team2: "Golden State Warriors"  },
  ],
  east: [
    { id: "e1v8", seed1: 1, team1: "Cleveland Cavaliers",    seed2: 8, team2: "Miami Heat"     },
    { id: "e4v5", seed1: 4, team1: "Indiana Pacers",         seed2: 5, team2: "Milwaukee Bucks" },
    { id: "e3v6", seed1: 3, team1: "New York Knicks",        seed2: 6, team2: "Detroit Pistons" },
    { id: "e2v7", seed1: 2, team1: "Boston Celtics",         seed2: 7, team2: "Orlando Magic"   },
  ],
};
