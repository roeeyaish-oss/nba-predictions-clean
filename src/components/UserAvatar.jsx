import React from "react";

function getInitials(name) {
  return (name || "?")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";
}

export default function UserAvatar({ avatarUrl, name, size = 36, textSize = 14 }) {
  const sharedStyle = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "50%",
    border: "2px solid #C9B037",
    flexShrink: 0,
  };

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name ? `${name} avatar` : "User avatar"}
        style={{
          ...sharedStyle,
          objectFit: "cover",
        }}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      style={{
        ...sharedStyle,
        background: "#C9B037",
        color: "#000",
        fontWeight: 700,
        fontSize: `${textSize}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {getInitials(name)}
    </div>
  );
}
