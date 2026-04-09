import { createClient } from "@supabase/supabase-js";
import { CLAUDE_MODEL } from "./_constants.js";

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

function getIsraelDates() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const today = fmt.format(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = fmt.format(yesterdayDate);
  return { today, yesterday };
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

    const { today, yesterday } = getIsraelDates();

    const { data: results, error: resultsError } = await supabase
      .from("results")
      .select("game_id, winner, games!inner(home_team, away_team, date)")
      .in("games.date", [yesterday, today]);

    if (resultsError) throw resultsError;
    console.log(`[Oracle] found ${results?.length ?? 0} results for ${yesterday} / ${today}`);
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

    const announcer = Math.random() < 0.5 ? "breen" : "barak";

    const breenPrompt = `You are Mike Breen, the legendary NBA play-by-play announcer. Give a nightly recap of these prediction results. You MUST write in English only. Never use Hebrew or any other language under any circumstances.

Style: classic NBA play-by-play, dramatic, professional excitement. Use phrases like: "BANG!", "OH!", "what a night!", "tough night at the office", "you live to fight another day", "came in HOT", "UNBELIEVABLE!", "what a call!"

Example response: {"announcer":"breen","title":"BANG!","recap":"🔥 **Roee** came in HOT tonight — what a call, BANG! 🏀 **Dagan**, tough night at the office, but you live to fight another day!"}`;

    const barakPrompt = `You are Gil Barak, the iconic Israeli NBA announcer, but you are speaking in English with your signature loud passionate over-the-top energy. Give a nightly recap of these prediction results. You MUST write in English only. Never use Hebrew or any other language under any circumstances.

Style: Israeli sports announcer energy in English — loud, passionate, over-the-top excited. Use phrases like: "UNBELIEVABLE!", "he put them in his pocket!", "SPECTACLE!", "what is happening here?!", "I don't BELIEVE it!", "incredible energy tonight!", mixed with classic NBA excitement.

Example response: {"announcer":"barak","title":"BANG!","recap":"🔥 **Roee** PUT THEM IN HIS POCKET — I don't BELIEVE it, what a spectacle! 🏀 **Dagan**, not your night my friend, but incredible energy, you come back stronger!"}`;

    const requestBody = {
      model: CLAUDE_MODEL,
      max_tokens: 300,
      system: `${announcer === "breen" ? breenPrompt : barakPrompt}

You MUST respond with ONLY a valid JSON object. No explanation, no preamble, no text before or after. Start your response with { and end with }.

The JSON object must have exactly these three fields:
{
  "announcer": "${announcer}",
  "title": "one of these based on content: DAME TIME / SPLASH NIGHT / AND ONE / BUCKETS / BANG! / CALLED IT / NOTHING BUT NET / RAK RESHETTTT",
  "recap": "exactly 2 short punchy sentences. Use emojis (🏀 🔥 ✅ ❌ 👑 🎯 😮 etc). Bold user names with **Name**. Celebrate good calls with excitement, acknowledge bad nights with sympathy — never mock or insult."
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
