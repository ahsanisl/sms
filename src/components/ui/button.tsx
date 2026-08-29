import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded font-label-md text-label-md font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-1 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-secondary text-white hover:bg-secondary/90 shadow-sm",
        secondary:
          "bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-low shadow-sm",
        ghost: "text-on-surface-variant hover:bg-surface-container-low hover:text-primary",
        destructive: "bg-error text-white hover:bg-error/90 shadow-sm",
        link: "text-secondary hover:underline p-0 h-auto",
      },
      size: {
        sm: "h-8 px-3 text-[13px] [&_svg]:size-4",
        md: "h-10 px-4 [&_svg]:size-[18px]",
        lg: "h-11 px-5 text-body-md [&_svg]:size-5",
        icon: "h-9 w-9 rounded-full [&_svg]:size-5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
}
