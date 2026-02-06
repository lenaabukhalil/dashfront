import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionContext";
import type { Permission } from "@/types/permissions";
import { 
  DollarSign, 
  TrendingUp,
  FileText,
  Building2,
  Download,
  CreditCard
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchDashboardStats } from "@/services/api";
import { useEffect, useState } from "react";

export const AccountantDashboard = () => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    revenue: 0,
    payments: 0,
    totalCashIn: 0,
    expendature: 0,
  });

  useEffect(() => {
    const loadData = async () => {
      const data = await fetchDashboardStats();
      setStats({
        revenue: data.revenue || 0,
        payments: data.payments || 0,
        totalCashIn: data.totalCashIn || 0,
        expendature: data.expendature || 0,
      });
    };
    
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Financial KPIs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Financial KPIs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Revenue</span>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold mt-2">{stats.revenue.toFixed(2)} JOD</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Payments</span>
                <CreditCard className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold mt-2">{stats.payments}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Cash In</span>
                <DollarSign className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold mt-2">{stats.totalCashIn.toFixed(2)} JOD</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Expenditure</span>
                <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />
              </div>
              <p className="text-2xl font-bold mt-2">{stats.expendature.toFixed(2)} JOD</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {hasPermission("reports.view" as Permission) && (
              <Button
                variant="outline"
                className="h-auto flex-col py-4"
                onClick={() => navigate("/reports")}
              >
                <FileText className="w-5 h-5 mb-2" />
                <span>Reports</span>
              </Button>
            )}
            {hasPermission("organizations.view" as Permission) && (
              <Button
                variant="outline"
                className="h-auto flex-col py-4"
                onClick={() => navigate("/organizations")}
              >
                <Building2 className="w-5 h-5 mb-2" />
                <span>Organizations</span>
              </Button>
            )}
            {hasPermission("reports.export" as Permission) && (
              <Button
                variant="outline"
                className="h-auto flex-col py-4"
                onClick={() => navigate("/reports")}
              >
                <Download className="w-5 h-5 mb-2" />
                <span>Export Data</span>
              </Button>
            )}
            {hasPermission("financial.view" as Permission) && (
              <Button
                variant="outline"
                className="h-auto flex-col py-4"
                onClick={() => navigate("/reports")}
              >
                <DollarSign className="w-5 h-5 mb-2" />
                <span>Financial</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Payment method breakdown will be displayed here
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
