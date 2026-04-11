import React, { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import HomePage from "@/pages/HomePage";
import LeaderboardPage from "@/pages/LeaderboardPage";
import ProfilePage from "@/pages/ProfilePage";
import ResultsPage from "@/pages/ResultsPage";
import HistoryPage from "@/pages/HistoryPage";
import OnboardingPage from "@/pages/OnboardingPage";
import OraclePopup from "@/components/OraclePopup";
import { supabase } from "@/lib/supabase";
import { getIsraelToday } from "@/lib/time";
import { lsGet, lsSet } from "@/lib/storage";
import { ANNOUNCER_URL, ANNOUNCER_HE_URL } from "@/lib/constants";

const EMAIL_AVATAR_MAP = {
  "roeeyaish@gmail.com": "https://mdllwtozvzjrlkexrdwk.supabase.co/storage/v1/object/public/avatars/roee.png",
  "yuvaldagan95@gmail.com": "https://mdllwtozvzjrlkexrdwk.supabase.co/storage/v1/object/public/avatars/dagan.png",
  "yuvalsaban9@gmail.com": "https://mdllwtozvzjrlkexrdwk.supabase.co/storage/v1/object/public/avatars/saban.png",
  "doronnoam3@gmail.com": "https://mdllwtozvzjrlkexrdwk.supabase.co/storage/v1/object/public/avatars/doron.png",
};

const SUPABASE_STORAGE_BASE = "https://mdllwtozvzjrlkexrdwk.supabase.co/storage/v1/object/public/avatars/";

function announcerToAvatarUrl(announcer) {
  return announcer === "barak" ? ANNOUNCER_HE_URL : ANNOUNCER_URL;
}

// Module-level guard so the oracle only fires once per session/date,
// even if auth state change fires multiple times.
let oracleLastFetchedDate = null;

const courtBackgroundStyle = {
  background: "url('/court-bg.png') center top / cover no-repeat fixed",
  backgroundColor: "#050200",
};

const loadingSpinnerStyle = {
  width: "44px",
  height: "44px",
  borderRadius: "50%",
  border: "4px solid rgba(201,176,55,0.25)",
  borderTopColor: "#C9B037",
  animation: "spin 0.8s linear infinite",
};

function App() {
  const [user, setUser] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [profile, setProfile] = useState({
    avatarUrl: null,
    displayName: null,
    championshipPick: null,
    onboardingComplete: null,
  });
  const [showOracle, setShowOracle] = useState(false);
  const [oracleData, setOracleData] = useState(null);

  function handleOracleClose() {
    setShowOracle(false);
    if (oracleData?.contentVersion) {
      lsSet("oracle_last_seen_version", oracleData.contentVersion);
    }
  }

  async function handleRegenerateOracle() {
    try { localStorage.removeItem("oracle_last_seen_version"); } catch (e) { void e; }
    oracleLastFetchedDate = null;
    try {
      const headers = await getAuthHeaders();
      const data = await fetch("/api/oracle?force=true", { headers }).then((r) => r.json());
      if (!data.ready || !data.title || !data.recap || !data.content_version) return;
      const ann = data.announcer ?? "breen";
      setOracleData({
        title: data.title,
        recap: data.recap,
        announcer: ann,
        avatarUrl: announcerToAvatarUrl(ann),
        contentVersion: data.content_version,
      });
      oracleLastFetchedDate = getIsraelToday();
      setShowOracle(true);
    } catch (err) {
      console.error("[Oracle] regenerate error:", err);
    }
  }

  async function getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  useEffect(() => {
    async function handleAuthUser(authUser) {
      if (!authUser) {
        setUser(null);
        setProfile({
          avatarUrl: null,
          displayName: null,
          championshipPick: null,
          onboardingComplete: null,
        });
        return;
      }

      const allowedEmails = (import.meta.env.VITE_ALLOWED_EMAILS || "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean);

      if (allowedEmails.length > 0 && !allowedEmails.includes(authUser.email?.toLowerCase())) {
        await supabase.auth.signOut();
        setUser(null);
        setAccessDenied(true);
        return;
      }

      setAccessDenied(false);

      let profile = null;

      try {
        const { error: upsertError } = await supabase.from("users").upsert(
          {
            id: authUser.id,
            email: authUser.email,
            name: authUser.user_metadata.full_name,
          },
          { onConflict: "id" }
        );

        if (upsertError) {
          throw upsertError;
        }
      } catch (error) {
        console.error("[Avatar] Failed to upsert user:", error);
      }

      try {
        const { data, error: profileError } = await supabase
          .from("users")
          .select("avatar_url, display_name, name, onboarding_complete, championship_pick")
          .eq("id", authUser.id)
          .single();

        if (profileError) {
          throw profileError;
        }

        profile = data;
      } catch (error) {
        console.error("[Avatar] Failed to fetch profile:", error);
      }

      const emailKey = authUser.email?.toLowerCase() ?? "";
      const mappedAvatarUrl = EMAIL_AVATAR_MAP[emailKey] ?? null;
      const currentAvatarUrl = typeof profile?.avatar_url === "string" ? profile.avatar_url : null;
      const hasStoredSupabaseAvatar = currentAvatarUrl?.startsWith(SUPABASE_STORAGE_BASE) ?? false;

      let finalAvatarUrl = currentAvatarUrl;

      if (mappedAvatarUrl) {
        finalAvatarUrl = mappedAvatarUrl;
      } else if (hasStoredSupabaseAvatar) {
        finalAvatarUrl = currentAvatarUrl;
      } else {
        finalAvatarUrl = null;
      }

      if (mappedAvatarUrl && currentAvatarUrl !== mappedAvatarUrl) {
        try {
          const { error: avatarUpdateError } = await supabase
            .from("users")
            .update({ avatar_url: mappedAvatarUrl })
            .eq("id", authUser.id);

          if (avatarUpdateError) {
            throw avatarUpdateError;
          }

        } catch (error) {
          console.error("[Avatar] Failed to update mapped avatar_url:", error);
        }
      }

      setProfile({
        avatarUrl: mappedAvatarUrl ?? finalAvatarUrl,
        displayName:
          profile?.display_name ??
          profile?.name ??
          authUser.user_metadata.full_name ??
          authUser.email,
        championshipPick: profile?.championship_pick ?? null,
        onboardingComplete: profile?.onboarding_complete ?? false,
      });
      setUser(authUser);

      if (profile?.onboarding_complete) {
        const today = getIsraelToday();
        if (oracleLastFetchedDate !== today) {
          oracleLastFetchedDate = today;
          getAuthHeaders()
            .then((headers) => fetch("/api/oracle", { headers }))
            .then((r) => r.json())
            .then((data) => {
              if (!data.ready || !data.title || !data.recap || !data.content_version) {
                return;
              }
              const ann = data.announcer ?? "breen";
              setOracleData({
                title: data.title,
                recap: data.recap,
                announcer: ann,
                avatarUrl: announcerToAvatarUrl(ann),
                contentVersion: data.content_version,
              });
              if (lsGet("oracle_last_seen_version") !== data.content_version) {
                setShowOracle(true);
              }
            })
            .catch((err) => console.error("[Oracle] fetch error:", err));
        }
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;
      handleAuthUser(session?.user ?? null);
    });

    // When the app resumes from background on iOS PWA and the date has
    // changed, reset the guard so the next auth trigger fetches fresh oracle.
    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && oracleLastFetchedDate !== getIsraelToday()) {
        oracleLastFetchedDate = null;
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  function handleProfileUpdate({ displayName, championshipPick }) {
    setProfile((prev) => ({ ...prev, displayName, championshipPick }));
  }

  function handleSignIn() {
    supabase.auth.signInWithOAuth({ provider: "google" });
  }

  function handleSignOut() {
    supabase.auth.signOut();
  }

  const authCardStyle = {
    background: "rgba(8,5,0,0.65)",
    border: "1.5px solid rgba(201,176,55,0.8)",
    borderRadius: "16px",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.58), inset 0 1px 0 rgba(255,215,0,0.08)",
    padding: "32px",
    textAlign: "center",
  };

  const signInButtonStyle = {
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

  if (accessDenied) {
    return (
      <div style={{ position: "fixed", inset: 0, overflow: "hidden" }} className="text-white">
        <div className="absolute inset-0" style={courtBackgroundStyle} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.45) 100%)", pointerEvents: "none" }} />
        <main style={{ position: "relative", height: "100%", overflowY: "auto", zIndex: 1 }} className="flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-md" style={authCardStyle}>
            <h1 style={{ marginBottom: "16px", fontSize: "28px", fontWeight: 700, color: "#fff" }}>Access Denied</h1>
            <p style={{ fontSize: "13px", lineHeight: 1.6, color: "rgba(255,255,255,0.45)" }}>
              Your Google account is not authorized to use this app.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ position: "fixed", inset: 0, overflow: "hidden" }} className="text-white">
        <div className="absolute inset-0" style={courtBackgroundStyle} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.45) 100%)", pointerEvents: "none" }} />
        <main style={{ position: "relative", height: "100%", overflowY: "auto", zIndex: 1 }} className="flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-md" style={authCardStyle}>
            <p style={{ marginBottom: "12px", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(201,176,55,0.7)" }}>NBA Predictions</p>
            <h1 style={{ marginBottom: "16px", fontSize: "28px", fontWeight: 700, color: "#fff" }}>Court Night</h1>
            <p style={{ marginBottom: "32px", fontSize: "13px", lineHeight: 1.6, color: "rgba(255,255,255,0.45)", maxWidth: "320px", marginLeft: "auto", marginRight: "auto" }}>
              Sign in to make your picks, check the leaderboard, and review prediction history across the group.
            </p>
            <button onClick={handleSignIn} style={signInButtonStyle}>
              Sign in with Google
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (profile.onboardingComplete === null) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          overflow: "hidden",
          background: "#050200",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={loadingSpinnerStyle} aria-label="Loading" />
      </div>
    );
  }

  return (
    <>
      {showOracle && oracleData && (
        <OraclePopup data={oracleData} onClose={handleOracleClose} />
      )}
      <Routes>
        <Route
          path="/onboarding"
          element={
            profile.onboardingComplete
              ? <Navigate to="/" replace />
              : <OnboardingPage
                  user={user}
                  supabase={supabase}
                  avatarUrl={profile.avatarUrl}
                  onComplete={(displayName) => {
                    setProfile((currentProfile) => ({
                      ...currentProfile,
                      displayName,
                      onboardingComplete: true,
                    }));
                    try {
                      if (!lsGet("welcome_shown")) {
                        lsSet("welcome_shown", "true");
                        getAuthHeaders()
                          .then((headers) => fetch(`/api/welcome?name=${encodeURIComponent(displayName)}`, { headers }))
                          .then((r) => r.json())
                          .then((data) => {
                            if (data.title && data.recap) {
                              setOracleData(data);
                              setShowOracle(true);
                            }
                          })
                          .catch(() => {});
                      }
                    } catch {
                      // ignore localStorage errors
                    }
                  }}
                />
          }
        />
        <Route
          element={
            profile.onboardingComplete
              ? <AppLayout
                  onSignOut={handleSignOut}
                  onRegenerateOracle={handleRegenerateOracle}
                  backgroundStyle={courtBackgroundStyle}
                  avatarUrl={profile.avatarUrl}
                  displayName={profile.displayName ?? user.user_metadata.full_name ?? user.email}
                />
              : <Navigate to="/onboarding" replace />
          }
        >
          <Route path="/" element={<HomePage user={user} supabase={supabase} oracleData={oracleData} onReopenOracle={() => setShowOracle(true)} />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route
            path="/profile"
            element={
              <ProfilePage
                user={user}
                supabase={supabase}
                avatarUrl={profile.avatarUrl}
                displayName={profile.displayName ?? user.user_metadata.full_name ?? user.email}
                championshipPick={profile.championshipPick}
                onProfileUpdate={handleProfileUpdate}
              />
            }
          />
          <Route path="/results" element={<ResultsPage supabase={supabase} />} />
          <Route path="/history" element={<HistoryPage currentUserId={user.id} supabase={supabase} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
