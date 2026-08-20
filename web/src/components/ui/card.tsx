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
        "studio-focus group relative overflow-hidden rounded-3xl border border-line bg-surface text-left shadow-[0_8px_24px_rgba(35,58,31,0.045)] transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-[0_14px_36px_rgba(35,58,31,0.09)]",
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
