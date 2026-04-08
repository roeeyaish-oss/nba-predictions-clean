import React, { useEffect, useRef, useState } from "react";
import { Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import SkeletonBlock from "@/components/SkeletonBlock";
import UserAvatar from "@/components/UserAvatar";
import { supabase } from "@/lib/supabase";
import useLeaderboard from "@/hooks/useLeaderboard";

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
  const prevRanks = useRef((() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentRanks));
    } catch {
      // ignore
    }
  }, [scores]);

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
              <h2 className="text-2xl font-800 text-white">Leaderboard</h2>
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
                        <UserAvatar avatarUrl={row.avatarUrl} name={row.user} size={32} textSize={12} />
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
                  <td className="px-3 py-4 text-right font-700 text-white">{row.score}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
