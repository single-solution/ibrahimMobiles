"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { classNames } from "@store/shared";
import { WorkspaceSearchField } from "@/components/shared/workspaceUi";

type SortDirection = "asc" | "desc";
type SortableValue = string | number;

export interface TableColumn<TRow> {
  id: string;
  header: ReactNode;
  cell: (row: TRow) => ReactNode;
  align?: "left" | "right" | "center";
  width?: string;
  hideOnMobile?: boolean;
  /** When true, the header becomes a button that toggles ascending/descending
   *  sort on this column. Sorting is client-side. */
  sortable?: boolean;
  /** Required when `sortable` is true on a column whose `cell` returns a React
   *  node rather than a primitive. Returns the value used for comparison. */
  sortAccessor?: (row: TRow) => SortableValue;
}

interface TableProps<TRow> {
  rows: TRow[];
  columns: TableColumn<TRow>[];
  rowKey: (row: TRow) => string;
  searchPlaceholder?: string;
  searchAccessor?: (row: TRow) => string;
  onRowClick?: (row: TRow) => void;
  emptyState?: ReactNode;
  pageSize?: number;
  toolbar?: ReactNode;
  /** Optional content rendered above the table (inside the same card) — used
   *  for chip-style filters that share the table's chrome. */
  filterBar?: ReactNode;
}

function deriveSortableValue<TRow>(
  row: TRow,
  column: TableColumn<TRow>,
): SortableValue {
  if (column.sortAccessor) {
    return column.sortAccessor(row);
  }
  const rendered = column.cell(row);
  if (typeof rendered === "string" || typeof rendered === "number") {
    return rendered;
  }
  return "";
}

