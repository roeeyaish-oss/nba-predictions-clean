# === nba_playoffs_to_supabase.py ===

import pandas as pd
from nba_api.stats.endpoints import scoreboardv2, boxscoretraditionalv2
from datetime import datetime, timedelta
from pytz import timezone
from supabase import create_client, Client
import os
import re
import time


SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# === טבלת המרה של TEAM_ID לשם קבוצה ===
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

# === שלב 1: שליפת משחקים של היום והמחר לפי שעון EST ===
est = timezone('US/Eastern')
yesterday_est = (datetime.now(est) - timedelta(days=1)).strftime('%m/%d/%Y')
today_est = datetime.now(est).strftime('%m/%d/%Y')
tomorrow_est = (datetime.now(est) + timedelta(days=1)).strftime('%m/%d/%Y')

print(f"📅 Fetching games for today ({today_est}) and tomorrow ({tomorrow_est})")

scoreboard_yestreday = scoreboardv2.ScoreboardV2(game_date=yesterday_est)
games_yesterday = scoreboard_yestreday.game_header.get_data_frame()

scoreboard_today = scoreboardv2.ScoreboardV2(game_date=today_est)
games_today = scoreboard_today.game_header.get_data_frame()

scoreboard_tomorrow = scoreboardv2.ScoreboardV2(game_date=tomorrow_est)
games_tomorrow = scoreboard_tomorrow.game_header.get_data_frame()

games = pd.concat([games_yesterday, games_today, games_tomorrow], ignore_index=True)

# === שלב 2: עיבוד נתונים ===
def extract_game_time_et(status_text):
    match = re.search(r'(\d{1,2}:\d{2} ?[ap]m)', status_text, re.IGNORECASE)
    if match:
        return match.group(1).upper()
    return ""


games["Game Time"] = games["GAME_STATUS_TEXT"].apply(extract_game_time_et)

ist = timezone('Asia/Jerusalem')


def convert_et_to_ist(date_str, time_str):
    try:
        if time_str == "":
            return ""
        dt_naive = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %I:%M %p")
        dt_est = est.localize(dt_naive)
        dt_ist = dt_est.astimezone(ist)
        return dt_ist.strftime("%H:%M")
    except Exception as e:
        print(f"⚠️ Failed to convert time: {e}")
        return ""


def convert_to_ist_date(date_str, time_str):
    try:
        if time_str == "":
            return ""
        dt_naive = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %I:%M %p")
        dt_est = est.localize(dt_naive)
        dt_ist = dt_est.astimezone(ist)
        return dt_ist.strftime("%Y-%m-%d")
    except Exception as e:
        print(f"⚠️ Failed to convert date: {e}")
        return ""


def get_winner(game_id):
    try:
        boxscore = boxscoretraditionalv2.BoxScoreTraditionalV2(game_id=game_id)
        df = boxscore.get_data_frames()[1]  # team stats
        team_1 = df.iloc[0]
        team_2 = df.iloc[1]

        team_1_full = team_id_to_name.get(team_1['TEAM_ID'], team_1['TEAM_NAME'])
        team_2_full = team_id_to_name.get(team_2['TEAM_ID'], team_2['TEAM_NAME'])

        if team_1['PTS'] > team_2['PTS']:
            winner = team_1_full
        elif team_2['PTS'] > team_1['PTS']:
            winner = team_2_full
        else:
            winner = "Tie"

        print(f"🧠 Game {game_id} | {team_1_full} vs {team_2_full} | Winner: {winner}")
        return winner

    except Exception as e:
        print(f"⚠️ Failed to get winner for Game ID {game_id}: {e}")
        return ""


games["Game Time (IST)"] = games.apply(
    lambda row: convert_et_to_ist(
        pd.to_datetime(row["GAME_DATE_EST"]).strftime('%Y-%m-%d'),
        row["Game Time"]
    ),
    axis=1
)

