import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

/** Standard page title + description + right-aligned action buttons row. */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8",
        className,
      )}
    >
      <div>
        <h1 className="text-headline-lg font-semibold text-primary">{title}</h1>
        {description && (
          <p className="text-body-md text-on-surface-variant mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}
