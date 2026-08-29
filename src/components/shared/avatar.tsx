import { cn } from "@/lib/utils";

const PALETTE = [
  "bg-secondary-container text-on-secondary-container",
  "bg-primary-container text-on-primary-container",
  "bg-tertiary-container text-on-tertiary-container",
  "bg-surface-container-high text-on-surface",
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function paletteIndex(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return hash % PALETTE.length;
}

interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-16 h-16 text-lg",
};

/** Initials-based avatar, used in place of the hotlinked Stitch photos. */
export function Avatar({ name, size = "sm", className }: AvatarProps) {
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-semibold shrink-0 select-none",
        SIZES[size],
        PALETTE[paletteIndex(name)],
        className,
      )}
      title={name}
      aria-label={name}
    >
      {initials(name) || "?"}
    </div>
  );
}
