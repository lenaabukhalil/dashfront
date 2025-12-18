import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageTabs } from "@/components/shared/PageTabs";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Download } from "lucide-react";
import {
  fetchChargerOrganizations,
  fetchLocationsByOrg,
  fetchChargersByLocation,
  fetchConnectorsByCharger,
  fetchFinancialReports,
} from "@/services/api";
import { toast } from "@/hooks/use-toast";
import type { SelectOption } from "@/types";

const tabs = [{ id: "financial", label: "Financial Reports" }];

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

const Reports = () => {
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
    period: "1",
    payment: "0",
    from: "",
    to: "",
  });

  const [reportRows, setReportRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const opts = await fetchChargerOrganizations();
        setOrgOptions(opts);
        setFilters((f) => ({ ...f, organizationId: opts[0]?.value ?? "" }));
      } catch (error) {
        toast({
          title: "خطأ تحميل المنظمات",
          description: "تعذر تحميل المنظمات.",
          variant: "destructive",
        });
      }
    };
    load();
  }, []);

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
        setFilters((f) => ({ ...f, locationId: opts[0]?.value ?? "" }));
      } catch (error) {
        toast({ title: "خطأ تحميل المواقع", description: "تعذر تحميل المواقع.", variant: "destructive" });
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
        setFilters((f) => ({ ...f, chargerId: opts[0]?.value ?? "" }));
      } catch (error) {
        toast({ title: "خطأ تحميل الشواحن", description: "تعذر تحميل الشواحن.", variant: "destructive" });
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
        setFilters((f) => ({ ...f, connectorId: opts[0]?.value ?? "" }));
      } catch (error) {
        toast({ title: "خطأ تحميل الموصلات", description: "تعذر تحميل الموصلات.", variant: "destructive" });
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
        toast({ title: "لا توجد بيانات", description: "جرب نطاقاً زمنياً مختلفاً." });
      }
    } catch (error) {
      toast({ title: "خطأ التقرير", description: "تعذر توليد التقرير.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const breadcrumb = useMemo(() => "ION Dashboard / Reports / Financial Reports", []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Reports</h1>
          <p className="text-sm text-muted-foreground mb-6">Generate and download financial reports</p>

          <PageTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="text-xs text-muted-foreground pb-4 border-b border-border">{breadcrumb}</div>
        </div>

        <div className="pt-2">
          <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
            {/* Filters */}
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  <Label>Charger</Label>
                  <Select
                    value={filters.chargerId}
                    onValueChange={(val) => setFilters((f) => ({ ...f, chargerId: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select charger" />
                    </SelectTrigger>
                    <SelectContent>
                      {chargerOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Connector</Label>
                  <Select
                    value={filters.connectorId}
                    onValueChange={(val) => setFilters((f) => ({ ...f, connectorId: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select connector" />
                    </SelectTrigger>
                    <SelectContent>
                      {connectorOptions.map((opt) => (
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

                <div className="space-y-2">
                  <Label>Payment</Label>
                  <Select
                    value={filters.payment}
                    onValueChange={(val) => setFilters((f) => ({ ...f, payment: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>From</Label>
                  <Input
                    type="datetime-local"
                    value={filters.from}
                    onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>To</Label>
                  <Input
                    type="datetime-local"
                    value={filters.to}
                    onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button onClick={handleGenerate} disabled={loading}>
                  {loading ? "Generating..." : "Generate report"}
                </Button>
                <Button variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  PDF
                </Button>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              {reportRows.length === 0 ? (
                <EmptyState
                  title="No data available"
                  description="Select filters and generate a report to view data."
                />
              ) : (
                <div className="overflow-x-auto border border-border rounded-xl">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        {Object.keys(reportRows[0] || {}).map((key) => (
                          <th key={key} className="text-left py-3 px-4 font-medium text-muted-foreground">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportRows.map((row, idx) => (
                        <tr key={idx} className="border-t border-border hover:bg-muted/30">
                          {Object.keys(reportRows[0] || {}).map((key) => (
                            <td key={key} className="py-3 px-4">
                              {String(row[key] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
