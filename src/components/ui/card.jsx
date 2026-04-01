import * as React from "react";
import { cn } from "../../lib/utils";

const cardStyle = {
  background: "rgba(8,5,0,0.88)",
  border: "1.5px solid rgba(201,176,55,0.8)",
  borderRadius: "16px",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,215,0,0.08)",
  color: "#fff",
  transition: "all 0.3s ease-in-out",
};

export function Card({ className, style, ...props }) {
  return (
    <div
      className={cn("", className)}
      style={{ ...cardStyle, ...style }}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }) {
  return <div className={cn("", className)} style={{ padding: "16px" }} {...props} />;
}
