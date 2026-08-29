"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { SearchBar } from "@/components/shared/search-bar";
import { FilterBar, type FilterDef } from "@/components/shared/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  accessor?: (row: T) => string | number;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  searchPlaceholder?: string;
  searchKeys?: (row: T) => string[];
  filters?: FilterDef[];
  filterFn?: (row: T, values: Record<string, string>) => boolean;
  pageSize?: number;
  rowActions?: (row: T) => React.ReactNode;
  onRowClick?: (row: T) => void;
  toolbarExtra?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  searchPlaceholder,
  searchKeys,
  filters,
  filterFn,
  pageSize = 10,
  rowActions,
  onRowClick,
  toolbarExtra,
  emptyTitle = "No results found",
  emptyDescription = "Try adjusting your search or filters.",
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let rows = data;
    if (search.trim() && searchKeys) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((row) => searchKeys(row).some((v) => v.toLowerCase().includes(q)));
    }
    if (filterFn && filters?.length) {
      const activeValues = Object.fromEntries(
        Object.entries(filterValues).filter(([, v]) => v),
      );
      if (Object.keys(activeValues).length) {
        rows = rows.filter((row) => filterFn(row, activeValues));
      }
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.accessor) {
        rows = [...rows].sort((a, b) => {
          const av = col.accessor!(a);
          const bv = col.accessor!(b);
          const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
          return sort.dir === "asc" ? cmp : -cmp;
        });
      }
    }
    return rows;
  }, [data, search, searchKeys, filterFn, filterValues, filters, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function toggleSort(key: string) {
    setPage(1);
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }

  return (
    <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/50 shadow-sm flex flex-col">
      {(searchKeys || filters?.length || toolbarExtra) && (
        <div className="p-4 border-b border-outline-variant/30 flex flex-col lg:flex-row gap-4 justify-between bg-surface-bright rounded-t-lg">
          {searchKeys ? (
            <SearchBar
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder={searchPlaceholder}
            />
          ) : (
            <div />
          )}
          <div className="flex flex-wrap items-center gap-2">
            {filters?.length ? (
              <FilterBar
                filters={filters}
                values={filterValues}
                onChange={(key, value) => {
                  setFilterValues((prev) => ({ ...prev, [key]: value }));
                  setPage(1);
                }}
              />
            ) : null}
            {toolbarExtra}
          </div>
        </div>
      )}

      {pageRows.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} icon="search" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/40">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "px-4 py-3 text-label-md font-semibold tracking-wide text-on-surface-variant uppercase whitespace-nowrap",
                      col.sortable && "cursor-pointer select-none hover:text-primary",
                      col.className,
                    )}
                    onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.header}
                      {col.sortable &&
                        (sort?.key === col.key ? (
                          sort.dir === "asc" ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
                        ))}
                    </span>
                  </th>
                ))}
                {rowActions && <th className="px-4 py-3 w-10" />}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr
                  key={rowKey(row)}
                  className={cn(
                    "border-b border-outline-variant/20 last:border-0 hover:bg-surface-container-low/60 transition-colors",
                    onRowClick && "cursor-pointer",
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-4 py-3 text-body-md text-on-surface align-middle", col.className)}>
                      {col.render ? col.render(row) : (col.accessor?.(row) ?? "")}
                    </td>
                  ))}
                  {rowActions && (
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {rowActions(row)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant/30 text-label-md text-on-surface-variant">
        <span>
          Showing {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
          {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}
        </span>
        <div className="flex items-center gap-1">
          <button
            className="p-1.5 rounded hover:bg-surface-container-low disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="p-1.5 rounded hover:bg-surface-container-low disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
