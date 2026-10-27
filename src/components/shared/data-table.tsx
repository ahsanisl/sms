"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight, X } from "lucide-react";
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
  /** Shown when the table has no rows at all (as opposed to no rows matching the current search/filters). */
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

  const activeFilterCount = Object.values(filterValues).filter(Boolean).length;
  const isFiltering = search.trim().length > 0 || activeFilterCount > 0;

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
          const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true });
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

  function clearAll() {
    setSearch("");
    setFilterValues({});
    setPage(1);
  }

  return (
    <div className="flex flex-col rounded-xl border border-outline-variant/70 bg-surface-container-lowest card-shadow">
      {(searchKeys || filters?.length || toolbarExtra) && (
        <div className="flex flex-col justify-between gap-3 rounded-t-xl border-b border-outline-variant/50 p-4 lg:flex-row lg:items-center">
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
            {isFiltering && (
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-label-md font-semibold text-secondary hover:bg-secondary-fixed/50 outline-none focus-visible:ring-2 focus-visible:ring-secondary"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
                Clear{activeFilterCount > 0 ? ` (${activeFilterCount + (search.trim() ? 1 : 0)})` : ""}
              </button>
            )}
            {toolbarExtra}
          </div>
        </div>
      )}

      {pageRows.length === 0 ? (
        data.length > 0 && isFiltering ? (
          <EmptyState title="No matching results" description="Nothing matches your current search or filters." icon="search" actionLabel="Clear search & filters" onAction={clearAll} />
        ) : (
          <EmptyState title={emptyTitle} description={emptyDescription} icon="inbox" />
        )
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant/50 bg-surface-container-low/60">
                {columns.map((col) => {
                  const sorted = sort?.key === col.key ? sort.dir : null;
                  return (
                    <th
                      key={col.key}
                      scope="col"
                      aria-sort={col.sortable ? (sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none") : undefined}
                      className={cn("whitespace-nowrap px-4 py-3 text-label-md font-semibold uppercase tracking-wide text-on-surface-variant", col.className)}
                    >
                      {col.sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(col.key)}
                          className={cn("-mx-1 inline-flex items-center gap-1 rounded px-1 uppercase tracking-wide hover:text-primary outline-none focus-visible:ring-2 focus-visible:ring-secondary", sorted && "text-primary")}
                        >
                          {col.header}
                          {sorted === "asc" ? <ChevronUp className="h-3.5 w-3.5" aria-hidden /> : sorted === "desc" ? <ChevronDown className="h-3.5 w-3.5" aria-hidden /> : <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" aria-hidden />}
                        </button>
                      ) : (
                        col.header
                      )}
                    </th>
                  );
                })}
                {rowActions && (
                  <th scope="col" className="w-10 px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr
                  key={rowKey(row)}
                  className={cn(
                    "border-b border-outline-variant/30 transition-colors last:border-0 hover:bg-surface-container-low/70",
                    onRowClick && "cursor-pointer focus-visible:bg-surface-container-low focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-secondary",
                  )}
                  onClick={() => onRowClick?.(row)}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          // Only the row itself — not Enter/Space on a link or button inside it.
                          if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-4 py-3 align-middle text-body-md text-on-surface", col.className)}>
                      {col.render ? col.render(row) : (col.accessor?.(row) ?? "")}
                    </td>
                  ))}
                  {rowActions && (
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                      {rowActions(row)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-outline-variant/50 px-4 py-3 text-label-md text-on-surface-variant sm:flex-row sm:items-center sm:justify-between">
        <span aria-live="polite">
          {filtered.length === 0 ? (
            "No records"
          ) : (
            <>
              Showing <span className="font-semibold text-on-surface">{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)}</span> of{" "}
              <span className="font-semibold text-on-surface">{filtered.length}</span>
              {isFiltering && data.length !== filtered.length ? ` (filtered from ${data.length})` : ""}
            </>
          )}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded-lg p-1.5 hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-40 outline-none focus-visible:ring-2 focus-visible:ring-secondary"
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
              type="button"
              className="rounded-lg p-1.5 hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-40 outline-none focus-visible:ring-2 focus-visible:ring-secondary"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
