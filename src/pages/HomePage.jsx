import React, { useEffect, useRef, useState } from "react";
import { Clock3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import DailyPredictions from "@/components/DailyPredictions";
import SkeletonBlock from "@/components/SkeletonBlock";
import { getIsraelToday, getIsraelTomorrow, isGameStarted } from "@/lib/time";
import useTodayGames from "@/hooks/useTodayGames";
import usePlayoffSeries from "@/hooks/usePlayoffSeries";
import NBA_TEAMS from "@/lib/nbaTeams";
import { ANNOUNCER_URL } from "@/lib/constants";

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

const SERIES_POINTS = { 1: 5, 2: 9, 3: 14, 4: 20 };
const ROUND_LABELS  = { 1: "ROUND 1", 2: "ROUND 2", 3: "CONF FINALS", 4: "NBA FINALS" };

// Map full team name → ESPN logo URL, built once from NBA_TEAMS
const teamLogoMap = new Map(NBA_TEAMS.map((t) => [t.name, t.logo]));


export default function HomePage({ user, supabase, oracleData, onReopenOracle }) {
  const { games, loading: gamesLoading } = useTodayGames(supabase);
  const { series, userPicks: savedSeriesPicks, refresh: refreshSeries } = usePlayoffSeries(supabase, user?.id);
  const hadCache = useRef(games.length > 0).current;
  const [ready, setReady] = useState(hadCache);
  const [animate, setAnimate] = useState(false);
  const [predictions, setPredictions] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [predictionsRefreshKey, setPredictionsRefreshKey] = useState(0);
  const [seriesPredictions, setSeriesPredictions] = useState({});
  const [submittingSeries, setSubmittingSeries] = useState(false);
  const [seriesMessage, setSeriesMessage] = useState(null);
  const submittableGames = games.filter((game) => !isGameStarted(game.gameTimeIL, game.date));
  const hasSubmittableGames = submittableGames.length > 0;

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!seriesMessage) return;
    const timer = setTimeout(() => setSeriesMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [seriesMessage]);

  useEffect(() => {
    if (!ready && !gamesLoading) {
      if (!hadCache) setAnimate(true);
      setReady(true);
    }
  }, [ready, gamesLoading, hadCache]);

  function handlePrediction(gameId, team) {
    setPredictions((prev) => ({ ...prev, [gameId]: prev[gameId] === team ? undefined : team }));
  }

  function handleSeriesPrediction(seriesId, team) {
    setSeriesPredictions((prev) => ({
      ...prev,
      [seriesId]: prev[seriesId] === team ? undefined : team,
    }));
  }

  async function handleSeriesSubmit() {
    if (!user) return;

    const picks = series
      .filter((s) => {
        const isLocked = s.first_game_time && new Date() >= new Date(s.first_game_time);
        return !isLocked && seriesPredictions[s.id];
      })
      .map((s) => ({ seriesId: s.id, pick: seriesPredictions[s.id] }));

    if (picks.length === 0) {
      setSeriesMessage({ type: "error", text: "Please select at least one series pick before submitting." });
      return;
    }

    setSubmittingSeries(true);

    const { data: { session } } = await supabase.auth.getSession();

    fetch("/api/submitSeries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify(picks),
    })
      .then((res) =>
        res.text().then((text) => {
          if (res.ok) {
            setSeriesMessage({ type: "success", text: "Series picks submitted!" });
            setSeriesPredictions({});
            refreshSeries();
          } else {
            setSeriesMessage({ type: "error", text: text || "Failed to submit series picks." });
          }
        })
      )
      .catch(() => {
        setSeriesMessage({ type: "error", text: "Network error. Please try again." });
      })
      .finally(() => {
        setSubmittingSeries(false);
      });
  }

  async function handleSubmit() {
    if (!user) return;

    const hasPick = submittableGames.some((game) => predictions[game.gameId]);

    if (!hasPick) {
      setMessage({ type: "error", text: "Please select at least one prediction before submitting." });
      return;
    }

    setSubmitting(true);

    const { data: { session } } = await supabase.auth.getSession();

    const output = submittableGames
      .filter((game) => predictions[game.gameId])
      .map((game) => ({
        gameId: game.gameId,
        pick: predictions[game.gameId],
      }));

    fetch("/api/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify(output),
    })
      .then((res) =>
        res.text().then((text) => {
          if (res.ok) {
            setMessage({ type: "success", text: "Predictions submitted successfully!" });
            setPredictions({});
            setPredictionsRefreshKey((k) => k + 1);
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
            <p style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", margin: 0 }}>No games scheduled for today or tomorrow.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {[
            { key: getIsraelToday(), label: "Today" },
            { key: getIsraelTomorrow(), label: "Tomorrow" },
          ].map(({ key: dateKey, label }) => {
            const dateGames = games.filter((g) => g.date === dateKey);
            if (dateGames.length === 0) return null;
            return (
              <div key={dateKey} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(201,176,55,0.7)", fontWeight: 600 }}>{label}</p>
                {dateGames.map((game) => {
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
            );
          })}
          {hasSubmittableGames && (
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
          )}

          {message && (
            <p style={{ textAlign: "center", fontSize: "13px", fontWeight: 700, color: message.type === "success" ? "#e8cb68" : "#fca5a5", margin: 0 }}>
              {message.text}
            </p>
          )}
        </>
      )}

      {series.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(201,176,55,0.7)", fontWeight: 600 }}>
            Playoff Series Picks
          </p>

          {series.map((s) => {
            const isLocked = s.first_game_time && new Date() >= new Date(s.first_game_time);
            const savedPick = savedSeriesPicks[s.id];
            const pendingPick = seriesPredictions[s.id];
            const activePick = pendingPick ?? savedPick;
            const pts = SERIES_POINTS[s.round] ?? 5;
            const roundLabel = ROUND_LABELS[s.round] ?? `ROUND ${s.round}`;
            const homeLogo = teamLogoMap.get(s.home_team);
            const awayLogo = teamLogoMap.get(s.away_team);

            return (
              <Card key={s.id}>
                <CardContent>
                  {/* Round + points header */}
                  <p style={{ margin: "0 0 14px", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(201,176,55,0.7)", fontWeight: 600 }}>
                    {roundLabel} · {pts} pts if correct
                  </p>

                  {/* Teams */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "20px", marginBottom: "16px" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: 0 }}>
                      {homeLogo && (
                        <img src={homeLogo} width="56" height="56" alt={s.home_team} style={{ width: "56px", height: "56px", objectFit: "contain", marginBottom: "8px" }} />
                      )}
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#fff", textAlign: "center" }}>{s.home_team}</span>
                    </div>
                    <span style={{ fontSize: "18px", fontWeight: 700, color: "#C9B037", letterSpacing: "0.15em" }}>VS</span>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: 0 }}>
                      {awayLogo && (
                        <img src={awayLogo} width="56" height="56" alt={s.away_team} style={{ width: "56px", height: "56px", objectFit: "contain", marginBottom: "8px" }} />
                      )}
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#fff", textAlign: "center" }}>{s.away_team}</span>
                    </div>
                  </div>

                  {/* Pick area */}
                  {isLocked ? (
                    <div style={{ textAlign: "center" }}>
                      {savedPick ? (
                        <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#C9B037" }}>
                          Your pick: {savedPick}
                        </p>
                      ) : (
                        <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#C9B037" }}>
                          Series pick locked.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <button
                        onClick={() => handleSeriesPrediction(s.id, s.home_team)}
                        style={activePick === s.home_team ? pickButtonSelected : pickButtonUnselected}
                      >
                        {s.home_team}
                      </button>
                      <button
                        onClick={() => handleSeriesPrediction(s.id, s.away_team)}
                        style={activePick === s.away_team ? pickButtonSelected : pickButtonUnselected}
                      >
                        {s.away_team}
                      </button>
                    </div>
                  )}

                  {/* Win counts once series has games */}
                  {(s.home_wins > 0 || s.away_wins > 0) && (
                    <p style={{ margin: "10px 0 0", textAlign: "center", fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
                      {s.home_team.split(" ").pop()} {s.home_wins} – {s.away_wins} {s.away_team.split(" ").pop()}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Submit button — only if there are unlocked series with a pending pick */}
          {series.some((s) => {
            const isLocked = s.first_game_time && new Date() >= new Date(s.first_game_time);
            return !isLocked && seriesPredictions[s.id];
          }) && (
            <button
              onClick={handleSeriesSubmit}
              disabled={submittingSeries}
              style={{
                ...submitButtonStyle,
                ...(submittingSeries ? { opacity: 0.6, cursor: "not-allowed" } : {}),
              }}
            >
              {submittingSeries ? "SUBMITTING..." : "SUBMIT SERIES PICKS"}
            </button>
          )}

          {seriesMessage && (
            <p style={{ textAlign: "center", fontSize: "13px", fontWeight: 700, color: seriesMessage.type === "success" ? "#e8cb68" : "#fca5a5", margin: 0 }}>
              {seriesMessage.text}
            </p>
          )}
        </div>
      )}

      <DailyPredictions currentUserId={user.id} refreshKey={predictionsRefreshKey} />

      {oracleData && (
        <button
          onClick={onReopenOracle}
          aria-label="Reopen Game Night Recap"
          style={{
            position: "fixed",
            bottom: "90px",
            right: "16px",
            zIndex: 999,
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            border: "2px solid rgba(201,176,55,0.85)",
            background: "#C9B037",
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
            padding: 0,
            cursor: "pointer",
            overflow: "hidden",
          }}
        >
          <img
            src={ANNOUNCER_URL}
            alt="Announcer"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </button>
      )}
    </div>
  );
}