export function Table<TRow>({
  rows,
  columns,
  rowKey,
  searchPlaceholder,
  searchAccessor,
  onRowClick,
  emptyState,
  pageSize = 50,
  toolbar,
  filterBar,
}: TableProps<TRow>) {
  const [query, setQuery] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [sort, setSort] = useState<{ columnId: string; direction: SortDirection } | null>(null);

  const filteredRows = useMemo(() => {
    if (!query.trim() || !searchAccessor) {
      return rows;
    }
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => searchAccessor(row).toLowerCase().includes(needle));
  }, [rows, query, searchAccessor]);

  const sortedRows = useMemo(() => {
    if (!sort) {
      return filteredRows;
    }
    const sortColumn = columns.find((column) => column.id === sort.columnId);
    if (!sortColumn) {
      return filteredRows;
    }
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...filteredRows].sort((rowA, rowB) => {
      const valueA = deriveSortableValue(rowA, sortColumn);
      const valueB = deriveSortableValue(rowB, sortColumn);
      if (typeof valueA === "number" && typeof valueB === "number") {
        return (valueA - valueB) * direction;
      }
      return String(valueA).localeCompare(String(valueB)) * direction;
    });
  }, [filteredRows, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePageIndex = Math.min(pageIndex, totalPages - 1);
  const visibleRows = sortedRows.slice(
    safePageIndex * pageSize,
    safePageIndex * pageSize + pageSize,
  );

  function toggleSort(columnId: string) {
    setSort((current) => {
      if (!current || current.columnId !== columnId) {
        return { columnId, direction: "asc" };
      }
      if (current.direction === "asc") {
        return { columnId, direction: "desc" };
      }
      return null;
    });
    setPageIndex(0);
  }

  function handlePrev() {
    setPageIndex((current) => Math.max(0, current - 1));
  }

  function handleNext() {
    setPageIndex((current) => Math.min(totalPages - 1, current + 1));
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)]">
      {(searchAccessor || toolbar) && (
          <div className="relative z-30 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-ink-100)] px-3 py-3 sm:px-5 sm:py-3.5">
          {searchAccessor ? (
            <WorkspaceSearchField
              value={query}
              onChange={(value) => {
                setQuery(value);
                setPageIndex(0);
              }}
              placeholder={searchPlaceholder ?? "Search…"}
              aria-label={searchPlaceholder ?? "Search table"}
              className="h-9 max-w-xs flex-1"
            />
          ) : (
            <span />
          )}
          {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
        </div>
      )}

      {filterBar && (
        <div className="relative z-20 border-b border-[var(--color-ink-100)] px-3 py-2.5 sm:px-5 sm:py-3">
          {filterBar}
        </div>
      )}

      {visibleRows.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-[var(--color-ink-500)]">
          {emptyState ?? "No results."}
        </div>
      ) : (
        <>
          {/* Mobile card list — below `md` we drop the horizontal-scroll table
              and stack each row as a card. Columns marked `hideOnMobile` are
              skipped, the first remaining column becomes the card title, and
              columns with an empty header (typically action icons) are
              rendered as a label-less footer row. */}
          <ul className="reveal-stagger divide-y divide-[var(--color-ink-100)] md:hidden">
            {visibleRows.map((row) => {
              const mobileColumns = columns.filter((column) => !column.hideOnMobile);
              const hasLabel = (column: TableColumn<TRow>) =>
                column.header !== "" && column.header != null;
              const labelled = mobileColumns.filter(hasLabel);
              const unlabelled = mobileColumns.filter((column) => !hasLabel(column));
              const [primaryColumn, ...detailColumns] = labelled;
              const interactive = Boolean(onRowClick);
              return (
                <li key={rowKey(row)} className="reveal animate-in">
                  <div
                    role={interactive ? "button" : undefined}
                    tabIndex={interactive ? 0 : undefined}
                    onClick={interactive ? () => onRowClick?.(row) : undefined}
                    onKeyDown={
                      interactive
                        ? (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              onRowClick?.(row);
                            }
                          }
                        : undefined
                    }
                    className={classNames(
                      "flex flex-col gap-2 px-3 py-3",
                      interactive &&
                        "cursor-pointer transition-colors active:bg-[var(--color-canvas-deep)]/60",
                    )}
                  >
                    {primaryColumn ? (
                      <div className="text-sm font-semibold text-[var(--color-ink-900)]">
                        {primaryColumn.cell(row)}
                      </div>
                    ) : null}
                    {detailColumns.length > 0 ? (
                      <dl className="grid gap-1.5">
                        {detailColumns.map((column) => (
                          <div
                            key={column.id}
                            className="flex items-start justify-between gap-3 text-[12px]"
                          >
                            <dt className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-500)]">
                              {column.header}
                            </dt>
                            <dd className="min-w-0 flex-1 text-right text-[var(--color-ink-800)]">
                              {column.cell(row)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                    {unlabelled.length > 0 ? (
                      <div
                        onClick={(event) => event.stopPropagation()}
                        className="flex flex-wrap items-center justify-end gap-1.5 pt-0.5"
                      >
                        {unlabelled.map((column) => (
                          <div key={column.id}>{column.cell(row)}</div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Desktop table — at md+ we keep the original sortable table layout. */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-[var(--color-canvas-deep)] shadow-[inset_0_-1px_0_var(--color-ink-100)]">
              <tr className="text-[var(--color-ink-500)]">
                {columns.map((column) => {
                  const isSorted = sort?.columnId === column.id;
                  return (
                    <th
                      key={column.id}
                      scope="col"
                      style={column.width ? { width: column.width } : undefined}
                      aria-sort={
                        isSorted ? (sort.direction === "asc" ? "ascending" : "descending") : undefined
                      }
                      className={classNames(
                        "px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] md:px-5 md:py-2.5 md:text-[11px]",
                        column.align === "right" && "text-right",
                        column.align === "center" && "text-center",
                        column.align !== "right" && column.align !== "center" && "text-left",
                        column.hideOnMobile && "hidden md:table-cell",
                      )}
                    >
                      {column.sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(column.id)}
                          className={classNames(
                            "inline-flex items-center gap-1.5 transition-colors hover:text-[var(--color-ink-800)]",
                            column.align === "right" && "flex-row-reverse",
                          )}
                        >
                          {column.header}
                          {isSorted && sort.direction === "asc" && (
                            <ChevronUp size={12} className="text-[var(--color-accent-700)]" />
                          )}
                          {isSorted && sort.direction === "desc" && (
                            <ChevronDown size={12} className="text-[var(--color-accent-700)]" />
                          )}
                          {!isSorted && (
                            <ChevronDown size={12} className="text-[var(--color-ink-300)]" />
                          )}
                        </button>
                      ) : (
                        column.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="reveal-stagger divide-y divide-[var(--color-ink-100)]">
              {visibleRows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={classNames(
                    "reveal animate-in transition-colors",
                    onRowClick && "cursor-pointer hover:bg-[var(--color-canvas-deep)]/50",
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={classNames(
                        "px-3 py-2 align-middle text-[13px] text-[var(--color-ink-800)] md:px-5 md:py-3 md:text-sm",
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
        </>
      )}

      {sortedRows.length > pageSize && (
        <div className="flex items-center justify-between gap-3 border-t border-[var(--color-ink-100)] px-3 py-2.5 text-[11px] text-[var(--color-ink-500)] sm:px-5 sm:py-3 sm:text-xs">
          <span>
            Showing{" "}
            <span className="font-semibold text-[var(--color-ink-800)]">
              {safePageIndex * pageSize + 1}–
              {Math.min(sortedRows.length, (safePageIndex + 1) * pageSize)}
            </span>{" "}
            of {sortedRows.length}
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
