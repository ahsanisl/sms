import * as React from "react";
import { fieldClasses } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(fieldClasses, "resize-y", className)} {...props} />;
}
