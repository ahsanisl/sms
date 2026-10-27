import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  /** Renders a small "← backLabel" link above the title, for detail/create screens. */
  backHref?: string;
  backLabel?: string;
  className?: string;
}

/** Small "← Label" link back to the parent screen, shown above a detail/create page's title. */
export function BackLink({ href, label = "Back", className }: { href: string; label?: string; className?: string }) {
  return (
    <Link href={href} className={cn("mb-2 inline-flex items-center gap-1 text-label-md font-medium text-on-surface-variant transition-colors hover:text-secondary print:hidden", className)}>
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
      {label}
    </Link>
  );
}

/** Standard page title + description + right-aligned action buttons row. */
export function PageHeader({ title, description, actions, backHref, backLabel = "Back", className }: PageHeaderProps) {
  return (
    <div className={cn("mb-6 flex flex-col justify-between gap-4 md:mb-8 md:flex-row md:items-end", className)}>
      <div className="min-w-0">
        {backHref && <BackLink href={backHref} label={backLabel} />}
        <h1 className="text-headline-md font-semibold tracking-tight text-primary md:text-headline-lg">{title}</h1>
        {description && <p className="mt-1 max-w-[48rem] text-body-md text-on-surface-variant">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:gap-3">{actions}</div>}
    </div>
  );
}
