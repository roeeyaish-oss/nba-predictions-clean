export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
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
        model: "claude-sonnet-4-5",
        max_tokens: 150,
        system: `You are a hype NBA arena announcer welcoming a new player to a predictions game called Court Night. Respond with a JSON object only, no markdown:
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
      parsed = JSON.parse(raw);
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
