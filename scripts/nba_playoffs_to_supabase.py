# === nba_playoffs_to_supabase.py ===

import pandas as pd
from nba_api.stats.endpoints import scoreboardv3, boxscoretraditionalv3, commonplayoffseries
from datetime import datetime, timedelta
from pytz import timezone, utc
from supabase import create_client, Client
from dotenv import load_dotenv
import os
import smtplib
import socket
import sys
import time
from email.message import EmailMessage

DRY_RUN = "--dry-run" in sys.argv
if DRY_RUN:
    print("=== DRY-RUN MODE: no data will be written to Supabase ===")

load_dotenv()

# === Network connectivity check ===
# Task Scheduler may wake the machine before the network adapter is ready.
# Retry up to 5 times with 30-second waits before giving up.
NET_CHECK_HOST = "google.com"
NET_CHECK_RETRIES = 5
NET_CHECK_DELAY = 30  # seconds between attempts
NET_CHECK_TIMEOUT = 10  # seconds per DNS resolution attempt

for attempt in range(1, NET_CHECK_RETRIES + 1):
    try:
        socket.setdefaulttimeout(NET_CHECK_TIMEOUT)
        socket.getaddrinfo(NET_CHECK_HOST, 443)
        print(f"Network ready (attempt {attempt}).")
        break
    except OSError:
        if attempt < NET_CHECK_RETRIES:
            print(f"Network not ready (attempt {attempt}/{NET_CHECK_RETRIES}). Waiting {NET_CHECK_DELAY}s...")
            time.sleep(NET_CHECK_DELAY)
        else:
            print(f"Network not available after {NET_CHECK_RETRIES} attempts. Exiting.")
            sys.exit(1)

NBA_TIMEOUT = 60
NBA_RETRIES = 3
NBA_RETRY_DELAY = 5  # seconds between retries

# === Issue accumulator — appended throughout the run, emailed once at the end ===
issues: list[str] = []


def call_with_retry(fn, *args, **kwargs):
    """Call fn(*args, **kwargs) up to NBA_RETRIES times, sleeping between attempts."""
    last_err = None
    for attempt in range(1, NBA_RETRIES + 1):
        try:
            return fn(*args, **kwargs)
        except Exception as e:
            last_err = e
            if attempt < NBA_RETRIES:
                print(f"Attempt {attempt} failed ({e}). Retrying in {NBA_RETRY_DELAY}s...")
                time.sleep(NBA_RETRY_DELAY)
    raise last_err


def safe_int(val, default=0):
    """Convert val to int, returning default on ValueError/TypeError (e.g. NaN)."""
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


def send_alert_email(issue_list: list[str]) -> None:
    """Send a single summary alert email if any issues were collected during the run."""
    gmail_user = os.getenv("GMAIL_USER", "").strip()
    gmail_password = os.getenv("GMAIL_APP_PASSWORD", "").strip()
    if not gmail_user or not gmail_password:
        print("Warning: GMAIL_USER or GMAIL_APP_PASSWORD not set — skipping alert email.")
        return

    body_lines = [
        "The following issues were detected during the Court Night pipeline run:",
        "",
        *[f"- {issue}" for issue in issue_list],
        "",
        f"Run timestamp: {datetime.now(utc).isoformat()}",
    ]

    message = EmailMessage()
    message["Subject"] = "⚠️ Court Night pipeline issues"
    message["From"] = gmail_user
    message["To"] = gmail_user
    message.set_content("\n".join(body_lines))

    try:
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=30) as smtp:
            smtp.starttls()
            smtp.login(gmail_user, gmail_password)
            smtp.send_message(message)
        print(f"Alert email sent to {gmail_user} ({len(issue_list)} issue(s)).")
    except Exception as e:
        print(f"Warning: Failed to send alert email: {e}")


SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_KEY:
    raise EnvironmentError(
        "SUPABASE_SERVICE_KEY is not set. "
        "This script requires the service role key to write data. "
        "Set it in your .env file or environment before running."
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# === Team ID lookup tables ===
team_id_to_name = {
    1610612737: "Atlanta Hawks",
    1610612738: "Boston Celtics",
    1610612751: "Brooklyn Nets",
    1610612766: "Charlotte Hornets",
    1610612741: "Chicago Bulls",
    1610612739: "Cleveland Cavaliers",
    1610612742: "Dallas Mavericks",
    1610612743: "Denver Nuggets",
    1610612765: "Detroit Pistons",
    1610612744: "Golden State Warriors",
    1610612745: "Houston Rockets",
    1610612754: "Indiana Pacers",
    1610612755: "Philadelphia 76ers",
    1610612746: "LA Clippers",
    1610612747: "Los Angeles Lakers",
    1610612763: "Memphis Grizzlies",
    1610612748: "Miami Heat",
    1610612749: "Milwaukee Bucks",
    1610612750: "Minnesota Timberwolves",
    1610612740: "New Orleans Pelicans",
    1610612752: "New York Knicks",
    1610612760: "Oklahoma City Thunder",
    1610612753: "Orlando Magic",
    1610612756: "Phoenix Suns",
    1610612757: "Portland Trail Blazers",
    1610612758: "Sacramento Kings",
    1610612759: "San Antonio Spurs",
    1610612761: "Toronto Raptors",
    1610612762: "Utah Jazz",
    1610612764: "Washington Wizards"
}

team_id_to_image = {
    1610612737: "https://cdn.nba.com/logos/nba/1610612737/global/L/logo.svg",
    1610612738: "https://cdn.nba.com/logos/nba/1610612738/global/L/logo.svg",
    1610612751: "https://cdn.nba.com/logos/nba/1610612751/global/L/logo.svg",
    1610612766: "https://cdn.nba.com/logos/nba/1610612766/global/L/logo.svg",
    1610612741: "https://cdn.nba.com/logos/nba/1610612741/global/L/logo.svg",
    1610612739: "https://cdn.nba.com/logos/nba/1610612739/global/L/logo.svg",
    1610612742: "https://cdn.nba.com/logos/nba/1610612742/global/L/logo.svg",
    1610612743: "https://cdn.nba.com/logos/nba/1610612743/global/L/logo.svg",
    1610612765: "https://cdn.nba.com/logos/nba/1610612765/global/L/logo.svg",
    1610612744: "https://cdn.nba.com/logos/nba/1610612744/global/L/logo.svg",
    1610612745: "https://cdn.nba.com/logos/nba/1610612745/global/L/logo.svg",
    1610612754: "https://cdn.nba.com/logos/nba/1610612754/global/L/logo.svg",
    1610612755: "https://cdn.nba.com/logos/nba/1610612755/global/L/logo.svg",
    1610612746: "https://cdn.nba.com/logos/nba/1610612746/global/L/logo.svg",
    1610612747: "https://cdn.nba.com/logos/nba/1610612747/global/L/logo.svg",
    1610612763: "https://cdn.nba.com/logos/nba/1610612763/global/L/logo.svg",
    1610612748: "https://cdn.nba.com/logos/nba/1610612748/global/L/logo.svg",
    1610612749: "https://cdn.nba.com/logos/nba/1610612749/global/L/logo.svg",
    1610612750: "https://cdn.nba.com/logos/nba/1610612750/global/L/logo.svg",
    1610612740: "https://cdn.nba.com/logos/nba/1610612740/global/L/logo.svg",
    1610612752: "https://cdn.nba.com/logos/nba/1610612752/global/L/logo.svg",
    1610612760: "https://cdn.nba.com/logos/nba/1610612760/global/L/logo.svg",
    1610612753: "https://cdn.nba.com/logos/nba/1610612753/global/L/logo.svg",
    1610612756: "https://cdn.nba.com/logos/nba/1610612756/global/L/logo.svg",
    1610612757: "https://cdn.nba.com/logos/nba/1610612757/global/L/logo.svg",
    1610612758: "https://cdn.nba.com/logos/nba/1610612758/global/L/logo.svg",
    1610612759: "https://cdn.nba.com/logos/nba/1610612759/global/L/logo.svg",
    1610612761: "https://cdn.nba.com/logos/nba/1610612761/global/L/logo.svg",
    1610612762: "https://cdn.nba.com/logos/nba/1610612762/global/L/logo.svg",
    1610612764: "https://cdn.nba.com/logos/nba/1610612764/global/L/logo.svg",
}


# === Scoring constants ===
GAME_POINTS = {1: 1, 2: 2, 3: 3, 4: 4}
SERIES_POINTS = {1: 5, 2: 9, 3: 14, 4: 20}
CHAMPIONSHIP_POINTS = 25

# championship_pick in the DB stores ESPN-style short IDs (e.g. "BOS", "LAL")
# series.winner stores full team names (e.g. "Boston Celtics")
# This map bridges the two so champion scoring works correctly.
TEAM_SHORT_ID_TO_NAME = {
    "ATL": "Atlanta Hawks",
    "BOS": "Boston Celtics",
    "BKN": "Brooklyn Nets",
    "CHA": "Charlotte Hornets",
    "CHI": "Chicago Bulls",
    "CLE": "Cleveland Cavaliers",
    "DAL": "Dallas Mavericks",
    "DEN": "Denver Nuggets",
    "DET": "Detroit Pistons",
    "GSW": "Golden State Warriors",
    "HOU": "Houston Rockets",
    "IND": "Indiana Pacers",
    "LAC": "LA Clippers",
    "LAL": "Los Angeles Lakers",
    "MEM": "Memphis Grizzlies",
    "MIA": "Miami Heat",
    "MIL": "Milwaukee Bucks",
    "MIN": "Minnesota Timberwolves",
    "NOP": "New Orleans Pelicans",
    "NYK": "New York Knicks",
    "OKC": "Oklahoma City Thunder",
    "ORL": "Orlando Magic",
    "PHI": "Philadelphia 76ers",
    "PHX": "Phoenix Suns",
    "POR": "Portland Trail Blazers",
    "SAC": "Sacramento Kings",
    "SAS": "San Antonio Spurs",
    "TOR": "Toronto Raptors",
    "UTA": "Utah Jazz",
    "WAS": "Washington Wizards",
}


# === Step 1: Fetch games for yesterday, today, and tomorrow (ET) ===
est = timezone('US/Eastern')
il = timezone('Asia/Jerusalem')

yesterday_est = (datetime.now(est) - timedelta(days=1)).strftime('%m/%d/%Y')
today_est = datetime.now(est).strftime('%m/%d/%Y')
tomorrow_est = (datetime.now(est) + timedelta(days=1)).strftime('%m/%d/%Y')

print(f"Fetching games for yesterday ({yesterday_est}), today ({today_est}), tomorrow ({tomorrow_est})")


def fetch_scoreboard(game_date):
    sb = call_with_retry(scoreboardv3.ScoreboardV3, game_date=game_date, timeout=NBA_TIMEOUT)
    games_df = sb.get_data_frames()[1]   # one row per game
    teams_df = sb.get_data_frames()[2]   # two rows per game (away first, home second)
    return games_df, teams_df


# Fix 1: Wrap each day's scoreboard fetch individually so a single failure
# doesn't crash the entire script. Failed days are skipped and logged.
_empty_df = pd.DataFrame()

def safe_fetch_scoreboard(date_str):
    try:
        return fetch_scoreboard(date_str)
    except Exception as e:
        issues.append(f"ScoreboardV3 failed for {date_str}: {e}")
        return _empty_df.copy(), _empty_df.copy()


games_df_y, teams_df_y   = safe_fetch_scoreboard(yesterday_est)
games_df_t, teams_df_t   = safe_fetch_scoreboard(today_est)
games_df_tm, teams_df_tm = safe_fetch_scoreboard(tomorrow_est)

all_games = pd.concat([games_df_y, games_df_t, games_df_tm], ignore_index=True)
all_teams = pd.concat([teams_df_y, teams_df_t, teams_df_tm], ignore_index=True)


# === Step 2: Reconstruct home/away team IDs from teams_df ===
# V3 teams_df has two rows per game: row 0 = away (visitor), row 1 = home
away_teams = all_teams.groupby('gameId').nth(0).reset_index()[['gameId', 'teamId']].rename(columns={'teamId': 'awayTeamId'})
home_teams = all_teams.groupby('gameId').nth(1).reset_index()[['gameId', 'teamId']].rename(columns={'teamId': 'homeTeamId'})

games = all_games.merge(away_teams, on='gameId').merge(home_teams, on='gameId')


# === Step 3: Time conversion ===
def convert_utc_to_il(utc_str):
    """Parse a UTC ISO string and return (il_date, il_time) or ('', '')."""
    try:
        if not utc_str:
            return '', ''
        dt_utc = datetime.strptime(utc_str, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=utc)
        dt_il = dt_utc.astimezone(il)
        return dt_il.strftime('%Y-%m-%d'), dt_il.strftime('%H:%M')
    except Exception as e:
        print(f"Warning: Failed to convert time '{utc_str}': {e}")
        return '', ''


games[['Date (IL)', 'Game Time (IL)']] = games['gameTimeUTC'].apply(
    lambda t: pd.Series(convert_utc_to_il(t))
)

games['Home Team'] = games['homeTeamId'].map(team_id_to_name).fillna('TBD')
games['Away Team'] = games['awayTeamId'].map(team_id_to_name).fillna('TBD')
games['Home Team Image'] = games['homeTeamId'].map(team_id_to_image).fillna('')
games['Away Team Image'] = games['awayTeamId'].map(team_id_to_image).fillna('')


# === Step 4: Build and upsert games table ===
# Only write playoff games (IDs starting with "004").
# Play-in ("005") and regular-season ("002") games are excluded.
games_cleaned = pd.DataFrame({
    'id': games['gameId'].astype(str),
    'date': games['Date (IL)'],
    'home_team': games['Home Team'],
    'away_team': games['Away Team'],
    'home_img': games['Home Team Image'],
    'away_img': games['Away Team Image'],
    'game_time': games['Game Time (IL)'],
})
games_cleaned = games_cleaned[games_cleaned['id'].str.startswith('004')]

try:
    games_payload = games_cleaned.to_dict(orient='records')
    if games_payload:
        supabase.table('games').upsert(games_payload).execute()
        print(f"Saved {len(games_payload)} games to Supabase.")
    else:
        print("No games to save.")
except Exception as e:
    print(f"Error saving games: {e}")


# === Step 5: Update results for finished games ===
def get_winner(game_id, home_team_id):
    try:
        boxscore = call_with_retry(boxscoretraditionalv3.BoxScoreTraditionalV3, game_id=game_id, timeout=NBA_TIMEOUT)
        df = boxscore.get_data_frames()[2]  # team totals (one row per team)
        team_1 = df.iloc[0]
        team_2 = df.iloc[1]

        # Fix 2: Use None fallback instead of abbreviated teamName.
        # If a team ID is missing from the lookup, log it and skip this game
        # so no corrupt short name (e.g. "BOS") is written as the winner.
        team_1_full = team_id_to_name.get(team_1['teamId'])
        team_2_full = team_id_to_name.get(team_2['teamId'])
        if not team_1_full or not team_2_full:
            issues.append(
                f"Unknown team ID in game {game_id}: "
                f"team1={team_1['teamId']}, team2={team_2['teamId']}"
            )
            return '', None, None

        # Fix 9: Use safe_int for points to avoid ValueError on NaN boxscores.
        team_1_pts = safe_int(team_1['points'])
        team_2_pts = safe_int(team_2['points'])

        if team_1_pts > team_2_pts:
            winner = team_1_full
        elif team_2_pts > team_1_pts:
            winner = team_2_full
        else:
            winner = 'Tie'

        # Determine home/away scores by matching teamId to homeTeamId
        if int(team_1['teamId']) == int(home_team_id):
            home_score, away_score = team_1_pts, team_2_pts
        else:
            home_score, away_score = team_2_pts, team_1_pts

        print(f"Game {game_id} | {team_1_full} {team_1_pts} vs {team_2_full} {team_2_pts} | Winner: {winner}")
        return winner, home_score, away_score
    except Exception as e:
        print(f"Warning: Failed to get winner for game {game_id}: {e}")
        return '', None, None


try:
    print(f"Status breakdown:\n{games['gameStatusText'].value_counts().to_string()}")

    # Fix 5: Use startswith('Final') to capture OT games ("Final/OT", "Final/2OT", etc.)
    # Exclude play-in games ("005") — they're not part of the prediction pool.
    final_games = games[
        games['gameStatusText'].str.startswith('Final', na=False) &
        ~games['gameId'].astype(str).str.startswith('005')
    ]
    print(f"Found {len(final_games)} final games.")

    results_updated_at = datetime.now(utc).isoformat()
    results_payload = []
    for _, row in final_games.iterrows():
        game_id = str(row['gameId'])
        winner, home_score, away_score = get_winner(game_id, row['homeTeamId'])
        if winner:
            results_payload.append({
                'game_id': game_id,
                'winner': winner,
                'home_score': home_score,
                'away_score': away_score,
                'updated_at': results_updated_at,
            })
        time.sleep(1.5)

    if results_payload:
        supabase.table('results').upsert(results_payload, on_conflict='game_id').execute()
        print(f"Upserted {len(results_payload)} results.")
    else:
        print("No final games to update.")
except Exception as e:
    print(f"Error updating results: {e}")


# === Step 6: Fetch and upsert playoff series, tag games with round/series_id ===

def extract_playoff_info(game_id: str):
    """
    Returns (round_num, series_num, game_num) if game_id is a playoff game, else None.
    NBA playoff game ID format: 0042YYRRSGG
      [0:3]  = '004' (playoff prefix)
      [3:5]  = season year (e.g. '25' for 2024-25)
      [5:7]  = round (e.g. '01' = Round 1)
      [7]    = series number within round
      [8:]   = game number within series
    """
    s = str(game_id).strip()
    if not s.startswith("004"):
        return None
    try:
        round_num = int(s[5:7])
        series_num = int(s[7])
        game_num = int(s[8:])
        if round_num < 1 or round_num > 4:
            return None
        return round_num, series_num, game_num
    except (ValueError, IndexError):
        return None


def determine_series_winner(home_team: str, away_team: str, home_wins: int, away_wins: int):
    """Returns the winner's team name if either team has 4 wins, else None."""
    if home_wins >= 4:
        return home_team
    if away_wins >= 4:
        return away_team
    return None


# Round 1: series number (SERIES_ID[8]) → (conference, high_seed, low_seed)
# Empirically verified against CommonPlayoffSeries for 2025-26:
#   S=1 → East 2v7  (Boston vs Philadelphia)
#   S=2 → East 3v6  (New York vs Atlanta)
#   S=3 → East 4v5  (Cleveland vs Toronto)
#   S=4 → East 1v8  (absent until play-in resolves)
#   S=5 → West 2v7  (San Antonio vs Portland)
#   S=6 → West 3v6  (Denver vs Minnesota)
#   S=7 → West 4v5  (LA Lakers vs Houston)
#   S=8 → West 1v8  (absent until play-in resolves)
_R1_SERIES_TO_SEEDS = {
    1: ("East", 2, 7),
    2: ("East", 3, 6),
    3: ("East", 4, 5),
    4: ("East", 1, 8),
    5: ("West", 2, 7),
    6: ("West", 3, 6),
    7: ("West", 4, 5),
    8: ("West", 1, 8),
}


def series_id_to_canonical(nba_series_id: str):
    """
    Derives our canonical series ID from the NBA API SERIES_ID string.

    SERIES_ID format: 004YY0RRS where:
      [0:3] = "004" (playoff prefix)
      [3:5] = season year (e.g. "25" for 2025-26)
      [5:8] = round zero-padded (e.g. "001" = Round 1)
      [8]   = series number within round (1-8 for R1)

    Returns "2026_{Conf}_{high}v{low}" for Round 1.
    Returns None for rounds 2-4 (log-but-skip; add when needed).
    """
    try:
        round_num = int(nba_series_id[5:8])
        series_num = int(nba_series_id[8])
    except (ValueError, IndexError):
        return None

    if round_num == 1:
        seeds = _R1_SERIES_TO_SEEDS.get(series_num)
        if seeds is None:
            return None
        conf, high, low = seeds
        return f"2026_{conf}_{high}v{low}"

    # Rounds 2-4: not yet implemented — will be added when needed
    return None


def fetch_series_from_common_playoff_series(season="2025-26"):
    """
    Fetches active playoff series using CommonPlayoffSeries.
    Only series present in the API are upserted; absent series (E1v8, W1v8)
    are not touched so their TBD values in the DB remain intact.

    Wins are counted from the results table via each series' GAME_IDs.

    Returns a list of series dicts in the format expected by upsert_series():
      {id, round, home_team, away_team, home_wins, away_wins, game_ids}
    """
    try:
        endpoint = call_with_retry(
            commonplayoffseries.CommonPlayoffSeries,
            season=season,
            timeout=NBA_TIMEOUT,
        )
        df = endpoint.get_data_frames()[0]
    except Exception as e:
        print(f"Warning: Could not fetch CommonPlayoffSeries: {e}")
        return []

    if df.empty:
        print("No data returned from CommonPlayoffSeries.")
        return []

    # Fetch all results once to count wins per series
    try:
        results_resp = supabase.table("results").select("game_id, winner").execute()
        results_map = {r["game_id"]: r["winner"] for r in (results_resp.data or [])}
    except Exception as e:
        print(f"Warning: Could not fetch results for win counting: {e}")
        results_map = {}

    # Group rows by SERIES_ID (one row per game in each series)
    series_groups: dict[str, list] = {}
    for _, row in df.iterrows():
        sid = str(row["SERIES_ID"]).strip()
        series_groups.setdefault(sid, []).append(row)

    series_list = []
    for nba_series_id, rows in series_groups.items():
        canonical_id = series_id_to_canonical(nba_series_id)
        if not canonical_id:
            try:
                round_num = int(nba_series_id[5:8])
            except (ValueError, IndexError):
                round_num = 0
            if round_num > 1:
                print(f"Skipping series {nba_series_id} (round {round_num} canonical mapping not yet implemented)")
            else:
                issues.append(
                    f"CommonPlayoffSeries: unrecognised R1 SERIES_ID {nba_series_id!r} — skipping"
                )
            continue

        # Sort by GAME_ID; Game 1 determines home/away (home court = higher seed)
        sorted_rows = sorted(rows, key=lambda r: str(r["GAME_ID"]))
        game1 = sorted_rows[0]
        home_team_id = safe_int(game1["HOME_TEAM_ID"])
        away_team_id = safe_int(game1["VISITOR_TEAM_ID"])

        home_team = team_id_to_name.get(home_team_id)
        away_team = team_id_to_name.get(away_team_id)

        if not home_team or not away_team:
            issues.append(
                f"CommonPlayoffSeries: unknown team ID in {canonical_id} — "
                f"home_id={home_team_id}, away_id={away_team_id}"
            )
            continue

        game_ids = [str(r["GAME_ID"]).strip() for r in rows]

        # Count wins from the results table
        home_wins = 0
        away_wins = 0
        for gid in game_ids:
            winner = results_map.get(gid)
            if winner == home_team:
                home_wins += 1
            elif winner == away_team:
                away_wins += 1

        # Round number is encoded in SERIES_ID positions [5:8] (zero-padded, e.g. "001" = R1)
        try:
            round_num = int(nba_series_id[5:8])
        except (ValueError, IndexError):
            round_num = 1

        series_list.append({
            "id": canonical_id,
            "round": round_num,
            "home_team": home_team,
            "away_team": away_team,
            "home_wins": home_wins,
            "away_wins": away_wins,
            "game_ids": game_ids,
        })

    print(f"Fetched {len(series_list)} playoff series from CommonPlayoffSeries.")
    return series_list


def upsert_series(series_list, game_time_map):
    """
    Upserts each series into the series table and tags corresponding games
    in the games table with playoff_round and series_id.

    game_time_map: dict of game_id (str) -> UTC ISO time string
    """
    if not series_list:
        print("No series to upsert.")
        return

    series_payload = []
    for s in series_list:
        winner = determine_series_winner(
            s["home_team"], s["away_team"], s["home_wins"], s["away_wins"]
        )

        # Find the earliest game time for this series to use as the lock time.
        # Only games in the 3-day scoreboard window are in game_time_map.
        first_game_time = None
        for gid in s["game_ids"]:
            t = game_time_map.get(gid)
            if t and (first_game_time is None or t < first_game_time):
                first_game_time = t

        if first_game_time is None:
            if s["home_wins"] > 0 or s["away_wins"] > 0:
                # Series already started but Game 1 is outside the 3-day window.
                # Use a sentinel past timestamp so the lock always triggers.
                first_game_time = "1970-01-01T00:00:00Z"
            else:
                # Fix 6: New series with no game time in the window.
                # NULL is correct (no games scheduled yet); log it so we notice.
                issues.append(
                    f"No game time found for new series {s['id']} "
                    f"({s['home_team']} vs {s['away_team']})"
                )

        series_payload.append({
            "id": s["id"],
            "round": s["round"],
            "home_team": s["home_team"],
            "away_team": s["away_team"],
            "home_wins": s["home_wins"],
            "away_wins": s["away_wins"],
            "winner": winner,
            "status": "completed" if winner else "active",
            "first_game_time": first_game_time,
            "updated_at": datetime.now(utc).isoformat(),
        })

    if DRY_RUN:
        print(f"[DRY-RUN] Would upsert {len(series_payload)} series:")
        for row in series_payload:
            print(
                f"  {row['id']:<25}  {row['home_team']:<28} vs "
                f"{row['away_team']:<28}  {row['home_wins']}-{row['away_wins']}  "
                f"[{row['status']}]  first_game_time={row['first_game_time']}"
            )
    else:
        supabase.table("series").upsert(series_payload).execute()
        print(f"Upserted {len(series_payload)} series.")

    # Tag games with their playoff_round and series_id
    tagged = 0
    for s in series_list:
        for gid in s["game_ids"]:
            if DRY_RUN:
                print(f"[DRY-RUN] Would tag game {gid} -> round={s['round']}, series_id={s['id']}")
                tagged += 1
            else:
                try:
                    supabase.table("games").update({
                        "playoff_round": s["round"],
                        "series_id": s["id"],
                    }).eq("id", gid).execute()
                    tagged += 1
                except Exception as e:
                    print(f"Warning: Could not tag game {gid}: {e}")
    if DRY_RUN:
        print(f"[DRY-RUN] Would tag {tagged} games with playoff round/series.")
    else:
        print(f"Tagged {tagged} games with playoff round/series.")


try:
    print("Fetching playoff series...")
    # Build a game_id -> UTC time map from the scoreboards we already fetched
    game_time_map = {}
    for _, row in all_games.iterrows():
        gid = str(row["gameId"])
        t = row.get("gameTimeUTC", "")
        if t:
            game_time_map[gid] = t

    playoff_series = fetch_series_from_common_playoff_series(season="2025-26")
    upsert_series(playoff_series, game_time_map)
except Exception as e:
    print(f"Error updating playoff series: {e}")


# === Step 7: Recalculate all scores ===
def recalculate_all_scores():
    """
    Full recalculation of all scores using Scoring System B:
      - Game picks:        Round 1=1pt, Round 2=2pt, Conf Finals=3pt, NBA Finals=4pt
      - Series winner:     Round 1=5pt, Round 2=9pt, Conf Finals=14pt, NBA Finals=20pt
      - Championship pick: 25pt (locked April 18)
    Writes game_score, series_score, championship_score, and total score to scores table.
    """
    # --- Fetch all data ---
    preds_resp = supabase.table("predictions").select("user_id, game_id, pick").execute()
    results_resp = supabase.table("results").select("game_id, winner").execute()
    games_resp = supabase.table("games").select("id, playoff_round").execute()
    series_preds_resp = supabase.table("series_predictions").select("user_id, series_id, pick").execute()
    series_resp = supabase.table("series").select("id, round, winner").execute()
    users_resp = supabase.table("users").select("id, championship_pick").execute()

    preds = preds_resp.data or []
    results = results_resp.data or []
    games_data = games_resp.data or []
    series_preds = series_preds_resp.data or []
    series_data = series_resp.data or []
    users_data = users_resp.data or []

    results_map = {r["game_id"]: r["winner"] for r in results}
    # playoff_round is None for regular season games; default to 0 (will use fallback of 1pt)
    game_round_map = {g["id"]: g["playoff_round"] for g in games_data}
    series_map = {s["id"]: s for s in series_data}

    game_scores = {}
    series_scores = {}
    champ_scores = {}

    # 1. Game scores with round multiplier
    for pred in preds:
        uid = pred["user_id"]
        gid = pred["game_id"]
        if gid in results_map and pred["pick"] == results_map[gid]:
            round_num = game_round_map.get(gid)
            pts = GAME_POINTS.get(round_num, 1)  # default 1pt for regular season / untagged
            game_scores[uid] = game_scores.get(uid, 0) + pts

    # 2. Series winner scores
    for sp in series_preds:
        uid = sp["user_id"]
        sid = sp["series_id"]
        series = series_map.get(sid)
        if series and series["winner"] and sp["pick"] == series["winner"]:
            pts = SERIES_POINTS.get(series["round"], 0)
            series_scores[uid] = series_scores.get(uid, 0) + pts

    # 3. Championship score
    # Actual champion = winner of the round-4 (NBA Finals) series (full team name)
    actual_champion = next(
        (s["winner"] for s in series_data if s["round"] == 4 and s["winner"]),
        None
    )
    if actual_champion:
        for user in users_data:
            pick_id = user.get("championship_pick")
            if not pick_id:
                continue
            # championship_pick stores short IDs ("BOS"); actual_champion is full name
            pick_full_name = TEAM_SHORT_ID_TO_NAME.get(pick_id, pick_id)
            if pick_full_name == actual_champion:
                champ_scores[user["id"]] = CHAMPIONSHIP_POINTS

    # 4. Build payload for all known users
    all_user_ids = (
        {p["user_id"] for p in preds}
        | {sp["user_id"] for sp in series_preds}
        | {u["id"] for u in users_data}
    )

    scores_payload = []
    for uid in all_user_ids:
        gs = game_scores.get(uid, 0)
        ss = series_scores.get(uid, 0)
        cs = champ_scores.get(uid, 0)
        scores_payload.append({
            "user_id": uid,
            "score": gs + ss + cs,
            "game_score": gs,
            "series_score": ss,
            "championship_score": cs,
        })

    if scores_payload:
        supabase.table("scores").upsert(scores_payload, on_conflict="user_id").execute()
        print(f"Upserted scores for {len(scores_payload)} users.")
    else:
        print("No scores to calculate.")


try:
    print("Calculating scores...")
    recalculate_all_scores()
except Exception as e:
    print(f"Error calculating scores: {e}")


print("Done. Games, results, series, and scores are up to date.")

# === Send one summary alert email if any issues were detected ===
if issues:
    print(f"\n{len(issues)} issue(s) detected during this run:")
    for issue in issues:
        print(f"  - {issue}")
    send_alert_email(issues)
else:
    print("No issues detected. Clean run.")
