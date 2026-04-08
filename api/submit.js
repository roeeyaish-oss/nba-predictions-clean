import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function getIsraelNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const p = Object.fromEntries(
    parts.filter((x) => x.type !== "literal").map((x) => [x.type, x.value])
  );

  return {
    date: `${p.year}-${p.month}-${p.day}`,
    minutes: parseInt(p.hour) * 60 + parseInt(p.minute),
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const body = Array.isArray(req.body) ? req.body : [];

  if (body.length === 0) {
    return res.status(400).send("No predictions provided");
  }

  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).send("Missing authorization token");
  }

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authUser) {
    return res.status(401).send("Unauthorized");
  }

  const userId = authUser.id;

  try {
    const gameIds = [...new Set(body.map((row) => row.gameId).filter(Boolean))];

    const { data: gamesData, error: gamesError } = await supabase
      .from("games")
      .select("id, date, game_time")
      .in("id", gameIds);

    if (gamesError) {
      throw gamesError;
    }

    const nowIL = getIsraelNow();
    const startedGameIds = new Set();

    for (const game of gamesData || []) {
      if (game.date && game.game_time) {
        if (game.date < nowIL.date) {
          startedGameIds.add(game.id);
        } else if (game.date === nowIL.date) {
          const [h, m] = game.game_time.split(":").map(Number);
          if (nowIL.minutes >= h * 60 + m) {
            startedGameIds.add(game.id);
          }
        }
      }
    }

    const payload = body
      .filter((row) => row.gameId && row.pick && !startedGameIds.has(row.gameId))
      .map((row) => ({
        user_id: userId,
        game_id: row.gameId,
        pick: row.pick,
      }));

    if (payload.length === 0) {
      if (startedGameIds.size > 0) {
        return res.status(400).send("All selected games have already started");
      }
      return res.status(400).send("No valid predictions provided");
    }

    const { error } = await supabase
      .from("predictions")
      .upsert(payload, { onConflict: "user_id,game_id" });

    if (error) {
      throw error;
    }

    return res.status(200).send("Predictions submitted successfully!");
  } catch (err) {
    console.error("Error submitting predictions:", err);
    return res.status(500).send("Server Error: " + err.message);
  }
}
