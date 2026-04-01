import React from "react";
import Scoreboard from "@/components/Scoreboard";

export default function LeaderboardPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-4 border border-[#C9B037]/35 bg-black/45 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,215,0,0.1)] backdrop-blur-[8px] sm:p-7">
        <p className="mb-2 text-[11px] uppercase tracking-[0.35em] text-[#C9B037]/85">Leaderboard</p>
        <h1 className="text-3xl font-800 text-white sm:text-5xl">Standings</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60 sm:text-base">
          Current score totals, ranked from the top down.
        </p>
      </section>

      <Scoreboard />
    </div>
  );
}
