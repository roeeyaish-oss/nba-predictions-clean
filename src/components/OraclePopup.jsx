import React, { useEffect } from "react";

const ANNOUNCER_URL =
  "https://mdllwtozvzjrlkexrdwk.supabase.co/storage/v1/object/public/avatars/announcer.png";

export default function OraclePopup({ data, onClose }) {
  // Close on Escape key
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "360px",
          background: "rgba(8,5,0,0.85)",
          border: "1.5px solid rgba(201,176,55,0.8)",
          borderRadius: "20px",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,215,0,0.1)",
          padding: "32px 28px 28px",
          textAlign: "center",
        }}
      >
        {/* X button */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: "14px",
            right: "16px",
            background: "none",
            border: "none",
            color: "#C9B037",
            fontSize: "20px",
            lineHeight: 1,
            cursor: "pointer",
            padding: "4px",
          }}
        >
          ✕
        </button>

        {/* Announcer image */}
        <img
          src={ANNOUNCER_URL}
          alt="Announcer"
          style={{
            width: "120px",
            height: "120px",
            objectFit: "contain",
            display: "block",
            margin: "0 auto 20px",
          }}
        />

        {/* Dynamic title */}
        <p
          style={{
            margin: "0 0 16px",
            color: "#C9B037",
            fontSize: "28px",
            fontWeight: 900,
            letterSpacing: "0.1em",
            lineHeight: 1.1,
            textTransform: "uppercase",
          }}
        >
          {data.title}
        </p>

        {/* Recap text - renders **bold** as <strong> without dangerouslySetInnerHTML */}
        <p
          style={{
            margin: 0,
            color: "rgba(255,255,255,0.9)",
            fontSize: "15px",
            lineHeight: 1.6,
          }}
        >
          {data.recap.split("**").map((part, i) =>
            i % 2 === 1 ? <strong key={i}>{part}</strong> : part
          )}
        </p>
      </div>
    </div>
  );
}
