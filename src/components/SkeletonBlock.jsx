import React from "react";

const skeletonStyleTag = `
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
`;

const baseStyle = {
  background: "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(201,176,55,0.08) 50%, rgba(255,255,255,0.04) 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.5s infinite",
  borderRadius: "8px",
};

export default function SkeletonBlock({ style }) {
  return (
    <>
      <style>{skeletonStyleTag}</style>
      <div aria-hidden="true" style={{ ...baseStyle, ...style }} />
    </>
  );
}
