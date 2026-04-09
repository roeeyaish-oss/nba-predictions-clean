import React from "react";
import { X } from "lucide-react";

function getInitials(name) {
  return (name || "?").trim().split(/\s+/).filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "?";
}

export default function AvatarModal({ avatarUrl, name, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          background: "rgba(8,5,0,0.92)",
          border: "1.5px solid rgba(201,176,55,0.7)",
          borderRadius: "20px",
          padding: "32px 24px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
          boxShadow: "0 8px 48px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,215,0,0.08)",
          maxWidth: "360px",
          width: "100%",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            background: "transparent",
            border: "none",
            color: "rgba(255,255,255,0.55)",
            cursor: "pointer",
            padding: "4px",
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={18} strokeWidth={2.2} />
        </button>

        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name ? `${name} avatar` : "User avatar"}
            style={{
              width: "300px",
              height: "300px",
              objectFit: "cover",
              borderRadius: "50%",
              border: "2px solid #C9B037",
              boxShadow: "0 0 32px rgba(201,176,55,0.3)",
            }}
          />
        ) : (
          <div
            style={{
              width: "300px",
              height: "300px",
              borderRadius: "50%",
              background: "#C9B037",
              color: "#000",
              fontWeight: 700,
              fontSize: "80px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #C9B037",
            }}
          >
            {getInitials(name)}
          </div>
        )}

        {name && (
          <p style={{ margin: 0, color: "#fff", fontWeight: 600, fontSize: "16px", textAlign: "center" }}>
            {name}
          </p>
        )}
      </div>
    </div>
  );
}
