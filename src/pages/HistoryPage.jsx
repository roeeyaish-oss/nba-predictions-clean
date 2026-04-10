import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import SkeletonBlock from "@/components/SkeletonBlock";
import UserAvatar from "@/components/UserAvatar";
import AvatarModal from "@/components/AvatarModal";
import NBA_TEAMS from "@/lib/nbaTeams";

const historyCache = new Map();

const USER_COLUMNS = [
  { email: "roeeyaish@gmail.com", label: "Roee" },
  { email: "yuvaldagan95@gmail.com", label: "Dagan" },
  { email: "yuvalsaban9@gmail.com", label: "Saban" },
  { email: "doronnoam3@gmail.com", label: "Doron" },
];

const cardStyle = {
  border: "1px solid rgba(201,176,55,0.3)",
  background: "rgba(8,5,0,0.45)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,215,0,0.1)",
  backdropFilter: "blur(8px)",
};

function formatDateLabel(dateString) {
  if (!dateString) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(dateString)).toUpperCase();
}

function toTricode(teamName) {
  if (!teamName) return "—";
  return teamName.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "—";
}

function buildHistoryRows(items) {
  const gamesMap = new Map();

  for (const item of items) {
    const gameId = item.game_id;
    if (!gameId) continue;

    if (!gamesMap.has(gameId)) {
      gamesMap.set(gameId, {
        gameId,
        date: item.games?.date ?? "",
        createdAt: item.created_at ?? "",
        gameLabel: `${toTricode(item.games?.away_team)} vs ${toTricode(item.games?.home_team)}`,
        winner: item.games?.results?.winner ?? null,
        picks: {},
      });
    }

    const gameRow = gamesMap.get(gameId);
    const email = item.users?.email?.toLowerCase();
    if (!email) continue;

    gameRow.picks[email] = {
      pick: toTricode(item.pick),
      correct: item.pick === gameRow.winner,
      avatarUrl: item.users?.avatar_url ?? null,
      name: item.users?.display_name ?? item.users?.name ?? USER_COLUMNS.find((user) => user.email === email)?.label ?? "",
    };
  }

  return [...gamesMap.values()].sort((a, b) => {
    if (a.date !== b.date) return a.date > b.date ? -1 : 1;
    return a.createdAt > b.createdAt ? -1 : 1;
  });
}

function DateDividerRow({ label, colSpan }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        style={{
          padding: "10px 12px 8px",
          color: "#C9B037",
          fontSize: "12px",
          fontWeight: 800,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          borderTop: "2px solid rgba(201,176,55,0.4)",
          borderBottom: "1px solid rgba(201,176,55,0.16)",
          background: "rgba(201,176,55,0.08)",
        }}
      >
        {label}
      </td>
    </tr>
  );
}

const SERIES_POINTS = { 1: 5, 2: 9, 3: 14, 4: 20 };

// championship_pick stores short IDs ("BOS"); series.winner stores full names ("Boston Celtics")
const teamIdToFullName = new Map(NBA_TEAMS.map((t) => [t.id, t.name]));

function buildSeriesRows(allSeries, seriesPicksData) {
  // Build a map of seriesId → picks per user email
  const picksMap = {};
  for (const item of seriesPicksData) {
    const sid = item.series_id;
    const email = item.users?.email?.toLowerCase();
    if (!sid || !email) continue;
    if (!picksMap[sid]) picksMap[sid] = {};
    picksMap[sid][email] = {
      pick: item.pick,
      avatarUrl: item.users?.avatar_url ?? null,
      name: item.users?.display_name ?? "",
    };
  }

  return allSeries.map((s) => ({
    seriesId: s.id,
    round: s.round,
    label: `${toTricode(s.away_team)} vs ${toTricode(s.home_team)}`,
    winner: s.winner,
    status: s.status,
    pts: SERIES_POINTS[s.round] ?? 5,
    picks: picksMap[s.id] ?? {},
  }));
}

function PickCell({ value, onAvatarClick }) {
  if (!value) {
    return <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "10px" }}>—</span>;
  }

  return (
    <button
      type="button"
      onClick={onAvatarClick}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        margin: 0,
        color: value.correct ? "#4ade80" : "#f87171",
        fontWeight: 600,
        fontSize: "10px",
        cursor: onAvatarClick ? "pointer" : "default",
      }}
    >
      {value.pick}
    </button>
  );
}

