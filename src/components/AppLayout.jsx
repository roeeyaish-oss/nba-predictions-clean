import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { History, House, Trophy, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/", label: "Home", icon: House, end: true },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/profile", label: "Profile", icon: UserRound },
  { to: "/history", label: "History", icon: History },
];

export default function AppLayout({ user, onSignOut, backgroundStyle }) {
  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      <div className="absolute inset-0" style={backgroundStyle} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(201,176,55,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/85" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 border-b border-[#C9B037]/50 bg-[rgba(5,3,0,0.7)] backdrop-blur-[14px]">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">Court Access</p>
              <p className="truncate text-sm text-white">
                Signed in as <span className="font-700 text-[#C9B037]">{user.user_metadata.full_name}</span>
              </p>
            </div>
            <Button
              onClick={onSignOut}
              className="shrink-0 rounded-2 border border-[#C9B037]/70 bg-transparent px-4 py-2 text-xs font-600 text-[#C9B037] hover:bg-[#C9B037]/18 hover:text-[#f6df8f]"
            >
              Sign Out
            </Button>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-30 pt-6 sm:px-8 sm:pb-34 sm:pt-8">
          <Outlet />
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#C9B037]/40 bg-[rgba(5,3,0,0.85)] backdrop-blur-[14px]">
          <div className="mx-auto grid max-w-4xl grid-cols-4 px-2 py-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-1 rounded-3 px-2 py-3 text-[11px] font-600 transition ${
                    isActive ? "text-[#C9B037]" : "text-white/50 hover:text-white/78"
                  }`
                }
              >
                <item.icon className="h-4 w-4" strokeWidth={2.2} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
