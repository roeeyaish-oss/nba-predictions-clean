import { useCallback, useEffect, useState } from "react";

export default function usePlayoffSeries(supabase, userId) {
  const [series, setSeries] = useState([]);
  const [userPicks, setUserPicks] = useState({});  // { [series_id]: team_name }
  const [loading, setLoading] = useState(true);

  const fetchSeries = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const [seriesRes, picksRes] = await Promise.all([
        supabase
          .from("series")
          .select("id, round, home_team, away_team, home_wins, away_wins, first_game_time, status")
          .eq("status", "active")
          .order("round", { ascending: true }),
        supabase
          .from("series_predictions")
          .select("series_id, pick")
          .eq("user_id", userId),
      ]);

      if (seriesRes.error) throw seriesRes.error;
      if (picksRes.error) throw picksRes.error;

      // TEST ONLY - remove before playoffs
      const liveSeries = seriesRes.data || [];
      setSeries(
        liveSeries.length > 0
          ? liveSeries
          : [
              {
                id: "TEST_R1_S1",
                round: 1,
                home_team: "Oklahoma City Thunder",
                away_team: "Memphis Grizzlies",
                home_wins: 0,
                away_wins: 0,
                winner: null,
                status: "active",
                first_game_time: null,
              },
            ]
      );

      const picksMap = {};
      for (const p of picksRes.data || []) {
        picksMap[p.series_id] = p.pick;
      }
      setUserPicks(picksMap);
    } catch (err) {
      console.error("Failed to load playoff series:", err);
      // Leave series as [] — section simply won't render during regular season
    } finally {
      setLoading(false);
    }
  }, [supabase, userId]);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);

  return { series, userPicks, loading, refresh: fetchSeries };
}
