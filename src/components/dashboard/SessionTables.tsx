import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchActiveSessions, fetchLocalSessions, type ActiveSession, type LocalSession } from "@/services/api";
import { Loader2 } from "lucide-react";

const ION_COLUMNS = 8;
const LOCAL_COLUMNS = 7;

function formatDate(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function TableSkeleton({ columns, rows = 4 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr key={rowIdx} className="border-b border-border last:border-0">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <td key={colIdx} className="py-3 px-2">
              <span className="inline-block h-4 w-full max-w-24 rounded bg-muted animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export const SessionTables = () => {
  const [ionSessions, setIonSessions] = useState<ActiveSession[]>([]);
  const [localSessions, setLocalSessions] = useState<LocalSession[]>([]);
  const [initialLoad, setInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    const loadSessions = async () => {
      if (!hasLoadedOnce.current) setInitialLoad(true);
      else setRefreshing(true);
      try {
        const [ion, local] = await Promise.all([fetchActiveSessions(), fetchLocalSessions()]);
        setIonSessions(ion);
        setLocalSessions(local);
        hasLoadedOnce.current = true;
      } catch (error) {
        console.error("Error loading sessions:", error);
      } finally {
        setInitialLoad(false);
        setRefreshing(false);
      }
    };

    loadSessions();
    const interval = setInterval(loadSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  const showIonSkeleton = initialLoad && ionSessions.length === 0;
  const showLocalSkeleton = initialLoad && localSessions.length === 0;

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold mb-4">Active Sessions</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">ION Sessions</CardTitle>
            {refreshing && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
            )}
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Start Date/Time</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Session ID</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Location</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Charger</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Connector</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Energy (KWH)</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Amount (JOD)</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Mobile</th>
                  </tr>
                </thead>
                <tbody>
                  {showIonSkeleton ? (
                    <TableSkeleton columns={ION_COLUMNS} />
                  ) : ionSessions.length > 0 ? (
                    ionSessions.slice(0, 6).map((session, idx) => (
                      <tr key={idx} className="border-b border-border last:border-0 hover:bg-muted/50">
                        <td className="py-3 px-2">{formatDate(session["Start Date/Time"])}</td>
                        <td className="py-3 px-2 font-mono">{session["Session ID"]}</td>
                        <td className="py-3 px-2">{session.Location}</td>
                        <td className="py-3 px-2">{session.Charger}</td>
                        <td className="py-3 px-2">{session.Connector}</td>
                        <td className="py-3 px-2">{session["Energy (KWH)"]?.toFixed(2) || "0.00"}</td>
                        <td className="py-3 px-2">{session["Amount (JOD)"]?.toFixed(2) || "0.00"}</td>
                        <td className="py-3 px-2">{session.mobile || "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={ION_COLUMNS} className="py-8 text-center text-sm text-muted-foreground">
                        No active sessions
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Local Sessions</CardTitle>
            {refreshing && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
            )}
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Start Date/Time</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Location</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Charger</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Connector</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Energy (KWH)</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Amount (JOD)</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">User ID</th>
                  </tr>
                </thead>
                <tbody>
                  {showLocalSkeleton ? (
                    <TableSkeleton columns={LOCAL_COLUMNS} />
                  ) : localSessions.length > 0 ? (
                    localSessions.slice(0, 6).map((session, idx) => (
                      <tr key={idx} className="border-b border-border last:border-0 hover:bg-muted/50">
                        <td className="py-3 px-2">{formatDate(session["Start Date/Time"])}</td>
                        <td className="py-3 px-2">{session.Location}</td>
                        <td className="py-3 px-2">{session.Charger}</td>
                        <td className="py-3 px-2">{session.Connector}</td>
                        <td className="py-3 px-2">{session["Energy (KWH)"]?.toFixed(2) || "0.00"}</td>
                        <td className="py-3 px-2">{session["Amount (JOD)"]?.toFixed(2) || "0.00"}</td>
                        <td className="py-3 px-2">{session["User ID"] || "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={LOCAL_COLUMNS} className="py-8 text-center text-sm text-muted-foreground">
                        No active local sessions
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
