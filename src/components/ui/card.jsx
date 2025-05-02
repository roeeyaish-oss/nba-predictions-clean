// card.jsx
import * as React from "react"
import { cn } from "../../lib/utils"

export function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-red-600 bg-black/50 shadow-xl backdrop-blur-md text-white ring-1 ring-red-500/50 hover:ring-red-400/80 transition duration-300 ease-in-out",
        className
      )}
      {...props}
    />
  )
}

export function CardContent({ className, ...props }) {
  return (
    <div className={cn("p-6", className)} {...props} />
  )
}
