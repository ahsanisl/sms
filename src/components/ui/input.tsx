import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "w-full bg-surface border border-outline-variant rounded-md px-md py-2",
        "text-body-md text-on-surface placeholder:text-on-surface-variant/60",
        "focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary",
        "disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
        className,
      )}
      {...props}
    />
  );
}
