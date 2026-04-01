// button.jsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "../../lib/utils"

export function Button({ className, asChild = false, ...props }) {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center rounded-full px-6 py-3 font-semibold border border-red-500 text-white hover:bg-red-500 hover:text-black transition duration-300 ease-in-out",
        className
      )}
      {...props}
    />
  )
}
