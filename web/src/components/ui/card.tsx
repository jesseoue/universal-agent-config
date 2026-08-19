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
        "studio-focus group relative overflow-hidden rounded-3xl border border-line bg-white/[0.023] text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/35 hover:bg-white/[0.04]",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-semibold tracking-tight text-text", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm leading-relaxed text-muted", className)} {...props} />;
}
