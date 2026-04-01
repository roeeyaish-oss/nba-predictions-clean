import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const body = Array.isArray(req.body) ? req.body : [];

  if (body.length === 0) {
    return res.status(400).send("No predictions provided");
  }

  try {
    const userNames = [...new Set(body.map((row) => row.user).filter(Boolean))];

    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, name")
      .in("name", userNames);

    if (usersError) {
      throw usersError;
    }

    const userIdByName = new Map((users || []).map((user) => [user.name, user.id]));
    const missingUsers = userNames.filter((name) => !userIdByName.has(name));

    if (missingUsers.length > 0) {
      return res.status(400).send(`Unknown user name(s): ${missingUsers.join(", ")}`);
    }

    const payload = body
      .filter((row) => row.user && row.gameId && row.pick)
      .map((row) => ({
        user_id: userIdByName.get(row.user),
        game_id: row.gameId,
        pick: row.pick,
      }));

    if (payload.length === 0) {
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
