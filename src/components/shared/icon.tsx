import type { LucideProps } from "lucide-react";
import { HelpCircle } from "lucide-react";
import { iconMap } from "@/lib/icon-map";

interface IconProps extends LucideProps {
  name: string;
}

/** Renders a Lucide icon looked up by its (former Material Symbols) name. */
export function Icon({ name, ...props }: IconProps) {
  const LucideIcon = iconMap[name] ?? HelpCircle;
  return <LucideIcon {...props} />;
}
