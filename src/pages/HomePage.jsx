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

const GAME_COLOR = "#C9B037";
const SERIES_COLOR = "#6366f1";

const titleSectionStyle = {
  background: "rgba(8,5,0,0.65)",
  border: "1.5px solid rgba(201,176,55,0.8)",
  borderRadius: "16px",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,215,0,0.08)",
  padding: "20px",
};

const tabsWrapStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "6px",
  width: "100%",
  padding: "6px",
  borderRadius: "999px",
  background: "rgba(12,10,18,0.78)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 10px 30px rgba(0,0,0,0.32)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
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

const seriesCardStyle = {
  background: "rgba(10,8,22,0.72)",
  border: "1.5px solid rgba(99,102,241,0.55)",
  boxShadow: "0 10px 32px rgba(0,0,0,0.42), inset 0 1px 0 rgba(129,140,248,0.1)",
};

const seriesPickButtonUnselected = {
  ...pickButtonBase,
  background: "rgba(99,102,241,0.08)",
  border: "1.5px solid rgba(99,102,241,0.45)",
  color: "#fff",
  fontWeight: 500,
};

const seriesPickButtonSelected = {
  ...pickButtonBase,
  background: "linear-gradient(135deg, #818cf8 0%, #6366f1 55%, #4338ca 100%)",
  border: "1.5px solid transparent",
  color: "#f8fafc",
  fontWeight: 700,
  boxShadow: "0 6px 20px rgba(99,102,241,0.38)",
};

const SERIES_POINTS = { 1: 5, 2: 9, 3: 14, 4: 20 };
const ROUND_LABELS = { 1: "ROUND 1", 2: "ROUND 2", 3: "CONF FINALS", 4: "NBA FINALS" };

const teamLogoMap = new Map(NBA_TEAMS.map((team) => [team.name, team.logo]));

function hasAnyTruthyValue(values) {
  return Object.values(values).some(Boolean);
}

function TabButton({ active, label, onClick, showDirtyDot, showAlert, accentColor, activeGradient }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: "relative",
        borderRadius: "999px",
        border: "none",
        background: active ? activeGradient : "transparent",
        color: active ? "#050200" : "rgba(201,176,55,0.72)",
        fontWeight: active ? 800 : 600,
        fontSize: "13px",
        letterSpacing: "0.08em",
        padding: "14px 14px",
        cursor: "pointer",
        width: "100%",
        opacity: active ? 1 : 0.88,
        boxShadow: active ? `0 8px 18px ${accentColor}47, inset 0 1px 0 rgba(255,245,200,0.35)` : "none",
        transform: active ? "translateY(-1px)" : "translateY(0)",
        transition: "color 300ms ease, background 300ms ease, border-color 300ms ease, box-shadow 300ms ease, transform 180ms ease",
      }}
    >
      {label}
      {showDirtyDot && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "8px",
            right: showAlert ? "30px" : "10px",
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "#ef4444",
            boxShadow: "0 0 10px #ef4444",
            transition: "color 300ms ease, background 300ms ease, border-color 300ms ease",
          }}
        />
      )}
      {showAlert && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "5px",
            right: "8px",
            minWidth: "18px",
            height: "18px",
            borderRadius: "999px",
            background: "#dc2626",
            color: "#fff",
            fontSize: "11px",
            fontWeight: 800,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
            padding: "0 5px",
          }}
        >
          !
        </span>
      )}
    </button>
  );
}

