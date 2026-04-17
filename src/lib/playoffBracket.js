// 2025-26 NBA Playoffs
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
  "Portland Trail Blazers":  "Blazers",
  "San Antonio Spurs":       "Spurs",
  "Phoenix Suns":            "Suns",
  "Denver Nuggets":          "Nuggets",
  "Minnesota Timberwolves":  "Wolves",
  "Los Angeles Lakers":      "Lakers",
  "Houston Rockets":         "Rockets",
  "Detroit Pistons":         "Pistons",
  "Orlando Magic":           "Magic",
  "Boston Celtics":          "Celtics",
  "Philadelphia 76ers":      "Sixers",
  "New York Knicks":         "Knicks",
  "Atlanta Hawks":           "Hawks",
  "Cleveland Cavaliers":     "Cavaliers",
  "Toronto Raptors":         "Raptors",
  "TBD":                     "TBD",
};

export function teamLogo(teamName) {
  if (!teamName || teamName === "TBD") return null;
  const abbr = TEAM_ABBR[teamName] ?? teamName;
  return `${ESPN_LOGO_BASE}/${abbr}.png`;
}

