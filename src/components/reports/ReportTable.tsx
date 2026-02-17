import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export interface ReportColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export interface ReportTableProps<T extends Record<string, unknown>> {
  columns: ReportColumn<T>[];
  data: T[];
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  emptyMessage?: string;
  pagination?: boolean;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  sortKey?: string | null;
  sortDir?: "asc" | "desc" | null;
  onSort?: (key: string) => void;
}

export function ReportTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  error = null,
  onRetry,
  emptyMessage = "No results match your filters.",
  pagination = true,
  pageSize: controlledPageSize,
  onPageSizeChange,
  sortKey = null,
  sortDir = null,
  onSort,
}: ReportTableProps<T>) {
  const [internalPageSize, setInternalPageSize] = React.useState(10);
  const [page, setPage] = React.useState(1);

  const pageSize = controlledPageSize ?? internalPageSize;
  const setPageSize = onPageSizeChange ?? setInternalPageSize;

  const total = data.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const visibleData = data.slice(start, start + pageSize);

  React.useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), pageCount));
  }, [pageCount]);

  if (loading) {
    return (
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {columns.map((col) => (
                <TableHead key={String(col.key)} className="whitespace-nowrap">
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>
                {columns.map((col) => (
                  <TableCell key={String(col.key)}>
                    <Skeleton className="h-5 w-full max-w-[120px]" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-lg border border-border border-dashed bg-muted/30 py-12 px-4"
        role="alert"
      >
        <AlertCircle className="h-10 w-10 text-destructive mb-3" aria-hidden />
        <p className="text-sm font-medium mb-1">Failed to load report</p>
        <p className="text-xs text-muted-foreground text-center mb-4">
          {error.message}
        </p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    );
  }

  const rangeText =
    total === 0
      ? "0–0 of 0"
      : `${start + 1}–${Math.min(start + pageSize, total)} of ${total}`;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
            <TableRow className="bg-muted/50 hover:bg-muted/50">
                {columns.map((col) => (
                  <TableHead
                    key={String(col.key)}
                    className="px-4 py-3"
                  >
                    {col.sortable && onSort ? (
                      <button
                        type="button"
                        onClick={() => onSort(String(col.key))}
                        className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                      >
                        {col.header}
                        {sortKey === col.key && (
                          <span className="text-xs" aria-hidden>
                            {sortDir === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
          <TableBody>
              {visibleData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="py-12 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                visibleData.map((row, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/30">
                    {columns.map((col) => (
                      <TableCell key={String(col.key)} className="px-4 py-3">
                        {col.render
                          ? col.render(row as T)
                          : String(row[col.key as keyof T] ?? "")}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
        </Table>
      </div>

      {pagination && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">Rows per page</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n)) {
                  setPageSize(n);
                  setPage(1);
                }
              }}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Rows per page"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <span>{rangeText}</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(1)}
              disabled={page <= 1}
              aria-label="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page >= pageCount}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(pageCount)}
              disabled={page >= pageCount}
              aria-label="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