export default function HomePage({ user, supabase, oracleData, onReopenOracle }) {
  const { games, loading: gamesLoading } = useTodayGames(supabase);
  const { series, userPicks: savedSeriesPicks, refresh: refreshSeries } = usePlayoffSeries(supabase, user?.id);
  const hadCache = useRef(games.length > 0).current;
  const [ready, setReady] = useState(hadCache);
  const [animate, setAnimate] = useState(false);
  const [activeTab, setActiveTab] = useState("game");
  const [tabAnimationKey, setTabAnimationKey] = useState(0);
  const [predictions, setPredictions] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [predictionsRefreshKey, setPredictionsRefreshKey] = useState(0);
  const [seriesPredictions, setSeriesPredictions] = useState({});
  const [submittingSeries, setSubmittingSeries] = useState(false);
  const [seriesMessage, setSeriesMessage] = useState(null);
  const [savedPicks, setSavedPicks] = useState({});

  const submittableGames = games.filter((game) => !isGameStarted(game.gameTimeIL, game.date));
  const hasSubmittableGames = submittableGames.length > 0;
  const hasSubmittableSeriesPicks = hasAnyTruthyValue(seriesPredictions);

  // Badge: red dot when there are pickable games/series the user hasn't saved picks for yet
  const hasUnpickedGames = submittableGames.some((g) => !savedPicks[g.gameId]);
  const hasUnpickedSeries = series.some((s) => !isSeriesLocked(s) && !savedSeriesPicks[s.id]);
  const accentColor = activeTab === "series" ? SERIES_COLOR : GAME_COLOR;
  const activeTabGradient = activeTab === "series"
    ? "linear-gradient(135deg, #a5b4fc 0%, #6366f1 48%, #4338ca 100%)"
    : "linear-gradient(135deg, #f0d77a 0%, #C9B037 48%, #8B6914 100%)";

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

  useEffect(() => {
    setTabAnimationKey((current) => current + 1);
  }, [activeTab]);

  useEffect(() => {
    if (!user?.id || games.length === 0) return;
    const gameIds = games.map((g) => g.gameId);
    supabase
      .from("predictions")
      .select("game_id, pick")
      .eq("user_id", user.id)
      .in("game_id", gameIds)
      .then(({ data }) => {
        if (!data) return;
        const map = {};
        for (const row of data) map[row.game_id] = row.pick;
        setSavedPicks(map);
      });
  }, [games, user?.id, supabase]);

  function handlePrediction(gameId, team) {
    setPredictions((prev) => ({ ...prev, [gameId]: prev[gameId] === team ? undefined : team }));
  }

  function handleSeriesPrediction(seriesId, team) {
    setSeriesPredictions((prev) => ({
      ...prev,
      [seriesId]: prev[seriesId] === team ? undefined : team,
    }));
  }

  function isSeriesLocked(seriesItem) {
    return (seriesItem.first_game_time && new Date() >= new Date(seriesItem.first_game_time)) ||
      seriesItem.home_wins > 0 ||
      seriesItem.away_wins > 0 ||
      seriesItem.home_team === "TBD" ||
      seriesItem.away_team === "TBD";
  }

  function isSeriesTBD(seriesItem) {
    return seriesItem.home_team === "TBD" || seriesItem.away_team === "TBD";
  }

  async function handleSeriesSubmit() {
    if (!user) return;

    const picks = series
      .filter((seriesItem) => !isSeriesLocked(seriesItem) && seriesPredictions[seriesItem.id])
      .map((seriesItem) => ({ seriesId: seriesItem.id, pick: seriesPredictions[seriesItem.id] }));

    if (picks.length === 0) {
      setSeriesMessage({ type: "error", text: "Please select at least one series pick before submitting." });
      return;
    }

    setSubmittingSeries(true);

    const { data: { session } } = await supabase.auth.getSession();

    try {
      const res = await fetch("/api/submitSeries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(picks),
      });

      const text = await res.text();

      if (!res.ok) {
        setSeriesMessage({ type: "error", text: text || "Failed to submit series picks." });
        return;
      }

      setSeriesPredictions({});
      await refreshSeries();
      setSeriesMessage({ type: "success", text: "Series picks submitted!" });
    } catch {
      setSeriesMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSubmittingSeries(false);
    }
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

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(output),
      });

      const text = await res.text();

      if (!res.ok) {
        setMessage({ type: "error", text: text || "Failed to submit predictions." });
        return;
      }

      setMessage({ type: "success", text: "Predictions submitted successfully!" });
      setSavedPicks((prev) => ({ ...prev, ...Object.fromEntries(output.map((o) => [o.gameId, o.pick])) }));
      setPredictions({});
      setPredictionsRefreshKey((current) => current + 1);
    } catch (err) {
      console.error("Error submitting predictions:", err);
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <section style={titleSectionStyle}>
          <SkeletonBlock style={{ width: "80px", height: "10px", marginBottom: "10px" }} />
          <SkeletonBlock style={{ width: "220px", height: "32px", marginBottom: "14px" }} />
          <SkeletonBlock style={{ width: "280px", height: "14px", marginBottom: "20px" }} />
          <div style={tabsWrapStyle}>
            <SkeletonBlock style={{ height: "48px" }} />
            <SkeletonBlock style={{ height: "48px" }} />
          </div>
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
        position: "relative",
        zIndex: 1,
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        ...(animate ? { animation: "fadeIn 250ms ease both" } : {}),
      }}
    >
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
          pointerEvents: "none",
          background: "rgba(99, 102, 241, 0.15)",
          opacity: activeTab === "series" ? 1 : 0,
          transition: "opacity 400ms ease",
        }}
      />
      <section style={titleSectionStyle}>
        <p style={{ margin: "0 0 8px", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(201,176,55,0.7)" }}>Game Night</p>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 700, color: "#fff" }}>NBA Predictions</h1>
        <p style={{ margin: "12px 0 0", fontSize: "13px", lineHeight: 1.6, color: "rgba(255,255,255,0.45)", maxWidth: "600px" }}>
          Pick winners before tip-off, track the live board, and lock in your playoff bracket before each series starts.
        </p>
      </section>

      <div style={tabsWrapStyle}>
        <TabButton
          active={activeTab === "game"}
          label="GAME PICKS"
          onClick={() => setActiveTab("game")}
          showDirtyDot={hasUnpickedGames}
          showAlert={false}
          accentColor={accentColor}
          activeGradient={activeTabGradient}
        />
        <TabButton
          active={activeTab === "series"}
          label="SERIES PICKS"
          onClick={() => setActiveTab("series")}
          showDirtyDot={hasUnpickedSeries}
          showAlert={false}
          accentColor={accentColor}
          activeGradient={activeTabGradient}
        />
      </div>

      <div
        key={`${activeTab}-${tabAnimationKey}`}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          animation: "fadeIn 220ms ease both",
          transform: "translateY(0)",
        }}
      >
      {activeTab === "game" ? (
        <>
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
                const dateGames = games.filter((game) => game.date === dateKey);
                if (dateGames.length === 0) return null;

                return (
                  <div key={dateKey} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(201,176,55,0.7)", fontWeight: 600 }}>
                      {label}
                    </p>
                    {dateGames.map((game) => {
                      const started = isGameStarted(game.gameTimeIL, game.date);
                      return (
                        <Card key={game.gameId} style={started ? { opacity: 0.7 } : undefined}>
                          <CardContent>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "20px", marginBottom: "16px" }}>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: 0 }}>
                                <img src={game.homeImg} width="56" height="56" alt={game.home} style={{ width: "56px", height: "56px", objectFit: "contain", marginBottom: "8px" }} />
                                <span style={{ fontSize: "13px", fontWeight: 600, color: "#fff", textAlign: "center" }}>{game.home}</span>
                              </div>
                              <span style={{ fontSize: "18px", fontWeight: 700, color: accentColor, letterSpacing: "0.15em", transition: "color 300ms ease, background 300ms ease, border-color 300ms ease" }}>VS</span>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: 0 }}>
                                <img src={game.awayImg} width="56" height="56" alt={game.away} style={{ width: "56px", height: "56px", objectFit: "contain", marginBottom: "8px" }} />
                                <span style={{ fontSize: "13px", fontWeight: 600, color: "#fff", textAlign: "center" }}>{game.away}</span>
                              </div>
                            </div>

                            {started ? (
                              <p style={{ textAlign: "center", fontSize: "13px", fontWeight: 700, color: "#C9B037", margin: 0 }}>
                                Predictions locked. Game already started.
                              </p>
                            ) : (
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                                <button
                                  type="button"
                                  onClick={() => handlePrediction(game.gameId, game.home)}
                                  style={predictions[game.gameId] === game.home ? pickButtonSelected : pickButtonUnselected}
                                >
                                  {game.home}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePrediction(game.gameId, game.away)}
                                  style={predictions[game.gameId] === game.away ? pickButtonSelected : pickButtonUnselected}
                                >
                                  {game.away}
                                </button>
                              </div>
                            )}

                            {game.gameTimeIL && (
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginTop: started ? "12px" : "0" }}>
                                <Clock3 style={{ width: "14px", height: "14px", color: accentColor, transition: "color 300ms ease, background 300ms ease, border-color 300ms ease" }} strokeWidth={2.3} />
                                <span style={{ fontSize: "12px", fontWeight: 600, color: accentColor, transition: "color 300ms ease, background 300ms ease, border-color 300ms ease" }}>{game.gameTimeIL}</span>
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
                  type="button"
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

          <DailyPredictions currentUserId={user.id} refreshKey={predictionsRefreshKey} />
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.18em", color: accentColor, fontWeight: 600, transition: "color 300ms ease, background 300ms ease, border-color 300ms ease" }}>
            Playoff Series Picks
          </p>

          {series.length === 0 ? (
            <Card>
              <CardContent>
                <p style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", margin: 0 }}>No active playoff series available right now.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {series.map((seriesItem) => {
                const isLocked = isSeriesLocked(seriesItem);
                const draftPick = seriesPredictions[seriesItem.id];
                const pts = SERIES_POINTS[seriesItem.round] ?? 5;
                const roundLabel = ROUND_LABELS[seriesItem.round] ?? `ROUND ${seriesItem.round}`;
                const homeLogo = teamLogoMap.get(seriesItem.home_team);
                const awayLogo = teamLogoMap.get(seriesItem.away_team);

                return (
                  <Card key={seriesItem.id} style={seriesCardStyle}>
                    <CardContent>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "14px" }}>
                        <p style={{ margin: 0, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(165,180,252,0.8)", fontWeight: 700 }}>
                          {roundLabel} · {pts} pts if correct
                        </p>
                        <span
                          style={{
                            flexShrink: 0,
                            padding: "5px 10px",
                            borderRadius: "999px",
                            background: "rgba(99,102,241,0.16)",
                            border: "1px solid rgba(129,140,248,0.35)",
                            color: accentColor,
                            fontSize: "10px",
                            fontWeight: 800,
                            letterSpacing: "0.14em",
                            transition: "color 300ms ease, background 300ms ease, border-color 300ms ease",
                          }}
                        >
                          SERIES
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "20px", marginBottom: "16px" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: 0 }}>
                          {homeLogo && (
                            <img src={homeLogo} width="56" height="56" alt={seriesItem.home_team} style={{ width: "56px", height: "56px", objectFit: "contain", marginBottom: "8px" }} />
                          )}
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "#fff", textAlign: "center" }}>{seriesItem.home_team}</span>
                        </div>
                        <span style={{ fontSize: "18px", fontWeight: 700, color: "#818cf8", letterSpacing: "0.15em" }}>VS</span>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: 0 }}>
                          {awayLogo && (
                            <img src={awayLogo} width="56" height="56" alt={seriesItem.away_team} style={{ width: "56px", height: "56px", objectFit: "contain", marginBottom: "8px" }} />
                          )}
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "#fff", textAlign: "center" }}>{seriesItem.away_team}</span>
                        </div>
                      </div>

                      {isLocked ? (
                        <div style={{ textAlign: "center" }}>
                          <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: isSeriesTBD(seriesItem) ? "rgba(255,255,255,0.4)" : "#a5b4fc" }}>
                            {isSeriesTBD(seriesItem) ? "⏳ Awaiting play-in result" : "🔒 Series pick locked"}
                          </p>
                        </div>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                          <button
                            type="button"
                            onClick={() => handleSeriesPrediction(seriesItem.id, seriesItem.home_team)}
                            style={draftPick === seriesItem.home_team ? seriesPickButtonSelected : seriesPickButtonUnselected}
                          >
                            {seriesItem.home_team}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSeriesPrediction(seriesItem.id, seriesItem.away_team)}
                            style={draftPick === seriesItem.away_team ? seriesPickButtonSelected : seriesPickButtonUnselected}
                          >
                            {seriesItem.away_team}
                          </button>
                        </div>
                      )}

                      {(seriesItem.home_wins > 0 || seriesItem.away_wins > 0) && (
                        <p style={{ margin: "10px 0 0", textAlign: "center", fontSize: "11px", color: "rgba(224,231,255,0.45)" }}>
                          {seriesItem.home_team.split(" ").pop()} {seriesItem.home_wins} - {seriesItem.away_wins} {seriesItem.away_team.split(" ").pop()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              {hasSubmittableSeriesPicks && (
                <button
                  type="button"
                  onClick={handleSeriesSubmit}
                  disabled={submittingSeries}
                  style={{
                    ...submitButtonStyle,
                    background: activeTab === "series" ? "linear-gradient(135deg, #a5b4fc 0%, #6366f1 55%, #4338ca 100%)" : submitButtonStyle.background,
                    color: activeTab === "series" ? "#f8fafc" : submitButtonStyle.color,
                    boxShadow: activeTab === "series" ? "0 6px 20px rgba(99,102,241,0.35)" : submitButtonStyle.boxShadow,
                    transition: "color 300ms ease, background 300ms ease, border-color 300ms ease, box-shadow 300ms ease",
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
            </>
          )}
        </div>
      )}
      </div>

      {oracleData && (
        <button
          type="button"
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
