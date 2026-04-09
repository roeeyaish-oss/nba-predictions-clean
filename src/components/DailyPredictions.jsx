import React, { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import UserAvatar from "@/components/UserAvatar";
import { supabase } from "@/lib/supabase";
import { isGameStarted } from "@/lib/time";

export default function DailyPredictions({ currentUserId, refreshKey }) {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchPredictions = async (isInitialLoad = false) => {
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const res = await fetch("/api/dailyPredictions", { headers });
        const data = await res.json();
        setError(false);
        setPredictions(data);
      } catch (err) {
        console.error("Failed to fetch predictions", err);
        setError(true);
      } finally {
        if (isInitialLoad) {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    };

    fetchPredictions(true);

    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchPredictions(false);
      }
    }, 30000);

    function handleVisibilityChange() {
      if (!document.hidden) {
        fetchPredictions(false);
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshKey]);

  const upcoming = predictions.filter((p) => !isGameStarted(p.game_time, p.date));

  const users = [
    ...new Map(
      upcoming.map((prediction) => [
        prediction.user_id,
        {
          displayName: prediction.display_name || prediction.user || "",
          avatarUrl: prediction.avatar_url ?? null,
        },
      ])
    ).entries(),
  ];

  const grouped = users.map(([userId, userData]) => {
    const userPreds = upcoming.filter((prediction) => prediction.user_id === userId);
    return {
      user: userData.displayName,
      avatarUrl: userData.avatarUrl,
      userId,
      picks: userPreds.map((prediction) => ({
        pick: prediction.pick,
        game_time: prediction.game_time,
        date: prediction.date,
      })),
    };
  });

  return (
    <Card>
      <CardContent className="p-5 sm:p-7">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-full border border-[#C9B037]/40 bg-[#C9B037]/12 p-2 text-[#C9B037]">
            <ScrollText className="h-4 w-4" strokeWidth={2.2} />
          </div>
          <div className="flex-1">
            <p className="text-[11px] uppercase tracking-[0.3em] text-[#C9B037]/75">Today</p>
            <h2 className="text-2xl font-800 text-white">Predictions Board</h2>
          </div>
          {refreshing && (
            <p style={{ fontSize: "10px", color: "#C9B037", opacity: 0.6, margin: 0 }}>
              ↻ updating...
            </p>
          )}
        </div>

        {error ? (
          <p
            className="text-center text-sm cursor-pointer"
            style={{ color: "#C9B037" }}
            onClick={() => { setError(false); setLoading(true); }}
          >
            Failed to load predictions. Tap to retry.
          </p>
        ) : loading && predictions.length === 0 ? (
          <p className="text-center text-sm text-white/60">Loading predictions...</p>
        ) : (
          <table className="w-full border-collapse text-sm text-white sm:text-base">
            <thead>
              <tr className="border-b border-[#C9B037]/18 text-left text-white/55">
                <th className="p-3">User</th>
                <th className="p-3">Pick(s)</th>
              </tr>
            </thead>
            <tbody>
              {grouped.length === 0 ? (
                <tr>
                  <td colSpan={2} className="p-4 text-center text-white/55">
                    {predictions.length > 0 ? "No upcoming games" : "No predictions yet"}
                  </td>
                </tr>
              ) : (
                grouped.map((row, idx) => (
                  <tr
                    key={`${row.userId}-${idx}`}
                    className="border-b border-white/6 last:border-b-0 hover:bg-white/4"
                  >
                    <td className="p-3 font-600 text-white">
                      <div className="flex items-center gap-3">
                        <UserAvatar avatarUrl={row.avatarUrl} name={row.user} size={32} textSize={12} />
                        <span>{row.user}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-2">
                        {row.picks.map((pick, i) => {
                          const started = isGameStarted(pick.game_time, pick.date);
                          const isOwn = row.userId === currentUserId;
                          return (
                            <div key={i} className="rounded-3 bg-white/4 px-3 py-2 text-white">
                              {started || isOwn ? pick.pick : <span className="italic text-white/45">Hidden</span>}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
