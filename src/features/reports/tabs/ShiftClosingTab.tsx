import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Loader2, Calendar } from "lucide-react";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { EmptyState } from "@/components/shared/EmptyState";
import { fetchSessionsReport } from "@/services/api";

function getAmount(row: Record<string, unknown>): number {
  const v = row["Amount (JOD)"] ?? row.amount ?? row.Amount ?? row.total_amount;
  return Number(v) || 0;
}

function getStartDate(row: Record<string, unknown>): string {
  const keys = ["Start Date/Time", "start_date", "startDate", "Start Time", "start_date_time"];
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== "")
      return String(v).slice(0, 10);
  }
  return "";
}

interface ShiftClosingTabProps {
  role: string | null;
}

export function ShiftClosingTab({ role }: ShiftClosingTabProps) {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<{ date: string; sessionsCount: number; revenue: number }[]>([]);

  const runReport = async () => {
    if (!fromDate || !toDate) return;
    setLoading(true);
    setRows([]);
    try {
      const sessions = await fetchSessionsReport(fromDate, toDate);
      const byDate = new Map<string, { count: number; revenue: number }>();
      for (const row of sessions as Record<string, unknown>[]) {
        const date = getStartDate(row);
        if (!date) continue;
        const cur = byDate.get(date) ?? { count: 0, revenue: 0 };
        cur.count += 1;
        cur.revenue += getAmount(row);
        byDate.set(date, cur);
      }
      const list = Array.from(byDate.entries())
        .map(([date, v]) => ({
          date,
          sessionsCount: v.count,
          revenue: Math.round(v.revenue * 100) / 100,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
      setRows(list);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const totalSessions = rows.reduce((s, r) => s + r.sessionsCount, 0);
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);

  return (
    <PermissionGuard
      role={role}
      permission="finance.setShift"
      action="read"
      fallback={
        <Card>
          <CardContent className="py-8">
            <EmptyState
              title="Access Denied"
              description="You don't have permission to view shift closing reports."
            />
          </CardContent>
        </Card>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Shift Closing
            </CardTitle>
            <CardDescription>
              Daily summary of sessions and revenue for shift handover and reconciliation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" /> From
                </Label>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">To</Label>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
              <Button onClick={runReport} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {loading ? "Loading…" : "Generate"}
              </Button>
            </div>

            {loading && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading…
              </div>
            )}

            {!loading && rows.length > 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Total sessions (period)</p>
                      <p className="text-2xl font-bold">{totalSessions}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Total revenue</p>
                      <p className="text-2xl font-bold">{totalRevenue.toFixed(2)} JOD</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Sessions</TableHead>
                        <TableHead className="text-right">Revenue (JOD)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={row.date}>
                          <TableCell className="font-medium">{row.date}</TableCell>
                          <TableCell className="text-right">{row.sessionsCount}</TableCell>
                          <TableCell className="text-right">{row.revenue.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}

            {!loading && rows.length === 0 && fromDate && toDate && (
              <EmptyState
                title="Generate report"
                description="Select date range and click Generate to see daily shift summary."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
}
