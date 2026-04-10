import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// April 18 2026 04:00 UTC = midnight ET on April 18
const CHAMPIONSHIP_LOCK_DATE = new Date("2026-04-18T04:00:00Z");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const body = Array.isArray(req.body) ? req.body : [];

  if (body.length === 0) {
    return res.status(400).send("No series predictions provided");
  }

  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).send("Missing authorization token");
  }

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser(token);
  if (authError || !authUser) {
    return res.status(401).send("Unauthorized");
  }

  const userId = authUser.id;

  try {
    const seriesIds = [...new Set(body.map((row) => row.seriesId).filter(Boolean))];

    if (seriesIds.length === 0) {
      return res.status(400).send("No valid series IDs provided");
    }

    // Fetch the series records to validate existence and lock status
    const { data: seriesData, error: seriesError } = await supabase
      .from("series")
      .select("id, round, first_game_time, status")
      .in("id", seriesIds);

    if (seriesError) {
      throw seriesError;
    }

    const seriesMap = Object.fromEntries((seriesData || []).map((s) => [s.id, s]));
    const now = new Date();

    const payload = [];
    const skipped = [];

    for (const row of body) {
      const { seriesId, pick } = row;
      if (!seriesId || !pick) continue;

      const series = seriesMap[seriesId];

      if (!series) {
        skipped.push(`${seriesId}: not found`);
        continue;
      }

      if (series.status === "completed") {
        skipped.push(`${seriesId}: series already completed`);
        continue;
      }

      // Lock: once the first game of the series has tipped off
      if (series.first_game_time && now >= new Date(series.first_game_time)) {
        skipped.push(`${seriesId}: series has already started`);
        continue;
      }

      payload.push({
        user_id: userId,
        series_id: seriesId,
        pick,
        round: series.round ?? 1,
        updated_at: now.toISOString(),
      });
    }

    if (payload.length === 0) {
      const reason = skipped.length > 0 ? skipped.join("; ") : "No valid series picks provided";
      return res.status(400).send(reason);
    }

    const { error: upsertError } = await supabase
      .from("series_predictions")
      .upsert(payload, { onConflict: "user_id,series_id" });

    if (upsertError) {
      throw upsertError;
    }

    return res.status(200).send(`Series predictions submitted successfully! (${payload.length} saved)`);
  } catch (err) {
    console.error("Error submitting series predictions:", err);
    return res.status(500).send("Server Error: " + err.message);
  }
}
