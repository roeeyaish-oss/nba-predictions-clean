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
  backgroundColor: "#0a0600",
  backgroundImage: [
    "radial-gradient(circle at 50% 40%, rgba(26,15,0,0.62) 0%, rgba(26,15,0,0.2) 14%, rgba(10,6,0,0) 18%)",
    "radial-gradient(circle at 18% -6%, rgba(255,200,100,0.15) 0%, rgba(255,200,100,0.05) 18%, rgba(255,200,100,0) 38%)",
    "radial-gradient(circle at 50% -16%, rgba(255,210,130,0.17) 0%, rgba(255,210,130,0.06) 22%, rgba(255,210,130,0) 44%)",
    "radial-gradient(circle at 82% -6%, rgba(255,190,90,0.14) 0%, rgba(255,190,90,0.04) 17%, rgba(255,190,90,0) 36%)",
    "repeating-linear-gradient(90deg, rgba(26,15,0,0.9) 0px, rgba(26,15,0,0.9) 54px, rgba(21,12,0,0.9) 54px, rgba(21,12,0,0.9) 108px)",
    "linear-gradient(180deg, rgba(16,10,2,0.95) 0%, rgba(7,4,1,0.98) 100%)",
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
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/70" />
        <main className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">
          <div className="w-full max-w-md rounded-4 border border-[#C9B037]/40 bg-black/60 p-8 text-center shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,215,0,0.1)] backdrop-blur-[8px]">
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
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/78" />
        <main className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">
          <div className="w-full max-w-md rounded-4 border border-[#C9B037]/40 bg-black/60 p-8 text-center shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,215,0,0.1)] backdrop-blur-[8px]">
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
