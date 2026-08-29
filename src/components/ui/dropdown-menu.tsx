"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;
export const DropdownMenuSub = DropdownMenuPrimitive.Sub;
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-[10rem] overflow-hidden rounded-lg border border-outline-variant",
          "bg-surface-container-lowest p-1 shadow-lg animate-content-in",
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-2",
        "text-body-md text-on-surface outline-none transition-colors",
        "hover:bg-surface-container-low focus:bg-surface-container-low",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        inset && "pl-8",
        variant === "destructive" && "text-error hover:bg-error-container/40 focus:bg-error-container/40",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-md py-2 pl-8 pr-2.5",
        "text-body-md text-on-surface outline-none transition-colors hover:bg-surface-container-low",
        className,
      )}
      checked={checked}
      {...props}
    >
      <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-md py-2 pl-8 pr-2.5",
        "text-body-md text-on-surface outline-none transition-colors hover:bg-surface-container-low",
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Circle className="h-2 w-2 fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

export function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & { inset?: boolean }) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn(
        "px-2.5 py-1.5 text-label-md text-on-surface-variant uppercase",
        inset && "pl-8",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      className={cn("-mx-1 my-1 h-px bg-outline-variant/60", className)}
      {...props}
    />
  );
}

export function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & { inset?: boolean }) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-2 text-body-md",
        "outline-none hover:bg-surface-container-low data-[state=open]:bg-surface-container-low",
        inset && "pl-8",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto h-4 w-4" />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

export function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-lg border border-outline-variant",
        "bg-surface-container-lowest p-1 shadow-lg animate-content-in",
        className,
      )}
      {...props}
    />
  );
}
