import React, { useEffect, useRef, useState } from "react";
import { Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import SkeletonBlock from "@/components/SkeletonBlock";
import UserAvatar from "@/components/UserAvatar";
import AvatarModal from "@/components/AvatarModal";
import { supabase } from "@/lib/supabase";
import useLeaderboard from "@/hooks/useLeaderboard";
import { lsGet, lsSet } from "@/lib/storage";

const STORAGE_KEY = "leaderboard_prev_ranks";

function getRankChange(user, currentRank, prevRanks) {
  if (!prevRanks || !(user in prevRanks)) return "=";
  const prev = prevRanks[user];
  if (currentRank < prev) return "up";
  if (currentRank > prev) return "down";
  return "=";
}

export default function Scoreboard() {
  const { scores, loading } = useLeaderboard(supabase);
  const hadCache = useRef(scores.length > 0).current;
  const [ready, setReady] = useState(hadCache);
  const [animate, setAnimate] = useState(false);
  const [modalTarget, setModalTarget] = useState(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const tooltipBtnRef = useRef(null);
  const tooltipRef = useRef(null);
  const prevRanks = useRef((() => {
    const stored = lsGet(STORAGE_KEY);
    try { return stored ? JSON.parse(stored) : null; } catch { return null; }
  })()).current;
  const savedThisLoad = useRef(false);

  useEffect(() => {
    if (!ready && !loading) {
      if (!hadCache) setAnimate(true);
      setReady(true);
    }
  }, [ready, loading, hadCache]);

  useEffect(() => {
    if (scores.length === 0 || savedThisLoad.current) return;
    savedThisLoad.current = true;
    const currentRanks = Object.fromEntries(scores.map((row, i) => [row.user, i + 1]));
    lsSet(STORAGE_KEY, JSON.stringify(currentRanks));
  }, [scores]);

  useEffect(() => {
    if (!tooltipOpen) return;
    function handleClickOutside(e) {
      if (
        tooltipRef.current && !tooltipRef.current.contains(e.target) &&
        tooltipBtnRef.current && !tooltipBtnRef.current.contains(e.target)
      ) {
        setTooltipOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [tooltipOpen]);

  function openTooltip() {
    if (tooltipOpen) { setTooltipOpen(false); return; }
    const btn = tooltipBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const tooltipWidth = 260;
    const margin = 12;
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - tooltipWidth - margin));
    const approxHeight = 300;
    let top = rect.bottom + 8;
    if (top + approxHeight > window.innerHeight - margin) {
      top = rect.top - approxHeight - 8;
    }
    setTooltipPos({ top, left });
    setTooltipOpen(true);
  }

  if (!ready) {
    return (
      <Card>
        <CardContent className="p-5 sm:p-7">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-full border border-[#C9B037]/40 bg-[#C9B037]/12 p-2 text-[#C9B037]">
              <Trophy className="h-4 w-4" strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[#C9B037]/75">Rankings</p>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 className="text-2xl font-800 text-white">Leaderboard</h2>
                <button
                  ref={tooltipBtnRef}
                  onClick={openTooltip}
                  aria-label="Scoring system info"
                  style={{
                    background: "none",
                    border: "1.5px solid rgba(201,176,55,0.5)",
                    borderRadius: "50%",
                    width: "20px",
                    height: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "rgba(201,176,55,0.8)",
                    fontSize: "11px",
                    fontWeight: 700,
                    lineHeight: 1,
                    padding: 0,
                    flexShrink: 0,
                  }}
                >
                  ⓘ
                </button>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {[0, 1, 2, 3].map((index) => (
              <div key={`leaderboard-skeleton-${index}`} className="flex items-center gap-3 px-3 py-4">
                <SkeletonBlock style={{ width: "20px", height: "16px" }} />
                <SkeletonBlock style={{ width: "32px", height: "32px", borderRadius: "50%" }} />
                <SkeletonBlock style={{ flex: 1, height: "16px" }} />
                <SkeletonBlock style={{ width: "36px", height: "16px" }} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    {modalTarget && (
      <AvatarModal avatarUrl={modalTarget.avatarUrl} name={modalTarget.name} onClose={() => setModalTarget(null)} />
    )}
    {tooltipOpen && (
      <div
        ref={tooltipRef}
        style={{
          position: "fixed",
          top: tooltipPos.top,
          left: tooltipPos.left,
          width: "260px",
          background: "rgba(8,5,0,0.95)",
          border: "1.5px solid #C9B037",
          borderRadius: "12px",
          padding: "16px",
          zIndex: 9999,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
        }}
      >
        <p style={{ margin: "0 0 12px", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.2em", color: "#C9B037", fontWeight: 700 }}>
          Scoring System
        </p>
        <p style={{ margin: "0 0 6px", fontSize: "11px", fontWeight: 700, color: "rgba(201,176,55,0.85)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Game Picks</p>
        {[["Round 1", "1 pt"], ["Round 2", "2 pts"], ["Conf Finals", "3 pts"], ["NBA Finals", "4 pts"]].map(([label, pts]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "rgba(255,255,255,0.75)", marginBottom: "3px" }}>
            <span>{label}</span><span style={{ color: "#fff", fontWeight: 600 }}>{pts}</span>
          </div>
        ))}
        <p style={{ margin: "12px 0 6px", fontSize: "11px", fontWeight: 700, color: "rgba(201,176,55,0.85)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Series Winner</p>
        {[["Round 1", "5 pts"], ["Round 2", "9 pts"], ["Conf Finals", "14 pts"], ["NBA Finals", "20 pts"]].map(([label, pts]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "rgba(255,255,255,0.75)", marginBottom: "3px" }}>
            <span>{label}</span><span style={{ color: "#fff", fontWeight: 600 }}>{pts}</span>
          </div>
        ))}
        <p style={{ margin: "12px 0 6px", fontSize: "11px", fontWeight: 700, color: "rgba(201,176,55,0.85)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Championship Pick</p>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "rgba(255,255,255,0.75)" }}>
          <span>Locks April 18</span><span style={{ color: "#fff", fontWeight: 600 }}>25 pts</span>
        </div>
      </div>
    )}
    <Card style={animate ? { animation: "fadeIn 250ms ease both" } : undefined}>
      <CardContent className="p-5 sm:p-7">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-full border border-[#C9B037]/40 bg-[#C9B037]/12 p-2 text-[#C9B037]">
            <Trophy className="h-4 w-4" strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[#C9B037]/75">Rankings</p>
            <h2 className="text-2xl font-800 text-white">Leaderboard</h2>
          </div>
        </div>
        <table className="w-full border-collapse text-left text-sm text-white sm:text-base">
          <thead>
            <tr className="border-b border-[#C9B037]/18 text-white/55">
              <th className="px-3 py-3">#</th>
              <th className="px-3 py-3">User</th>
              <th className="px-3 py-3 text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((row, index) => {
              const change = getRankChange(row.user, index + 1, prevRanks);
              return (
                <tr
                  key={`${row.user}-${index}`}
                  className="border-b border-white/6 last:border-b-0 hover:bg-white/4"
                >
                  <td className="px-3 py-4 font-700 text-[#C9B037]">{String(index + 1).padStart(2, "0")}</td>
                  <td className="px-3 py-4 font-600 text-white">
                    <div className="flex items-center gap-3">
                      <div style={{ position: "relative", display: "inline-flex" }}>
                        <UserAvatar avatarUrl={row.avatarUrl} name={row.user} size={32} textSize={12} onClick={() => setModalTarget({ avatarUrl: row.avatarUrl, name: row.user })} />
                        <span style={{
                          position: "absolute",
                          bottom: "-4px",
                          right: "-6px",
                          fontSize: "10px",
                          fontWeight: 700,
                          lineHeight: 1,
                          color: change === "up" ? "#4ade80" : change === "down" ? "#f87171" : "rgba(255,255,255,0.4)",
                        }}>
                          {change === "up" ? "↑" : change === "down" ? "↓" : "="}
                        </span>
                      </div>
                      <span>{row.user}</span>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-right">
                    <span style={{ fontWeight: 700, color: "#fff", fontSize: "16px" }}>{row.score}</span>
                    <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>
                      {row.gameScore}g · {row.seriesScore}s · {row.championshipScore}c
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
    </>
  );
}
