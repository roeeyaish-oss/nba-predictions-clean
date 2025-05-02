import React, { useEffect, useState } from "react";
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

function App() {
  const [games, setGames] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [userName, setUserName] = useState("");

  useEffect(() => {
    fetch(
      "https://script.google.com/macros/s/AKfycbzkm85dkp1X4FCboHYczkZ9l3oZkEAw1cZVpLD0fEQWQTVkPxtaKHRno1lfW-XY5e7Z/exec"
    )
      .then((res) => res.json())
      .then((data) => setGames(data));
  }, []);

  function handlePrediction(gameId, team) {
    setPredictions((prev) => ({ ...prev, [gameId]: team }));
  }

  function handleSubmit() {
    if (!userName) return alert("Please select your name");

    const output = games.map((g) => [userName, g.gameId, predictions[g.gameId] || ""]);

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
    <main className="relative min-h-screen text-white px-4 sm:px-6 py-6 sm:py-10 font-sans overflow-x-hidden bg-[#0b0f2a]">

      {/* רקע גרדיאנט עמוק */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#0b0f2a] to-black" />

      {/* לוגו ה־NBA בפינה השמאלית העליונה */}
      <img
        src="/nba-logo.png"
        alt="NBA Logo"
        className="hidden sm:block w-20 absolute top-4 right-4 z-50"
      />


      <div className="relative z-10 w-full max-w-4xl mx-auto">
        <h1 className="text-4xl font-extrabold mb-10 text-center text-white tracking-wide">
          🏀 NBA Playoff Predictions
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

        <div className="grid gap-10">
          {games.map((g) => (
            <Card
              key={g.gameId}
              className="bg-black/80 border border-blue-900 text-white rounded-2xl shadow-lg shadow-red-500/30 hover:shadow-red-500/60 transition"
            >
              <CardContent className="p-6">
                {g.gameTimeIL && (
                  <p className="text-center text-sm text-slate-400 mb-3">
                    🕒 Game Time <span className="font-semibold text-white">{g.gameTimeIL}</span> (IL)
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
