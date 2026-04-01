import React, { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DailyPredictions from "@/components/DailyPredictions";
import { getIsraelToday, isGameStarted } from "@/lib/time";

export default function HomePage({ user, supabase }) {
  const [games, setGames] = useState([]);
  const [gamesLoaded, setGamesLoaded] = useState(false);
  const [predictions, setPredictions] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    async function loadGames() {
      try {
        const today = getIsraelToday();
        const { data, error } = await supabase
          .from("games")
          .select("id, date, home_team, away_team, home_img, away_img, game_time")
          .eq("date", today)
          .order("game_time", { ascending: true });

        if (error) throw error;

        const formatted = (data || []).map((game) => ({
          gameId: game.id,
          date: game.date,
          home: game.home_team,
          away: game.away_team,
          homeImg: game.home_img,
          awayImg: game.away_img,
          gameTimeIL: game.game_time,
        }));

        setGames(formatted);
      } catch (err) {
        console.error("Failed to load games:", err);
      } finally {
        setGamesLoaded(true);
      }
    }

    loadGames();
  }, [supabase]);

  function handlePrediction(gameId, team) {
    setPredictions((prev) => ({ ...prev, [gameId]: team }));
  }

  function handleSubmit() {
    if (!user) return;

    const submittableGames = games.filter((game) => !isGameStarted(game.gameTimeIL, game.date));
    const hasPick = submittableGames.some((game) => predictions[game.gameId]);

    if (!hasPick) {
      setMessage({ type: "error", text: "Please select at least one prediction before submitting." });
      return;
    }

    setSubmitting(true);

    const output = submittableGames
      .filter((game) => predictions[game.gameId])
      .map((game) => ({
        userId: user.id,
        gameId: game.gameId,
        pick: predictions[game.gameId],
      }));

    fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(output),
    })
      .then((res) =>
        res.text().then((text) => {
          if (res.ok) {
            setMessage({ type: "success", text: "Predictions submitted successfully!" });
          } else {
            setMessage({ type: "error", text: text || "Failed to submit predictions." });
          }
        })
      )
      .catch((err) => {
        console.error("Error submitting predictions:", err);
        setMessage({ type: "error", text: "Network error. Please try again." });
      })
      .finally(() => {
        setSubmitting(false);
      });
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="rounded-4 border border-[#C9B037]/35 bg-black/45 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,215,0,0.1)] backdrop-blur-[8px] sm:p-7">
        <p className="mb-2 text-[11px] uppercase tracking-[0.35em] text-[#C9B037]/85">Game Night</p>
        <h1 className="text-3xl font-800 tracking-tight text-white sm:text-5xl">NBA Predictions</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60 sm:text-base">
          Pick winners before tip-off, track the live board, and check how the field is leaning once games begin.
        </p>
      </section>

      {!gamesLoaded ? (
        <p className="text-center text-sm text-white/60">Loading today&apos;s games...</p>
      ) : games.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-white/65">
            No games scheduled for today.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-5 sm:gap-6">
            {games.map((game) => {
              const started = isGameStarted(game.gameTimeIL, game.date);
              return (
                <Card key={game.gameId} className={started ? "opacity-70" : ""}>
                  <CardContent className="p-5 sm:p-7">
                    {game.gameTimeIL && (
                      <div className="mb-5 flex items-center justify-center gap-2 text-sm text-[#C9B037]">
                        <Clock3 className="h-4 w-4" strokeWidth={2.3} />
                        <span className="font-600">{game.gameTimeIL}</span>
                      </div>
                    )}

                    <div className="mb-6 flex items-center justify-center gap-5 sm:gap-8">
                      <div className="flex min-w-0 flex-1 flex-col items-center">
                        <img src={game.homeImg} width="72" height="72" className="mb-3 h-18 w-18 object-contain" />
                        <span className="text-center text-base font-600 text-white">{game.home}</span>
                      </div>
                      <span className="text-lg font-700 tracking-[0.25em] text-[#C9B037] sm:text-xl">VS</span>
                      <div className="flex min-w-0 flex-1 flex-col items-center">
                        <img src={game.awayImg} width="72" height="72" className="mb-3 h-18 w-18 object-contain" />
                        <span className="text-center text-base font-600 text-white">{game.away}</span>
                      </div>
                    </div>

                    {started ? (
                      <p className="text-center text-sm font-700 text-[#C9B037]">Predictions locked. Game already started.</p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Button
                          onClick={() => handlePrediction(game.gameId, game.home)}
                          className={`rounded-2 border px-5 py-3 text-sm ${
                            predictions[game.gameId] === game.home
                              ? "border-[#C9B037] bg-[#C9B037] font-700 text-black"
                              : "border-[#C9B037] bg-transparent text-white hover:bg-[rgba(201,176,55,0.2)]"
                          }`}
                        >
                          {game.home}
                        </Button>
                        <Button
                          onClick={() => handlePrediction(game.gameId, game.away)}
                          className={`rounded-2 border px-5 py-3 text-sm ${
                            predictions[game.gameId] === game.away
                              ? "border-[#C9B037] bg-[#C9B037] font-700 text-black"
                              : "border-[#C9B037] bg-transparent text-white hover:bg-[rgba(201,176,55,0.2)]"
                          }`}
                        >
                          {game.away}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className={`w-full rounded-3 border-none bg-gradient-to-br from-[#C9B037] to-[#8B6914] px-6 py-4 text-sm font-700 text-black shadow-[0_4px_16px_rgba(201,176,55,0.4)] hover:from-[#d6bc60] hover:to-[#9b7717] ${submitting ? "cursor-not-allowed opacity-60" : ""}`}
          >
            {submitting ? "Submitting..." : "Submit Predictions"}
          </Button>

          {message && (
            <p className={`text-center text-sm font-700 ${message.type === "success" ? "text-[#e8cb68]" : "text-red-300"}`}>
              {message.text}
            </p>
          )}
        </>
      )}

      <DailyPredictions currentUserId={user.id} />
    </div>
  );
}
