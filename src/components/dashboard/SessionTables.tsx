import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchActiveSessions, fetchLocalSessions, type ActiveSession, type LocalSession } from "@/services/api";

export const SessionTables = () => {
  const [ionSessions, setIonSessions] = useState<ActiveSession[]>([]);
  const [localSessions, setLocalSessions] = useState<LocalSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSessions = async () => {
      setLoading(true);
      try {
        const [ion, local] = await Promise.all([fetchActiveSessions(), fetchLocalSessions()]);
        setIonSessions(ion);
        setLocalSessions(local);
      } catch (error) {
        console.error("Error loading sessions:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
    // Refresh every 5 seconds
    const interval = setInterval(loadSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold mb-4">Active Sessions</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ION Sessions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ION Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                Loading...
              </div>
            ) : (
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
                    {ionSessions.length > 0 ? (
                      ionSessions.slice(0, 6).map((session, idx) => (
                        <tr key={idx} className="border-b border-border last:border-0 hover:bg-muted/50">
                          <td className="py-3 px-2">{session["Start Date/Time"]}</td>
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
                        <td colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                          No active sessions
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Local Sessions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Local Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                Loading...
              </div>
            ) : (
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
                    {localSessions.length > 0 ? (
                      localSessions.slice(0, 6).map((session, idx) => (
                        <tr key={idx} className="border-b border-border last:border-0 hover:bg-muted/50">
                          <td className="py-3 px-2">{session["Start Date/Time"]}</td>
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
                        <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                          No active local sessions
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
