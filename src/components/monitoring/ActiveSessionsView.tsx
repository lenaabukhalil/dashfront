import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Clock,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePermission } from "@/hooks/usePermission";
import { userTypeToRole } from "@/lib/rbac-helpers";
import { useAuth } from "@/contexts/AuthContext";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { fetchActiveSessions } from "@/services/api";
import { EmptyState } from "@/components/shared/EmptyState";

interface ActiveSession {
  "Session ID": string;
  "Start Date/Time": string;
  Location: string;
  Charger: string;
  Connector: string;
  "Energy (KWH)": number;
  "Amount (JOD)": number;
  mobile?: string;
  "User ID"?: string;
}

export const ActiveSessionsView = ({ onLoadingChange }: { onLoadingChange?: (loading: boolean) => void }) => {
  const { user } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;
  const { canRead } = usePermission(role);

  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

  useEffect(() => {
    if (!canRead("charger.status")) {
      setLoading(false);
      onLoadingChange?.(false);
      return;
    }

    const loadSessions = async () => {
      try {
        setLoading(true);
        onLoadingChange?.(true);
        const data = await fetchActiveSessions();
        setSessions(data);
      } catch (error) {
        console.error("Error loading active sessions:", error);
      } finally {
        setLoading(false);
        onLoadingChange?.(false);
      }
    };

    loadSessions();
    const interval = setInterval(loadSessions, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [canRead, onLoadingChange]);

  const totalSessions = sessions.length;
  const pageCount = Math.max(1, Math.ceil(totalSessions / pageSize));
  const start = (page - 1) * pageSize;
  const visibleSessions = useMemo(
    () => sessions.slice(start, start + pageSize),
    [sessions, start, pageSize]
  );

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), pageCount));
  }, [pageCount]);

  return (
    <PermissionGuard
      role={role}
      permission="charger.status"
      action="read"
      fallback={
        <Card>
          <CardContent className="py-8">
            <EmptyState
              title="Access Denied"
              description="You don't have permission to view active sessions."
            />
          </CardContent>
        </Card>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Active Charging Sessions
          </CardTitle>
          <CardDescription>Real-time view of all active charging sessions.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : sessions.length === 0 ? (
            <EmptyState
              title="No Active Sessions"
              description="There are no active charging sessions at the moment."
            />
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Session ID</TableHead>
                      <TableHead>Start Time</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Charger</TableHead>
                      <TableHead>Connector</TableHead>
                      <TableHead>Energy (kWh)</TableHead>
                      <TableHead>Amount (JOD)</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleSessions.map((session) => (
                      <TableRow key={session["Session ID"]}>
                        <TableCell className="font-mono text-xs">
                          {session["Session ID"]}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            {new Date(session["Start Date/Time"]).toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>{session.Location}</TableCell>
                        <TableCell>{session.Charger}</TableCell>
                        <TableCell>{session.Connector}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-yellow-500" />
                            {session["Energy (KWH)"].toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-500" />
                            {session["Amount (JOD)"].toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {session.mobile || session["User ID"] || "Guest"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="default">Active</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline">Rows per page</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => {
                      const n = Number(v);
                      if (PAGE_SIZE_OPTIONS.includes(n as 10 | 25 | 50 | 100)) {
                        setPageSize(n);
                        setPage(1);
                      }
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
                <span>
                  {totalSessions === 0
                    ? "0–0 of 0"
                    : `${start + 1}–${Math.min(
                        start + pageSize,
                        totalSessions
                      )} of ${totalSessions}`}
                </span>
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
            </>
          )}
        </CardContent>
      </Card>
    </PermissionGuard>
  );
};
