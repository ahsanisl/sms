import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Icon } from "@/components/shared/icon";
import { cn } from "@/lib/utils";

export type StatTone = "default" | "success" | "warning" | "error";

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  trend?: {
    direction: "up" | "down" | "flat";
    label: string;
  };
  /** Colors the icon chip — e.g. "error" for an outstanding balance. */
  tone?: StatTone;
  /** Makes the whole card a link to the screen behind the number. */
  href?: string;
  className?: string;
}

const TREND_COLOR: Record<NonNullable<StatCardProps["trend"]>["direction"], string> = {
  up: "text-success",
  down: "text-error",
  flat: "text-on-surface-variant",
};

const TREND_ICON: Record<NonNullable<StatCardProps["trend"]>["direction"], string> = {
  up: "trending_up",
  down: "trending_down",
  flat: "remove",
};

const TONE_CHIP: Record<StatTone, string> = {
  default: "bg-secondary-fixed text-secondary",
  success: "bg-success-container text-success",
  warning: "bg-warning-container text-warning",
  error: "bg-error-container text-error",
};

/** KPI card used across dashboards — value + label + trend indicator, optionally linking to its detail screen. */
export function StatCard({ label, value, icon, trend, tone = "default", href, className }: StatCardProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-label-md font-medium uppercase tracking-wide text-on-surface-variant">{label}</p>
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", TONE_CHIP[tone])}>
          <Icon name={icon} className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <p className="mt-1 text-headline-md font-semibold tracking-tight text-primary tabular-nums">{value}</p>
      {trend && (
        <span className={cn("mt-1.5 flex items-center gap-1 pr-5 text-label-sm", TREND_COLOR[trend.direction])}>
          <Icon name={TREND_ICON[trend.direction]} className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {trend.label}
        </span>
      )}
      {/* Positioned, so a card without a trend line doesn't keep an empty row for it. */}
      {href && <ArrowUpRight aria-hidden className="absolute bottom-3 right-3 h-4 w-4 text-on-surface-variant opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />}
    </>
  );

  const classes = cn("group relative block rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-4 card-shadow", href && "card-hover-shadow hover:border-secondary/40", className);

  if (href) {
    return (
      <Link href={href} className={classes}>
        {body}
      </Link>
    );
  }
  return <div className={classes}>{body}</div>;
}
