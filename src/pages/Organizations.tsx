import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageTabs } from "@/components/shared/PageTabs";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchOrganizations, createOrganization, fetchOrganizationDetails } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import type { Organization } from "@/types";
import { usePermission } from "@/hooks/usePermission";
import { userTypeToRole } from "@/lib/rbac-helpers";
import { useAuth } from "@/contexts/AuthContext";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
const tabs = [
  { id: "overview", label: "Overview" },
  { id: "add", label: "Organizations" },
];

const columns = [
  { key: "id" as const, header: "ID" },
  { key: "name" as const, header: "Name" },
  {
    key: "amount" as const,
    header: "Amount (JOD)",
    render: (org: Organization) => {
      const amount = typeof org.amount === 'number' ? org.amount : parseFloat(String(org.amount || 0));
      return amount.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    },
  },
  {
    key: "energy" as const,
    header: "Energy",
    render: (org: Organization) => {
      const energy = typeof org.energy === 'number' ? org.energy : parseFloat(String(org.energy || 0));
      return `${energy.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kWh`;
    },
  },
];

interface OrganizationFormData {
  name: string;
  name_ar: string;
  contact_first_name: string;
  contact_last_name: string;
  contact_phoneNumber: string;
  details: string;
}

const Organizations = () => {
  const { user } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;
  const { canRead, canWrite } = usePermission(role);
  
  const [activeTab, setActiveTab] = useState("overview");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [selectedOrgId, setSelectedOrgId] = useState<string>("__NEW_ORG__");
  const [formData, setFormData] = useState<OrganizationFormData>({
    name: "",
    name_ar: "",
    contact_first_name: "",
    contact_last_name: "",
    contact_phoneNumber: "",
    details: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingOrgDetails, setIsLoadingOrgDetails] = useState(false);

  useEffect(() => {
    // Only load if user has read permission
    if (!canRead("org.name")) {
      setLoading(false);
      return;
    }

    const loadOrganizations = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchOrganizations();
        console.log("Organizations data loaded:", data);
        setOrganizations(data);
      } catch (error) {
        console.error("Error loading organizations:", error);
        setError(error instanceof Error ? error.message : "Failed to load organizations");
        setOrganizations([]);
      } finally {
        setLoading(false);
      }
    };
    
    // Load immediately
    loadOrganizations();
    
    // Auto-refresh every 60 seconds (matching Node-RED backend)
    const interval = setInterval(() => {
      loadOrganizations();
    }, 60000); // 60 seconds
    
    return () => clearInterval(interval);
  }, [canRead]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Organization name is required!",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        ...(selectedOrgId !== "__NEW_ORG__" && { organization_id: selectedOrgId }),
      };
      
      const result = await createOrganization(payload);
      
      if (result.success) {
        const updatedOrgs = await fetchOrganizations();
        setOrganizations(updatedOrgs);
        
       
        setFormData({
          name: "",
          name_ar: "",
          contact_first_name: "",
          contact_last_name: "",
          contact_phoneNumber: "",
          details: "",
        });
        setSelectedOrgId("__NEW_ORG__");
        
        // إظهار رسالة نجاح
        toast({
          title: "Success",
          description: selectedOrgId === "__NEW_ORG__" 
            ? "Organization added successfully!" 
            : "Organization updated successfully!",
        });
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save organization. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: "",
      name_ar: "",
      contact_first_name: "",
      contact_last_name: "",
      contact_phoneNumber: "",
      details: "",
    });
    setSelectedOrgId("__NEW_ORG__");
  };

  const handleOrgSelectChange = async (value: string) => {
    setSelectedOrgId(value);
    if (value === "__NEW_ORG__") {
      // Clear form for new organization
      setFormData({
        name: "",
        name_ar: "",
        contact_first_name: "",
        contact_last_name: "",
        contact_phoneNumber: "",
        details: "",
      });
    } else {
      // Load existing organization details from API
      setIsLoadingOrgDetails(true);
      try {
        console.log("Loading organization details for ID:", value);
        const orgDetails = await fetchOrganizationDetails(value);
        console.log("Organization details received:", orgDetails);
        
        if (orgDetails) {
          setFormData({
            name: orgDetails.name || "",
            name_ar: orgDetails.name_ar || "",
            contact_first_name: orgDetails.contact_first_name || "",
            contact_last_name: orgDetails.contact_last_name || "",
            contact_phoneNumber: orgDetails.contact_phoneNumber || "",
            details: orgDetails.details || "",
          });
          toast({
            title: "Success",
            description: "Organization details loaded successfully",
          });
        } else {
          // If API doesn't return details, try to get basic info from the list
          const org = organizations.find((o) => o.id === value);
          if (org) {
            setFormData({
              name: org.name || "",
              name_ar: "",
              contact_first_name: "",
              contact_last_name: "",
              contact_phoneNumber: "",
              details: "",
            });
            toast({
              title: "Info",
              description: "Basic organization info loaded. Some details may be missing.",
            });
          } else {
            toast({
              title: "Warning",
              description: "Could not load organization details. Please try again.",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error("Error loading organization details:", error);
        toast({
          title: "Error",
          description: "Failed to load organization details. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingOrgDetails(false);
      }
    }
  };

  const getBreadcrumb = () => {
    switch (activeTab) {
      case "add":
        return "ION Dashboard / Organizations / Add Organizations";
      case "reports":
        return "ION Dashboard / Organizations / Reports";
      default:
        return "ION Dashboard / Organizations";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Organizations</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Manage all organizations
          </p>

          <PageTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          <div className="text-xs text-muted-foreground pb-4 border-b border-border">
            {getBreadcrumb()}
          </div>
        </div>

        <div className="pt-2">
          {activeTab === "overview" && (
            <PermissionGuard 
              role={role} 
              permission="org.name" 
              action="read"
              fallback={
                <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                  <EmptyState
                    title="Access Denied"
                    description="You don't have permission to view organizations."
                  />
                </div>
              }
            >
              <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                {error ? (
                <div className="py-8 text-center">
                  <p className="text-destructive mb-2 font-semibold">Connection Error</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Cannot connect to backend API
                  </p>
                  <div className="text-left max-w-md mx-auto bg-muted p-4 rounded-lg mb-4">
                    <p className="text-sm font-medium mb-2">Please check:</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Is the API endpoint configured correctly?</li>
                      <li>Check CORS settings in the backend</li>
                      <li>Verify network connectivity</li>
                    </ul>
                  </div>
                  <button
                    onClick={() => {
                      setError(null);
                      window.location.reload();
                    }}
                    className="text-sm text-primary hover:underline"
                  >
                    Retry
                  </button>
                </div>
              ) : loading && organizations.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Loading organizations...
                </div>
              ) : organizations.length === 0 ? (
                <EmptyState
                  title="No Organizations"
                  description="No organizations found. Add your first organization to get started."
                />
              ) : (
                <div className="space-y-4">
                  <DataTable 
                    columns={columns} 
                    data={organizations}
                    searchPlaceholder="Search organizations..."
                    showSearch={true}
                  />
                  {loading && (
                    <div className="text-xs text-muted-foreground text-center">
                      Refreshing data...
                    </div>
                  )}
                </div>
              )}
              </div>
            </PermissionGuard>
          )}
          {activeTab === "add" && (
            <PermissionGuard 
              role={role} 
              permission="org.name" 
              action="write"
              fallback={
                <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                  <EmptyState
                    title="Access Denied"
                    description="You don't have permission to add or edit organizations."
                  />
                </div>
              }
            >
              <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                <form onSubmit={handleFormSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="organization-select">
                    Organization <span className="text-destructive">*</span>
                  </Label>
                  <Select 
                    value={selectedOrgId} 
                    onValueChange={handleOrgSelectChange}
                    disabled={isLoadingOrgDetails || loading}
                  >
                    <SelectTrigger id="organization-select">
                      <SelectValue placeholder={isLoadingOrgDetails ? "Loading..." : "Select organization"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__NEW_ORG__">--- New Organization ---</SelectItem>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isLoadingOrgDetails && (
                    <p className="text-xs text-muted-foreground">Loading organization details...</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter organization name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name_ar">Name (Arabic)</Label>
                    <Input
                      id="name_ar"
                      value={formData.name_ar}
                      onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                      placeholder="أدخل اسم المنظمة"
                      dir="rtl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_first_name">Contact First Name</Label>
                    <Input
                      id="contact_first_name"
                      value={formData.contact_first_name}
                      onChange={(e) => setFormData({ ...formData, contact_first_name: e.target.value })}
                      placeholder="Enter first name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_last_name">Contact Last Name</Label>
                    <Input
                      id="contact_last_name"
                      value={formData.contact_last_name}
                      onChange={(e) => setFormData({ ...formData, contact_last_name: e.target.value })}
                      placeholder="Enter last name"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="contact_phoneNumber">Contact Phone Number</Label>
                    <Input
                      id="contact_phoneNumber"
                      value={formData.contact_phoneNumber}
                      onChange={(e) => setFormData({ ...formData, contact_phoneNumber: e.target.value })}
                      placeholder="+971 50 000 0000"
                      type="tel"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="details">Details</Label>
                    <Textarea
                      id="details"
                      value={formData.details}
                      onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                      placeholder="Enter organization details"
                      rows={4}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Add / Update Organization"}
                  </Button>
                </div>
              </form>
              </div>
            </PermissionGuard>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Organizations;
