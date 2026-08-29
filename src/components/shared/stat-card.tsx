import { Icon } from "@/components/shared/icon";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  trend?: {
    direction: "up" | "down" | "flat";
    label: string;
  };
  className?: string;
}

const TREND_COLOR: Record<NonNullable<StatCardProps["trend"]>["direction"], string> = {
  up: "text-emerald-600",
  down: "text-error",
  flat: "text-on-surface-variant",
};

const TREND_ICON: Record<NonNullable<StatCardProps["trend"]>["direction"], string> = {
  up: "trending_up",
  down: "trending_down",
  flat: "remove",
};

/** KPI card used across dashboards — value + label + trend indicator. */
export function StatCard({ label, value, icon, trend, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-surface rounded-xl p-lg border border-outline-variant card-shadow card-hover-shadow relative overflow-hidden",
        className,
      )}
    >
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Icon name={icon} size={48} />
      </div>
      <h3 className="text-label-md font-medium tracking-wide text-on-surface-variant uppercase mb-2">
        {label}
      </h3>
      <div className="text-headline-lg font-semibold text-primary mb-2">{value}</div>
      {trend && (
        <div className={cn("flex items-center gap-1", TREND_COLOR[trend.direction])}>
          <Icon name={TREND_ICON[trend.direction]} size={16} />
          <span className="text-label-sm">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
