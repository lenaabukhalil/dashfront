import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  showSearch?: boolean;
  defaultPageSize?: number;
  pagination?: boolean;
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100] as const;

export function DataTable<T extends object>({
  columns,
  data,
  searchPlaceholder = "Search",
  showSearch = true,
  defaultPageSize = 10,
  pagination = true,
}: DataTableProps<T>) {
  const safeData = data ?? [];
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(
    (PAGE_SIZE_OPTIONS as readonly number[]).includes(defaultPageSize) ? defaultPageSize : 10
  );
  const [page, setPage] = useState(1);

  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return safeData;
    return safeData.filter((item) =>
      Object.values(item).some((value) => String(value).toLowerCase().includes(q))
    );
  }, [safeData, search]);

  const total = filteredData.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), pageCount));
  }, [pageCount]);

  const visibleData = useMemo(() => {
    if (!pagination) return filteredData;
    return filteredData.slice((page - 1) * pageSize, page * pageSize);
  }, [filteredData, page, pageSize, pagination]);

  const rangeText =
    total === 0
      ? "0-0 of 0"
      : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} of ${total}`;

  return (
    <div>
      {showSearch && (
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            className="pl-10"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className="text-left py-3 px-4 font-medium text-muted-foreground"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-8 text-center text-muted-foreground"
                >
                  No data available
                </td>
              </tr>
            ) : (
              visibleData.map((item, idx) => (
                <tr
                  key={idx}
                  className="border-b border-border last:border-0 hover:bg-muted/50"
                >
                  {columns.map((col) => (
                    <td key={String(col.key)} className="py-4 px-4">
                      {col.render
                        ? col.render(item)
                        : String(item[col.key as keyof T] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline">Items per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              const next = Number(v);
              if (!Number.isFinite(next)) return;
              setPageSize(next);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[88px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span>{rangeText}</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setPage(1)}
              disabled={page <= 1}
              aria-label="First page"
              title="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label="Previous page"
              title="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page >= pageCount}
              aria-label="Next page"
              title="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setPage(pageCount)}
              disabled={page >= pageCount}
              aria-label="Last page"
              title="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