export default function HistoryPage({ currentUserId, supabase }) {
  const cachedItems = historyCache.get(currentUserId) ?? [];
  const hadCache = useRef(cachedItems.length > 0).current;
  const [items, setItems] = useState(cachedItems);
  const [seriesRows, setSeriesRows] = useState([]);
  const [champRow, setChampRow] = useState(null);
  const [ready, setReady] = useState(hadCache);
  const [animate, setAnimate] = useState(false);
  const [error, setError] = useState(false);
  const [modalTarget, setModalTarget] = useState(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        const [predsRes, seriesPicksRes, champRes, allSeriesRes] = await Promise.all([
          supabase
            .from("predictions")
            .select("game_id, pick, created_at, users!inner(email, name, display_name, avatar_url), games!inner(away_team, home_team, date, results!inner(winner))")
            .not("games.results.winner", "is", null),
          supabase
            .from("series_predictions")
            .select("series_id, pick, user_id, users!inner(email, display_name, avatar_url)"),
          supabase
            .from("users")
            .select("email, display_name, avatar_url, championship_pick")
            .in("email", USER_COLUMNS.map((u) => u.email)),
          supabase
            .from("series")
            .select("id, round, home_team, away_team, winner, status")
            .order("round", { ascending: true }),
        ]);

        if (predsRes.error) throw predsRes.error;

        const nextItems = predsRes.data || [];
        historyCache.set(currentUserId, nextItems);
        setItems(nextItems);

        // Series rows
        const allSeries = allSeriesRes.data || [];
        const seriesPicks = seriesPicksRes.data || [];
        setSeriesRows(buildSeriesRows(allSeries, seriesPicks));

        // Championship row
        const champUsers = champRes.data || [];
        const actualChampion = allSeries.find((s) => s.round === 4 && s.winner)?.winner ?? null;
        const champPicks = {};
        for (const u of champUsers) {
          const email = u.email?.toLowerCase();
          if (email) {
            champPicks[email] = {
              pick: u.championship_pick ?? null,
              avatarUrl: u.avatar_url ?? null,
              name: u.display_name ?? "",
            };
          }
        }
        setChampRow({ actualChampion, picks: champPicks });

        setError(false);
      } catch (err) {
        console.error("Failed to load all prediction history:", err);
        setError(true);
      } finally {
        if (!hadCache) setAnimate(true);
        setReady(true);
      }
    }

    loadHistory();
  }, [supabase, hadCache, currentUserId]);

  const rows = useMemo(() => buildHistoryRows(items), [items]);

  if (!ready) {
    return (
      <div className="space-y-6">
        <section className="rounded-4 border border-[#C9B037]/35 bg-black/45 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,215,0,0.1)] backdrop-blur-[8px] sm:p-7">
          <SkeletonBlock style={{ width: "60px", height: "10px", marginBottom: "10px" }} />
          <SkeletonBlock style={{ width: "220px", height: "36px", marginBottom: "14px" }} />
          <SkeletonBlock style={{ width: "260px", height: "14px" }} />
        </section>
        <Card style={cardStyle}>
          <CardContent className="p-0">
            {[0, 1, 2, 3, 4].map((index) => (
              <SkeletonBlock key={`history-table-skeleton-${index}`} style={{ height: "52px", borderRadius: 0 }} />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <p style={{ textAlign: "center", color: "#C9B037", marginTop: "48px" }}>
        Failed to load history. Please refresh.
      </p>
    );
  }

  return (
    <>
      {modalTarget && (
        <AvatarModal avatarUrl={modalTarget.avatarUrl} name={modalTarget.name} onClose={() => setModalTarget(null)} />
      )}
      <div
        className="space-y-6"
        style={animate ? { animation: "fadeIn 250ms ease both" } : undefined}
      >
        <section className="rounded-4 border border-[#C9B037]/35 bg-black/45 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,215,0,0.1)] backdrop-blur-[8px] sm:p-7">
          <p className="mb-2 text-[11px] uppercase tracking-[0.35em] text-[#C9B037]/85">History</p>
          <h1 className="text-3xl font-800 text-white sm:text-5xl">All Predictions</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60 sm:text-base">
            Completed-game picks across every user in the pool.
          </p>
        </section>

        {rows.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-white/65">
              No history available yet.
            </CardContent>
          </Card>
        ) : (
          <Card style={cardStyle}>
            <CardContent className="p-0">
              <div style={{ width: "100%" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <colgroup>
                    <col style={{ width: "32%" }} />
                    <col style={{ width: "17%" }} />
                    <col style={{ width: "17%" }} />
                    <col style={{ width: "17%" }} />
                    <col style={{ width: "17%" }} />
                  </colgroup>
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                      <th style={{ padding: "10px 8px", textAlign: "left", color: "rgba(255,255,255,0.45)", fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        Game
                      </th>
                      {USER_COLUMNS.map((user) => {
                        const firstMatch = rows.find((row) => row.picks[user.email]);
                        const profile = firstMatch?.picks[user.email];
                        return (
                          <th key={user.email} style={{ padding: "8px 4px", textAlign: "center" }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                              <UserAvatar
                                avatarUrl={profile?.avatarUrl ?? null}
                                name={profile?.name ?? user.label}
                                size={16}
                                textSize={9}
                                border="1px solid rgba(201,176,55,0.8)"
                                onClick={profile ? () => setModalTarget({ avatarUrl: profile.avatarUrl, name: profile.name }) : undefined}
                              />
                              <span style={{ color: "#fff", fontSize: "10px", fontWeight: 600, lineHeight: 1 }}>{user.label}</span>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => {
                      const prevDate = index > 0 ? rows[index - 1].date : null;
                      const isNewDate = row.date !== prevDate;
                      const striped = index % 2 === 1;

                      return (
                        <React.Fragment key={row.gameId}>
                          {isNewDate && <DateDividerRow label={formatDateLabel(row.date)} colSpan={USER_COLUMNS.length + 1} />}
                          <tr style={{ background: striped ? "rgba(255,255,255,0.02)" : "transparent" }}>
                            <td style={{ padding: "10px 8px", color: "#fff", fontWeight: 600, fontSize: "11px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                              {row.gameLabel}
                            </td>
                            {USER_COLUMNS.map((user) => (
                              <td key={user.email} style={{ padding: "10px 4px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                <PickCell
                                  value={row.picks[user.email]}
                                  onAvatarClick={
                                    row.picks[user.email]
                                      ? () => setModalTarget({
                                          avatarUrl: row.picks[user.email].avatarUrl,
                                          name: row.picks[user.email].name,
                                        })
                                      : undefined
                                  }
                                />
                              </td>
                            ))}
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Series Picks section — only shown once playoff series exist ── */}
        {seriesRows.length > 0 && (
          <Card style={cardStyle}>
            <CardContent className="p-0">
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", minWidth: "360px" }}>
                  <colgroup>
                    <col style={{ width: "28%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "15%" }} />
                  </colgroup>
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                      <th style={{ padding: "10px 8px", textAlign: "left", color: "rgba(201,176,55,0.7)", fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        Series
                      </th>
                      <th style={{ padding: "10px 4px", textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: "10px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                        Pts
                      </th>
                      {USER_COLUMNS.map((user) => {
                        const firstSeriesMatch = seriesRows.find((r) => r.picks[user.email]);
                        const seriesProfile = firstSeriesMatch?.picks[user.email] ?? champRow?.picks[user.email];
                        return (
                          <th key={user.email} style={{ padding: "8px 4px", textAlign: "center" }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                              <UserAvatar
                                avatarUrl={seriesProfile?.avatarUrl ?? null}
                                name={seriesProfile?.name ?? user.label}
                                size={16}
                                textSize={9}
                                border="1px solid rgba(201,176,55,0.8)"
                                onClick={seriesProfile ? () => setModalTarget({ avatarUrl: seriesProfile.avatarUrl, name: seriesProfile.name }) : undefined}
                              />
                              <span style={{ color: "#fff", fontSize: "10px", fontWeight: 600, lineHeight: 1 }}>{user.label}</span>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {seriesRows.map((row, index) => {
                      const striped = index % 2 === 1;
                      const revealed = row.status === "completed";
                      return (
                        <tr key={row.seriesId} style={{ background: striped ? "rgba(255,255,255,0.02)" : "transparent" }}>
                          <td style={{ padding: "10px 8px", color: "#fff", fontWeight: 600, fontSize: "11px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            {row.label}
                          </td>
                          <td style={{ padding: "10px 4px", textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: "10px", fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            {row.pts}
                          </td>
                          {USER_COLUMNS.map((user) => {
                            const p = row.picks[user.email];
                            let content;
                            if (!revealed || !p) {
                              content = <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "10px" }}>—</span>;
                            } else {
                              const correct = p.pick === row.winner;
                              content = (
                                <span style={{ color: correct ? "#4ade80" : "#f87171", fontWeight: 600, fontSize: "10px" }}>
                                  {toTricode(p.pick)}
                                </span>
                              );
                            }
                            return (
                              <td key={user.email} style={{ padding: "10px 4px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                {content}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}

                    {/* Championship row */}
                    {champRow && (
                      <tr style={{ background: "rgba(201,176,55,0.05)" }}>
                        <td style={{ padding: "10px 8px", color: "#C9B037", fontWeight: 700, fontSize: "11px", borderTop: "1px solid rgba(201,176,55,0.25)" }}>
                          🏆 Champion
                        </td>
                        <td style={{ padding: "10px 4px", textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: "10px", fontWeight: 600, borderTop: "1px solid rgba(201,176,55,0.25)" }}>
                          25
                        </td>
                        {USER_COLUMNS.map((user) => {
                          const p = champRow.picks[user.email];
                          let content;
                          if (!p?.pick) {
                            content = <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "10px" }}>—</span>;
                          } else if (!champRow.actualChampion) {
                            // Champion not yet known — show pick in neutral color
                            content = <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "10px" }}>{p.pick}</span>;
                          } else {
                            // p.pick is a short ID ("BOS"); actualChampion is a full name ("Boston Celtics")
                            const correct = teamIdToFullName.get(p.pick) === champRow.actualChampion;
                            content = (
                              <span style={{ color: correct ? "#4ade80" : "#f87171", fontWeight: 600, fontSize: "10px" }}>
                                {p.pick}
                              </span>
                            );
                          }
                          return (
                            <td key={user.email} style={{ padding: "10px 4px", textAlign: "center", borderTop: "1px solid rgba(201,176,55,0.25)" }}>
                              {content}
                            </td>
                          );
                        })}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
