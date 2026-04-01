import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Scoreboard from "@/components/Scoreboard";
import DailyPredictions from "@/components/DailyPredictions";

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

function isGameStarted(gameTimeIL) {
  if (!gameTimeIL) return false;
  const [h, m] = gameTimeIL.split(":").map(Number);
  const now = new Date();
  const nowIL = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));
  return nowIL.getHours() > h || (nowIL.getHours() === h && nowIL.getMinutes() >= m);
}

function App() {
  const [user, setUser] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
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
    async function handleAuthUser(authUser) {
      if (!authUser) {
        setUser(null);
        return;
      }

      const allowedEmails = (import.meta.env.VITE_ALLOWED_EMAILS || "")
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);

      if (allowedEmails.length > 0 && !allowedEmails.includes(authUser.email)) {
        await supabase.auth.signOut();
        setUser(null);
        setAccessDenied(true);
        return;
      }

      setAccessDenied(false);

      await supabase.from("users").upsert(
        { id: authUser.id, email: authUser.email, name: authUser.user_metadata.full_name },
        { onConflict: "id" }
      );

      setUser(authUser);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  function handleSignIn() {
    supabase.auth.signInWithOAuth({ provider: "google" });
  }

  function handleSignOut() {
    supabase.auth.signOut();
  }

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
      } finally {
        setGamesLoaded(true);
      }
    }

    loadGames();
  }, []);

  function handlePrediction(gameId, team) {
    setPredictions((prev) => ({ ...prev, [gameId]: team }));
  }

  function handleSubmit() {
    if (!user) return;

    const submittableGames = games.filter((g) => !isGameStarted(g.gameTimeIL));
    const hasPick = submittableGames.some((g) => predictions[g.gameId]);

    if (!hasPick) {
      setMessage({ type: "error", text: "Please select at least one prediction before submitting." });
      return;
    }

    setSubmitting(true);

    const output = submittableGames
      .filter((g) => predictions[g.gameId])
      .map((g) => ({
        userId: user.id,
        gameId: g.gameId,
        pick: predictions[g.gameId],
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
    <main className="relative min-h-screen text-white px-4 sm:px-8 py-6 sm:py-10 font-sans overflow-x-hidden bg-[#0b0f2a]">

      <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#0b0f2a] to-black" />

      <img
        src="/nba-logo.png"
        alt="NBA Logo"
        className="fixed top-4 right-4 w-12 sm:w-20 z-50 opacity-80"
      />

      <div className="relative z-10 w-full max-w-[95%] sm:max-w-4xl mx-auto">

        <h1 className="text-4xl font-extrabold mb-10 text-center text-white tracking-wide">
          🏀 NBA Playoff Predictions
        </h1>

        {accessDenied ? (
          <p className="text-center text-red-500 mt-20 font-semibold">
            Access denied. You are not authorized to use this app.
          </p>
        ) : !user ? (
          <div className="flex justify-center mt-20">
            <Button
              onClick={handleSignIn}
              className="text-sm px-8 py-3 rounded-full border border-blue-500 bg-transparent hover:bg-blue-600 hover:text-white font-bold shadow-md"
            >
              Sign in with Google
            </Button>
          </div>
        ) : (
        <>
        <div className="flex items-center justify-center gap-4 mb-10">
          <span className="text-slate-300 text-sm">
            Signed in as <span className="font-semibold text-white">{user.user_metadata.full_name}</span>
          </span>
          <Button
            onClick={handleSignOut}
            className="text-xs px-4 py-1 rounded-full border border-gray-500 bg-transparent hover:bg-gray-700 text-gray-300"
          >
            Sign Out
          </Button>
        </div>

        {!gamesLoaded ? (
          <p className="text-center text-slate-400 mt-10">Loading games...</p>
        ) : games.length === 0 ? (
          <p className="text-center text-slate-400 mt-10">No games scheduled for today</p>
        ) : (
        <>
        <div className="grid gap-14 sm:gap-10">
          {games.map((g) => {
            const started = isGameStarted(g.gameTimeIL);
            return (
            <Card
              key={g.gameId}
              className={`bg-black/80 border border-blue-900 text-white rounded-2xl shadow-lg shadow-red-500/30 hover:shadow-red-500/60 transition ${started ? "opacity-50" : ""}`}
            >
              <CardContent className="p-4 sm:p-6">
                {g.gameTimeIL && (
                  <p className="text-center text-sm text-slate-400 mb-3">
                    🕑 Game Time <span className="font-semibold text-white">{g.gameTimeIL}</span> (IL)
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

                {started ? (
                  <p className="text-center text-red-400 font-semibold text-sm">Game started</p>
                ) : (
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
                )}
              </CardContent>
            </Card>
            );
          })}
        </div>

        <div className="flex justify-center mt-12">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className={`text-sm px-8 py-3 rounded-full border border-blue-500 bg-transparent hover:bg-blue-600 hover:text-white font-bold shadow-md ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {submitting ? "Submitting..." : "Submit Predictions"}
          </Button>
        </div>

        {message && (
          <p className={`text-center mt-4 font-semibold ${message.type === "success" ? "text-green-400" : "text-red-400"}`}>
            {message.text}
          </p>
        )}
        </>
        )}

        <div className="mt-14">
          <Scoreboard />
        </div>

        <div className="mt-10">
          <DailyPredictions currentUserId={user.id} />
        </div>
        </>
        )}
      </div>
    </main>
  );
}

export default App;
