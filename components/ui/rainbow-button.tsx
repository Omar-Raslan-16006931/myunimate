
import React from "react";
import { cn } from "../../lib/utils";
import "./rainbow-button.css";

export type RainbowButtonProps = React.ComponentProps<"button">;

export function RainbowButton({
  children,
  className,
  ...props
}: RainbowButtonProps) {
  return (
    <button
      className={cn(
        "group relative inline-flex h-14 animate-rainbow cursor-pointer items-center justify-center rounded-xl border-0 bg-[length:200%] px-8 py-2 font-bold text-white transition-colors [background-clip:padding-box,border-box,border-box] [background-origin:border-box] [border:calc(0.08*1rem)_solid_transparent] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal-500 disabled:pointer-events-none disabled:opacity-50 shadow-2xl shadow-teal-500/50 active:scale-95 transition-transform",

        // before styles (glow effect around the whole button)
        "before:absolute before:-inset-1 before:-z-10 before:rounded-2xl before:animate-rainbow before:bg-[linear-gradient(90deg,hsl(var(--color-1)),hsl(var(--color-5)),hsl(var(--color-3)),hsl(var(--color-4)),hsl(var(--color-2)))] before:bg-[length:200%] before:opacity-40 before:blur-xl",

        // bg colors (purple gradient)
        "bg-[linear-gradient(#0f9d8d,#0b7d70),linear-gradient(#0f9d8d_50%,rgba(15, 157, 141,0.6)_80%,rgba(15, 157, 141,0)),linear-gradient(90deg,hsl(var(--color-1)),hsl(var(--color-5)),hsl(var(--color-3)),hsl(var(--color-4)),hsl(var(--color-2)))]",

        // dark mode override (same purple for consistency)
        "dark:bg-[linear-gradient(#0f9d8d,#0b7d70),linear-gradient(#0f9d8d_50%,rgba(15, 157, 141,0.6)_80%,rgba(15, 157, 141,0)),linear-gradient(90deg,hsl(var(--color-1)),hsl(var(--color-5)),hsl(var(--color-3)),hsl(var(--color-4)),hsl(var(--color-2)))]",

        className
      )}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-2 text-lg">{children}</span>
    </button>
  );
}
