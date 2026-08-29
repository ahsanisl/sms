import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterDef {
  key: string;
  label: string;
  options: FilterOption[];
}

interface FilterBarProps {
  filters: FilterDef[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  className?: string;
}

/** Row of select-based filters used alongside a SearchBar in table toolbars. */
export function FilterBar({ filters, values, onChange, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 overflow-x-auto pb-1 lg:pb-0 hide-scrollbar",
        className,
      )}
    >
      {filters.map((filter) => (
        <Select
          key={filter.key}
          value={values[filter.key] ?? ""}
          onChange={(e) => onChange(filter.key, e.target.value)}
        >
          <option value="">{filter.label}</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      ))}
    </div>
  );
}
