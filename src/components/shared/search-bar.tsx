import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/** Search input with a leading icon, matching the Stitch toolbar search field. */
export function SearchBar({ value, onChange, placeholder = "Search…", className }: SearchBarProps) {
  return (
    <div className={cn("relative w-full lg:max-w-[28rem]", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-on-surface-variant" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant rounded",
          "text-body-md text-on-surface placeholder:text-on-surface-variant/60",
          "focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-colors",
        )}
      />
    </div>
  );
}
