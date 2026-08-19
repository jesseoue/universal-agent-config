"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export function Switch({ className, ...props }: SwitchPrimitive.SwitchProps) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "studio-focus peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-line-strong bg-white/[0.045] transition-colors data-[state=checked]:border-accent/50 data-[state=checked]:bg-accent/20",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-4 translate-x-1 rounded-full bg-white/80 shadow transition-transform data-[state=checked]:translate-x-6 data-[state=checked]:bg-accent" />
    </SwitchPrimitive.Root>
  );
}
