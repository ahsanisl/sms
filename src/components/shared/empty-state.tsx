import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Placeholder for empty tables/lists/search results. */
export function EmptyState({
  icon = "info",
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
        <Icon name={icon} size={26} />
      </div>
      <div>
        <p className="text-title-lg font-semibold text-primary">{title}</p>
        {description && (
          <p className="text-body-md text-on-surface-variant mt-1 max-w-[24rem]">
            {description}
          </p>
        )}
      </div>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
