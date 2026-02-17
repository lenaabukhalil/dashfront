import { createContext, useContext, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { usePermission } from "@/hooks/usePermission";
import type { PermissionCode } from "@/types/permissions";
import type { PermissionKey } from "@/lib/permissions";

interface PermissionContextType {
  canRead: (code: PermissionCode | PermissionKey) => boolean;
  canWrite: (code: PermissionCode | PermissionKey) => boolean;
  hasPermission: (code: PermissionCode | PermissionKey) => boolean;
  hasAnyPermission: (codes: (PermissionCode | PermissionKey)[], action?: "read" | "write") => boolean;
  hasAllPermissions: (codes: (PermissionCode | PermissionKey)[], action?: "read" | "write") => boolean;
  isReadOnly: (code: PermissionCode | PermissionKey) => boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const PermissionProvider = ({ children }: { children: ReactNode }) => {
  const { canRead, canWrite, hasAny, hasAll, isReadOnly } = usePermission();

  const value: PermissionContextType = {
    canRead: (code) => canRead(code as PermissionKey),
    canWrite: (code) => canWrite(code as PermissionKey),
    hasPermission: (code) => canRead(code as PermissionKey),
    hasAnyPermission: (codes, action = "read") =>
      hasAny(codes as PermissionKey[], action),
    hasAllPermissions: (codes, action = "read") =>
      hasAll(codes as PermissionKey[], action),
    isReadOnly: (code) => isReadOnly(code as PermissionKey),
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error("usePermissions must be used within a PermissionProvider");
  }
  return context;
};
