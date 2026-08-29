import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

/** Label + control + error/hint wrapper, matching the Stitch form layout. */
export function FormField({
  label,
  htmlFor,
  required,
  error,
  hint,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-error"> *</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-label-sm text-error">{error}</p>
      ) : hint ? (
        <p className="text-label-sm text-on-surface-variant">{hint}</p>
      ) : null}
    </div>
  );
}
