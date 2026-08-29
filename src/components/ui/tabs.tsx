"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "flex items-center gap-1 border-b border-outline-variant overflow-x-auto hide-scrollbar",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "relative shrink-0 px-4 py-3 text-label-md font-semibold text-on-surface-variant",
        "border-b-2 border-transparent transition-colors hover:text-primary",
        "data-[state=active]:text-primary data-[state=active]:border-primary",
        "outline-none focus-visible:ring-2 focus-visible:ring-secondary rounded-t",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn("outline-none pt-6", className)}
      {...props}
    />
  );
}
