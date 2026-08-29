import { cn } from "@/lib/utils";

export type StatusTone = "success" | "error" | "warning" | "info" | "neutral";

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-green-100 text-green-800 border-green-200",
  error: "bg-red-100 text-red-800 border-red-200",
  warning: "bg-amber-100 text-amber-800 border-amber-200",
  info: "bg-secondary-container/20 text-secondary border-secondary-container/30",
  neutral: "bg-surface-container text-on-surface-variant border-outline-variant",
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
        "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border whitespace-nowrap",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
