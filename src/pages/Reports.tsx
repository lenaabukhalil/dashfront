import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageTabs } from "@/components/shared/PageTabs";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Zap,
  Users,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import {
  fetchChargerOrganizations,
  fetchLocationsByOrg,
  fetchChargersByLocation,
  fetchConnectorsByCharger,
  fetchFinancialReports,
} from "@/services/api";
import { toast } from "@/hooks/use-toast";
import type { SelectOption } from "@/types";
import { usePermission } from "@/hooks/usePermission";
import { userTypeToRole } from "@/lib/rbac-helpers";
import { useAuth } from "@/contexts/AuthContext";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const tabs = [
  { id: "financial", label: "Revenue Reports" },
  { id: "shift-closing", label: "Shift Closing" },
  { id: "revenue-sharing", label: "Revenue Sharing" },
  { id: "comparison", label: "Charger Comparison" },
];

const periodOptions = [
  { value: "1", label: "Today" },
  { value: "2", label: "Yesterday" },
  { value: "3", label: "Last week" },
  { value: "4", label: "This month" },
  { value: "5", label: "Last month" },
  { value: "6", label: "Custom" },
];

const paymentOptions = [
  { value: "0", label: "All" },
  { value: "2", label: "ION" },
  { value: "1", label: "Cash" },
];

