"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "studio-focus inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        primary: "bg-accent text-[#0b0d0a] shadow-[0_10px_30px_rgba(217,248,113,0.18)] hover:bg-accent-strong",
        secondary: "border border-line-strong bg-white/[0.045] text-text hover:border-accent/40 hover:bg-accent-soft",
        ghost: "text-muted hover:bg-white/[0.045] hover:text-text",
        danger: "border border-danger/35 bg-danger/10 text-danger hover:bg-danger/20",
      },
      size: {
        sm: "h-9 rounded-lg px-3",
        md: "h-10 rounded-xl px-4",
        lg: "h-12 rounded-2xl px-6 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
