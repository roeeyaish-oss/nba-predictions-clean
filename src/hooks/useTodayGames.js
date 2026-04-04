import { useCallback, useEffect, useState } from "react";
import { getIsraelToday } from "@/lib/time";

const TODAY_GAMES_TTL_MS = 5 * 60 * 1000;

let gamesCache = {
  key: null,
  data: [],
  fetchedAt: 0,
};

function formatGames(data) {
  return (data || []).map((game) => ({
    gameId: game.id,
    date: game.date,
    home: game.home_team,
    away: game.away_team,
    homeImg: game.home_img,
    awayImg: game.away_img,
    gameTimeIL: game.game_time,
  }));
}

export default function useTodayGames(supabase) {
  const todayKey = getIsraelToday();
  const hasFreshCache =
    gamesCache.key === todayKey &&
    Date.now() - gamesCache.fetchedAt < TODAY_GAMES_TTL_MS;
  const hasAnyCache = gamesCache.key === todayKey;

  const [games, setGames] = useState(hasAnyCache ? gamesCache.data : []);
  const [loading, setLoading] = useState(!hasAnyCache);

  const fetchGames = useCallback(
    async ({ background = false } = {}) => {
      if (!background) {
        setLoading(true);
      }

      try {
        const { data, error } = await supabase
          .from("games")
          .select("id, date, home_team, away_team, home_img, away_img, game_time")
          .eq("date", todayKey)
          .order("game_time", { ascending: true });

        if (error) throw error;

        const formatted = formatGames(data);
        gamesCache = {
          key: todayKey,
          data: formatted,
          fetchedAt: Date.now(),
        };
        setGames(formatted);
      } catch (err) {
        console.error("Failed to load games:", err);
      } finally {
        setLoading(false);
      }
    },
    [supabase, todayKey]
  );

  useEffect(() => {
    if (hasAnyCache) {
      setGames(gamesCache.data);
      setLoading(false);
    } else {
      setGames([]);
      setLoading(true);
    }

    if (!hasFreshCache) {
      fetchGames({ background: hasAnyCache });
    }
  }, [fetchGames, hasAnyCache, hasFreshCache, todayKey]);

  const refresh = useCallback(() => fetchGames(), [fetchGames]);

  return { games, loading, refresh };
}
