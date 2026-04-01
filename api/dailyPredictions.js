import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function getIsraelDateRange() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(new Date())
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  const today = `${parts.year}-${parts.month}-${parts.day}`;
  const start = `${today}T00:00:00+03:00`;
  const nextDate = new Date(start);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);

  const nextYear = nextDate.getUTCFullYear();
  const nextMonth = String(nextDate.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(nextDate.getUTCDate()).padStart(2, "0");
  const end = `${nextYear}-${nextMonth}-${nextDay}T00:00:00+03:00`;

  return { start, end };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { start, end } = getIsraelDateRange();

    const { data, error } = await supabase
      .from("predictions")
      .select("pick, created_at, users(name)")
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    const formatted = (data || []).map((row) => ({
      user: row.users?.name ?? "",
      pick: row.pick,
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
