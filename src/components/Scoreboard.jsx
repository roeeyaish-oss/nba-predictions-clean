import React, { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

export default function Scoreboard() {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("scores")
      .select("score, users(name)")
      .then(({ data, error }) => {
        if (error) throw error;

        const formatted = (data || []).map((row) => ({
          user: row.users?.name ?? "",
          score: row.score,
        }));

        setScores([...formatted].sort((a, b) => b.score - a.score));
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load scores:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="text-center text-sm text-white/60">Loading scores...</div>;
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
              <tr key={`${row.user}-${index}`} className="border-b border-white/6 last:border-b-0 hover:bg-white/4">
                <td className="px-3 py-4 font-700 text-[#C9B037]">{String(index + 1).padStart(2, "0")}</td>
                <td className="px-3 py-4 font-600 text-white">{row.user}</td>
                <td className="px-3 py-4 text-right font-700 text-white">{row.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
