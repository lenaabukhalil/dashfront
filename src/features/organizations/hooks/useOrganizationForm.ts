import { useState } from "react";
import {
  fetchOrganizationDetails,
  createOrganization,
  deleteOrganization,
} from "@/services/api";
import { toast } from "@/hooks/use-toast";
import type { Organization } from "@/types";

export interface OrganizationFormData {
  name: string;
  name_ar: string;
  contact_first_name: string;
  contact_last_name: string;
  contact_phoneNumber: string;
  details: string;
}

const initialFormData: OrganizationFormData = {
  name: "",
  name_ar: "",
  contact_first_name: "",
  contact_last_name: "",
  contact_phoneNumber: "",
  details: "",
};

export function useOrganizationForm(
  organizations: Organization[],
  loading: boolean,
  refetch: () => Promise<void>,
  removeOrganizationById?: (id: string | number) => void
) {
  const [selectedOrgId, setSelectedOrgId] = useState<string>("__NEW_ORG__");
  const [formData, setFormData] = useState<OrganizationFormData>({ ...initialFormData });
  const [initialSnapshot, setInitialSnapshot] = useState<OrganizationFormData>({ ...initialFormData });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingOrgDetails, setIsLoadingOrgDetails] = useState(false);

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
        await refetch();
        setFormData({ ...initialFormData });
        setInitialSnapshot({ ...initialFormData });
        setSelectedOrgId("__NEW_ORG__");
        toast({
          title: "Success",
          description:
            selectedOrgId === "__NEW_ORG__"
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
    } catch (err) {
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
    if (selectedOrgId === "__NEW_ORG__") {
      setFormData({ ...initialFormData });
      setInitialSnapshot({ ...initialFormData });
    } else {
      setFormData({ ...initialSnapshot });
    }
  };

  const handleOrgSelectChange = async (value: string) => {
    setSelectedOrgId(value);
    if (value === "__NEW_ORG__") {
      setFormData({ ...initialFormData });
      setInitialSnapshot({ ...initialFormData });
    } else {
      setIsLoadingOrgDetails(true);
      try {
        console.log("Loading organization details for ID:", value);
        const orgDetails = await fetchOrganizationDetails(value);
        console.log("Organization details received:", orgDetails);

        if (orgDetails) {
          const next: OrganizationFormData = {
            name: orgDetails.name || "",
            name_ar: orgDetails.name_ar || "",
            contact_first_name: orgDetails.contact_first_name || "",
            contact_last_name: orgDetails.contact_last_name || "",
            contact_phoneNumber: orgDetails.contact_phoneNumber || "",
            details: orgDetails.details || "",
          };
          setFormData(next);
          setInitialSnapshot(next);
          toast({
            title: "Success",
            description: "Organization details loaded successfully",
          });
        } else {
          const org = organizations.find((o) => o.id === value);
          if (org) {
            const next: OrganizationFormData = {
              name: org.name || "",
              name_ar: "",
              contact_first_name: "",
              contact_last_name: "",
              contact_phoneNumber: "",
              details: "",
            };
            setFormData(next);
            setInitialSnapshot(next);
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
      } catch (err) {
        console.error("Error loading organization details:", err);
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

  const handleDelete = async () => {
    if (selectedOrgId === "__NEW_ORG__") return;
    const idToDelete = selectedOrgId;
    setIsSubmitting(true);
    try {
      const result = await deleteOrganization(Number(idToDelete));
      if (result.success) {
        removeOrganizationById?.(idToDelete);
        setFormData({ ...initialFormData });
        setInitialSnapshot({ ...initialFormData });
        setSelectedOrgId("__NEW_ORG__");
        await refetch();
        toast({
          title: "Success",
          description: result.message || "Organization deleted successfully.",
        });
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to delete organization.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete organization. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    selectedOrgId,
    formData,
    setFormData,
    isSubmitting,
    isLoadingOrgDetails,
    handleFormSubmit,
    handleCancel,
    handleOrgSelectChange,
    handleDelete,
  };
}
