// Phase 1+2+3 verification checklist:
// Phase 1 (already shipped):
// - [x] Near-expiry tokens refresh synchronously (no 10s floor wait).
// - [x] Concurrent timer + visibility triggers share one /auth/refresh call (inFlight dedup).
// - [x] expireSession() clears timer and inflight ref before logout UI.
// - [x] Failed refresh on expired token triggers expireSession() instead of retry loop.
// - [x] Cross-tab ion_token removal expires local session.
// Phase 2 (deps cleanup):
// - [ ] Mouse/keyboard activity does NOT re-run the scheduling effect (verify: open React DevTools, watch the effect, move mouse — should not log re-runs).
// - [ ] lastActivity state is fully removed; no references remain.
// - [ ] Scheduling effect runs only on: fresh login, session expiry flip, post-refresh rescheduleTick bump.
// Phase 3 (cross-tab + perms refresh):
// - [ ] After /auth/refresh success, AuthContext.user and permissions reflect the latest response (verify by changing DB perms and waiting for next refresh).
// - [ ] Refresh response with permissions: PERMISSION_LABELS-gated UI updates without reload.
// - [ ] Tab A refresh → tab B picks up new permissions/user within the same event loop tick via storage event.
// Phase 3.5 (type alignment + cross-tab token sync):
// - [ ] AuthContextType in src/types/auth.ts now declares applyRefreshedAuth (verify with `tsc --noEmit`).
// - [ ] Tab A refresh updates ion_token in localStorage → Tab B's scheduler reschedules from the new exp (no double refresh; rescheduleTick bumps).

import { createContext, useState, useEffect, useCallback, ReactNode, useRef } from "react";
import { useAuth } from "./AuthContext";
import { getAuthToken, refreshTokenApi, handleSessionExpiredUi } from "@/services/api";
import type { User } from "@/types/auth";
import type { PermissionsMap } from "@/types/permissions";

interface Session {
  id: string;
  userId: string;
  startTime: Date;
  lastActivity: Date;
  ipAddress: string;
  userAgent: string;
  isCurrent: boolean;
}

interface SessionContextType {
  currentSession: Session | null;
  activeSessions: Session[];
  updateActivity: () => void;
  forceLogout: (sessionId: string) => void;
  forceLogoutAll: () => void;
  isSessionExpired: boolean;
}

export const SessionContext = createContext<SessionContextType | undefined>(undefined);

const SESSION_STORAGE_KEY = "ion_session";
const REFRESH_LEAD_MS = 5 * 60 * 1000; // refresh 5 min before exp
const MIN_REFRESH_INTERVAL_MS = 60 * 1000; // hard floor between attempts

