import React from "react";

const fadeInStyleTag = `
@keyframes contentFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
`;

export default function FadeIn({ children }) {
  return (
    <>
      <style>{fadeInStyleTag}</style>
      <div style={{ animation: "contentFadeIn 200ms ease" }}>
        {children}
      </div>
    </>
  );
}
