"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { classNames } from "@/lib/utils";

export interface DataTableColumn<TRow> {
  id: string;
  header: ReactNode;
  cell: (row: TRow) => ReactNode;
  align?: "left" | "right" | "center";
  width?: string;
  hideOnMobile?: boolean;
}

interface DataTableProps<TRow> {
  rows: TRow[];
  columns: DataTableColumn<TRow>[];
  rowKey: (row: TRow) => string;
  searchPlaceholder?: string;
  searchAccessor?: (row: TRow) => string;
  onRowClick?: (row: TRow) => void;
  emptyState?: ReactNode;
  pageSize?: number;
  toolbar?: ReactNode;
}

export function DataTable<TRow>({
  rows,
  columns,
  rowKey,
  searchPlaceholder,
  searchAccessor,
  onRowClick,
  emptyState,
  pageSize = 10,
  toolbar,
}: DataTableProps<TRow>) {
  const [query, setQuery] = useState("");
  const [pageIndex, setPageIndex] = useState(0);

  const filteredRows = useMemo(() => {
    if (!query.trim() || !searchAccessor) {
      return rows;
    }
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => searchAccessor(row).toLowerCase().includes(needle));
  }, [rows, query, searchAccessor]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePageIndex = Math.min(pageIndex, totalPages - 1);
  const visibleRows = filteredRows.slice(
    safePageIndex * pageSize,
    safePageIndex * pageSize + pageSize,
  );

  function handlePrev() {
    setPageIndex((current) => Math.max(0, current - 1));
  }

  function handleNext() {
    setPageIndex((current) => Math.min(totalPages - 1, current + 1));
  }

  function handleSearchChange(event: React.ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
    setPageIndex(0);
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)]">
      {(searchAccessor || toolbar) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-ink-100)] px-5 py-3.5">
          {searchAccessor ? (
            <label className="relative flex h-9 max-w-xs flex-1 items-center">
              <Search
                size={14}
                className="pointer-events-none absolute left-2.5 text-[var(--color-ink-400)]"
              />
              <input
                type="search"
                value={query}
                onChange={handleSearchChange}
                placeholder={searchPlaceholder ?? "Search…"}
                className="h-full w-full rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] pl-8 pr-3 text-sm text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-400)] focus:border-[var(--color-ink-400)] focus:outline-none"
              />
            </label>
          ) : (
            <span />
          )}
          {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
        </div>
      )}

      {visibleRows.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-[var(--color-ink-500)]">
          {emptyState ?? "No results."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/60 text-[var(--color-ink-500)]">
                {columns.map((column) => (
                  <th
                    key={column.id}
                    scope="col"
                    style={column.width ? { width: column.width } : undefined}
                    className={classNames(
                      "px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em]",
                      column.align === "right" && "text-right",
                      column.align === "center" && "text-center",
                      column.align !== "right" && column.align !== "center" && "text-left",
                      column.hideOnMobile && "hidden md:table-cell",
                    )}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-ink-100)]">
              {visibleRows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={classNames(
                    "transition-colors",
                    onRowClick && "cursor-pointer hover:bg-[var(--color-canvas-deep)]/50",
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={classNames(
                        "px-5 py-4 align-middle text-[var(--color-ink-800)]",
                        column.align === "right" && "text-right",
                        column.align === "center" && "text-center",
                        column.hideOnMobile && "hidden md:table-cell",
                      )}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredRows.length > pageSize && (
        <div className="flex items-center justify-between gap-3 border-t border-[var(--color-ink-100)] px-5 py-3 text-xs text-[var(--color-ink-500)]">
          <span>
            Showing{" "}
            <span className="font-semibold text-[var(--color-ink-800)]">
              {safePageIndex * pageSize + 1}–
              {Math.min(filteredRows.length, (safePageIndex + 1) * pageSize)}
            </span>{" "}
            of {filteredRows.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrev}
              disabled={safePageIndex === 0}
              aria-label="Previous page"
              className="grid size-7 place-items-center rounded-[var(--radius-sm)] text-[var(--color-ink-700)] hover:bg-[var(--color-canvas-deep)] disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2 font-medium text-[var(--color-ink-800)]">
              {safePageIndex + 1} / {totalPages}
            </span>
            <button
              type="button"
              onClick={handleNext}
              disabled={safePageIndex >= totalPages - 1}
              aria-label="Next page"
              className="grid size-7 place-items-center rounded-[var(--radius-sm)] text-[var(--color-ink-700)] hover:bg-[var(--color-canvas-deep)] disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
