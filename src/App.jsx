import React, { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
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
  backgroundColor: "#050300",
  backgroundImage: [
    // Center spotlight — bright cone from above
    "radial-gradient(ellipse 60% 80% at 50% -10%, rgba(255,215,140,0.35) 0%, rgba(255,200,100,0.12) 30%, transparent 65%)",
    // Left spotlight — angled god-ray
    "radial-gradient(ellipse 40% 70% at 20% -8%, rgba(255,200,100,0.30) 0%, rgba(255,190,80,0.08) 35%, transparent 60%)",
    // Right spotlight — angled god-ray
    "radial-gradient(ellipse 40% 70% at 80% -8%, rgba(255,190,90,0.28) 0%, rgba(255,180,70,0.07) 35%, transparent 60%)",
    // Warm center court glow
    "radial-gradient(circle at 50% 50%, rgba(30,18,0,0.5) 0%, rgba(15,8,0,0.15) 30%, transparent 55%)",
    // Wood floor planks
    "repeating-linear-gradient(90deg, rgba(22,12,0,0.85) 0px, rgba(22,12,0,0.85) 54px, rgba(16,8,0,0.85) 54px, rgba(16,8,0,0.85) 108px)",
    // Base darkness falloff
    "linear-gradient(180deg, rgba(8,5,1,0.9) 0%, rgba(3,2,0,0.98) 100%)",
  ].join(", "),
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

  if (accessDenied) {
    return (
      <div className="relative min-h-screen overflow-hidden text-white">
        <div className="absolute inset-0" style={courtBackgroundStyle} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/85" />
        <main className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">
          <div className="w-full max-w-md rounded-4 border border-[rgba(201,176,55,0.7)] bg-[rgba(10,8,0,0.75)] p-8 text-center shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,215,0,0.15),inset_0_0_20px_rgba(201,176,55,0.05)] backdrop-blur-[12px]">
            <h1 className="mb-4 text-3xl font-700 text-white">Access Denied</h1>
            <p className="text-sm leading-6 text-white/65">
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
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/85" />
        <main className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">
          <div className="w-full max-w-md rounded-4 border border-[rgba(201,176,55,0.7)] bg-[rgba(10,8,0,0.75)] p-8 text-center shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,215,0,0.15),inset_0_0_20px_rgba(201,176,55,0.05)] backdrop-blur-[12px]">
            <p className="mb-3 text-xs uppercase tracking-[0.32em] text-[#C9B037]/85">NBA Predictions</p>
            <h1 className="mb-4 text-4xl font-800 text-white">Court Night</h1>
            <p className="mx-auto mb-8 max-w-sm text-sm leading-6 text-white/65">
              Sign in to make your picks, check the leaderboard, and review prediction history across the group.
            </p>
            <Button
              onClick={handleSignIn}
              className="w-full rounded-3 border border-[#C9B037]/70 bg-gradient-to-br from-[#C9B037] to-[#8B6914] px-6 py-3 text-sm font-700 text-black shadow-[0_4px_16px_rgba(201,176,55,0.4)] hover:from-[#d7be63] hover:to-[#9d7919]"
            >
              Sign in with Google
            </Button>
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
