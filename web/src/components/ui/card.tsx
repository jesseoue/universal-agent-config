import * as React from "react";
import { cn } from "@/lib/utils";

type CardProps = React.HTMLAttributes<HTMLElement> & {
  as?: "div" | "button";
  type?: "button" | "submit";
};

export function Card({ className, as = "div", type, ...props }: CardProps) {
  const Component = as;
  return (
    <Component
      {...(as === "button" ? { type: type ?? "button" } : {})}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-sm font-semibold tracking-tight text-white", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm leading-relaxed text-white/55", className)} {...props} />;
}
