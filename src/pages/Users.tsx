import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageTabs } from "@/components/shared/PageTabs";
import { DataTable } from "@/components/shared/DataTable";
import { FormPlaceholder } from "@/components/shared/FormPlaceholder";
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
import {
  fetchLeadershipUsers,
  fetchChargerOrganizations,
  fetchLocationsByOrg,
  fetchChargersByLocation,
  fetchConnectorsByCharger,
  createPartnerUser,
} from "@/services/api";
import { toast } from "@/hooks/use-toast";
import type { User, SelectOption } from "@/types";

const tabs = [
  { id: "leadership", label: "Leadership" },
  { id: "addUsers", label: "Add users" },
  { id: "addPartner", label: "Add Partner User" },
  { id: "reimbursement", label: "Reimbursement" },
];

const columns = [
  { key: "firstName" as const, header: "First Name" },
  { key: "lastName" as const, header: "Last Name" },
  { key: "count" as const, header: "Count" },
  { key: "mobile" as const, header: "Mobile" },
  {
    key: "energy" as const,
    header: "Energy",
    render: (user: User) => `${user.energy.toLocaleString()} kWh`,
  },
  {
    key: "amount" as const,
    header: "Amount",
    render: (user: User) => `$${user.amount.toLocaleString()}`,
  },
];

const roleOptions = [
  { value: 1, label: "admin" },
  { value: 2, label: "operator" },
  { value: 3, label: "accountant" },
  { value: 4, label: "manager" },
];

const languageOptions = [
  { value: "ar", label: "Arabic" },
  { value: "en", label: "English" },
];

