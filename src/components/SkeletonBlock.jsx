import React from "react";

export default function SkeletonBlock({ style }) {
  return <div aria-hidden="true" className="skeleton-block" style={style} />;
}
