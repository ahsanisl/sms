import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Native <select> styled to match the Stitch filter/select pattern
 * (custom chevron, bordered pill). Kept native rather than a Radix Select
 * for simplicity — every use case here is a plain single-choice dropdown.
 */
export function Select({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div className="relative inline-flex">
      <select
        className={cn(
          "appearance-none pr-8 pl-3 py-1.5 bg-surface-container-lowest border border-outline-variant",
          "rounded text-label-md font-label-md text-on-surface",
          "focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary",
          "disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
    </div>
  );
}
