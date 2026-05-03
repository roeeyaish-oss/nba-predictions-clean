import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import SkeletonBlock from "@/components/SkeletonBlock";
import NBA_TEAMS from "@/lib/nbaTeams";
import { TEAM_SHORT, teamLogo } from "@/lib/playoffBracket";

// ─── Team logo lookup (by full name) ────────────────────────────────────────
const TEAM_LOGO_MAP = Object.fromEntries(NBA_TEAMS.map((t) => [t.name, t.logo]));
function getTeamLogo(name) {
  return TEAM_LOGO_MAP[name] ?? teamLogo(name);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDateShort(dateStr) {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(year, month - 1, day)
  );
}

function groupBy(arr, keyFn) {
  const map = new Map();
  for (const item of arr) {
    const k = keyFn(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  }
  return map;
}

/** Count wins per team across all games matching this series matchup.
 *  Uses series table win counts (NBA API, always authoritative) as primary source.
 *  Falls back to counting individual results rows if no series record exists. */
function seriesRecord(flatResults, team1, team2, seriesMap) {
  if (!team1 || !team2) return [0, 0];

  // Primary: use NBA API win counts from the series table
  const key = [team1, team2].sort().join("|");
  const s = seriesMap?.get(key);
  if (s) {
    return s.home_team === team1
      ? [s.home_wins, s.away_wins]
      : [s.away_wins, s.home_wins];
  }

  // Fallback: count from individual results rows
  let w1 = 0, w2 = 0;
  for (const r of flatResults) {
    const home = r.games?.home_team;
    const away = r.games?.away_team;
    const isMatchup =
      (home === team1 && away === team2) ||
      (home === team2 && away === team1);
    if (!isMatchup) continue;
    if (r.winner === team1) w1++;
    else if (r.winner === team2) w2++;
  }
  return [w1, w2];
}

function seriesWinner(flatResults, team1, team2, seriesMap) {
  if (!team1 || !team2) return null;

  // Primary: series.winner is set directly by the NBA API when a team reaches 4 wins
  const key = [team1, team2].sort().join("|");
  const s = seriesMap?.get(key);
  if (s?.winner) return s.winner;

  // Fallback: derive from win counts
  const [w1, w2] = seriesRecord(flatResults, team1, team2, seriesMap);
  if (w1 >= 4) return team1;
  if (w2 >= 4) return team2;
  return null;
}

// ─── Dynamic R1 derivation ───────────────────────────────────────────────────

/** Parse the conference and high-seed from a series ID like "2026_East_1v8". */
function parseSeriesId(id) {
  if (!id) return null;
  const parts = id.split("_");
  if (parts.length < 3) return null;
  const conf = parts[1]; // "East" or "West"
  const seeds = parts[2].split("v").map(Number);
  if (seeds.length !== 2 || isNaN(seeds[0]) || isNaN(seeds[1])) return null;
  return { conf, highSeed: seeds[0], lowSeed: seeds[1] };
}

// Standard NBA bracket top-to-bottom slot order by high seed: 1, 4, 3, 2
const R1_SLOT_ORDER = [1, 4, 3, 2];

/** Build the R1 matchup array for one conference from DB series rows.
 *  Missing slots are padded with null-team entries so later rounds still render. */
function deriveR1FromDB(seriesData, conf) {
  const r1 = (seriesData || [])
    .filter(s => s.round === 1)
    .map(s => {
      const parsed = parseSeriesId(s.id);
      if (!parsed || parsed.conf !== conf) return null;
      return {
        seed1: parsed.highSeed,
        team1: s.home_team,
        seed2: parsed.lowSeed,
        team2: s.away_team,
      };
    })
    .filter(Boolean);

  r1.sort((a, b) => R1_SLOT_ORDER.indexOf(a.seed1) - R1_SLOT_ORDER.indexOf(b.seed1));

  // Pad to 4 slots — BracketSeriesCard already handles null teams (shows "TBD")
  while (r1.length < 4) {
    r1.push({ seed1: null, team1: null, seed2: null, team2: null });
  }
  return r1;
}

/** Build full bracket state (all rounds) from results data, using series table
 *  win counts as the primary source where available. */
function computeBracketState(flatResults, seriesData) {
  // Build lookup: "TeamA|TeamB" (sorted) → series row
  const seriesMap = new Map();
  for (const s of seriesData || []) {
    if (s.home_team && s.away_team) {
      seriesMap.set([s.home_team, s.away_team].sort().join("|"), s);
    }
  }

  function buildMatchup(team1, seed1, team2, seed2) {
    const [w1, w2] = seriesRecord(flatResults, team1, team2, seriesMap);
    return { team1, seed1, team2, seed2, wins1: w1, wins2: w2 };
  }

  function buildConference(firstRound) {
    const r1 = firstRound.map((m) => buildMatchup(m.team1, m.seed1, m.team2, m.seed2));

    const r1adv = firstRound.map((m) => {
      const w = seriesWinner(flatResults, m.team1, m.team2, seriesMap);
      if (!w) return null;
      return { team: w, seed: w === m.team1 ? m.seed1 : m.seed2 };
    });

    const sf = [
      buildMatchup(r1adv[0]?.team, r1adv[0]?.seed, r1adv[1]?.team, r1adv[1]?.seed),
      buildMatchup(r1adv[2]?.team, r1adv[2]?.seed, r1adv[3]?.team, r1adv[3]?.seed),
    ];

    const sfAdv = sf.map((m) => {
      const w = seriesWinner(flatResults, m.team1, m.team2, seriesMap);
      if (!w) return null;
      return { team: w, seed: w === m.team1 ? m.seed1 : m.seed2 };
    });

    const cf = buildMatchup(sfAdv[0]?.team, sfAdv[0]?.seed, sfAdv[1]?.team, sfAdv[1]?.seed);
    const cfAdv = (() => {
      const w = seriesWinner(flatResults, cf.team1, cf.team2, seriesMap);
      if (!w) return null;
      return { team: w, seed: w === cf.team1 ? cf.seed1 : cf.seed2 };
    })();

    return { r1, sf, cf, confWinner: cfAdv };
  }

  const west = buildConference(deriveR1FromDB(seriesData, "West"));
  const east = buildConference(deriveR1FromDB(seriesData, "East"));
  const finals = buildMatchup(
    west.confWinner?.team, west.confWinner?.seed,
    east.confWinner?.team, east.confWinner?.seed
  );

  return { west, east, finals };
}

// ─── Bracket layout constants ────────────────────────────────────────────────
const B_CARD_H = 80;       // height of each series card (px)
const B_FR_W   = 148;      // First Round card width
const B_SF_W   = 135;      // Semifinals card width
const B_CF_W   = 125;      // Conf Finals card width
const B_FIN_W  = 115;      // Finals card width
const B_HEADER = 34;       // height of round-label header row

// First Round card top positions (within bracket body, not including header)
const B_FR_TOP = [0, 90, 210, 300];
// First Round card vertical centers
const B_FR_CY  = [40, 130, 250, 340];
// Bracket pair vertical centers → Semifinals card top positions
const B_SF_TOP = [45, 255];          // SF[i].top = pairCY[i] - B_CARD_H/2
// Conf Finals vertical center → card top
const B_CF_CY  = 190;
const B_CF_TOP = 150;                // = B_CF_CY - B_CARD_H/2

// Column left-edge x positions
const B_COL = {
  wFR:  0,    // West First Round
  wSF:  170,  // West Semifinals   (0   + 148 + 22 gap)
  wCF:  325,  // West Conf Finals  (170 + 135 + 20 gap)
  fin:  468,  // NBA Finals        (325 + 125 + 18 gap)
  eCF:  601,  // East Conf Finals  (468 + 115 + 18 gap)
  eSF:  746,  // East Semifinals   (601 + 125 + 20 gap)
  eFR:  903,  // East First Round  (746 + 135 + 22 gap)
};
const B_TOTAL_W = 1051;  // 903 + 148
const B_BODY_H  = 390;   // FR_TOP[3] + B_CARD_H + 10 padding

// Pre-computed SVG connector path (all bracket lines, y=0 at top of bracket body)
// Each line connects center of card right/left edge to the connector midpoint,
// then to the paired card, creating the classic bracket brace shape.
const SVG_CONNECTORS =
  // West FR → SF, pair A (FR[0] cy=40, FR[1] cy=130, mid=85)
  "M 148 40 H 159 V 130 M 148 130 H 159 M 159 85 H 170 " +
  // West FR → SF, pair B (FR[2] cy=250, FR[3] cy=340, mid=295)
  "M 148 250 H 159 V 340 M 148 340 H 159 M 159 295 H 170 " +
  // West SF → CF (SF[0] cy=85, SF[1] cy=295, mid=190)
  "M 305 85 H 315 V 295 M 305 295 H 315 M 315 190 H 325 " +
  // West CF → Finals
  "M 450 190 H 468 " +
  // Finals → East CF
  "M 583 190 H 601 " +
  // East CF → SF (SF[0] cy=85, SF[1] cy=295, mid=190)
  "M 746 85 H 736 V 295 M 746 295 H 736 M 736 190 H 726 " +
  // East SF → FR, pair A (FR[0] cy=40, FR[1] cy=130, mid=85)
  "M 903 40 H 892 V 130 M 903 130 H 892 M 892 85 H 881 " +
  // East SF → FR, pair B (FR[2] cy=250, FR[3] cy=340, mid=295)
  "M 903 250 H 892 V 340 M 903 340 H 892 M 892 295 H 881";

// ─── Bracket Series Card ─────────────────────────────────────────────────────

function BracketSeriesCard({ matchup, left, top, width }) {
  const { team1, seed1, team2, seed2, wins1, wins2 } = matchup;
  const done    = wins1 >= 4 || wins2 >= 4;
  const isW1Win = done && wins1 >= 4;
  const isW2Win = done && wins2 >= 4;

  function shortOf(t) {
    return t ? (TEAM_SHORT[t] ?? t.split(" ").pop()) : "";
  }

  let statusText = "";
  if (wins1 >= 4)            statusText = `${shortOf(team1)} WINS`;
  else if (wins2 >= 4)       statusText = `${shortOf(team2)} WINS`;
  else if (wins1 + wins2 > 0) {
    if (wins1 === wins2)     statusText = `TIED ${wins1}-${wins2}`;
    else {
      const lead = wins1 > wins2 ? team1 : team2;
      statusText = `${shortOf(lead)} ${Math.max(wins1, wins2)}-${Math.min(wins1, wins2)}`;
    }
  }

  function TeamRow({ team, seed, wins, isWinner }) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "0 8px", height: 33, flexShrink: 0,
        background: isWinner ? "rgba(201,176,55,0.12)" : "transparent",
      }}>
        <span style={{
          fontSize: 9, fontWeight: 700, minWidth: 12,
          textAlign: "center", color: "rgba(201,176,55,0.55)",
        }}>
          {seed ?? ""}
        </span>
        {teamLogo(team) ? (
          <img
            src={teamLogo(team)}
            alt={team}
            style={{ width: 20, height: 20, objectFit: "contain", flexShrink: 0 }}
            loading="lazy"
          />
        ) : (
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />
        )}
        <span style={{
          flex: 1, fontSize: 11,
          color: isWinner ? "#C9B037" : (team && team !== "TBD") ? "#fff" : "rgba(255,255,255,0.3)",
          fontWeight: isWinner ? 700 : 500,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {team ? shortOf(team) : "TBD"}
        </span>
        <span style={{
          fontSize: 13, fontWeight: 700, minWidth: 14, textAlign: "right",
          color: isWinner ? "#C9B037" : "rgba(255,255,255,0.4)",
        }}>
          {team ? wins : ""}
        </span>
      </div>
    );
  }

  return (
    <div style={{
      position: "absolute", left, top, width, height: B_CARD_H,
      background: "rgba(6,3,0,0.82)",
      border: `1.5px solid ${done ? "rgba(201,176,55,0.75)" : "rgba(201,176,55,0.32)"}`,
      borderRadius: 8, overflow: "hidden",
      display: "flex", flexDirection: "column",
    }}>
      <TeamRow team={team1} seed={seed1} wins={wins1} isWinner={isW1Win} />
      <div style={{ height: 1, background: "rgba(201,176,55,0.12)", flexShrink: 0 }} />
      <TeamRow team={team2} seed={seed2} wins={wins2} isWinner={isW2Win} />
      <div style={{
        height: 13, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "0 6px", background: "rgba(0,0,0,0.28)",
      }}>
        {statusText && (
          <span style={{
            fontSize: 9, fontWeight: 700,
            color: done ? "#C9B037" : "rgba(255,255,255,0.38)",
            letterSpacing: "0.04em",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {statusText}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Bracket Tree ─────────────────────────────────────────────────────────────

function BracketTree({ flatResults, seriesData }) {
  const state = computeBracketState(flatResults, seriesData);

  const colHeaders = [
    { label: "First Round", sub: "WEST", cx: B_COL.wFR + B_FR_W / 2 },
    { label: "Semifinals",  sub: null,   cx: B_COL.wSF + B_SF_W / 2 },
    { label: "Conf. Finals",sub: null,   cx: B_COL.wCF + B_CF_W / 2 },
    { label: "NBA Finals",  sub: null,   cx: B_COL.fin + B_FIN_W / 2 },
    { label: "Conf. Finals",sub: null,   cx: B_COL.eCF + B_CF_W / 2 },
    { label: "Semifinals",  sub: null,   cx: B_COL.eSF + B_SF_W / 2 },
    { label: "First Round", sub: "EAST", cx: B_COL.eFR + B_FR_W / 2 },
  ];

  return (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <div style={{
        position: "relative",
        width: B_TOTAL_W,
        height: B_HEADER + B_BODY_H,
        margin: "0 auto",
      }}>

        {/* Column header labels */}
        {colHeaders.map((h, i) => (
          <div key={i} style={{
            position: "absolute", top: 0, left: h.cx,
            transform: "translateX(-50%)",
            textAlign: "center", height: B_HEADER,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 2,
          }}>
            {h.sub && (
              <span style={{
                fontSize: 8, fontWeight: 700, letterSpacing: "0.22em",
                color: "rgba(201,176,55,0.6)", textTransform: "uppercase", lineHeight: 1,
              }}>
                {h.sub}
              </span>
            )}
            <span style={{
              fontSize: 9, fontWeight: 600, letterSpacing: "0.08em",
              color: "rgba(255,255,255,0.35)", textTransform: "uppercase", lineHeight: 1,
              whiteSpace: "nowrap",
            }}>
              {h.label}
            </span>
          </div>
        ))}

        {/* SVG connector lines */}
        <svg
          style={{ position: "absolute", top: B_HEADER, left: 0, pointerEvents: "none", overflow: "visible" }}
          width={B_TOTAL_W}
          height={B_BODY_H}
        >
          <path
            d={SVG_CONNECTORS}
            fill="none"
            stroke="rgba(201,176,55,0.3)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>

        {/* West — First Round */}
        {state.west.r1.map((m, i) => (
          <BracketSeriesCard
            key={`w-r1-${i}`}
            matchup={m}
            left={B_COL.wFR}
            top={B_HEADER + B_FR_TOP[i]}
            width={B_FR_W}
          />
        ))}

        {/* West — Semifinals */}
        {state.west.sf.map((m, i) => (
          <BracketSeriesCard
            key={`w-sf-${i}`}
            matchup={m}
            left={B_COL.wSF}
            top={B_HEADER + B_SF_TOP[i]}
            width={B_SF_W}
          />
        ))}

        {/* West — Conference Finals */}
        <BracketSeriesCard
          matchup={state.west.cf}
          left={B_COL.wCF}
          top={B_HEADER + B_CF_TOP}
          width={B_CF_W}
        />

        {/* NBA Finals */}
        <BracketSeriesCard
          matchup={state.finals}
          left={B_COL.fin}
          top={B_HEADER + B_CF_TOP}
          width={B_FIN_W}
        />

        {/* East — Conference Finals */}
        <BracketSeriesCard
          matchup={state.east.cf}
          left={B_COL.eCF}
          top={B_HEADER + B_CF_TOP}
          width={B_CF_W}
        />

        {/* East — Semifinals */}
        {state.east.sf.map((m, i) => (
          <BracketSeriesCard
            key={`e-sf-${i}`}
            matchup={m}
            left={B_COL.eSF}
            top={B_HEADER + B_SF_TOP[i]}
            width={B_SF_W}
          />
        ))}

        {/* East — First Round */}
        {state.east.r1.map((m, i) => (
          <BracketSeriesCard
            key={`e-r1-${i}`}
            matchup={m}
            left={B_COL.eFR}
            top={B_HEADER + B_FR_TOP[i]}
            width={B_FR_W}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Results Table ─────────────────────────────────────────────────────────────

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

  const sorted = [...flatResults].sort((a, b) => {
    const da = a.games?.date ?? "", db = b.games?.date ?? "";
    if (da !== db) return da > db ? -1 : 1;
    const ta = a.games?.game_time ?? "", tb = b.games?.game_time ?? "";
    return ta > tb ? -1 : 1;
  });

  const byDate = groupBy(sorted, (r) => r.games?.date ?? "");

  const thStyle = {
    padding: "8px 10px", fontSize: 10,
    textTransform: "uppercase", letterSpacing: "0.13em",
    color: "rgba(201,176,55,0.55)", fontWeight: 700,
    textAlign: "left",
    borderBottom: "1px solid rgba(201,176,55,0.14)",
    whiteSpace: "nowrap",
  };

  const tdStyle = {
    padding: "9px 10px", fontSize: 13, color: "#fff",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    verticalAlign: "middle",
  };

  function TeamCell({ name }) {
    const logo = getTeamLogo(name);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap" }}>
        {logo && (
          <img src={logo} alt={name} style={{ width: 22, height: 22, objectFit: "contain", flexShrink: 0 }} loading="lazy" />
        )}
        <span>{name ?? "—"}</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {[...byDate.entries()].map(([date, rows]) => (
        <div key={date}>
          <p style={{
            margin: "0 0 8px", fontSize: 11, textTransform: "uppercase",
            letterSpacing: "0.18em", color: "rgba(201,176,55,0.7)", fontWeight: 600,
          }}>
            {formatDateShort(date)}
          </p>
          <Card>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 580 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Home</th>
                    <th style={{ ...thStyle, textAlign: "center" }}>Score</th>
                    <th style={thStyle}>Away</th>
                    <th style={{ ...thStyle, color: "#C9B037" }}>Winner</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td style={{ ...tdStyle, color: "rgba(255,255,255,0.45)", whiteSpace: "nowrap", fontSize: 12 }}>
                        {formatDateShort(r.games?.date)}
                      </td>
                      <td style={tdStyle}>
                        <TeamCell name={r.games?.home_team} />
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700, whiteSpace: "nowrap", letterSpacing: "0.04em" }}>
                        {r.home_score != null && r.away_score != null
                          ? `${r.home_score} - ${r.away_score}`
                          : "—"}
                      </td>
                      <td style={tdStyle}>
                        <TeamCell name={r.games?.away_team} />
                      </td>
                      <td style={{ ...tdStyle, color: "#C9B037", fontWeight: 700 }}>
                        <TeamCell name={r.winner} />
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

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ResultsPage({ supabase }) {
  const hadCache = useRef(false);
  const [flatResults, setFlatResults] = useState([]);
  const [seriesData, setSeriesData] = useState([]);
  const [ready, setReady] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [resultsRes, seriesRes] = await Promise.all([
          supabase
            .from("results")
            .select("winner, home_score, away_score, games(home_team, away_team, date, game_time)"),
          supabase
            .from("series")
            .select("id, round, home_team, away_team, home_wins, away_wins, winner"),
        ]);

        if (resultsRes.error) throw resultsRes.error;
        if (seriesRes.error) throw seriesRes.error;
        setFlatResults(resultsRes.data || []);
        setSeriesData(seriesRes.data || []);
        setError(false);
      } catch (err) {
        console.error("Failed to load results:", err);
        setError(true);
      } finally {
        if (!hadCache.current) setAnimate(true);
        setReady(true);
      }
    }
    load();
  }, [supabase]);

  if (!ready) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <section className="rounded-4 border border-[#C9B037]/35 bg-black/45 p-5 backdrop-blur-[8px]">
          <SkeletonBlock style={{ width: 60, height: 10, marginBottom: 10 }} />
          <SkeletonBlock style={{ width: 180, height: 36, marginBottom: 14 }} />
          <SkeletonBlock style={{ width: 240, height: 14 }} />
        </section>
        <SkeletonBlock style={{ height: B_HEADER + B_BODY_H, borderRadius: 12 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[0, 1, 2, 3].map((i) => (
            <SkeletonBlock key={i} style={{ height: 48, borderRadius: 8 }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <p style={{ textAlign: "center", color: "#C9B037", marginTop: "48px" }}>
        Failed to load results. Please refresh.
      </p>
    );
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 24,
      ...(animate ? { animation: "fadeIn 250ms ease both" } : {}),
    }}>
      {/* Header */}
      <section className="rounded-4 border border-[#C9B037]/35 bg-black/45 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,215,0,0.1)] backdrop-blur-[8px] sm:p-7">
        <p className="mb-2 text-[11px] uppercase tracking-[0.35em] text-[#C9B037]/85">2025-26 Playoffs</p>
        <h1 className="text-3xl font-800 text-white sm:text-5xl">Results</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60 sm:text-base">
          Bracket standings and completed game results.
        </p>
      </section>

      {/* Playoff bracket tree */}
      <div style={{
        background: "rgba(8,5,0,0.55)",
        border: "1.5px solid rgba(201,176,55,0.3)",
        borderRadius: 16,
        padding: "16px 12px",
      }}>
        <BracketTree flatResults={flatResults} seriesData={seriesData} />
      </div>

      {/* Game results table */}
      <div>
        <p style={{
          margin: "0 0 12px", fontSize: 9, textTransform: "uppercase",
          letterSpacing: "0.2em", color: "rgba(201,176,55,0.7)", fontWeight: 600,
        }}>
          Game Results
        </p>
        <ResultsTable flatResults={flatResults} />
      </div>
    </div>
  );
}
