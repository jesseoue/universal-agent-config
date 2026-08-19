"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export function Switch({ className, ...props }: SwitchPrimitive.SwitchProps) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-white/15 bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300 data-[state=checked]:border-lime-300/50 data-[state=checked]:bg-lime-300/20",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-4 translate-x-1 rounded-full bg-white/80 shadow transition-transform data-[state=checked]:translate-x-6 data-[state=checked]:bg-lime-200" />
    </SwitchPrimitive.Root>
  );
}
