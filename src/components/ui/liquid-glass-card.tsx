"use client";

/**
 * @description: Tweet Card - Modern glass card with hover gradient effects
 * @license: MIT
 * Based on KokonutUI X Card - https://kokonutui.com
 * Adapted for use as form container
 */

import { cva, type VariantProps } from "class-variance-authority";
import React from "react";
import { cn } from "@/lib/utils";

// Tweet Card variants
const liquidGlassCardVariants = cva(
  "group relative will-change-transform",
  {
    variants: {
      glassSize: {
        sm: "",
        default: "",
        lg: "",
      },
    },
    defaultVariants: {
      glassSize: "default",
    },
  }
);

export type LiquidGlassCardProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof liquidGlassCardVariants> & {
    glassEffect?: boolean;
  };

function LiquidGlassCard({
  className,
  glassSize,
  glassEffect = true,
  children,
  ...props
}: LiquidGlassCardProps) {
  const paddingClass = glassSize === "sm" ? "p-4" : glassSize === "lg" ? "p-6 md:p-8" : "p-6";

  return (
    <div
      className={cn(
        liquidGlassCardVariants({ glassSize }),
        className
      )}
      style={{ transform: "translateZ(0)" }}
      {...props}
    >
      {/* Gradient hover effect background */}
      <div
        className={cn(
          "absolute -inset-[1px] rounded-2xl opacity-0 blur-sm transition-opacity duration-500",
          "bg-gradient-to-br from-blue-200 via-blue-300/80 to-cyan-400",
          "dark:from-blue-500/40 dark:via-blue-600/30 dark:to-cyan-500/40",
          "group-hover:opacity-100"
        )}
      />

      {/* Card container */}
      <div
        className={cn(
          "relative rounded-2xl overflow-hidden",
          "bg-white/95 dark:bg-zinc-900/95",
          "shadow-[0_8px_40px_rgba(0,0,0,0.08)]",
          "dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)]",
          "backdrop-blur-xl",
          "transition-all duration-300"
        )}
      >
        {/* Inner gradient overlay on hover */}
        <div
          className={cn(
            "absolute inset-0 opacity-0 transition-opacity duration-500",
            "bg-gradient-to-br from-blue-50/50 via-transparent to-cyan-50/30",
            "dark:from-blue-500/5 dark:via-transparent dark:to-cyan-500/5",
            "group-hover:opacity-100"
          )}
        />

        {/* Top highlight line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-300/60 to-transparent dark:via-zinc-600/40" />

        {/* Content with proper text colors for both themes */}
        <div className={cn("relative z-10 text-foreground", paddingClass)}>
          {children}
        </div>
      </div>
    </div>
  );
}

export { LiquidGlassCard };
export default LiquidGlassCard;
