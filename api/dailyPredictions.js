import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function getIsraelDates() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const today = formatter.format(new Date());
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = formatter.format(tomorrowDate);

  return { today, tomorrow };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { today, tomorrow } = getIsraelDates();

    const { data, error } = await supabase
      .from("predictions")
      .select("pick, created_at, game_id, user_id, users(name, display_name, avatar_url), games!inner(game_time, date)")
      .in("games.date", [today, tomorrow])
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    const formatted = (data || []).map((row) => ({
      user: row.users?.name ?? "",
      display_name: row.users?.display_name || row.users?.name || "",
      avatar_url: row.users?.avatar_url ?? null,
      user_id: row.user_id,
      pick: row.pick,
      game_id: row.game_id,
      game_time: row.games?.game_time ?? "",
      date: row.games?.date ?? "",
      created_at: row.created_at,
    }));

    return res.status(200).json(formatted);
  } catch (err) {
    console.error("Error loading daily predictions:", err);
    return res.status(500).json({
      error: "Failed to load predictions",
      details: err.message,
    });
  }
}