function readTokenExpiryMs(): number | null {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(normalized)) as { exp?: unknown };
    const exp = Number(json?.exp);
    if (!Number.isFinite(exp) || exp <= 0) return null;
    return exp * 1000;
  } catch {
    return null;
  }
}

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const { user, logout, applyRefreshedAuth } = useAuth();
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [rescheduleTick, setRescheduleTick] = useState(0);
  const isSessionExpiredRef = useRef(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRefreshAttemptRef = useRef(0);
  const inFlightRefreshRef = useRef<Promise<unknown> | null>(null);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current != null) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const expireSession = useCallback(() => {
    if (isSessionExpiredRef.current) return;
    isSessionExpiredRef.current = true;
    clearRefreshTimer();
    inFlightRefreshRef.current = null;
    setIsSessionExpired(true);
    handleSessionExpiredUi();
  }, [clearRefreshTimer]);

  const attemptRefresh = useCallback(() => {
    if (inFlightRefreshRef.current !== null) {
      return inFlightRefreshRef.current;
    }

    if (!user || isSessionExpiredRef.current) return;

    const nowMs = Date.now();
    const elapsed = nowMs - lastRefreshAttemptRef.current;
    if (elapsed < MIN_REFRESH_INTERVAL_MS) {
      clearRefreshTimer();
      refreshTimerRef.current = setTimeout(() => {
        attemptRefresh();
      }, MIN_REFRESH_INTERVAL_MS - elapsed);
      return;
    }

    lastRefreshAttemptRef.current = nowMs;
    const p = refreshTokenApi()
      .then((data) => {
        applyRefreshedAuth({
          token: data?.token ?? null,
          user: data?.user ?? null,
          permissions: (data?.permissions as PermissionsMap | undefined) ?? null,
        });
        setRescheduleTick((t) => t + 1);
      })
      .catch(() => {
        const expMs = readTokenExpiryMs();
        if (expMs == null || expMs <= Date.now()) {
          expireSession();
        }
      })
      .finally(() => {
        inFlightRefreshRef.current = null;
      });
    inFlightRefreshRef.current = p;
    return p;
  }, [user, clearRefreshTimer, expireSession, applyRefreshedAuth]);

  useEffect(() => {
    if (user) {
      isSessionExpiredRef.current = false;
      const session: Session = {
        id: `session-${Date.now()}`,
        userId: user.id,
        startTime: new Date(),
        lastActivity: new Date(),
        ipAddress: "N/A", // Would be set by backend
        userAgent: navigator.userAgent,
        isCurrent: true,
      };
      setCurrentSession(session);
      setActiveSessions([session]);
      setIsSessionExpired(false);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  }, [user]);

  useEffect(() => {
    if (!user || isSessionExpired) return;

    const expMs = readTokenExpiryMs();
    if (expMs == null) return;

    if (expMs <= Date.now()) {
      expireSession();
      return;
    }

    const remaining = expMs - Date.now();
    clearRefreshTimer();
    if (remaining <= REFRESH_LEAD_MS) {
      attemptRefresh();
    } else {
      refreshTimerRef.current = setTimeout(() => {
        attemptRefresh();
      }, remaining - REFRESH_LEAD_MS);
    }

    return () => {
      clearRefreshTimer();
    };
  }, [user, isSessionExpired, rescheduleTick, expireSession, attemptRefresh, applyRefreshedAuth]);

  useEffect(() => {
    if (!user || isSessionExpired) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;

      const expMs = readTokenExpiryMs();
      if (expMs == null) return;

      const nowMs = Date.now();
      if (expMs <= nowMs) {
        expireSession();
        return;
      }

      if (expMs - nowMs <= REFRESH_LEAD_MS) {
        attemptRefresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user, isSessionExpired, expireSession, attemptRefresh]);

  // Cross-tab only: `storage` does not fire in the tab that called clearAuthStorage.
  // Same-tab expiry (appFetch 401 → handleSessionExpiredUi) is not covered here; the
  // 400ms redirect window may allow one no-op timer tick against an empty token.
  useEffect(() => {
    if (!user) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === "ion_token" && e.newValue === null) {
        expireSession();
        return;
      }
      if (e.key === "ion_token" && e.newValue && e.newValue !== e.oldValue) {
        // Tab A refreshed the token; rebase our scheduler on the new exp.
        setRescheduleTick((t) => t + 1);
        return;
      }
      if (e.key === "ion_permissions" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as PermissionsMap;
          applyRefreshedAuth({ permissions: parsed });
        } catch {
          /* ignore parse errors */
        }
        return;
      }
      if (e.key === "ion_user" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as User;
          applyRefreshedAuth({ user: parsed });
        } catch {
          /* ignore parse errors */
        }
        return;
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [user, expireSession, applyRefreshedAuth]);

  const updateActivity = useCallback(() => {
    if (currentSession) {
      const updated = {
        ...currentSession,
        lastActivity: new Date(),
      };
      setCurrentSession(updated);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updated));
    }
  }, [currentSession]);

  const forceLogout = useCallback(
    (sessionId: string) => {
      setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSession?.id === sessionId) {
        logout();
      }
    },
    [currentSession, logout],
  );

  const forceLogoutAll = useCallback(() => {
    setActiveSessions([]);
    logout();
  }, [logout]);

  useEffect(() => {
    if (!user) return;

    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    const handleActivity = () => updateActivity();

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [user, updateActivity]);

  return (
    <SessionContext.Provider
      value={{
        currentSession,
        activeSessions,
        updateActivity,
        forceLogout,
        forceLogoutAll,
        isSessionExpired,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};
