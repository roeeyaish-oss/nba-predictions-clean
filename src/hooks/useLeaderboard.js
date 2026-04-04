import { useCallback, useEffect, useState } from "react";

const LEADERBOARD_TTL_MS = 60 * 1000;

let leaderboardCache = {
  data: [],
  fetchedAt: 0,
};

function formatScores(data) {
  return [...(data || [])]
    .map((row) => ({
      user: row.users?.display_name ?? row.users?.name ?? "",
      avatarUrl: row.users?.avatar_url ?? null,
      score: row.score,
    }))
    .sort((a, b) => b.score - a.score);
}

export default function useLeaderboard(supabase) {
  const hasAnyCache = leaderboardCache.fetchedAt > 0;
  const hasFreshCache = Date.now() - leaderboardCache.fetchedAt < LEADERBOARD_TTL_MS;

  const [scores, setScores] = useState(hasAnyCache ? leaderboardCache.data : []);
  const [loading, setLoading] = useState(!hasAnyCache);

  const fetchScores = useCallback(
    async ({ background = false } = {}) => {
      if (!background) {
        setLoading(true);
      }

      try {
        const { data, error } = await supabase
          .from("scores")
          .select("score, users(name, display_name, avatar_url)");

        if (error) throw error;

        const formatted = formatScores(data);
        leaderboardCache = {
          data: formatted,
          fetchedAt: Date.now(),
        };
        setScores(formatted);
      } catch (err) {
        console.error("Failed to load scores:", err);
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  useEffect(() => {
    if (hasAnyCache) {
      setScores(leaderboardCache.data);
      setLoading(false);
    } else {
      setScores([]);
      setLoading(true);
    }

    if (!hasFreshCache) {
      fetchScores({ background: hasAnyCache });
    }
  }, [fetchScores, hasAnyCache, hasFreshCache]);

  const refresh = useCallback(() => fetchScores(), [fetchScores]);

  return { scores, loading, refresh };
}
