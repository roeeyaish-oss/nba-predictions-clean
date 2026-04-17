# === nba_playoffs_to_supabase.py ===

import pandas as pd
from nba_api.stats.endpoints import scoreboardv3, boxscoretraditionalv3, playoffpicture
from datetime import datetime, timedelta, date
from pytz import timezone, utc
from supabase import create_client, Client
from dotenv import load_dotenv
import os
import smtplib
import socket
import sys
import time
from email.message import EmailMessage

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
games_cleaned = pd.DataFrame({
    'id': games['gameId'].astype(str),
    'date': games['Date (IL)'],
    'home_team': games['Home Team'],
    'away_team': games['Away Team'],
    'home_img': games['Home Team Image'],
    'away_img': games['Away Team Image'],
    'game_time': games['Game Time (IL)'],
})

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
    final_games = games[games['gameStatusText'].str.startswith('Final', na=False)]
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


def fetch_series_from_playoff_picture(season_id="22025"):
    """
    Fetches active playoff series using PlayoffPicture.
    Works before and during the playoffs (unlike CommonPlayoffSeries).

    ID format: "2026_{Conf}_{highSeed}v{lowSeed}"  e.g. "2026_East_1v8"
    Round is inferred from matchup count per conference: 4=R1, 2=R2, 1=CF.

    Returns a list of series dicts in the format expected by upsert_series():
      {id, round, home_team, away_team, home_wins, away_wins, game_ids}
    """
    try:
        endpoint = call_with_retry(
            playoffpicture.PlayoffPicture,
            season_id=season_id,
            timeout=NBA_TIMEOUT,
        )
        dfs = endpoint.get_data_frames()
        east_df = dfs[0]   # East matchups
        west_df = dfs[1]   # West matchups
    except Exception as e:
        print(f"Warning: Could not fetch PlayoffPicture: {e}")
        return []

    if east_df.empty and west_df.empty:
        print("No playoff matchup data returned from PlayoffPicture.")
        return []

    # Build a team-pair → game_ids lookup from playoff games in the 3-day scoreboard.
    # upsert_series() uses game_ids to derive first_game_time for pick locking.
    team_pair_to_game_ids = {}
    for _, row in games.iterrows():
        gid = str(row["gameId"])
        if not gid.startswith("004"):
            continue
        home = team_id_to_name.get(safe_int(row.get("homeTeamId", 0)))
        away = team_id_to_name.get(safe_int(row.get("awayTeamId", 0)))
        if home and away:
            key = frozenset([home, away])
            team_pair_to_game_ids.setdefault(key, [])
            team_pair_to_game_ids[key].append(gid)

    series_list = []
    # 4 matchups per conference = Round 1, 2 = Round 2, 1 = Conf Finals
    round_from_count = {4: 1, 2: 2, 1: 3}

    for conf_name, df in [("East", east_df), ("West", west_df)]:
        if df.empty:
            continue
        row_count = len(df)
        round_num = round_from_count.get(row_count)
        if round_num is None:
            issues.append(
                f"PlayoffPicture: unexpected {conf_name} matchup count {row_count} "
                f"(expected 4, 2, or 1)"
            )
            continue

        for _, row in df.iterrows():
            high_seed    = safe_int(row["HIGH_SEED_RANK"])
            low_seed     = safe_int(row["LOW_SEED_RANK"])
            high_team_id = safe_int(row["HIGH_SEED_TEAM_ID"])
            low_team_id  = safe_int(row["LOW_SEED_TEAM_ID"])

            home_team = team_id_to_name.get(high_team_id)
            away_team = team_id_to_name.get(low_team_id)

            if not home_team or not away_team:
                issues.append(
                    f"PlayoffPicture: unknown team ID in {conf_name} — "
                    f"high={high_team_id}, low={low_team_id}"
                )
                continue

            # PlayoffPicture returns play-in wins before the playoffs start.
            # Zero them out until the first playoff game date.
            PLAYOFF_START = date(2026, 4, 18)
            if date.today() < PLAYOFF_START:
                home_wins = 0
                away_wins = 0
            else:
                home_wins = safe_int(row["HIGH_SEED_SERIES_W"])
                away_wins = safe_int(row["HIGH_SEED_SERIES_L"])

            series_id = f"2026_{conf_name}_{high_seed}v{low_seed}"

            game_ids = list(
                team_pair_to_game_ids.get(frozenset([home_team, away_team]), [])
            )

            series_list.append({
                "id": series_id,
                "round": round_num,
                "home_team": home_team,
                "away_team": away_team,
                "home_wins": home_wins,
                "away_wins": away_wins,
                "game_ids": game_ids,
            })

    print(f"Fetched {len(series_list)} playoff series from PlayoffPicture.")
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

    supabase.table("series").upsert(series_payload).execute()
    print(f"Upserted {len(series_payload)} series.")

    # Tag games with their playoff_round and series_id
    tagged = 0
    for s in series_list:
        for gid in s["game_ids"]:
            try:
                supabase.table("games").update({
                    "playoff_round": s["round"],
                    "series_id": s["id"],
                }).eq("id", gid).execute()
                tagged += 1
            except Exception as e:
                print(f"Warning: Could not tag game {gid}: {e}")
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

    playoff_series = fetch_series_from_playoff_picture()
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
