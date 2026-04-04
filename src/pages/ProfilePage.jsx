import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import UserAvatar from "@/components/UserAvatar";

function formatDate(dateString) {
  if (!dateString) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateString));
}

export default function ProfilePage({ user, supabase, avatarUrl, displayName }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const { data, error } = await supabase
          .from("predictions")
          .select("pick, created_at, games(home_team, away_team, date, game_time)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setItems(data || []);
      } catch (err) {
        console.error("Failed to load profile history:", err);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [supabase, user.id]);

  return (
    <div className="space-y-6">
      <section className="rounded-4 border border-[#C9B037]/35 bg-black/45 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,215,0,0.1)] backdrop-blur-[8px] sm:p-7">
        <div className="mb-8 text-center">
          <div className="flex justify-center">
            <UserAvatar
              avatarUrl={avatarUrl}
              name={displayName}
              size={120}
              textSize={40}
              border="none"
              boxShadow="0 0 32px rgba(201,176,55,0.6), 0 0 8px rgba(201,176,55,0.3)"
            />
          </div>
          <h2 className="mt-5 text-2xl font-700 text-white">{displayName}</h2>
          <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-[#C9B037]">Profile</p>
        </div>
        <h1 className="text-3xl font-800 text-white sm:text-5xl">Your Picks</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60 sm:text-base">
          Full prediction history for <span className="text-[#C9B037]">{displayName}</span>.
        </p>
      </section>

      {loading ? (
        <p className="text-center text-sm text-white/60">Loading prediction history...</p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-white/65">
            No predictions submitted yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {items.map((item, index) => (
            <Card key={`${item.created_at}-${index}`}>
              <CardContent className="space-y-3 p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-[#C9B037]/80">{formatDate(item.games?.date)}</p>
                    <h2 className="mt-2 text-lg font-700 text-white">
                      {item.games?.away_team} at {item.games?.home_team}
                    </h2>
                  </div>
                  <span className="rounded-full border border-[#C9B037]/35 px-3 py-1 text-xs font-700 text-[#C9B037]">
                    {item.games?.game_time || "--:--"}
                  </span>
                </div>
                <div className="rounded-3 bg-white/4 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/40">Your pick</p>
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
