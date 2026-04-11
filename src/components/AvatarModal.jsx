import React, { useEffect } from "react";
import { createPortal } from "react-dom";

function getInitials(name) {
  return (name || "?").trim().split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "?";
}

export default function AvatarModal({ avatarUrl, name, onClose }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      onClick={onClose}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          onClose();
        }
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        padding: "24px",
      }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name ? `${name} avatar` : "User avatar"}
          style={{
            width: "min(300px, calc(100vw - 48px))",
            height: "min(300px, calc(100vh - 120px))",
            maxWidth: "300px",
            maxHeight: "300px",
            objectFit: "contain",
            display: "block",
          }}
        />
      ) : (
        <div
          style={{
            width: "min(300px, calc(100vw - 48px))",
            height: "min(300px, calc(100vh - 120px))",
            maxWidth: "300px",
            maxHeight: "300px",
            background: "#C9B037",
            color: "#000",
            fontWeight: 700,
            fontSize: "80px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
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
    </div>,
    document.body
  );
}
