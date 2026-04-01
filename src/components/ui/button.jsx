import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "../../lib/utils";

export function Button({ className, asChild = false, ...props }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center rounded-3 border border-[#C9B037] bg-transparent px-5 py-3 font-600 text-white transition duration-300 ease-in-out hover:bg-[rgba(201,176,55,0.2)]",
        className
      )}
      {...props}
    />
  );
}
