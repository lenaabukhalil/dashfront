import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import type { AuditLog, AuditActionType, AuditLogFilters } from "@/types/audit";

interface AuditContextType {
  logs: AuditLog[];
  addLog: (
    action: AuditActionType,
    resource: string,
    resourceId?: string,
    details?: string,
    success?: boolean,
    errorMessage?: string
  ) => void;
  getLogs: (filters?: AuditLogFilters) => AuditLog[];
  clearLogs: () => void;
  exportLogs: (filters?: AuditLogFilters) => string;
}

const AuditContext = createContext<AuditContextType | undefined>(undefined);

const AUDIT_STORAGE_KEY = "ion_audit_logs";
const MAX_LOGS = 1000;

export const AuditProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>(() => {
    try {
      const stored = localStorage.getItem(AUDIT_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const addLog = useCallback(
    (
      action: AuditActionType,
      resource: string,
      resourceId?: string,
      details?: string,
      success: boolean = true,
      errorMessage?: string
    ) => {
      if (!user) return;

      const newLog: AuditLog = {
        id: `audit-${Date.now()}-${Math.random()}`,
        userId: user.id,
        userEmail: user.email,
        userType: user.userType,
        action,
        resource,
        resourceId,
        details,
        ipAddress: "N/A", // Would be set by backend
        userAgent: navigator.userAgent,
        timestamp: new Date(),
        success,
        errorMessage,
      };

      setLogs((prev) => {
        const updated = [newLog, ...prev].slice(0, MAX_LOGS);
        try {
          localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updated));
        } catch (error) {
          console.error("Failed to save audit logs:", error);
        }
        return updated;
      });
    },
    [user]
  );

  const getLogs = useCallback(
    (filters?: AuditLogFilters): AuditLog[] => {
      let filtered = [...logs];

      if (filters) {
        if (filters.userId) {
          filtered = filtered.filter((log) => log.userId === filters.userId);
        }
        if (filters.action) {
          filtered = filtered.filter((log) => log.action === filters.action);
        }
        if (filters.resource) {
          filtered = filtered.filter((log) => log.resource === filters.resource);
        }
        if (filters.startDate) {
          filtered = filtered.filter(
            (log) => new Date(log.timestamp) >= filters.startDate!
          );
        }
        if (filters.endDate) {
          filtered = filtered.filter(
            (log) => new Date(log.timestamp) <= filters.endDate!
          );
        }
        if (filters.success !== undefined) {
          filtered = filtered.filter((log) => log.success === filters.success);
        }
      }

      return filtered;
    },
    [logs]
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
    localStorage.removeItem(AUDIT_STORAGE_KEY);
  }, []);

  const exportLogs = useCallback(
    (filters?: AuditLogFilters): string => {
      const filteredLogs = getLogs(filters);
      return JSON.stringify(filteredLogs, null, 2);
    },
    [getLogs]
  );

  return (
    <AuditContext.Provider
      value={{
        logs,
        addLog,
        getLogs,
        clearLogs,
        exportLogs,
      }}
    >
      {children}
    </AuditContext.Provider>
  );
};

export const useAudit = () => {
  const context = useContext(AuditContext);
  if (context === undefined) {
    throw new Error("useAudit must be used within an AuditProvider");
  }
  return context;
};
