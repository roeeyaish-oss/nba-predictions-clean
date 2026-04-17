import { useCallback, useEffect, useState } from "react";

export default function usePlayoffSeries(supabase, userId) {
  const [series, setSeries] = useState([]);
  const [userPicks, setUserPicks] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchSeries = useCallback(async () => {
    if (!userId) {
      setSeries([]);
      setUserPicks({});
      setLoading(false);
      return { series: [], userPicks: {} };
    }

    try {
      setLoading(true);

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

      const nextSeries = seriesRes.data || [];

      setSeries(nextSeries);

      const activeSeriesIds = new Set(nextSeries.map((item) => item.id));
      const picksMap = {};

      for (const pickRow of picksRes.data || []) {
        if (!activeSeriesIds.has(pickRow.series_id) || !pickRow.pick) continue;
        picksMap[pickRow.series_id] = pickRow.pick;
      }

      setUserPicks(picksMap);

      return { series: nextSeries, userPicks: picksMap };
    } catch (err) {
      console.error("Failed to load playoff series:", err);
      setSeries([]);
      setUserPicks({});
      return { series: [], userPicks: {} };
    } finally {
      setLoading(false);
    }
  }, [supabase, userId]);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);

  return { series, userPicks, loading, refresh: fetchSeries };
}
