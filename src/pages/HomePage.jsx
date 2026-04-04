import React, { useEffect, useRef, useState } from "react";
import { Clock3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import DailyPredictions from "@/components/DailyPredictions";
import SkeletonBlock from "@/components/SkeletonBlock";
import { isGameStarted } from "@/lib/time";
import useTodayGames from "@/hooks/useTodayGames";

const titleSectionStyle = {
  background: "rgba(8,5,0,0.65)",
  border: "1.5px solid rgba(201,176,55,0.8)",
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
  const { games, loading: gamesLoading } = useTodayGames(supabase);
  const hadCache = useRef(games.length > 0).current;
  const [ready, setReady] = useState(hadCache);
  const [animate, setAnimate] = useState(false);
  const [predictions, setPredictions] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!ready && !gamesLoading) {
      if (!hadCache) setAnimate(true);
      setReady(true);
    }
  }, [ready, gamesLoading, hadCache]);

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

  if (!ready) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <section style={titleSectionStyle}>
          <SkeletonBlock style={{ width: "80px", height: "10px", marginBottom: "10px" }} />
          <SkeletonBlock style={{ width: "220px", height: "32px", marginBottom: "14px" }} />
          <SkeletonBlock style={{ width: "280px", height: "14px" }} />
        </section>
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {[0, 1].map((index) => (
            <Card key={`game-skeleton-${index}`}>
              <CardContent>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "20px", marginBottom: "16px" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                    <SkeletonBlock style={{ width: "56px", height: "56px", borderRadius: "50%", marginBottom: "8px" }} />
                    <SkeletonBlock style={{ width: "70px", height: "14px" }} />
                  </div>
                  <SkeletonBlock style={{ width: "28px", height: "18px" }} />
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                    <SkeletonBlock style={{ width: "56px", height: "56px", borderRadius: "50%", marginBottom: "8px" }} />
                    <SkeletonBlock style={{ width: "70px", height: "14px" }} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <SkeletonBlock style={{ height: "40px" }} />
                  <SkeletonBlock style={{ height: "40px" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <SkeletonBlock style={{ width: "64px", height: "14px" }} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        ...(animate ? { animation: "fadeIn 250ms ease both" } : {}),
      }}
    >
      <section style={titleSectionStyle}>
        <p style={{ margin: "0 0 8px", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(201,176,55,0.7)" }}>Game Night</p>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 700, color: "#fff" }}>NBA Predictions</h1>
        <p style={{ margin: "12px 0 0", fontSize: "13px", lineHeight: 1.6, color: "rgba(255,255,255,0.45)", maxWidth: "600px" }}>
          Pick winners before tip-off, track the live board, and check how the field is leaning once games begin.
        </p>
      </section>

      {games.length === 0 ? (
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
                <Card
                  key={game.gameId}
                  style={started ? { opacity: 0.7 } : undefined}
                >
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
