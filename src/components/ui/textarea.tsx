import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "w-full bg-surface border border-outline-variant rounded-md px-md py-2",
        "text-body-md text-on-surface placeholder:text-on-surface-variant/60",
        "focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary",
        "disabled:opacity-50 disabled:cursor-not-allowed transition-colors resize-y",
        className,
      )}
      {...props}
    />
  );
}
