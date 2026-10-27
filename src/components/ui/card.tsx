import { cn } from "@/lib/utils";

/** Standard content surface — white card, hairline border, soft shadow. */
export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-xl border border-outline-variant/70 bg-surface-container-lowest card-shadow", className)} {...props} />;
}

interface CardHeaderProps extends Omit<React.ComponentProps<"div">, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Optional icon name rendered in a tinted chip before the title. */
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

/** Title row for a Card: title + optional description on the left, an action (link/button) on the right. */
export function CardHeader({ title, description, icon, action, className, ...props }: CardHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 px-lg pt-lg", className)} {...props}>
      <div className="flex min-w-0 items-start gap-3">
        {icon}
        <div className="min-w-0">
          <h2 className="text-title-lg font-semibold text-primary">{title}</h2>
          {description && <p className="mt-0.5 text-body-md text-on-surface-variant">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-lg", className)} {...props} />;
}
