import React, { useEffect, useState } from "react";
import { ANNOUNCER_URL, ANNOUNCER_HE_URL } from "@/lib/constants";

export default function OraclePopup({ data, onClose }) {
  const isHebrew = data.announcer === "he";
  const announcerImg = isHebrew ? ANNOUNCER_HE_URL : ANNOUNCER_URL;
  const announcerName = isHebrew ? "גיל ברק" : "Mike Breen";
  const [imgLoaded, setImgLoaded] = useState(false);

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

        {/* Announcer image — fixed container height prevents layout jump */}
        <div style={{ width: "120px", height: "120px", margin: "0 auto 6px", position: "relative", borderRadius: "50%", overflow: "hidden" }}>
          {!imgLoaded && (
            <div
              className="skeleton-block"
              style={{ position: "absolute", inset: 0, borderRadius: "50%" }}
            />
          )}
          <img
            src={announcerImg}
            alt={announcerName}
            onLoad={() => setImgLoaded(true)}
            style={{
              width: "120px",
              height: "120px",
              objectFit: "contain",
              display: "block",
              opacity: imgLoaded ? 1 : 0,
              transition: "opacity 0.2s ease",
            }}
          />
        </div>

        {/* Announcer name */}
        <p
          style={{
            margin: "0 0 18px",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "rgba(201,176,55,0.7)",
          }}
        >
          {announcerName}
        </p>

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
          dir={isHebrew ? "rtl" : "ltr"}
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
