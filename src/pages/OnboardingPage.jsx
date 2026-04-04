import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import NBA_TEAMS from "@/lib/nbaTeams";

const courtBackgroundStyle = {
  background: "url('/court-bg.png') center top / cover no-repeat fixed",
  backgroundColor: "#050200",
};

const cardStyle = {
  background: "rgba(8,5,0,0.65)",
  border: "1.5px solid rgba(201,176,55,0.65)",
  borderRadius: "20px",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.58), inset 0 1px 0 rgba(255,215,0,0.08)",
  padding: "28px 24px",
  width: "100%",
  maxWidth: "480px",
};

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

const submitButtonStyle = {
  width: "100%",
  background: "linear-gradient(135deg, #C9B037 0%, #8B6914 100%)",
  color: "#000",
  fontWeight: 700,
  fontSize: "15px",
  letterSpacing: "0.05em",
  borderRadius: "12px",
  padding: "14px",
  border: "none",
  boxShadow: "0 4px 20px rgba(201,176,55,0.45)",
  cursor: "pointer",
};

const submitButtonDisabledStyle = {
  ...submitButtonStyle,
  opacity: 0.4,
  cursor: "not-allowed",
};

export default function OnboardingPage({ user, supabase, avatarUrl, onComplete }) {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.full_name ?? ""
  );
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  console.log("[OnboardingPage] avatarUrl received:", avatarUrl);
  const initials = (displayName || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleSubmit() {
    if (!displayName.trim() || !selectedTeam) return;
    setSubmitting(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("users")
      .update({
        display_name: displayName.trim(),
        championship_pick: selectedTeam,
        onboarding_complete: true,
      })
      .eq("id", user.id);

    if (updateError) {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    onComplete();
    navigate("/", { replace: true });
  }

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden" }} className="text-white">
      <div className="absolute inset-0" style={courtBackgroundStyle} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.5) 100%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", height: "100%", overflowY: "auto", zIndex: 1 }}>
        <div style={{ minHeight: "100%", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px 60px" }}>
          <div style={cardStyle}>

            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: "28px" }}>
              <p style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(201,176,55,0.7)", margin: "0 0 12px" }}>
                Welcome
              </p>

              {/* Avatar */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Your avatar"
                    style={{ width: "100px", height: "100px", borderRadius: "50%", border: "2px solid rgba(201,176,55,0.6)", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ width: "100px", height: "100px", borderRadius: "50%", border: "2px solid rgba(201,176,55,0.6)", background: "rgba(201,176,55,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", fontWeight: 700, color: "#C9B037" }}>
                    {initials}
                  </div>
                )}
              </div>

              <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#fff", margin: 0 }}>
                Set up your profile
              </h1>
            </div>

            {/* Display name */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(201,176,55,0.8)", marginBottom: "8px", fontWeight: 600 }}>
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How should we call you?"
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
                  const isSelected = selectedTeam === team.id;
                  return (
                    <button
                      key={team.id}
                      onClick={() => setSelectedTeam(team.id)}
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

              {selectedTeam && (
                <p style={{ marginTop: "10px", fontSize: "12px", color: "#C9B037", textAlign: "center" }}>
                  {NBA_TEAMS.find((t) => t.id === selectedTeam)?.name}
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <p style={{ marginBottom: "12px", fontSize: "13px", color: "#ff6b6b", textAlign: "center" }}>
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!displayName.trim() || !selectedTeam || submitting}
              style={!displayName.trim() || !selectedTeam || submitting ? submitButtonDisabledStyle : submitButtonStyle}
            >
              {submitting ? "Saving…" : "Let's go"}
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}
