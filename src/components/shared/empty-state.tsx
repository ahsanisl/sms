import Link from "next/link";
import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Alternative to onAction: render the action as a link. */
  actionHref?: string;
  /** Tighter padding for use inside a card or list. */
  compact?: boolean;
  className?: string;
}

/** Placeholder for empty tables/lists/search results. */
export function EmptyState({ icon = "info", title, description, actionLabel, onAction, actionHref, compact = false, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 text-center", compact ? "py-8" : "py-16", className)}>
      <div className={cn("relative flex items-center justify-center rounded-2xl bg-secondary-fixed/60 text-secondary", compact ? "h-11 w-11" : "h-14 w-14")}>
        <Icon name={icon} className={compact ? "h-5 w-5" : "h-6 w-6"} aria-hidden />
      </div>
      <div>
        <p className={cn("font-semibold text-primary", compact ? "text-body-lg" : "text-title-lg")}>{title}</p>
        {description && <p className="mx-auto mt-1 max-w-[26rem] text-body-md text-on-surface-variant">{description}</p>}
      </div>
      {actionLabel && actionHref && (
        <Button variant="secondary" size="sm" asChild className="mt-1">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
      {actionLabel && !actionHref && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction} className="mt-1">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
