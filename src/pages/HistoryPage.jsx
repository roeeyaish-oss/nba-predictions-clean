import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import SkeletonBlock from "@/components/SkeletonBlock";
import UserAvatar from "@/components/UserAvatar";
import AvatarModal from "@/components/AvatarModal";

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
  const [ready, setReady] = useState(hadCache);
  const [animate, setAnimate] = useState(false);
  const [error, setError] = useState(false);
  const [modalTarget, setModalTarget] = useState(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        const { data, error } = await supabase
          .from("predictions")
          .select("game_id, pick, created_at, users!inner(email, name, display_name, avatar_url), games!inner(away_team, home_team, date, results!inner(winner))")
          .not("games.results.winner", "is", null);

        if (error) throw error;
        const nextItems = data || [];
        historyCache.set(currentUserId, nextItems);
        setItems(nextItems);
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
      </div>
    </>
  );
}
