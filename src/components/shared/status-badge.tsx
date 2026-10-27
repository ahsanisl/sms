import { cn } from "@/lib/utils";

export type StatusTone = "success" | "error" | "warning" | "info" | "neutral";

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-success-container/70 text-on-success-container ring-success/20",
  error: "bg-error-container/70 text-on-error-container ring-error/20",
  warning: "bg-warning-container/80 text-on-warning-container ring-warning/20",
  info: "bg-secondary-fixed/70 text-on-secondary-fixed-variant ring-secondary/20",
  neutral: "bg-surface-container text-on-surface-variant ring-outline-variant/60",
};

const DOT_CLASSES: Record<StatusTone, string> = {
  success: "bg-success",
  error: "bg-error",
  warning: "bg-warning",
  info: "bg-secondary",
  neutral: "bg-outline",
};

interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
  className?: string;
}

/** Small color-coded status pill (Active/Paid/Overdue/Present, etc). */
export function StatusBadge({ label, tone = "neutral", className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        TONE_CLASSES[tone],
        className,
      )}
    >
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", DOT_CLASSES[tone])} />
      {label}
    </span>
  );
}
