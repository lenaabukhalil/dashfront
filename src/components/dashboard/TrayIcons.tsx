import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { fetchDashboardStats } from "@/services/api";
import { useEffect, useState } from "react";

interface DashboardStats {
  newUsers: number;
  sessions: number;
  smsBalance: number;
  eFawateerCom: number;
  ni: number;
  orangeMoney: number;
  totalCashIn: number;
  expendature: number;
}

export const TrayIcons = () => {
  const [stats, setStats] = useState<DashboardStats>({
    newUsers: 0,
    sessions: 0,
    smsBalance: 0,
    eFawateerCom: 0,
    ni: 0,
    orangeMoney: 0,
    totalCashIn: 0,
    expendature: 0,
  });

  useEffect(() => {
    const loadStats = async () => {
      const data = await fetchDashboardStats();
      setStats({
        newUsers: data.newUsers,
        sessions: data.sessions,
        smsBalance: Number((data as unknown as Record<string, unknown>).smsBalance ?? 0),
        eFawateerCom: data.eFawateerCom,
        ni: data.ni,
        orangeMoney: data.orangeMoney,
        totalCashIn: data.totalCashIn,
        expendature: data.expendature,
      });
    };

    loadStats();
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const services = [
    { label: "Backend", status: true },
    { label: "MQTT", status: true },
    { label: "Database", status: true },
    { label: "Firebase", status: true },
    { label: "openvpn", status: true },
    { label: "NGINX", status: true },
    { label: "DNS", status: true },
    { label: "AWS", status: true },
  ];

  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {services.map((service) => (
            <div
              key={service.label}
              className="flex items-center justify-between p-2 rounded-md border border-border bg-card"
            >
              <span className="text-xs text-muted-foreground">{service.label}</span>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>
          ))}

          <div className="flex flex-col items-center justify-center p-2 rounded-md border border-border bg-card">
            <p className="text-lg font-bold">{stats.newUsers}</p>
            <p className="text-xs text-muted-foreground text-center">New Users</p>
          </div>

          <div className="flex flex-col items-center justify-center p-2 rounded-md border border-border bg-card">
            <p className="text-lg font-bold">{stats.smsBalance.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground text-center">SMS Balance</p>
          </div>

          <div className="flex flex-col items-center justify-center p-2 rounded-md border border-border bg-card">
            <p className="text-lg font-bold">{stats.sessions}</p>
            <p className="text-xs text-muted-foreground text-center">Sessions</p>
          </div>

          <div className="flex flex-col items-center justify-center p-2 rounded-md border border-border bg-card">
            <p className="text-lg font-bold">{stats.eFawateerCom.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground text-center">eFawateerCom</p>
          </div>

          <div className="flex flex-col items-center justify-center p-2 rounded-md border border-border bg-card">
            <p className="text-lg font-bold">{stats.ni.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground text-center">NI</p>
          </div>

          <div className="flex flex-col items-center justify-center p-2 rounded-md border border-border bg-card">
            <p className="text-lg font-bold">{stats.orangeMoney.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground text-center">Orange Money</p>
          </div>

          <div className="flex flex-col items-center justify-center p-2 rounded-md border border-border bg-card">
            <p className="text-lg font-bold">{stats.totalCashIn.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground text-center">Total Cash in</p>
          </div>

          <div className="flex flex-col items-center justify-center p-2 rounded-md border border-border bg-card">
            <p className="text-lg font-bold">{stats.expendature.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground text-center">Expendature</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

