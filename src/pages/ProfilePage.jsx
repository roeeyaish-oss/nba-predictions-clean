import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import SkeletonBlock from "@/components/SkeletonBlock";
import AvatarModal from "@/components/AvatarModal";
import NBA_TEAMS from "@/lib/nbaTeams";

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

function formatDateLabel(dateString) {
  if (!dateString) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(dateString)).toUpperCase();
}

function buildProfileRows(items) {
  return [...items].sort((a, b) => {
    const dateA = a.games?.date ?? "";
    const dateB = b.games?.date ?? "";
    if (dateA !== dateB) return dateA > dateB ? -1 : 1;
    return (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1;
  });
}

function DateDividerRow({ label }) {
  return (
    <tr>
      <td
        colSpan={2}
        style={{
          padding: "14px 16px 10px",
          color: "#C9B037",
          fontSize: "13px",
          fontWeight: 800,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          borderBottom: "1px solid rgba(201,176,55,0.2)",
          background: "rgba(201,176,55,0.08)",
        }}
      >
        {label}
      </td>
    </tr>
  );
}

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
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState(displayName);
  const [editTeam, setEditTeam] = useState(championshipPick);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    if (imgRef.current?.complete) setAvatarLoaded(true);
  }, []);

  useEffect(() => {
    async function loadHistory() {
      try {
        const { data, error } = await supabase
          .from("predictions")
          .select("pick, created_at, games!inner(home_team, away_team, date, results!inner(winner))")
          .eq("user_id", user.id)
          .not("games.results.winner", "is", null);

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
  const rows = useMemo(() => buildProfileRows(items), [items]);

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
          <Card>
            <CardContent className="p-0">
              {[0, 1, 2, 3, 4].map((index) => (
                <SkeletonBlock key={`profile-table-skeleton-${index}`} style={{ height: "52px", borderRadius: 0 }} />
              ))}
            </CardContent>
          </Card>
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
                Completed-game history for <span className="text-[#C9B037]">{displayName}</span>.
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
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-white/65">
            No completed picks yet.
          </CardContent>
        </Card>
      ) : (
        <Card style={{
          border: "1px solid rgba(201,176,55,0.3)",
          background: "rgba(8,5,0,0.45)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,215,0,0.1)",
          backdropFilter: "blur(8px)",
        }}>
          <CardContent className="p-0">
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                    <th style={{ padding: "16px", textAlign: "left", color: "#C9B037", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                      Game
                    </th>
                    <th style={{ padding: "16px", textAlign: "left", color: "#C9B037", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                      Pick
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item, index) => {
                    const date = item.games?.date ?? "";
                    const prevDate = index > 0 ? rows[index - 1].games?.date ?? "" : null;
                    const isNewDate = date !== prevDate;
                    const correct = item.pick === item.games?.results?.winner;
                    const striped = index % 2 === 1;

                    return (
                      <React.Fragment key={`${item.created_at}-${index}`}>
                        {isNewDate && <DateDividerRow label={formatDateLabel(date)} />}
                        <tr style={{ background: striped ? "rgba(255,255,255,0.025)" : "transparent" }}>
                          <td style={{ padding: "14px 16px", color: "#fff", fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            {item.games?.away_team} vs {item.games?.home_team}
                          </td>
                          <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            <span style={{ color: correct ? "#4ade80" : "#f87171", fontWeight: 700 }}>
                              {item.pick} {correct ? "(+1)" : "(0)"}
                            </span>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
