export default async function handler(req, res) {
    const url = "https://script.google.com/macros/s/AKfycbzkm85dkp1X4FCboHYczkZ9l3oZkEAw1cZVpLD0fEQWQTVkPxtaKHRno1lfW-XY5e7Z/exec?action=dailyPredictions";
  
    try {
      const response = await fetch(url);
      const data = await response.json();
      return res.status(200).json(data);
    } catch (err) {
      console.error("Error in proxy:", err);
      return res.status(500).json({ error: "Proxy failed", details: err.message });
    }
  }
  