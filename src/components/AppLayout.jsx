import React, { useEffect, useRef, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { CheckCircle, History, House, RotateCcw, Trophy, UserRound } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import AvatarModal from "@/components/AvatarModal";

const navItems = [
  { to: "/", label: "Home", icon: House, end: true },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/results", label: "Results", icon: CheckCircle },
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

const iconButtonStyle = {
  border: "1px solid rgba(201,176,55,0.5)",
  background: "transparent",
  color: "#C9B037",
  borderRadius: "6px",
  padding: "5px 8px",
  cursor: "pointer",
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
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

const dropdownStyle = {
  position: "absolute",
  top: "calc(100% + 8px)",
  left: 0,
  zIndex: 50,
  background: "rgba(8,5,0,0.95)",
  border: "1.5px solid rgba(201,176,55,0.5)",
  borderRadius: "12px",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
  minWidth: "200px",
  overflow: "hidden",
};

const dropdownItemStyle = {
  display: "block",
  width: "100%",
  background: "transparent",
  border: "none",
  color: "#fff",
  fontSize: "13px",
  fontWeight: 600,
  padding: "12px 16px",
  textAlign: "left",
  cursor: "pointer",
};

export default function AppLayout({ onSignOut, backgroundStyle, avatarUrl, displayName }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showOracleConfirm, setShowOracleConfirm] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    function handleOutsideClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [dropdownOpen]);

  function handleRegenerateOracle() {
    try { localStorage.removeItem("oracle_data_today"); } catch (e) { void e; }
    window.location.reload();
  }

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden" }} className="text-white">
      <div className="absolute inset-0" style={backgroundStyle} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.45) 100%)", pointerEvents: "none" }} />

      {showAvatarModal && (
        <AvatarModal avatarUrl={avatarUrl} name={displayName} onClose={() => setShowAvatarModal(false)} />
      )}

      {showOracleConfirm && (
        <div
          onClick={() => setShowOracleConfirm(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "rgba(8,5,0,0.95)",
              border: "1.5px solid rgba(201,176,55,0.7)",
              borderRadius: "16px",
              padding: "28px 24px",
              maxWidth: "320px",
              width: "100%",
              boxShadow: "0 8px 40px rgba(0,0,0,0.7)",
              textAlign: "center",
            }}
          >
            <p style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 700, color: "#fff" }}>
              Are you sure? 👀
            </p>
            <p style={{ margin: "0 0 24px", fontSize: "13px", color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
              Did you ask Roee?
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <button
                onClick={() => setShowOracleConfirm(false)}
                style={{
                  background: "transparent",
                  border: "1.5px solid rgba(201,176,55,0.4)",
                  borderRadius: "10px",
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "13px",
                  fontWeight: 600,
                  padding: "11px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerateOracle}
                style={{
                  background: "linear-gradient(135deg, #C9B037 0%, #8B6914 100%)",
                  border: "none",
                  borderRadius: "10px",
                  color: "#000",
                  fontSize: "13px",
                  fontWeight: 700,
                  padding: "11px",
                  cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(201,176,55,0.4)",
                }}
              >
                Yes, regenerate
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ position: "relative", height: "100%", overflowY: "auto", zIndex: 1 }} className="flex flex-col">
        <header style={headerStyle}>
          <div style={{ maxWidth: "1152px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
            <div ref={dropdownRef} style={{ minWidth: 0, display: "flex", alignItems: "center", gap: "12px", position: "relative" }}>
              <UserAvatar
                avatarUrl={avatarUrl}
                name={displayName}
                size={36}
                textSize={14}
                onClick={() => setShowAvatarModal(true)}
              />
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                aria-label="User menu"
                style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", minWidth: 0, textAlign: "left" }}
              >
                <p style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(201,176,55,0.6)", margin: 0 }}>Court Access</p>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <span style={{ fontWeight: 600, color: "#C9B037" }}>{displayName}</span>
                </p>
              </button>
              {dropdownOpen && (
                <div style={dropdownStyle}>
                  <button
                    style={dropdownItemStyle}
                    onClick={() => { setDropdownOpen(false); setShowAvatarModal(true); }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(201,176,55,0.1)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    View Avatar
                  </button>
                  <div style={{ height: "1px", background: "rgba(201,176,55,0.15)", margin: "0 12px" }} />
                  <button
                    style={dropdownItemStyle}
                    onClick={() => { setDropdownOpen(false); setShowOracleConfirm(true); }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(201,176,55,0.1)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    Regenerate Oracle 🔄
                  </button>
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={() => window.location.reload()}
                aria-label="Refresh app"
                style={iconButtonStyle}
              >
                <RotateCcw size={14} strokeWidth={2.3} />
              </button>
              <button onClick={onSignOut} style={signOutButtonStyle}>
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <main className="app-main" style={{ paddingBottom: "80px" }}>
          <Outlet />
        </main>

        <nav style={bottomNavStyle}>
          <div style={{ maxWidth: "768px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", height: "100%", padding: "0 4px" }}>
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
