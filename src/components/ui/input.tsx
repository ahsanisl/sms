import * as React from "react";
import { cn } from "@/lib/utils";

/** Shared look for text-like controls (Input, Textarea) — exported so Select stays visually in step. */
export const fieldClasses = cn(
  "w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-md py-2",
  "text-body-md text-on-surface placeholder:text-on-surface-variant/60",
  "hover:border-outline focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20",
  "aria-[invalid=true]:border-error aria-[invalid=true]:focus:ring-error/20",
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-container-low transition-colors",
);

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(fieldClasses, className)} {...props} />;
}
