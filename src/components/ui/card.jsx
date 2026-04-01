import * as React from "react";
import { cn } from "../../lib/utils";

export function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        "rounded-4 border border-[rgba(201,176,55,0.7)] bg-[rgba(10,8,0,0.75)] text-white shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,215,0,0.15),inset_0_0_20px_rgba(201,176,55,0.05)] backdrop-blur-[12px] transition duration-300 ease-in-out",
        className
      )}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }) {
  return <div className={cn("p-6", className)} {...props} />;
}
