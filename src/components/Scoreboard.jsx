import React, { useLayoutEffect, useRef, useState } from "react";
import { Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import SkeletonBlock from "@/components/SkeletonBlock";
import UserAvatar from "@/components/UserAvatar";
import { supabase } from "@/lib/supabase";
import useLeaderboard from "@/hooks/useLeaderboard";

export default function Scoreboard() {
  const { scores, loading } = useLeaderboard(supabase);
  const hadCachedScores = useRef(scores.length > 0).current;
  const [contentReady, setContentReady] = useState(hadCachedScores);
  const [shouldAnimateRows, setShouldAnimateRows] = useState(false);

  useLayoutEffect(() => {
    if (!contentReady && !loading) {
      setContentReady(true);
      setShouldAnimateRows(!hadCachedScores && scores.length > 0);
    }
  }, [contentReady, hadCachedScores, loading, scores.length]);

  if (!contentReady) {
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
        <table className="w-full border-collapse text-left text-sm text-white sm:text-base">
          <thead>
            <tr className="border-b border-[#C9B037]/18 text-white/55">
              <th className="px-3 py-3">#</th>
              <th className="px-3 py-3">User</th>
              <th className="px-3 py-3 text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((row, index) => (
              <tr
                key={`${row.user}-${index}`}
                className="border-b border-white/6 last:border-b-0 hover:bg-white/4"
                style={{
                  ...(shouldAnimateRows
                    ? {
                        animationDelay: `${Math.min(index * 60, 300)}ms`,
                        animation: "cardEnter 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94) both",
                      }
                    : {}),
                }}
              >
                <td className="px-3 py-4 font-700 text-[#C9B037]">{String(index + 1).padStart(2, "0")}</td>
                <td className="px-3 py-4 font-600 text-white">
                  <div className="flex items-center gap-3">
                    <UserAvatar avatarUrl={row.avatarUrl} name={row.user} size={32} textSize={12} />
                    <span>{row.user}</span>
                  </div>
                </td>
                <td className="px-3 py-4 text-right font-700 text-white">{row.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
