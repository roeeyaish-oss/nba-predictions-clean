import React, { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { isGameStarted } from "@/lib/time";

export default function DailyPredictions({ currentUserId }) {
  const [predictions, setPredictions] = useState([]);

  useEffect(() => {
    const fetchPredictions = () => {
      fetch("/api/dailyPredictions")
        .then((res) => res.json())
        .then((data) => setPredictions(data))
        .catch((err) => console.error("Failed to fetch predictions", err));
    };

    fetchPredictions();
    const interval = setInterval(fetchPredictions, 30000);

    return () => clearInterval(interval);
  }, []);

  const users = [...new Map(predictions.map((prediction) => [prediction.user_id, prediction.user])).entries()];

  const grouped = users.map(([userId, userName]) => {
    const userPreds = predictions.filter((prediction) => prediction.user_id === userId);
    return {
      user: userName,
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
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[#C9B037]/75">Today</p>
            <h2 className="text-2xl font-800 text-white">Predictions Board</h2>
          </div>
        </div>

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
                  No predictions yet
                </td>
              </tr>
            ) : (
              grouped.map((row, idx) => (
                <tr
                  key={`${row.userId}-${idx}`}
                  className="border-b border-white/6 last:border-b-0 hover:bg-white/4"
                >
                  <td className="p-3 font-600 text-white">{row.user}</td>
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
      </CardContent>
    </Card>
  );
}
