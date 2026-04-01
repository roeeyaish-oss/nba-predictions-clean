import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Scoreboard from "@/components/Scoreboard";
import DailyPredictions from "@/components/DailyPredictions";
import {
  Select,
  SelectTrigger,
  SelectItem,
  SelectValue,
  SelectContent,
} from "@/components/ui/select";

const NAMES = ["Roee", "Dagan Harakuvich", "Saban", "Doron"];
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

function getIsraelToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function App() {
  const [games, setGames] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [userName, setUserName] = useState("");

  useEffect(() => {
    async function loadGames() {
      try {
        const today = getIsraelToday();
        const { data, error } = await supabase
          .from("games")
          .select("id, home_team, away_team, home_img, away_img, game_time")
          .eq("date", today)
          .order("game_time", { ascending: true });

        if (error) {
          throw error;
        }

        const formatted = (data || []).map((game) => ({
          gameId: game.id,
          home: game.home_team,
          away: game.away_team,
          homeImg: game.home_img,
          awayImg: game.away_img,
          gameTimeIL: game.game_time,
        }));

        setGames(formatted);
      } catch (err) {
        console.error("Failed to load games:", err);
      }
    }

    loadGames();
  }, []);

  function handlePrediction(gameId, team) {
    setPredictions((prev) => ({ ...prev, [gameId]: team }));
  }

  function handleSubmit() {
    if (!userName) return alert("Please select your name");

    const output = games.map((g) => ({
      user: userName,
      gameId: g.gameId,
      pick: predictions[g.gameId] || "",
    }));

    fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(output),
    })
      .then((res) => res.text())
      .then(() => alert("Predictions submitted successfully!"))
      .catch((err) => {
        console.error("Error submitting predictions:", err);
        alert("Something went wrong.");
      });
  }

  return (
    <main className="relative min-h-screen text-white px-4 sm:px-8 py-6 sm:py-10 font-sans overflow-x-hidden bg-[#0b0f2a]">


      {/* ×¨×§×¢ ×’×¨×“×™×× ×˜ ×¢×ž×•×§ */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#0b0f2a] to-black" />

      {/* ×œ×•×’×• ×”Ö¾NBA ×‘×¤×™× ×” ×”×©×ž××œ×™×ª ×”×¢×œ×™×•× ×” */}
      <img
        src="/nba-logo.png"
        alt="NBA Logo"
        className="fixed top-4 right-4 w-12 sm:w-20 z-50 opacity-80"
      />



      <div className="relative z-10 w-full max-w-[95%] sm:max-w-4xl mx-auto">


        <h1 className="text-4xl font-extrabold mb-10 text-center text-white tracking-wide">
          ðŸ€ NBA Playoff Predictions
        </h1>

        <div className="w-full max-w-md mb-10 mx-auto">
          <Select onValueChange={setUserName}>
            <SelectTrigger className="w-full border border-gray-600 bg-black text-white text-base rounded-xl px-4 py-3">
              <SelectValue placeholder="Select your name" />
            </SelectTrigger>
            <SelectContent className="bg-black text-white border border-gray-600 rounded-xl">
              {NAMES.map((n) => (
                <SelectItem
                  key={n}
                  value={n}
                  className="text-base hover:bg-blue-600 hover:text-white"
                >
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-14 sm:gap-10">

          {games.map((g) => (
            <Card
              key={g.gameId}
              className="bg-black/80 border border-blue-900 text-white rounded-2xl shadow-lg shadow-red-500/30 hover:shadow-red-500/60 transition"
            >
              <CardContent className="p-4 sm:p-6">
                {g.gameTimeIL && (
                  <p className="text-center text-sm text-slate-400 mb-3">
                    ðŸ•’ Game Time <span className="font-semibold text-white">{g.gameTimeIL}</span> (IL)
                  </p>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-6">
                  <div className="flex flex-col items-center">
                    <img src={g.homeImg} width="70" height="70" className="mb-2" />
                    <span className="text-md font-semibold text-center">{g.home}</span>
                  </div>
                  <span className="text-white text-lg font-bold">VS</span>
                  <div className="flex flex-col items-center">
                    <img src={g.awayImg} width="70" height="70" className="mb-2" />
                    <span className="text-md font-semibold text-center">{g.away}</span>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-4">
                  <Button
                    onClick={() => handlePrediction(g.gameId, g.home)}
                    className={`text-sm px-6 py-2 rounded-full border font-medium ${predictions[g.gameId] === g.home
                      ? "bg-red-500 text-white"
                      : "border-red-500 bg-transparent text-white hover:bg-red-600 hover:text-white"
                      }`}
                  >
                    {g.home}
                  </Button>

                  <Button
                    onClick={() => handlePrediction(g.gameId, g.away)}
                    className={`text-sm px-6 py-2 rounded-full border font-medium ${predictions[g.gameId] === g.away
                      ? "bg-red-500 text-white"
                      : "border-red-500 bg-transparent text-white hover:bg-red-600 hover:text-white"
                      }`}
                  >
                    {g.away}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-center mt-12">
          <Button
            onClick={handleSubmit}
            className="text-sm px-8 py-3 rounded-full border border-blue-500 bg-transparent hover:bg-blue-600 hover:text-white font-bold shadow-md"
          >
            Submit Predictions
          </Button>
        </div>

        <div className="mt-14">
          <Scoreboard />
        </div>

        <div className="mt-10">
          <DailyPredictions />
        </div>
      </div>
    </main>
  );
}

export default App;
