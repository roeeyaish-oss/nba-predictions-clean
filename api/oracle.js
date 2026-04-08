import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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
    const yesterday = getIsraelYesterday();
    console.log("[Oracle] querying for yesterday:", yesterday);

    // Fetch yesterday's results joined with games
    const { data: results, error: resultsError } = await supabase
      .from("results")
      .select("game_id, winner, games!inner(home_team, away_team, date)")
      .eq("games.date", yesterday);

    console.log("[Oracle] results query — error:", resultsError, "| count:", results?.length ?? 0, "| data:", JSON.stringify(results));

    if (resultsError) throw resultsError;
    if (!results || results.length === 0) {
      console.log("[Oracle] skip: no results found for yesterday");
      return res.status(200).json({ skip: true });
    }

    const gameIds = results.map((r) => r.game_id);
    console.log("[Oracle] game_ids to query predictions for:", gameIds);

    // Fetch predictions for those games joined with users
    const { data: predictions, error: predsError } = await supabase
      .from("predictions")
      .select("game_id, pick, users(display_name, name)")
      .in("game_id", gameIds);

    console.log("[Oracle] predictions query — error:", predsError, "| count:", predictions?.length ?? 0, "| data:", JSON.stringify(predictions));

    if (predsError) throw predsError;

    // Build context string for Claude
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

    // Call Claude API
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
    console.log("[Oracle] Sending to Claude:", JSON.stringify({ model: requestBody.model, messages: requestBody.messages }));

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
        headers: Object.fromEntries(claudeRes.headers.entries()),
        body: errorBody,
      });
      throw new Error(`Claude API error: ${claudeRes.status} — ${errorBody}`);
    }

    const claudeData = await claudeRes.json();
    const raw = claudeData.content?.[0]?.text ?? "";

    console.log("[Oracle] Claude raw response:", raw);

    let parsed;
    try {
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("[Oracle] skip: JSON parse failed:", parseErr.message, "| raw:", raw);
      return res.status(200).json({ skip: true });
    }

    if (!parsed.title || !parsed.recap) {
      console.error("[Oracle] skip: missing title or recap in parsed response:", JSON.stringify(parsed));
      return res.status(200).json({ skip: true });
    }

    return res.status(200).json({ title: parsed.title, recap: parsed.recap });
  } catch (err) {
    console.error("Oracle error:", err);
    return res.status(500).json({ skip: true });
  }
}
