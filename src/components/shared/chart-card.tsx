import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  height?: number;
}

/** Card chrome around a Recharts chart — replaces Stitch's "simulated chart" divs. */
export function ChartCard({ title, description, action, children, className, height = 256 }: ChartCardProps) {
  return (
    <div className={cn("rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-lg card-shadow", className)}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-title-lg font-semibold text-primary">{title}</h3>
          {description && <p className="mt-0.5 text-body-md text-on-surface-variant">{description}</p>}
        </div>
        {action}
      </div>
      <div style={{ height }} className="w-full">
        {children}
      </div>
    </div>
  );
}
