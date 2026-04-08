import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function requireAuth(req, res) {
  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  const token = match[1].trim();
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  return data.user;
}

function getIsraelYesterday() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(yesterday);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const user = await requireAuth(req, res);
    if (!user) {
      return;
    }

    const yesterday = getIsraelYesterday();

    const { data: results, error: resultsError } = await supabase
      .from("results")
      .select("game_id, winner, games!inner(home_team, away_team, date)")
      .eq("games.date", yesterday);

    if (resultsError) throw resultsError;
    console.log(`[Oracle] found ${results?.length ?? 0} results for ${yesterday}`);
    if (!results || results.length === 0) {
      console.log("[Oracle] skip: no results found for yesterday");
      return res.status(200).json({ skip: true });
    }

    const gameIds = results.map((r) => r.game_id);

    const { data: predictions, error: predsError } = await supabase
      .from("predictions")
      .select("game_id, pick, users(display_name, name)")
      .in("game_id", gameIds);

    if (predsError) throw predsError;

    const lines = results.map((result) => {
      const { home_team, away_team } = result.games;
      const winner = result.winner;
      const gamePreds = (predictions || []).filter((p) => p.game_id === result.game_id);
      const predLines = gamePreds.map((p) => {
        const name = p.users?.display_name || p.users?.name || "Unknown";
        const correct = p.pick === winner;
        return `  - ${name}: picked ${p.pick} ${correct ? "✓" : "✗"}`;
      });
      return [
        `Game: ${away_team} vs ${home_team} → Winner: ${winner}`,
        ...predLines,
      ].join("\n");
    });

    const context = lines.join("\n\n");

    const requestBody = {
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system: `You are an NBA announcer giving a savage nightly recap. Return raw JSON only, no markdown, no code fences, no backticks.
{
  "title": "one of these based on content: DAME TIME / SPLASH NIGHT / AND ONE / BUCKETS / BANG! / CALLED IT / NOTHING BUT NET / RAK RESHETTTT",
  "recap": "exactly 2 sentences, short and punchy. Use emojis (🏀 🔥 💀 ✅ ❌ 👑 😤 🎯 etc). Bold user names with **Name**. First sentence: who won or lost dramatically. Second sentence: a savage punchline. Example: 🔥 **Roee** called it PERFECTLY going 3/3 tonight! 💀 **Dagan** thought the Lakers had it — WRONG, sit down!"
}
Choose RAK RESHETTTT if someone got everything wrong.
Choose DAME TIME if someone made a dramatic climb in rankings.
Choose CALLED IT if someone got everything right.`,
      messages: [{ role: "user", content: context }],
    };

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!claudeRes.ok) {
      const errorBody = await claudeRes.text();
      console.error("[Oracle] Claude API error:", {
        status: claudeRes.status,
        body: errorBody,
      });
      throw new Error(`Claude API error: ${claudeRes.status} - ${errorBody}`);
    }

    const claudeData = await claudeRes.json();
    const raw = claudeData.content?.[0]?.text ?? "";

    let parsed;
    try {
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("[Oracle] skip: JSON parse failed:", parseErr.message);
      return res.status(200).json({ skip: true });
    }

    if (!parsed.title || !parsed.recap) {
      console.error("[Oracle] skip: missing title or recap in parsed response");
      return res.status(200).json({ skip: true });
    }

    console.log("[Oracle] recap generated successfully");
    return res.status(200).json({ title: parsed.title, recap: parsed.recap });
  } catch (err) {
    console.error("Oracle error:", err);
    return res.status(500).json({ skip: true });
  }
}
