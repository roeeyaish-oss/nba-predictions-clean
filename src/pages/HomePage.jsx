import React, { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import DailyPredictions from "@/components/DailyPredictions";
import { getIsraelToday, isGameStarted } from "@/lib/time";

const titleSectionStyle = {
  background: "rgba(8,5,0,0.82)",
  border: "1.5px solid rgba(201,176,55,0.65)",
  borderRadius: "16px",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,215,0,0.08)",
  padding: "20px",
};

const pickButtonBase = {
  width: "100%",
  borderRadius: "10px",
  padding: "10px 0",
  fontSize: "13px",
  cursor: "pointer",
  transition: "all 0.2s ease",
  textAlign: "center",
};

const pickButtonUnselected = {
  ...pickButtonBase,
  background: "rgba(201,176,55,0.08)",
  border: "1.5px solid rgba(201,176,55,0.5)",
  color: "#fff",
  fontWeight: 500,
};

const pickButtonSelected = {
  ...pickButtonBase,
  background: "linear-gradient(135deg, #C9B037 0%, #8B6914 100%)",
  border: "1.5px solid transparent",
  color: "#000",
  fontWeight: 700,
  boxShadow: "0 4px 16px rgba(201,176,55,0.5)",
};

const submitButtonStyle = {
  background: "linear-gradient(135deg, #C9B037 0%, #8B6914 100%)",
  color: "#000",
  fontWeight: 700,
  fontSize: "15px",
  letterSpacing: "0.05em",
  borderRadius: "12px",
  padding: "14px",
  width: "100%",
  border: "none",
  boxShadow: "0 4px 20px rgba(201,176,55,0.45)",
  cursor: "pointer",
};

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
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <section style={titleSectionStyle}>
        <p style={{ margin: "0 0 8px", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(201,176,55,0.7)" }}>Game Night</p>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 700, color: "#fff" }}>NBA Predictions</h1>
        <p style={{ margin: "12px 0 0", fontSize: "13px", lineHeight: 1.6, color: "rgba(255,255,255,0.45)", maxWidth: "600px" }}>
          Pick winners before tip-off, track the live board, and check how the field is leaning once games begin.
        </p>
      </section>

      {!gamesLoaded ? (
        <p style={{ textAlign: "center", fontSize: "13px", color: "rgba(255,255,255,0.45)" }}>Loading today&apos;s games...</p>
      ) : games.length === 0 ? (
        <Card>
          <CardContent>
            <p style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", margin: 0 }}>No games scheduled for today.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {games.map((game) => {
              const started = isGameStarted(game.gameTimeIL, game.date);
              return (
                <Card key={game.gameId} style={started ? { opacity: 0.7 } : undefined}>
                  <CardContent>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "20px", marginBottom: "16px" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: 0 }}>
                        <img src={game.homeImg} width="56" height="56" alt={game.home} style={{ width: "56px", height: "56px", objectFit: "contain", marginBottom: "8px" }} />
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "#fff", textAlign: "center" }}>{game.home}</span>
                      </div>
                      <span style={{ fontSize: "18px", fontWeight: 700, color: "#C9B037", letterSpacing: "0.15em" }}>VS</span>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: 0 }}>
                        <img src={game.awayImg} width="56" height="56" alt={game.away} style={{ width: "56px", height: "56px", objectFit: "contain", marginBottom: "8px" }} />
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "#fff", textAlign: "center" }}>{game.away}</span>
                      </div>
                    </div>

                    {started ? (
                      <p style={{ textAlign: "center", fontSize: "13px", fontWeight: 700, color: "#C9B037", margin: 0 }}>Predictions locked. Game already started.</p>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                        <button
                          onClick={() => handlePrediction(game.gameId, game.home)}
                          style={predictions[game.gameId] === game.home ? pickButtonSelected : pickButtonUnselected}
                        >
                          {game.home}
                        </button>
                        <button
                          onClick={() => handlePrediction(game.gameId, game.away)}
                          style={predictions[game.gameId] === game.away ? pickButtonSelected : pickButtonUnselected}
                        >
                          {game.away}
                        </button>
                      </div>
                    )}

                    {game.gameTimeIL && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginTop: started ? "12px" : "0" }}>
                        <Clock3 style={{ width: "14px", height: "14px", color: "#C9B037" }} strokeWidth={2.3} />
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "#C9B037" }}>{game.gameTimeIL}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              ...submitButtonStyle,
              ...(submitting ? { opacity: 0.6, cursor: "not-allowed" } : {}),
            }}
          >
            {submitting ? "SUBMITTING..." : "SUBMIT PREDICTIONS"}
          </button>

          {message && (
            <p style={{ textAlign: "center", fontSize: "13px", fontWeight: 700, color: message.type === "success" ? "#e8cb68" : "#fca5a5", margin: 0 }}>
              {message.text}
            </p>
          )}
        </>
      )}

      <DailyPredictions currentUserId={user.id} />
    </div>
  );
}
