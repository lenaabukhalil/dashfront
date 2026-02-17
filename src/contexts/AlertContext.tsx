import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useNotifications } from "./NotificationContext";
import type { Alert, AlertSeverity, AlertType, AlertRule } from "@/types/alerts";

interface AlertContextType {
  alerts: Alert[];
  rules: AlertRule[];
  addAlert: (
    type: AlertType,
    severity: AlertSeverity,
    title: string,
    message: string,
    resourceId?: string,
    resourceType?: string,
    details?: Record<string, unknown>
  ) => void;
  acknowledgeAlert: (alertId: string) => void;
  acknowledgeAll: () => void;
  removeAlert: (alertId: string) => void;
  getAlertsBySeverity: (severity: AlertSeverity) => Alert[];
  getUnacknowledgedAlerts: () => Alert[];
  addRule: (rule: Omit<AlertRule, "id">) => void;
  updateRule: (ruleId: string, updates: Partial<AlertRule>) => void;
  deleteRule: (ruleId: string) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

const ALERT_STORAGE_KEY = "ion_alerts";
const RULES_STORAGE_KEY = "ion_alert_rules";
const MAX_ALERTS = 500;

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [alerts, setAlerts] = useState<Alert[]>(() => {
    try {
      const stored = localStorage.getItem(ALERT_STORAGE_KEY);
      return stored
        ? (JSON.parse(stored) as { timestamp?: string | number; [k: string]: unknown }[]).map((a) => ({
            ...a,
            timestamp: new Date(a.timestamp ?? 0),
          }))
        : [];
    } catch {
      return [];
    }
  });
  const [rules, setRules] = useState<AlertRule[]>(() => {
    try {
      const stored = localStorage.getItem(RULES_STORAGE_KEY);
      return stored ? JSON.parse(stored) : getDefaultRules();
    } catch {
      return getDefaultRules();
    }
  });

  function getDefaultRules(): AlertRule[] {
    return [
      {
        id: "rule-1",
        name: "Charger Offline",
        type: "charger_offline",
        severity: "high",
        enabled: true,
        conditions: {},
        recipients: [1, 2], // Admin and Operator
        channels: ["in_app", "email"],
      },
      {
        id: "rule-2",
        name: "Charger Fault",
        type: "charger_fault",
        severity: "critical",
        enabled: true,
        conditions: {},
        recipients: [1, 2],
        channels: ["in_app", "email", "sms"],
      },
      {
        id: "rule-3",
        name: "Low Balance",
        type: "low_balance",
        severity: "medium",
        enabled: true,
        conditions: { threshold: 10 },
        recipients: [1, 3], // Admin and Accountant
        channels: ["in_app", "email"],
      },
    ];
  }

  const addAlert = useCallback(
    (
      type: AlertType,
      severity: AlertSeverity,
      title: string,
      message: string,
      resourceId?: string,
      resourceType?: string,
      details?: Record<string, unknown>
    ) => {
      const relevantRule = rules.find((r) => r.type === type && r.enabled);
      
      if (relevantRule && user && !relevantRule.recipients.includes(user.userType)) {
        return; // User doesn't have permission to see this alert
      }

      const newAlert: Alert = {
        id: `alert-${Date.now()}-${Math.random()}`,
        type,
        severity,
        title,
        message,
        timestamp: new Date(),
        acknowledged: false,
        resourceId,
        resourceType,
        details,
      };

      setAlerts((prev) => {
        const updated = [newAlert, ...prev].slice(0, MAX_ALERTS);
        try {
          localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(updated));
        } catch (error) {
          console.error("Failed to save alerts:", error);
        }
        return updated;
      });

      if (relevantRule?.channels.includes("in_app")) {
        addNotification({
          title,
          message,
          type: severity === "critical" ? "error" : severity === "high" ? "warning" : "info",
        });
      }
    },
    [rules, user, addNotification]
  );

  const acknowledgeAlert = useCallback((alertId: string) => {
    if (!user) return;
    
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId
          ? {
              ...alert,
              acknowledged: true,
              acknowledgedBy: user.id,
              acknowledgedAt: new Date(),
            }
          : alert
      )
    );
  }, [user]);

  const acknowledgeAll = useCallback(() => {
    if (!user) return;
    
    setAlerts((prev) =>
      prev.map((alert) =>
        !alert.acknowledged
          ? {
              ...alert,
              acknowledged: true,
              acknowledgedBy: user.id,
              acknowledgedAt: new Date(),
            }
          : alert
      )
    );
  }, [user]);

  const removeAlert = useCallback((alertId: string) => {
    setAlerts((prev) => {
      const updated = prev.filter((alert) => alert.id !== alertId);
      try {
        localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error("Failed to save alerts:", error);
      }
      return updated;
    });
  }, []);

  const getAlertsBySeverity = useCallback(
    (severity: AlertSeverity): Alert[] => {
      return alerts.filter((alert) => alert.severity === severity);
    },
    [alerts]
  );

  const getUnacknowledgedAlerts = useCallback((): Alert[] => {
    return alerts.filter((alert) => !alert.acknowledged);
  }, [alerts]);

  const addRule = useCallback((rule: Omit<AlertRule, "id">) => {
    const newRule: AlertRule = {
      ...rule,
      id: `rule-${Date.now()}-${Math.random()}`,
    };
    setRules((prev) => {
      const updated = [...prev, newRule];
      try {
        localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error("Failed to save alert rules:", error);
      }
      return updated;
    });
  }, []);

  const updateRule = useCallback((ruleId: string, updates: Partial<AlertRule>) => {
    setRules((prev) => {
      const updated = prev.map((rule) =>
        rule.id === ruleId ? { ...rule, ...updates } : rule
      );
      try {
        localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error("Failed to save alert rules:", error);
      }
      return updated;
    });
  }, []);

  const deleteRule = useCallback((ruleId: string) => {
    setRules((prev) => {
      const updated = prev.filter((rule) => rule.id !== ruleId);
      try {
        localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error("Failed to save alert rules:", error);
      }
      return updated;
    });
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(alerts));
    } catch (error) {
      console.error("Failed to save alerts:", error);
    }
  }, [alerts]);

  return (
    <AlertContext.Provider
      value={{
        alerts,
        rules,
        addAlert,
        acknowledgeAlert,
        acknowledgeAll,
        removeAlert,
        getAlertsBySeverity,
        getUnacknowledgedAlerts,
        addRule,
        updateRule,
        deleteRule,
      }}
    >
      {children}
    </AlertContext.Provider>
  );
};

export const useAlerts = () => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error("useAlerts must be used within an AlertProvider");
  }
  return context;
};