const Users = () => {
  const [activeTab, setActiveTab] = useState("leadership");
  const [users, setUsers] = useState<User[]>([]);

  const [orgOptions, setOrgOptions] = useState<SelectOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<SelectOption[]>([]);
  const [chargerOptions, setChargerOptions] = useState<SelectOption[]>([]);
  const [connectorOptions, setConnectorOptions] = useState<SelectOption[]>([]);

  const [partnerForm, setPartnerForm] = useState({
    organization: "",
    firstName: "",
    lastName: "",
    mobile: "",
    email: "",
    role: 1,
    language: "ar",
  });

  const [loadingOrg, setLoadingOrg] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingChargers, setLoadingChargers] = useState(false);
  const [loadingConnectors, setLoadingConnectors] = useState(false);
  const [savingPartner, setSavingPartner] = useState(false);

  useEffect(() => {
    fetchLeadershipUsers().then(setUsers);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingOrg(true);
        const opts = await fetchChargerOrganizations();
        setOrgOptions(opts);
        setPartnerForm((f) => ({ ...f, organization: opts[0]?.value ?? "" }));
        setSelectedOrgForFilters(opts[0]?.value ?? "");
      } catch (error) {
        toast({
          title: "خطأ تحميل المنظمات",
          description: "تعذر تحميل المنظمات.",
          variant: "destructive",
        });
      } finally {
        setLoadingOrg(false);
      }
    };
    load();
  }, []);

  // Reimbursement filters (org/location/charger/connector)
  const [selectedOrgForFilters, setSelectedOrgForFilters] = useState<string>("");
  const [selectedLocationForFilters, setSelectedLocationForFilters] = useState<string>("");
  const [selectedChargerForFilters, setSelectedChargerForFilters] = useState<string>("");
  const [selectedConnectorForFilters, setSelectedConnectorForFilters] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      if (!selectedOrgForFilters) {
        setLocationOptions([]);
        setSelectedLocationForFilters("");
        return;
      }
      try {
        setLoadingLocations(true);
        const opts = await fetchLocationsByOrg(selectedOrgForFilters);
        setLocationOptions(opts);
        setSelectedLocationForFilters(opts[0]?.value ?? "");
      } catch (error) {
        toast({
          title: "خطأ تحميل المواقع",
          description: "تعذر تحميل المواقع.",
          variant: "destructive",
        });
      } finally {
        setLoadingLocations(false);
      }
    };
    load();
  }, [selectedOrgForFilters]);

  useEffect(() => {
    const load = async () => {
      if (!selectedLocationForFilters) {
        setChargerOptions([]);
        setSelectedChargerForFilters("");
        return;
      }
      try {
        setLoadingChargers(true);
        const opts = await fetchChargersByLocation(selectedLocationForFilters);
        setChargerOptions(opts);
        setSelectedChargerForFilters(opts[0]?.value ?? "");
      } catch (error) {
        toast({
          title: "خطأ تحميل الشواحن",
          description: "تعذر تحميل الشواحن.",
          variant: "destructive",
        });
      } finally {
        setLoadingChargers(false);
      }
    };
    load();
  }, [selectedLocationForFilters]);

  useEffect(() => {
    const load = async () => {
      if (!selectedChargerForFilters) {
        setConnectorOptions([]);
        setSelectedConnectorForFilters("");
        return;
      }
      try {
        setLoadingConnectors(true);
        const opts = await fetchConnectorsByCharger(selectedChargerForFilters);
        setConnectorOptions(opts);
        setSelectedConnectorForFilters(opts[0]?.value ?? "");
      } catch (error) {
        toast({
          title: "خطأ تحميل الموصلات",
          description: "تعذر تحميل الموصلات.",
          variant: "destructive",
        });
      } finally {
        setLoadingConnectors(false);
      }
    };
    load();
  }, [selectedChargerForFilters]);

  const handlePartnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { organization, firstName, lastName, mobile, email, role, language } = partnerForm;
    if (!organization || !firstName || !lastName || !mobile || !email) {
      toast({
        title: "حقول مطلوبة",
        description: "أكمل جميع الحقول المطلوبة.",
        variant: "destructive",
      });
      return;
    }
    try {
      setSavingPartner(true);
      const res = await createPartnerUser({
        organization,
        firstName,
        lastName,
        mobile,
        email,
        role,
        language,
      });
      if (res.success) {
        toast({ title: "تم الحفظ", description: res.message });
        setPartnerForm((f) => ({ ...f, firstName: "", lastName: "", mobile: "", email: "" }));
      } else {
        toast({ title: "لم يتم الحفظ", description: res.message, variant: "destructive" });
      }
    } catch (error) {
      toast({
        title: "خطأ غير متوقع",
        description: "تعذر حفظ المستخدم.",
        variant: "destructive",
      });
    } finally {
      setSavingPartner(false);
    }
  };

  const breadcrumb = useMemo(() => {
    switch (activeTab) {
      case "addUsers":
        return "ION Dashboard / Users / Add users";
      case "addPartner":
        return "ION Dashboard / Users / Add Partner User";
      case "reimbursement":
        return "ION Dashboard / Users / Reimbursement";
      default:
        return "ION Dashboard / Users";
    }
  }, [activeTab]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Users</h1>
          <p className="text-sm text-muted-foreground mb-6">Manage users and partners</p>

          <PageTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="text-xs text-muted-foreground pb-4 border-b border-border">{breadcrumb}</div>
        </div>

        <div className="pt-2">
          {activeTab === "leadership" && (
            <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
              <DataTable columns={columns} data={users} />
            </div>
          )}

          {activeTab === "addUsers" && (
            <FormPlaceholder
              title="Add Users"
              description="Add new users to the system."
            />
          )}

          {activeTab === "addPartner" && (
            <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
              <form className="space-y-6" onSubmit={handlePartnerSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Organization</Label>
                    <Select
                      disabled={loadingOrg}
                      value={partnerForm.organization}
                      onValueChange={(val) => setPartnerForm((f) => ({ ...f, organization: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={loadingOrg ? "Loading..." : "Select organization"} />
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
                    <Label>First Name</Label>
                    <Input
                      placeholder="Enter first name"
                      value={partnerForm.firstName}
                      onChange={(e) => setPartnerForm((f) => ({ ...f, firstName: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input
                      placeholder="Enter last name"
                      value={partnerForm.lastName}
                      onChange={(e) => setPartnerForm((f) => ({ ...f, lastName: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Mobile</Label>
                    <Input
                      placeholder="+971 50 000 0000"
                      value={partnerForm.mobile}
                      onChange={(e) => setPartnerForm((f) => ({ ...f, mobile: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      value={partnerForm.email}
                      onChange={(e) => setPartnerForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Roles</Label>
                    <Select
                      value={String(partnerForm.role)}
                      onValueChange={(val) => setPartnerForm((f) => ({ ...f, role: Number(val) }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((opt) => (
                          <SelectItem key={opt.value} value={String(opt.value)}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select
                      value={partnerForm.language}
                      onValueChange={(val) => setPartnerForm((f) => ({ ...f, language: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        {languageOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setPartnerForm((f) => ({ ...f, firstName: "", lastName: "", mobile: "", email: "" }))
                    }
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={savingPartner}>
                    {savingPartner ? "Saving..." : "Add user"}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "reimbursement" && (
            <div className="bg-card rounded-2xl p-6 shadow-sm border border-border space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Organization</Label>
                  <Select
                    disabled={loadingOrg}
                    value={selectedOrgForFilters}
                    onValueChange={setSelectedOrgForFilters}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingOrg ? "Loading..." : "Select organization"} />
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
                    disabled={!selectedOrgForFilters || loadingLocations}
                    value={selectedLocationForFilters}
                    onValueChange={setSelectedLocationForFilters}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingLocations ? "Loading..." : "Select location"} />
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
                    disabled={!selectedLocationForFilters || loadingChargers}
                    value={selectedChargerForFilters}
                    onValueChange={setSelectedChargerForFilters}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingChargers ? "Loading..." : "Select charger"} />
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
                    disabled={!selectedChargerForFilters || loadingConnectors}
                    value={selectedConnectorForFilters}
                    onValueChange={setSelectedConnectorForFilters}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingConnectors ? "Loading..." : "Select connector"} />
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From</Label>
                  <Input type="datetime-local" />
                </div>
                <div className="space-y-2">
                  <Label>To</Label>
                  <Input type="datetime-local" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline">Reset</Button>
                <Button>Generate</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Users;