// Mock data generators for demonstration
const generateRevenueData = (period: string) => {
  const days = period === "1" ? 1 : period === "2" ? 1 : period === "3" ? 7 : period === "4" ? 30 : 30;
  return Array.from({ length: days }, (_, i) => ({
    date: new Date(Date.now() - (days - i - 1) * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    revenue: Math.floor(Math.random() * 5000) + 1000,
    sessions: Math.floor(Math.random() * 50) + 10,
    energy: Math.floor(Math.random() * 500) + 100,
  }));
};

const generateShiftData = () => {
  return Array.from({ length: 7 }, (_, i) => ({
    shift: `Shift ${i + 1}`,
    operator: `Operator ${String.fromCharCode(65 + i)}`,
    startTime: `${8 + i}:00`,
    endTime: `${16 + i}:00`,
    revenue: Math.floor(Math.random() * 3000) + 500,
    sessions: Math.floor(Math.random() * 40) + 5,
    cashless: Math.floor(Math.random() * 2000) + 300,
    cash: Math.floor(Math.random() * 1000) + 100,
    status: i < 5 ? "closed" : "open",
  }));
};

const generateRevenueShareData = () => {
  return [
    { partner: "ION Partner A", gross: 45000, share: 15, net: 6750, sessions: 320 },
    { partner: "ION Partner B", gross: 32000, share: 20, net: 6400, sessions: 245 },
    { partner: "ION Partner C", gross: 28000, share: 12, net: 3360, sessions: 198 },
    { partner: "ION Partner D", gross: 15000, share: 18, net: 2700, sessions: 112 },
  ];
};

const generateComparisonData = () => {
  return [
    { charger: "Charger A", revenue: 12500, sessions: 145, energy: 1250, utilization: 78 },
    { charger: "Charger B", revenue: 9800, sessions: 112, energy: 980, utilization: 65 },
    { charger: "Charger C", revenue: 15200, sessions: 178, energy: 1520, utilization: 85 },
    { charger: "Charger D", revenue: 8700, sessions: 98, energy: 870, utilization: 58 },
    { charger: "Charger E", revenue: 13400, sessions: 156, energy: 1340, utilization: 72 },
  ];
};


const Reports = () => {
  const { user } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;
  const { canRead, canWrite } = usePermission(role);
  
  const [activeTab, setActiveTab] = useState("financial");

  const [orgOptions, setOrgOptions] = useState<SelectOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<SelectOption[]>([]);
  const [chargerOptions, setChargerOptions] = useState<SelectOption[]>([]);
  const [connectorOptions, setConnectorOptions] = useState<SelectOption[]>([]);

  const [filters, setFilters] = useState({
    organizationId: "",
    locationId: "",
    chargerId: "",
    connectorId: "",
    period: "4",
    payment: "0",
    from: "",
    to: "",
  });

  const [reportRows, setReportRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Generate mock data based on active tab
  const revenueData = useMemo(() => generateRevenueData(filters.period), [filters.period]);
  const shiftData = useMemo(() => generateShiftData(), []);
  const revenueShareData = useMemo(() => generateRevenueShareData(), []);
  const comparisonData = useMemo(() => generateComparisonData(), []);

  const revenueSummary = useMemo(() => {
    const total = revenueData.reduce((sum, d) => sum + d.revenue, 0);
    const sessions = revenueData.reduce((sum, d) => sum + d.sessions, 0);
    const energy = revenueData.reduce((sum, d) => sum + d.energy, 0);
    const avgRevenue = total / revenueData.length;
    const prevTotal = total * 0.85; // Mock previous period
    const change = ((total - prevTotal) / prevTotal) * 100;
    return { total, sessions, energy, avgRevenue, change };
  }, [revenueData]);

  useEffect(() => {
    if (!canRead("finance.financialReports")) {
      return;
    }

    const load = async () => {
      try {
        const opts = await fetchChargerOrganizations();
        setOrgOptions(opts);
        if (opts.length > 0) {
          setFilters((f) => ({ ...f, organizationId: opts[0].value }));
        }
      } catch (error) {
        toast({
          title: "Error loading organizations",
          description: "Failed to load organizations.",
          variant: "destructive",
        });
      }
    };
    load();
  }, [canRead]);

  useEffect(() => {
    const load = async () => {
      if (!filters.organizationId) {
        setLocationOptions([]);
        setFilters((f) => ({ ...f, locationId: "" }));
        return;
      }
      try {
        const opts = await fetchLocationsByOrg(filters.organizationId);
        setLocationOptions(opts);
        if (opts.length > 0) {
          setFilters((f) => ({ ...f, locationId: opts[0].value }));
        }
      } catch (error) {
        toast({ title: "Error loading locations", description: "Failed to load locations.", variant: "destructive" });
      }
    };
    load();
  }, [filters.organizationId]);

  useEffect(() => {
    const load = async () => {
      if (!filters.locationId) {
        setChargerOptions([]);
        setFilters((f) => ({ ...f, chargerId: "" }));
        return;
      }
      try {
        const opts = await fetchChargersByLocation(filters.locationId);
        setChargerOptions(opts);
        if (opts.length > 0) {
          setFilters((f) => ({ ...f, chargerId: opts[0].value }));
        }
      } catch (error) {
        toast({ title: "Error loading chargers", description: "Failed to load chargers.", variant: "destructive" });
      }
    };
    load();
  }, [filters.locationId]);

  useEffect(() => {
    const load = async () => {
      if (!filters.chargerId) {
        setConnectorOptions([]);
        setFilters((f) => ({ ...f, connectorId: "" }));
        return;
      }
      try {
        const opts = await fetchConnectorsByCharger(filters.chargerId);
        setConnectorOptions(opts);
        if (opts.length > 0) {
          setFilters((f) => ({ ...f, connectorId: opts[0].value }));
        }
      } catch (error) {
        toast({ title: "Error loading connectors", description: "Failed to load connectors.", variant: "destructive" });
      }
    };
    load();
  }, [filters.chargerId]);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      const data = await fetchFinancialReports(filters);
      setReportRows(data);
      if (!data.length) {
        toast({ title: "No data available", description: "Try a different time range." });
      }
    } catch (error) {
      toast({ title: "Report error", description: "Failed to generate report.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format: "pdf" | "csv", data?: any[]) => {
    toast({
      title: "Export initiated",
      description: `Exporting report as ${format.toUpperCase()}...`,
    });
    // Export logic would go here
  };

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Generate detailed financial reports, analytics, and insights
          </p>
          <PageTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        <div className="pt-2">
          <PermissionGuard 
            role={role} 
            permission="finance.financialReports" 
            action="read"
            fallback={
              <Card>
                <CardContent className="py-8">
                <EmptyState
                  title="Access Denied"
                  description="You don't have permission to view financial reports."
                />
                </CardContent>
              </Card>
            }
          >
            {/* Revenue Reports Tab */}
            {activeTab === "financial" && (
              <div className="space-y-6">
                {/* Filters */}
                <Card>
                  <CardHeader>
                    <CardTitle>Report Filters</CardTitle>
                    <CardDescription>Select filters to generate revenue reports</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div className="space-y-2">
                  <Label>Organization</Label>
                  <Select
                    value={filters.organizationId}
                    onValueChange={(val) => setFilters((f) => ({ ...f, organizationId: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {orgOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Location</Label>
                  <Select
                    value={filters.locationId}
                    onValueChange={(val) => setFilters((f) => ({ ...f, locationId: val }))}
                          disabled={!filters.organizationId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locationOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Period</Label>
                  <Select
                    value={filters.period}
                    onValueChange={(val) => setFilters((f) => ({ ...f, period: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      {periodOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

                    <div className="flex gap-3">
                <Button onClick={handleGenerate} disabled={loading}>
                        {loading ? "Generating..." : "Generate Report"}
                </Button>
                      <Button variant="outline" onClick={() => handleExport("pdf")}>
                  <FileText className="w-4 h-4 mr-2" />
                        Export PDF
                </Button>
                      <Button variant="outline" onClick={() => handleExport("csv", reportRows)}>
                  <Download className="w-4 h-4 mr-2" />
                        Export CSV
                </Button>
              </div>
                  </CardContent>
                </Card>

                {/* Summary Cards removed */}
          </div>
            )}

            {/* Shift Closing Tab */}
            {activeTab === "shift-closing" && (
              <PermissionGuard role={role} permission="finance.setShift" action="read">
                <div className="space-y-6">
                  <Card>
                    <CardContent className="py-8">
                      <EmptyState
                        title="Shift Closing Reports"
                        description="This section is currently empty."
                      />
                    </CardContent>
                  </Card>
                </div>
              </PermissionGuard>
            )}

            {/* Revenue Sharing Tab */}
            {activeTab === "revenue-sharing" && (
              <div className="space-y-6">
                <Card>
                  <CardContent className="py-8">
                    <EmptyState
                      title="Revenue Share Reports"
                      description="This section is currently empty."
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Charger Comparison Tab */}
            {activeTab === "comparison" && (
              <div className="space-y-6">
                <Card>
                  <CardContent className="py-8">
                    <EmptyState
                      title="Charger Comparison Reports"
                      description="This section is currently empty."
                    />
                  </CardContent>
                </Card>
              </div>
            )}
          </PermissionGuard>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
