import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import SkeletonBlock from "@/components/SkeletonBlock";

function formatDate(dateString) {
  if (!dateString) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateString));
}

function getInitials(name) {
  return (name || "?")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";
}

const profileHistoryCache = new Map();

export default function ProfilePage({ user, supabase, avatarUrl, displayName }) {
  const cachedItems = profileHistoryCache.get(user.id) ?? [];
  const hadCache = useRef(cachedItems.length > 0).current;
  const [items, setItems] = useState(cachedItems);
  const [predictionsLoaded, setPredictionsLoaded] = useState(hadCache);
  const [avatarLoaded, setAvatarLoaded] = useState(!avatarUrl);
  const ready = predictionsLoaded && avatarLoaded;
  const [animate, setAnimate] = useState(false);
  const imgRef = useRef(null);

  // Fallback for already-cached images: onLoad won't fire if complete is already true
  useEffect(() => {
    if (imgRef.current?.complete) setAvatarLoaded(true);
  }, []);

  useEffect(() => {
    async function loadHistory() {
      try {
        const { data, error } = await supabase
          .from("predictions")
          .select("pick, created_at, games(home_team, away_team, date, game_time)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        const nextItems = data || [];
        profileHistoryCache.set(user.id, nextItems);
        setItems(nextItems);
      } catch (err) {
        console.error("Failed to load profile history:", err);
      } finally {
        setPredictionsLoaded(true);
      }
    }

    loadHistory();
  }, [supabase, user.id, hadCache]);

  useEffect(() => {
    if (ready && !hadCache) setAnimate(true);
  }, [ready, hadCache]);

  // Always render the avatar img hidden so it loads in the background
  // regardless of whether the skeleton or real content is showing.
  const hiddenAvatar = avatarUrl ? (
    <img
      ref={imgRef}
      src={avatarUrl}
      alt=""
      aria-hidden="true"
      onLoad={() => setAvatarLoaded(true)}
      onError={() => setAvatarLoaded(true)}
      style={{ display: "none" }}
    />
  ) : null;

  if (!ready) {
    return (
      <>
        {hiddenAvatar}
        <div className="space-y-6">
          <section className="rounded-4 border border-[#C9B037]/35 bg-black/45 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,215,0,0.1)] backdrop-blur-[8px] sm:p-7">
            <div style={{ maxWidth: "220px", margin: "0 auto 32px", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
                <SkeletonBlock style={{ width: "120px", height: "120px", borderRadius: "50%" }} />
              </div>
              <SkeletonBlock style={{ width: "140px", height: "18px", margin: "0 auto" }} />
            </div>
            <SkeletonBlock style={{ width: "200px", height: "36px", marginBottom: "12px" }} />
            <SkeletonBlock style={{ width: "260px", height: "14px" }} />
          </section>
          <div className="grid gap-4">
            {[0, 1, 2].map((index) => (
              <Card key={`profile-history-skeleton-${index}`}>
                <CardContent className="space-y-3 p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <SkeletonBlock style={{ width: "84px", height: "12px", marginBottom: "12px" }} />
                      <SkeletonBlock style={{ width: "180px", height: "20px", marginBottom: "10px" }} />
                      <SkeletonBlock style={{ width: "120px", height: "14px" }} />
                    </div>
                    <SkeletonBlock style={{ width: "56px", height: "28px", borderRadius: "999px" }} />
                  </div>
                  <SkeletonBlock style={{ width: "56px", height: "12px" }} />
                  <SkeletonBlock style={{ width: "140px", height: "18px" }} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <div
      className="space-y-6"
      style={animate ? { animation: "fadeIn 250ms ease both" } : undefined}
    >
      <section className="rounded-4 border border-[#C9B037]/35 bg-black/45 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,215,0,0.1)] backdrop-blur-[8px] sm:p-7">
        <div
          style={{
            background: "rgba(8,5,0,0.75)",
            border: "1.5px solid rgba(201,176,55,0.65)",
            borderRadius: "16px",
            padding: "24px 16px 16px",
            maxWidth: "220px",
            margin: "0 auto 32px",
            boxShadow: "0 0 40px rgba(201,176,55,0.25)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center" }}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={`${displayName} avatar`}
                style={{ height: "200px", width: "auto", display: "block" }}
              />
            ) : (
              <div
                aria-hidden="true"
                style={{
                  height: "200px",
                  width: "140px",
                  background: "#C9B037",
                  color: "#000",
                  fontWeight: 700,
                  fontSize: "56px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {getInitials(displayName)}
              </div>
            )}
          </div>
          <div style={{ height: "1px", background: "#C9B037", opacity: 0.4, margin: "12px 0" }} />
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#fff", textAlign: "center", margin: 0 }}>
            {displayName}
          </h2>
          <p style={{ fontSize: "10px", letterSpacing: "0.3em", color: "#C9B037", textAlign: "center", margin: "10px 0 0", textTransform: "uppercase" }}>
            Court Player
          </p>
        </div>
        <h1 className="text-3xl font-800 text-white sm:text-5xl">Your Picks</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60 sm:text-base">
          Full prediction history for <span className="text-[#C9B037]">{displayName}</span>.
        </p>
      </section>

      {items.length === 0 ? (
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
