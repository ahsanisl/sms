import { cn } from "@/lib/utils";

/** Shimmering placeholder block shown while content loads (see .skeleton in globals.css). */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div aria-hidden className={cn("skeleton rounded-md", className)} {...props} />;
}
