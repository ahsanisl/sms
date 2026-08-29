"use client";

import type { CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--color-surface-container-lowest)",
          "--normal-text": "var(--color-on-surface)",
          "--normal-border": "var(--color-outline-variant)",
        } as CSSProperties
      }
      position="top-right"
      richColors
      {...props}
    />
  );
}
