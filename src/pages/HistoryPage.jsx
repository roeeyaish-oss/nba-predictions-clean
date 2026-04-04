import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import SkeletonBlock from "@/components/SkeletonBlock";
import UserAvatar from "@/components/UserAvatar";

function formatDate(dateString) {
  if (!dateString) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateString));
}

let historyCache = [];

export default function HistoryPage({ currentUserId, supabase }) {
  const [items, setItems] = useState(historyCache);
  const [loading, setLoading] = useState(historyCache.length === 0);
  const hadCachedItems = useRef(historyCache.length > 0).current;
  const [contentReady, setContentReady] = useState(hadCachedItems);
  const [shouldAnimateCards, setShouldAnimateCards] = useState(false);

  useEffect(() => {
    async function loadHistory() {
      try {
        const { data, error } = await supabase
          .from("predictions")
          .select("user_id, pick, created_at, users(name, display_name, avatar_url), games(home_team, away_team, date, game_time)")
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) throw error;
        historyCache = data || [];
        setItems(historyCache);
      } catch (err) {
        console.error("Failed to load all prediction history:", err);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [supabase]);

  useLayoutEffect(() => {
    if (!contentReady && !loading) {
      setContentReady(true);
      setShouldAnimateCards(!hadCachedItems && items.length > 0);
    }
  }, [contentReady, hadCachedItems, items.length, loading]);

  function renderHistorySkeleton(index) {
    return (
      <Card key={`history-skeleton-${index}`}>
        <CardContent className="space-y-3 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <SkeletonBlock style={{ width: "36px", height: "36px", borderRadius: "50%" }} />
              <div>
                <SkeletonBlock style={{ width: "84px", height: "12px", marginBottom: "12px" }} />
                <SkeletonBlock style={{ width: "150px", height: "18px", marginBottom: "10px" }} />
                <SkeletonBlock style={{ width: "120px", height: "14px" }} />
              </div>
            </div>
            <SkeletonBlock style={{ width: "56px", height: "28px", borderRadius: "999px" }} />
          </div>
          <SkeletonBlock style={{ width: "56px", height: "12px" }} />
          <SkeletonBlock style={{ width: "140px", height: "18px" }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-4 border border-[#C9B037]/35 bg-black/45 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,215,0,0.1)] backdrop-blur-[8px] sm:p-7">
        <p className="mb-2 text-[11px] uppercase tracking-[0.35em] text-[#C9B037]/85">History</p>
        <h1 className="text-3xl font-800 text-white sm:text-5xl">All Predictions</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60 sm:text-base">
          Recent picks across every user in the pool.
        </p>
      </section>

      {!contentReady ? (
        <div className="grid gap-4">
          {[0, 1, 2].map(renderHistorySkeleton)}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-white/65">
            No history available yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {items.map((item, index) => (
            <Card
              key={`${item.created_at}-${index}`}
              style={{
                ...(shouldAnimateCards
                  ? {
                      animationDelay: `${Math.min(index * 60, 300)}ms`,
                      animation: "cardEnter 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94) both",
                    }
                  : {}),
              }}
            >
              <CardContent className="space-y-3 p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <UserAvatar
                      avatarUrl={item.users?.avatar_url ?? null}
                      name={item.users?.display_name || item.users?.name || "Unknown User"}
                      size={36}
                      textSize={14}
                    />
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-[#C9B037]/80">{formatDate(item.games?.date)}</p>
                      <h2 className="mt-2 text-base font-700 text-white">
                        {item.users?.display_name || item.users?.name || "Unknown User"}
                        {item.user_id === currentUserId ? " · You" : ""}
                      </h2>
                      <p className="mt-1 text-sm text-white/55">
                        {item.games?.away_team} at {item.games?.home_team}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full border border-[#C9B037]/35 px-3 py-1 text-xs font-700 text-[#C9B037]">
                    {item.games?.game_time || "--:--"}
                  </span>
                </div>
                <div className="rounded-3 bg-white/4 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/40">Pick</p>
                  <p className="mt-2 text-base font-700 text-white">{item.pick}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
