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

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const user = await requireAuth(req, res);
  if (!user) {
    return;
  }

  const name = req.query.name?.trim();
  if (!name) {
    return res.status(400).json({ error: "Missing name" });
  }

  const fallback = {
    title: "WELCOME TO THE COURT",
    recap: `Ladies and gentlemen, ${name} has ENTERED THE BUILDING! Court Night just got a whole lot more interesting. Let's see if you got game!`,
  };

  try {
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 150,
        system: `You are a hype NBA arena announcer welcoming a new player to a predictions game called Court Night. Return raw JSON only, no markdown, no code fences, no backticks.
{
  "title": "WELCOME TO THE COURT",
  "recap": "2-3 sentences, dramatic NBA announcer style, use the player's name creatively, make it hype and personalized, use NBA slang"
}
The title must always be exactly: WELCOME TO THE COURT`,
        messages: [{ role: "user", content: `New player joining: ${name}` }],
      }),
    });

    if (!claudeRes.ok) throw new Error(`Claude API error: ${claudeRes.status}`);

    const claudeData = await claudeRes.json();
    const raw = claudeData.content?.[0]?.text ?? "";

    let parsed;
    try {
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return res.status(200).json(fallback);
    }

    if (!parsed.title || !parsed.recap) {
      return res.status(200).json(fallback);
    }

    return res.status(200).json({ title: parsed.title, recap: parsed.recap });
  } catch (err) {
    console.error("Welcome oracle error:", err);
    return res.status(200).json(fallback);
  }
}