games["Date (IL)"] = games.apply(
    lambda row: convert_to_ist_date(
        pd.to_datetime(row["GAME_DATE_EST"]).strftime('%Y-%m-%d'),
        row["Game Time"]
    ),
    axis=1
)

games["Home Team"] = games["HOME_TEAM_ID"].map(team_id_to_name).fillna("TBD")
games["Away Team"] = games["VISITOR_TEAM_ID"].map(team_id_to_name).fillna("TBD")
games["Home Team Image"] = games["HOME_TEAM_ID"].map(team_id_to_image).fillna("TBD")
games["Away Team Image"] = games["VISITOR_TEAM_ID"].map(team_id_to_image).fillna("TBD")

# === שלב 3: בניית טבלה ל-Supabase ===
if not games.empty:
    games_cleaned = pd.DataFrame({
        "id": games["GAME_ID"].astype(str),
        "date": games["Date (IL)"],
        "home_team": games["Home Team"],
        "away_team": games["Away Team"],
        "home_img": games["Home Team Image"],
        "away_img": games["Away Team Image"],
        "game_time": games["Game Time (IST)"],
    })
else:
    games_cleaned = pd.DataFrame(
        columns=["id", "date", "home_team", "away_team", "home_img", "away_img", "game_time"]
    )

# === שלב 4: שמירה לטבלת games ב-Supabase ===
try:
    games_payload = games_cleaned.to_dict(orient="records")

    if games_payload:
        supabase.table("games").upsert(games_payload).execute()
        print(f"✅ {len(games_payload)} games saved to Supabase.")
    else:
        print("ℹ️ No games to save to Supabase.")
except Exception as e:
    print(f"⚠️ Error while saving games to Supabase: {e}")

# === שלב 5: עדכון טבלת results עם מנצחות של משחקים שהסתיימו ===
try:
    print("🔍 Checking which games have status 'Final'...")
    print("סטטוסים זמינים:")
    print(games["GAME_STATUS_TEXT"].value_counts())

    final_games = games[games["GAME_STATUS_TEXT"] == "Final"]
    print(f"🎯 Found {len(final_games)} final games:")
    print(final_games[["GAME_ID", "GAME_DATE_EST", "HOME_TEAM_ID", "VISITOR_TEAM_ID"]])

    results_payload = []
    for _, row in final_games.iterrows():
        game_id = str(row["GAME_ID"])
        winner = get_winner(game_id)
        if winner:
            results_payload.append({
                "game_id": game_id,
                "winner": winner,
            })
        time.sleep(1.5)

    if results_payload:
        supabase.table("results").upsert(results_payload).execute()
        print(f"🏆 Upserted {len(results_payload)} results into Supabase.")
    else:
        print("ℹ️ No final games to update in results.")
except Exception as e:
    print(f"⚠️ Error while updating results in Supabase: {e}")

# === שלב 6: חישוב ניקוד ===
try:
    print("📊 Calculating scores...")
    predictions_resp = supabase.table("predictions").select("user_id, game_id, pick").execute()
    results_resp = supabase.table("results").select("game_id, winner").execute()

    results_map = {r["game_id"]: r["winner"] for r in (results_resp.data or [])}

    score_counts = {}
    for pred in (predictions_resp.data or []):
        uid = pred["user_id"]
        game_id = pred["game_id"]
        if game_id in results_map:
            score_counts.setdefault(uid, 0)
            if pred["pick"] == results_map[game_id]:
                score_counts[uid] += 1

    if score_counts:
        scores_payload = [{"user_id": uid, "score": count} for uid, count in score_counts.items()]
        supabase.table("scores").upsert(scores_payload).execute()
        print(f"📊 Upserted scores for {len(scores_payload)} users.")
    else:
        print("ℹ️ No scores to calculate.")
except Exception as e:
    print(f"⚠️ Error while calculating scores: {e}")

print("🎉 All done! Games, Results, and Scores are up to date.")
