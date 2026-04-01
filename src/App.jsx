import React, { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import AppLayout from "@/components/AppLayout";
import HomePage from "@/pages/HomePage";
import LeaderboardPage from "@/pages/LeaderboardPage";
import ProfilePage from "@/pages/ProfilePage";
import HistoryPage from "@/pages/HistoryPage";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const courtBackgroundStyle = {
  background: "url('/court-bg.jpg') center center / cover no-repeat fixed",
  backgroundColor: "#050200",
};


function App() {
  const [user, setUser] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    async function handleAuthUser(authUser) {
      if (!authUser) {
        setUser(null);
        return;
      }

      const allowedEmails = (import.meta.env.VITE_ALLOWED_EMAILS || "")
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean);

      if (allowedEmails.length > 0 && !allowedEmails.includes(authUser.email)) {
        await supabase.auth.signOut();
        setUser(null);
        setAccessDenied(true);
        return;
      }

      setAccessDenied(false);

      await supabase.from("users").upsert(
        {
          id: authUser.id,
          email: authUser.email,
          name: authUser.user_metadata.full_name,
          avatar_url: authUser.user_metadata.avatar_url ?? null,
        },
        { onConflict: "id" }
      );

      setUser(authUser);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  function handleSignIn() {
    supabase.auth.signInWithOAuth({ provider: "google" });
  }

  function handleSignOut() {
    supabase.auth.signOut();
  }

  const authCardStyle = {
    background: "rgba(8,5,0,0.82)",
    border: "1.5px solid rgba(201,176,55,0.65)",
    borderRadius: "16px",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,215,0,0.08)",
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
      <div className="relative min-h-screen overflow-hidden text-white">
        <div className="absolute inset-0" style={courtBackgroundStyle} />
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.72)", pointerEvents: "none" }} />
        <main className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">
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
      <div className="relative min-h-screen overflow-hidden text-white">
        <div className="absolute inset-0" style={courtBackgroundStyle} />
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.72)", pointerEvents: "none" }} />
        <main className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">
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

  return (
    <Routes>
      <Route element={<AppLayout user={user} onSignOut={handleSignOut} backgroundStyle={courtBackgroundStyle} />}>
        <Route path="/" element={<HomePage user={user} supabase={supabase} />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/profile" element={<ProfilePage user={user} supabase={supabase} />} />
        <Route path="/history" element={<HistoryPage currentUserId={user.id} supabase={supabase} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
