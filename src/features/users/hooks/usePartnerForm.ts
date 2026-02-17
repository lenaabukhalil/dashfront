import { useEffect, useState } from "react";
import { createPartnerUser } from "@/services/api";
import { toast } from "@/hooks/use-toast";

export interface PartnerFormState {
  organization: string;
  firstName: string;
  lastName: string;
  mobile: string;
  email: string;
  role: number;
  language: string;
}

const initialForm: PartnerFormState = {
  organization: "",
  firstName: "",
  lastName: "",
  mobile: "",
  email: "",
  role: 1,
  language: "ar",
};

export function usePartnerForm(initialOrgValue: string) {
  const [partnerForm, setPartnerForm] = useState<PartnerFormState>({ ...initialForm });
  const [savingPartner, setSavingPartner] = useState(false);

  useEffect(() => {
    if (initialOrgValue && partnerForm.organization === "") {
      setPartnerForm((f) => ({ ...f, organization: initialOrgValue }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync initial org once only
  }, [initialOrgValue]);

  const handlePartnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { organization, firstName, lastName, mobile, email, role, language } = partnerForm;
    if (!organization || !firstName || !lastName || !mobile || !email) {
      toast({
        title: "Required fields",
        description: "Please complete all required fields.",
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
        toast({ title: "Saved", description: res.message });
        setPartnerForm((f) => ({ ...f, firstName: "", lastName: "", mobile: "", email: "" }));
      } else {
        toast({ title: "Not saved", description: res.message, variant: "destructive" });
      }
    } catch (error) {
      toast({
        title: "Unexpected error",
        description: "Could not save the user.",
        variant: "destructive",
      });
    } finally {
      setSavingPartner(false);
    }
  };

  const handleCancel = () => {
    setPartnerForm((f) => ({ ...f, firstName: "", lastName: "", mobile: "", email: "" }));
  };

  return {
    partnerForm,
    setPartnerForm,
    savingPartner,
    handlePartnerSubmit,
    handleCancel,
  };
}
