import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AppSelect } from "@/components/shared/AppSelect";
import { EmptyState } from "@/components/shared/EmptyState";
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { fetchLocationsList, type LocationListItem } from "@/services/api";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

function toVisibility01(v: unknown): 0 | 1 {
  if (v === 1 || v === "1" || v === true) return 1;
  return 0;
}

function AvailabilityPill({ value }: { value: unknown }) {
  const raw = String(value ?? "").trim();
  const v = raw.toLowerCase();

  const base =
    "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-black/5 shadow-sm";

  if (v === "available") {
    return <span className={`${base} bg-emerald-100 text-emerald-800`}>{raw || "available"}</span>;
  }

  if (v === "unavailable") {
    return <span className={`${base} bg-rose-100 text-rose-800`}>{raw || "unavailable"}</span>;
  }

  if (v === "coming_soon" || v === "coming soon") {
    return <span className={`${base} bg-amber-100 text-amber-800`}>{raw || "coming_soon"}</span>;
  }

  if (!raw) return <span className="text-muted-foreground">—</span>;
  return <span className={`${base} bg-muted text-foreground`}>{raw}</span>;
}

interface LocationsListProps {
  refreshKey?: number;
}

export const LocationsList = ({ refreshKey = 0 }: LocationsListProps) => {
  const [rows, setRows] = useState<LocationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchLocationsList();
        setRows(Array.isArray(data) ? data : []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [refreshKey]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const id = String(r.location_id ?? "").toLowerCase();
      const orgId = String(r.organization_id ?? "").toLowerCase();
      const name = String(r.name ?? "").toLowerCase();
      const nameAr = String(r.name_ar ?? "").toLowerCase();
      return id.includes(q) || orgId.includes(q) || name.includes(q) || nameAr.includes(q);
    });
  }, [rows, search]);

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), pageCount));
  }, [pageCount]);

  const visible = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  const rangeText =
    total === 0
      ? "0-0 of 0"
      : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} of ${total}`;

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Locations </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by Locations"
            className="pl-10"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading...</div>
        ) : total === 0 ? (
          <EmptyState title="No Locations" description="No locations found." />
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">name_ar</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Chargers</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Payment</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Availability</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Visibility</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr
                      key={String(r.location_id)}
                      className="hover:bg-muted/50"
                    >
                      <td className="py-3 px-4">{String(r.name ?? "")}</td>
                      <td className="py-3 px-4" dir="rtl">
                        {String(r.name_ar ?? "")}
                      </td>
                      <td className="py-3 px-4">
                        {Number.isFinite(Number(r.num_chargers))
                          ? String(Number(r.num_chargers))
                          : ""}
                      </td>
                      <td className="py-3 px-4">{String(r.payment_types ?? "")}</td>
                      <td className="py-3 px-4">
                        <AvailabilityPill value={r.availability} />
                      </td>
                      <td className="py-3 px-4">{toVisibility01(r.visible_on_map)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline">Items per page</span>
                <AppSelect
                  options={PAGE_SIZE_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))}
                  value={String(pageSize)}
                  onChange={(v) => {
                    const next = Number(v);
                    if (!Number.isFinite(next)) return;
                    setPageSize(next as (typeof PAGE_SIZE_OPTIONS)[number]);
                    setPage(1);
                  }}
                  placeholder="Page size"
                  size="sm"
                  className="w-[88px]"
                />
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
          </>
        )}
      </CardContent>
    </Card>
  );
};
