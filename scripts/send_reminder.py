import os
import smtplib
import sys
from datetime import datetime, timedelta
from email.message import EmailMessage
from zoneinfo import ZoneInfo

from dotenv import load_dotenv
from supabase import Client, create_client


ISRAEL_TZ = ZoneInfo("Asia/Jerusalem")
SUBJECT = "\U0001F3C0 Court Night \u2014 Don't forget to make your picks!"
SIGN_OFF = "Good luck tonight! \U0001F3C0"


def require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def get_israel_now() -> datetime:
    return datetime.now(ISRAEL_TZ)


def get_israel_date() -> str:
    return get_israel_now().strftime("%Y-%m-%d")


def get_israel_tomorrow() -> str:
    return (get_israel_now() + timedelta(days=1)).strftime("%Y-%m-%d")


def get_israel_minutes() -> int:
    now = get_israel_now()
    return now.hour * 60 + now.minute


def parse_game_minutes(game_time: str) -> int:
    hours, minutes = game_time.split(":")
    return int(hours) * 60 + int(minutes)


def is_game_started(game: dict, today: str, now_minutes: int) -> bool:
    game_date = (game.get("date") or "").strip()
    game_time = (game.get("game_time") or "").strip()
    if not game_time:
        return False
    if game_date < today:
        return True
    if game_date > today:
        return False
    return parse_game_minutes(game_time) <= now_minutes


def load_supabase() -> Client:
    url = require_env("SUPABASE_URL")
    key = require_env("SUPABASE_SERVICE_KEY")
    return create_client(url, key)


def fetch_upcoming_games(supabase: Client) -> list[dict]:
    today = get_israel_date()
    tomorrow = get_israel_tomorrow()
    now_minutes = get_israel_minutes()

    response = (
        supabase.table("games")
        .select("id, date, game_time, home_team, away_team")
        .in_("date", [today, tomorrow])
        .order("date")
        .order("game_time")
        .execute()
    )

    games = response.data or []
    return [game for game in games if not is_game_started(game, today, now_minutes)]


def fetch_users(supabase: Client) -> list[dict]:
    response = supabase.table("users").select("id, email, display_name, name").execute()
    return response.data or []


def fetch_predictions_by_user(supabase: Client, game_ids: list[str]) -> dict[str, set[str]]:
    if not game_ids:
        return {}

    response = (
        supabase.table("predictions")
        .select("user_id, game_id")
        .in_("game_id", game_ids)
        .execute()
    )

    predictions_by_user: dict[str, set[str]] = {}
    for row in response.data or []:
        user_id = row.get("user_id")
        game_id = row.get("game_id")
        if not user_id or not game_id:
            continue
        predictions_by_user.setdefault(str(user_id), set()).add(str(game_id))
    return predictions_by_user


def format_game_line(game: dict) -> str:
    return f"- {game['away_team']} at {game['home_team']} - {game['game_time']} Israel time"


def build_email_body(user: dict, missing_games: list[dict]) -> str:
    display_name = (
        (user.get("display_name") or "").strip()
        or (user.get("name") or "").strip()
        or "there"
    )
    lines = [
        f"Hi {display_name},",
        "",
        "You still need to make picks for today's upcoming games:",
        "",
        *[format_game_line(game) for game in missing_games],
        "",
        SIGN_OFF,
    ]
    return "\n".join(lines)


def get_user_display_name(user: dict) -> str:
    return (
        (user.get("display_name") or "").strip()
        or (user.get("name") or "").strip()
        or (user.get("email") or "").strip()
        or "Unknown user"
    )


def send_email(to_email: str, body: str) -> None:
    gmail_user = require_env("GMAIL_USER")
    gmail_password = require_env("GMAIL_APP_PASSWORD")

    message = EmailMessage()
    message["Subject"] = SUBJECT
    message["From"] = gmail_user
    message["To"] = to_email
    message.set_content(body)

    with smtplib.SMTP("smtp.gmail.com", 587, timeout=30) as smtp:
        smtp.starttls()
        smtp.login(gmail_user, gmail_password)
        smtp.send_message(message)


def main() -> int:
    load_dotenv()

    try:
        supabase = load_supabase()
        upcoming_games = fetch_upcoming_games(supabase)
        print(f"Found {len(upcoming_games)} upcoming games for reminders.")
        if not upcoming_games:
            print("No upcoming games for today or tomorrow in Israel time. No reminder emails sent.")
            return 0

        game_ids = [str(game["id"]) for game in upcoming_games if game.get("id")]
        predictions_by_user = fetch_predictions_by_user(supabase, game_ids)
        users = fetch_users(supabase)

        reminders_sent = 0
        skipped_users = 0

        for user in users:
            user_id = str(user.get("id") or "").strip()
            email = (user.get("email") or "").strip()
            display_name = get_user_display_name(user)
            if not user_id or not email:
                skipped_users += 1
                print(f"{display_name} - skipped, missing email or user id")
                continue

            submitted_game_ids = predictions_by_user.get(user_id, set())
            missing_games = [
                game for game in upcoming_games if str(game["id"]) not in submitted_game_ids
            ]
            if not missing_games:
                print(f"{display_name} - all picks submitted, no reminder needed")
                continue

            send_email(email, build_email_body(user, missing_games))
            reminders_sent += 1
            print(f"{display_name} - missing {len(missing_games)} picks, reminder sent")

        print(
            f"Reminder run complete. Sent {reminders_sent} emails. "
            f"Skipped {skipped_users} users without an email or id."
        )
        return 0
    except Exception as exc:
        print(f"Reminder run failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
