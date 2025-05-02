export default async function handler(req, res) {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }
  
    // חשוב! ב-Vercel ה-body כבר מפוענח אוטומטית
    const body = req.body;
  
    const timestamp = new Date().toLocaleString("en-IL", {
      timeZone: "Asia/Jerusalem",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  
    const formatted = body.map((row) => [
      row[0], // user
      row[1], // gameId
      row[2], // pick
      timestamp
    ]);
  
    try {
      const response = await fetch(
        "https://script.google.com/macros/s/AKfycbzkm85dkp1X4FCboHYczkZ9l3oZkEAw1cZVpLD0fEQWQTVkPxtaKHRno1lfW-XY5e7Z/exec",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formatted),
        }
      );
  
      const text = await response.text();
      console.log("Response from script:", text);
      return res.status(200).send(text);
    } catch (err) {
      console.error("Error:", err);
      return res.status(500).send("Server Error: " + err.message);
    }
  }
  