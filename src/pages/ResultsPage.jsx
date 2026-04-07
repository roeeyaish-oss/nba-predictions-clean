import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import SkeletonBlock from "@/components/SkeletonBlock";
import { PLAYOFF_BRACKET, teamLogo } from "@/lib/playoffBracket";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDateShort(dateStr) {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(year, month - 1, day)
  );
}

/** Group an array of objects by a key-getter fn, preserving insertion order. */
function groupBy(arr, keyFn) {
  const map = new Map();
  for (const item of arr) {
    const k = keyFn(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  }
  return map;
}

/** Count wins for each team in a bracket series from the flat results array. */
function seriesRecord(flatResults, team1, team2) {
  let w1 = 0;
  let w2 = 0;
  for (const r of flatResults) {
    const home = r.games?.home_team;
    const away = r.games?.away_team;
    const winner = r.winner;
    const isMatchup =
      (home === team1 && away === team2) ||
      (home === team2 && away === team1);
    if (!isMatchup) continue;
    if (winner === team1) w1++;
    else if (winner === team2) w2++;
  }
  return [w1, w2];
}

// ─── Playoff Bracket ────────────────────────────────────────────────────────

function SeriesCard({ series, flatResults }) {
  const { seed1, team1, abbr1, seed2, team2, abbr2 } = series;
  const [w1, w2] = seriesRecord(flatResults, team1, team2);
  const done = w1 === 4 || w2 === 4;
  const leader = w1 > w2 ? team1 : w2 > w1 ? team2 : null;

  let statusText = "";
  if (w1 === 0 && w2 === 0) statusText = "";
  else if (done) statusText = `${w1 === 4 ? team1 : team2} wins`;
  else if (w1 === w2) statusText = `Tied ${w1}-${w2}`;
  else statusText = `${leader} leads ${Math.max(w1, w2)}-${Math.min(w1, w2)}`;

  const cardBase = {
    background: "rgba(8,5,0,0.65)",
    border: "1.5px solid rgba(201,176,55,0.5)",
    borderRadius: "12px",
    overflow: "hidden",
  };

  function TeamRow({ seed, team, abbr, wins, isWinner }) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 12px",
          background: isWinner ? "rgba(201,176,55,0.12)" : "transparent",
        }}
      >
        <span
          style={{
            fontSize: "10px",
            fontWeight: 700,
            color: "rgba(201,176,55,0.6)",
            minWidth: "16px",
            textAlign: "center",
          }}
        >
          {seed}
        </span>
        <img
          src={teamLogo(abbr)}
          alt={team}
          style={{ width: "28px", height: "28px", objectFit: "contain", flexShrink: 0 }}
          loading="lazy"
        />
        <span
          style={{
            flex: 1,
            fontSize: "12px",
            fontWeight: isWinner ? 700 : 500,
            color: isWinner ? "#C9B037" : "#fff",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {team}
        </span>
        <span
          style={{
            fontSize: "14px",
            fontWeight: 700,
            color: isWinner ? "#C9B037" : "rgba(255,255,255,0.5)",
            minWidth: "16px",
            textAlign: "right",
          }}
        >
          {wins}
        </span>
      </div>
    );
  }

  return (
    <div style={cardBase}>
      <TeamRow seed={seed1} team={team1} abbr={abbr1} wins={w1} isWinner={done && w1 === 4} />
      <div style={{ height: "1px", background: "rgba(201,176,55,0.15)" }} />
      <TeamRow seed={seed2} team={team2} abbr={abbr2} wins={w2} isWinner={done && w2 === 4} />
      {statusText ? (
        <div
          style={{
            padding: "5px 12px",
            background: "rgba(0,0,0,0.3)",
            borderTop: "1px solid rgba(201,176,55,0.1)",
            fontSize: "10px",
            color: done ? "#C9B037" : "rgba(255,255,255,0.45)",
            fontWeight: done ? 700 : 400,
            textAlign: "center",
            letterSpacing: "0.03em",
          }}
        >
          {statusText}
        </div>
      ) : null}
    </div>
  );
}

