import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import SkeletonBlock from "@/components/SkeletonBlock";
import AvatarModal from "@/components/AvatarModal";
import NBA_TEAMS from "@/lib/nbaTeams";

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

const inputStyle = {
  width: "100%",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(201,176,55,0.35)",
  borderRadius: "10px",
  color: "#fff",
  fontSize: "15px",
  padding: "12px 14px",
  outline: "none",
  boxSizing: "border-box",
};

const profileHistoryCache = new Map();

export default function ProfilePage({ user, supabase, avatarUrl, displayName, championshipPick, onProfileUpdate }) {
  const cachedItems = profileHistoryCache.get(user.id) ?? [];
  const hadCache = useRef(cachedItems.length > 0).current;
  const [items, setItems] = useState(cachedItems);
  const [predictionsLoaded, setPredictionsLoaded] = useState(hadCache);
  const [error, setError] = useState(false);
  const [avatarLoaded, setAvatarLoaded] = useState(!avatarUrl);
  const ready = predictionsLoaded && avatarLoaded;
  const [animate, setAnimate] = useState(false);
  const imgRef = useRef(null);

  // Edit mode state
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState(displayName);
  const [editTeam, setEditTeam] = useState(championshipPick);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

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
        setError(false);
      } catch (err) {
        console.error("Failed to load profile history:", err);
        setError(true);
      } finally {
        setPredictionsLoaded(true);
      }
    }

    loadHistory();
  }, [supabase, user.id, hadCache]);

  useEffect(() => {
    if (ready && !hadCache) setAnimate(true);
  }, [ready, hadCache]);

  function handleEnterEdit() {
    setEditName(displayName);
    setEditTeam(championshipPick);
    setSaveError(null);
    setEditMode(true);
  }

  function handleCancelEdit() {
    setEditMode(false);
    setSaveError(null);
  }

  async function handleSave() {
    if (!editName.trim()) return;
    setSaving(true);
    setSaveError(null);

    const { error } = await supabase
      .from("users")
      .update({ display_name: editName.trim(), championship_pick: editTeam })
      .eq("id", user.id);

    if (error) {
      setSaveError("Failed to save. Please try again.");
      setSaving(false);
      return;
    }

    onProfileUpdate({ displayName: editName.trim(), championshipPick: editTeam });
    setEditMode(false);
    setSaving(false);
  }

  const currentChampionshipTeam = NBA_TEAMS.find((t) => t.id === championshipPick);

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
      {hiddenAvatar}
      {showAvatarModal && (
        <AvatarModal avatarUrl={avatarUrl} name={displayName} onClose={() => setShowAvatarModal(false)} />
      )}

      {/* ── Edit Mode ── */}
      {editMode ? (
        <section
          style={{
            background: "rgba(8,5,0,0.65)",
            border: "1.5px solid rgba(201,176,55,0.65)",
            borderRadius: "16px",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,215,0,0.08)",
            padding: "24px 20px",
          }}
        >
          <p style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(201,176,55,0.7)", margin: "0 0 16px" }}>
            Edit Profile
          </p>

          {/* Display name */}
          <div style={{ marginBottom: "24px" }}>
            <label htmlFor="edit-display-name" style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(201,176,55,0.8)", marginBottom: "8px", fontWeight: 600 }}>
              Display Name
            </label>
            <input
              id="edit-display-name"
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              style={inputStyle}
              maxLength={40}
            />
          </div>

          {/* Championship pick */}
          <div style={{ marginBottom: "28px" }}>
            <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(201,176,55,0.8)", marginBottom: "4px", fontWeight: 600 }}>
              Championship Pick
            </label>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", margin: "0 0 12px" }}>
              Which team will win it all?
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px" }}>
              {NBA_TEAMS.map((team) => {
                const isSelected = editTeam === team.id;
                return (
                  <button
                    key={team.id}
                    onClick={() => setEditTeam(team.id)}
                    title={team.name}
                    style={{
                      background: isSelected ? "rgba(201,176,55,0.15)" : "rgba(255,255,255,0.04)",
                      border: isSelected ? "1.5px solid #C9B037" : "1.5px solid rgba(255,255,255,0.08)",
                      borderRadius: "10px",
                      padding: "8px 4px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: isSelected ? "0 0 12px rgba(201,176,55,0.4)" : "none",
                      transition: "all 0.15s ease",
                      aspectRatio: "1",
                    }}
                  >
                    <img
                      src={team.logo}
                      alt={team.name}
                      style={{ width: "100%", maxWidth: "36px", height: "auto", display: "block" }}
                      loading="lazy"
                    />
                  </button>
                );
              })}
            </div>
            {editTeam && (
              <p style={{ marginTop: "10px", fontSize: "12px", color: "#C9B037", textAlign: "center" }}>
                {NBA_TEAMS.find((t) => t.id === editTeam)?.name}
              </p>
            )}
          </div>

          {saveError && (
            <p style={{ marginBottom: "12px", fontSize: "13px", color: "#fca5a5", textAlign: "center" }}>
              {saveError}
            </p>
          )}

          {/* Save / Cancel */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <button
              onClick={handleCancelEdit}
              disabled={saving}
              style={{
                background: "transparent",
                border: "1.5px solid rgba(201,176,55,0.4)",
                borderRadius: "12px",
                color: "rgba(255,255,255,0.7)",
                fontSize: "14px",
                fontWeight: 600,
                padding: "12px",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!editName.trim() || saving}
              style={{
                background: !editName.trim() || saving
                  ? "rgba(201,176,55,0.25)"
                  : "linear-gradient(135deg, #C9B037 0%, #8B6914 100%)",
                border: "none",
                borderRadius: "12px",
                color: "#000",
                fontSize: "14px",
                fontWeight: 700,
                padding: "12px",
                cursor: !editName.trim() || saving ? "not-allowed" : "pointer",
                boxShadow: !editName.trim() || saving ? "none" : "0 4px 16px rgba(201,176,55,0.4)",
              }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </section>
      ) : (
        /* ── View Mode ── */
        <section className="rounded-4 border border-[#C9B037]/35 bg-black/45 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,215,0,0.1)] backdrop-blur-[8px] sm:p-7">
          <div
            style={{
              background: "rgba(8,5,0,0.75)",
              border: "1.5px solid rgba(201,176,55,0.65)",
              borderRadius: "16px",
              padding: "24px 16px 16px",
              maxWidth: "220px",
              margin: "0 auto 24px",
              boxShadow: "0 0 40px rgba(201,176,55,0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center" }}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={`${displayName} avatar`}
                  onClick={() => setShowAvatarModal(true)}
                  style={{ height: "200px", width: "auto", display: "block", cursor: "pointer" }}
                />
              ) : (
                <div
                  aria-hidden="true"
                  onClick={() => setShowAvatarModal(true)}
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
                    cursor: "pointer",
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
            {currentChampionshipTeam && (
              <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                <img
                  src={currentChampionshipTeam.logo}
                  alt={currentChampionshipTeam.name}
                  style={{ width: "40px", height: "40px", objectFit: "contain" }}
                />
                <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", textAlign: "center", margin: 0 }}>
                  {currentChampionshipTeam.name}
                </p>
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
            <div>
              <h1 className="text-3xl font-800 text-white sm:text-5xl">Your Picks</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60 sm:text-base">
                Full prediction history for <span className="text-[#C9B037]">{displayName}</span>.
              </p>
            </div>
            <button
              onClick={handleEnterEdit}
              style={{
                flexShrink: 0,
                background: "transparent",
                border: "1.5px solid rgba(201,176,55,0.5)",
                borderRadius: "8px",
                color: "#C9B037",
                fontSize: "12px",
                fontWeight: 600,
                padding: "7px 16px",
                cursor: "pointer",
                letterSpacing: "0.05em",
                whiteSpace: "nowrap",
              }}
            >
              Edit Profile
            </button>
          </div>
        </section>
      )}

      {error ? (
        <p style={{ textAlign: "center", color: "#C9B037", marginTop: "16px" }}>
          Failed to load picks. Please refresh.
        </p>
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
                      {item.games?.away_team} vs {item.games?.home_team}
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
