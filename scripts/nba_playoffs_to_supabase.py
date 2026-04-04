# === nba_playoffs_to_supabase.py ===

import pandas as pd
from nba_api.stats.endpoints import scoreboardv3, boxscoretraditionalv3
from nba_api.stats.library.http import NBAStatsHTTP
from datetime import datetime, timedelta
from pytz import timezone, utc
from supabase import create_client, Client
from dotenv import load_dotenv
import os
import time

load_dotenv()

# Extend the default headers with a full browser fingerprint so stats.nba.com
# doesn't block requests from CI/cloud environments (GitHub Actions, etc.).
# We update rather than replace so the library's base keys are preserved.
NBAStatsHTTP.headers = {
    **NBAStatsHTTP.headers,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    'Origin': 'https://www.nba.com',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'Sec-Ch-Ua-Platform': '"Windows"',
}
# Reset the shared session so it picks up the new headers on the next request.
NBAStatsHTTP._session = None

NBA_TIMEOUT = 60
NBA_RETRIES = 3
NBA_RETRY_DELAY = 5  # seconds between retries


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


SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")

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


games_df_y, teams_df_y = fetch_scoreboard(yesterday_est)
games_df_t, teams_df_t = fetch_scoreboard(today_est)
games_df_tm, teams_df_tm = fetch_scoreboard(tomorrow_est)

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
def get_winner(game_id):
    try:
        boxscore = call_with_retry(boxscoretraditionalv3.BoxScoreTraditionalV3, game_id=game_id, timeout=NBA_TIMEOUT)
        df = boxscore.get_data_frames()[2]  # team totals (one row per team)
        team_1 = df.iloc[0]
        team_2 = df.iloc[1]

        team_1_full = team_id_to_name.get(team_1['teamId'], team_1['teamName'])
        team_2_full = team_id_to_name.get(team_2['teamId'], team_2['teamName'])

        if team_1['points'] > team_2['points']:
            winner = team_1_full
        elif team_2['points'] > team_1['points']:
            winner = team_2_full
        else:
            winner = 'Tie'

        print(f"Game {game_id} | {team_1_full} vs {team_2_full} | Winner: {winner}")
        return winner
    except Exception as e:
        print(f"Warning: Failed to get winner for game {game_id}: {e}")
        return ''


try:
    print(f"Status breakdown:\n{games['gameStatusText'].value_counts().to_string()}")

    final_games = games[games['gameStatusText'] == 'Final']
    print(f"Found {len(final_games)} final games.")

    results_payload = []
    for _, row in final_games.iterrows():
        game_id = str(row['gameId'])
        winner = get_winner(game_id)
        if winner:
            results_payload.append({'game_id': game_id, 'winner': winner})
        time.sleep(1.5)

    if results_payload:
        supabase.table('results').upsert(results_payload, on_conflict='game_id').execute()
        print(f"Upserted {len(results_payload)} results.")
    else:
        print("No final games to update.")
except Exception as e:
    print(f"Error updating results: {e}")


# === Step 6: Recalculate scores ===
try:
    print("Calculating scores...")
    predictions_resp = supabase.table('predictions').select('user_id, game_id, pick').execute()
    results_resp = supabase.table('results').select('game_id, winner').execute()

    results_map = {r['game_id']: r['winner'] for r in (results_resp.data or [])}

    score_counts = {}
    for pred in (predictions_resp.data or []):
        uid = pred['user_id']
        game_id = pred['game_id']
        if game_id in results_map:
            score_counts.setdefault(uid, 0)
            if pred['pick'] == results_map[game_id]:
                score_counts[uid] += 1

    if score_counts:
        scores_payload = [{'user_id': uid, 'score': count} for uid, count in score_counts.items()]
        supabase.table('scores').upsert(scores_payload).execute()
        print(f"Upserted scores for {len(scores_payload)} users.")
    else:
        print("No scores to calculate.")
except Exception as e:
    print(f"Error calculating scores: {e}")


print("Done. Games, results, and scores are up to date.")
