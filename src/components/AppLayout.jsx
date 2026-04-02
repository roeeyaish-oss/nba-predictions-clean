import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { History, House, Trophy, UserRound } from "lucide-react";

const navItems = [
  { to: "/", label: "Home", icon: House, end: true },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/profile", label: "Profile", icon: UserRound },
  { to: "/history", label: "History", icon: History },
];

const headerStyle = {
  position: "sticky",
  top: 0,
  zIndex: 20,
  background: "rgba(5,3,0,0.85)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  borderBottom: "1px solid rgba(201,176,55,0.25)",
  padding: "10px 20px",
};

const signOutButtonStyle = {
  border: "1px solid rgba(201,176,55,0.5)",
  background: "transparent",
  color: "#C9B037",
  borderRadius: "6px",
  padding: "5px 14px",
  fontSize: "12px",
  fontWeight: 600,
  cursor: "pointer",
  flexShrink: 0,
};

const bottomNavStyle = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 30,
  background: "rgba(3,2,0,0.92)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderTop: "1px solid rgba(201,176,55,0.2)",
  height: "64px",
};

export default function AppLayout({ user, onSignOut, backgroundStyle }) {
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden" }} className="text-white">
      <div className="absolute inset-0" style={backgroundStyle} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.45) 100%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", height: "100%", overflowY: "auto", zIndex: 1 }} className="flex flex-col">
        <header style={headerStyle}>
          <div style={{ maxWidth: "1152px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(201,176,55,0.6)", margin: 0 }}>Court Access</p>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Signed in as <span style={{ fontWeight: 600, color: "#C9B037" }}>{user.user_metadata.full_name}</span>
              </p>
            </div>
            <button onClick={onSignOut} style={signOutButtonStyle}>
              Sign Out
            </button>
          </div>
        </header>

        <main className="app-main" style={{ paddingBottom: "80px" }}>
          <Outlet />
        </main>

        <nav style={bottomNavStyle}>
          <div style={{ maxWidth: "768px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", height: "100%", padding: "0 8px" }}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                style={({ isActive }) => ({
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  textDecoration: "none",
                  color: isActive ? "#C9B037" : "rgba(255,255,255,0.4)",
                  transition: "color 0.2s",
                })}
              >
                <item.icon style={{ width: "20px", height: "20px" }} strokeWidth={2.2} />
                <span style={{ fontSize: "10px", fontWeight: 600 }}>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