function PlayoffBracket({ flatResults }) {
  const conferenceStyle = {
    background: "rgba(8,5,0,0.5)",
    border: "1.5px solid rgba(201,176,55,0.4)",
    borderRadius: "16px",
    padding: "16px",
  };

  function ConferenceSection({ label, series }) {
    return (
      <div style={conferenceStyle}>
        <p
          style={{
            margin: "0 0 12px",
            fontSize: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            color: "rgba(201,176,55,0.7)",
            fontWeight: 700,
          }}
        >
          {label} · First Round
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
          {series.map((s) => (
            <SeriesCard key={s.id} series={s} flatResults={flatResults} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ overflowX: "auto" }}>
        <ConferenceSection label="East" series={PLAYOFF_BRACKET.east} />
      </div>
      <div style={{ overflowX: "auto" }}>
        <ConferenceSection label="West" series={PLAYOFF_BRACKET.west} />
      </div>
    </div>
  );
}

// ─── Results Table ───────────────────────────────────────────────────────────

function ResultsTable({ flatResults }) {
  if (flatResults.length === 0) {
    return (
      <Card>
        <CardContent style={{ padding: "32px", textAlign: "center", color: "rgba(255,255,255,0.5)" }}>
          No results yet.
        </CardContent>
      </Card>
    );
  }

  // Sort by date asc, then game_time asc
  const sorted = [...flatResults].sort((a, b) => {
    const dateA = a.games?.date ?? "";
    const dateB = b.games?.date ?? "";
    if (dateA !== dateB) return dateA < dateB ? -1 : 1;
    const timeA = a.games?.game_time ?? "";
    const timeB = b.games?.game_time ?? "";
    return timeA < timeB ? -1 : 1;
  });

  const byDate = groupBy(sorted, (r) => r.games?.date ?? "");

  const thStyle = {
    padding: "8px 12px",
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.15em",
    color: "rgba(201,176,55,0.6)",
    fontWeight: 700,
    textAlign: "left",
    borderBottom: "1px solid rgba(201,176,55,0.15)",
    background: "transparent",
  };

  const tdStyle = {
    padding: "10px 12px",
    fontSize: "13px",
    color: "#fff",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    verticalAlign: "middle",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {[...byDate.entries()].map(([date, rows]) => (
        <div key={date}>
          <p
            style={{
              margin: "0 0 8px",
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: "rgba(201,176,55,0.7)",
              fontWeight: 600,
            }}
          >
            {formatDateShort(date)}
          </p>
          <Card>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "320px" }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Matchup</th>
                    <th style={{ ...thStyle, color: "#C9B037" }}>Winner</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} style={{ transition: "background 0.15s" }}>
                      <td style={tdStyle}>
                        <span style={{ color: "rgba(255,255,255,0.6)" }}>
                          {r.games?.away_team}
                        </span>
                        <span style={{ color: "rgba(201,176,55,0.5)", margin: "0 6px", fontSize: "11px" }}>@</span>
                        <span>{r.games?.home_team}</span>
                      </td>
                      <td style={{ ...tdStyle, color: "#C9B037", fontWeight: 700 }}>
                        {r.winner}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ))}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ResultsPage({ supabase }) {
  const hadCache = useRef(false);
  const [flatResults, setFlatResults] = useState([]);
  const [ready, setReady] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from("results")
          .select("winner, games(home_team, away_team, date, game_time)");

        if (error) throw error;
        setFlatResults(data || []);
      } catch (err) {
        console.error("Failed to load results:", err);
      } finally {
        if (!hadCache.current) setAnimate(true);
        setReady(true);
      }
    }

    load();
  }, [supabase]);

  if (!ready) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <section className="rounded-4 border border-[#C9B037]/35 bg-black/45 p-5 backdrop-blur-[8px]">
          <SkeletonBlock style={{ width: "60px", height: "10px", marginBottom: "10px" }} />
          <SkeletonBlock style={{ width: "180px", height: "36px", marginBottom: "14px" }} />
          <SkeletonBlock style={{ width: "240px", height: "14px" }} />
        </section>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[0, 1, 2, 3].map((i) => (
            <SkeletonBlock key={i} style={{ height: "52px", borderRadius: "8px" }} />
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
      {/* Page header */}
      <section className="rounded-4 border border-[#C9B037]/35 bg-black/45 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,215,0,0.1)] backdrop-blur-[8px] sm:p-7">
        <p className="mb-2 text-[11px] uppercase tracking-[0.35em] text-[#C9B037]/85">2024-25 Playoffs</p>
        <h1 className="text-3xl font-800 text-white sm:text-5xl">Results</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60 sm:text-base">
          Bracket standings and completed game results.
        </p>
      </section>

      {/* Playoff bracket */}
      <PlayoffBracket flatResults={flatResults} />

      {/* Results table */}
      <div>
        <p
          style={{
            margin: "0 0 12px",
            fontSize: "9px",
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            color: "rgba(201,176,55,0.7)",
            fontWeight: 600,
          }}
        >
          Game Results
        </p>
        <ResultsTable flatResults={flatResults} />
      </div>
    </div>
  );
}
