import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Zap, Clock, DollarSign } from "lucide-react";
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

  useEffect(() => {
    if (!canRead("charger.chargerStatus")) {
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

  return (
    <PermissionGuard
      role={role}
      permission="charger.chargerStatus"
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
          <CardDescription>
            Real-time view of all active charging sessions
          </CardDescription>
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
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
                  {sessions.map((session) => (
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
          )}
        </CardContent>
      </Card>
    </PermissionGuard>
  );
};
