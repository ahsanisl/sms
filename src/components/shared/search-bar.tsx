import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/** Search input with a leading icon and a clear button, matching the Stitch toolbar search field. */
export function SearchBar({ value, onChange, placeholder = "Search…", className }: SearchBarProps) {
  return (
    <div className={cn("relative w-full lg:max-w-[28rem]", className)}>
      <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && value) {
            e.stopPropagation();
            onChange("");
          }
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(
          "h-9 w-full rounded-lg border border-outline-variant bg-surface-container-lowest pl-10 pr-9",
          "text-body-md text-on-surface placeholder:text-on-surface-variant/60 [&::-webkit-search-cancel-button]:hidden",
          "hover:border-outline focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-colors",
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-on-surface-variant hover:bg-surface-container hover:text-primary outline-none focus-visible:ring-2 focus-visible:ring-secondary"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
