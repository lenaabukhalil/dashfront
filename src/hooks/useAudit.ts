import { useContext } from "react";
import { AuditContext, defaultAuditContext } from "@/contexts/AuditContext";

export const useAudit = () => {
  const context = useContext(AuditContext);
  return context ?? defaultAuditContext;
};
