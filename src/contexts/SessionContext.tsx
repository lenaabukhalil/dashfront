import { createContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { getAuthToken, getMeApi } from "@/services/api";

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
  sessionTimeout: number; // in minutes
  setSessionTimeout: (minutes: number) => void;
  updateActivity: () => void;
  forceLogout: (sessionId: string) => void;
  forceLogoutAll: () => void;
  getRemainingTime: () => number; // in seconds
  isSessionExpired: boolean;
}

export const SessionContext = createContext<SessionContextType | undefined>(undefined);

const SESSION_STORAGE_KEY = "ion_session";
const SESSION_TIMEOUT_KEY = "ion_session_timeout";
const DEFAULT_TIMEOUT = 30; // 30 minutes
const TOKEN_WARNING_MINUTES = 10; // warn once at 10 minutes remaining
const TOKEN_REFRESH_WINDOW_MINUTES = 15; // try silent refresh if under 15 minutes
const ACTIVE_WINDOW_MS = 5 * 60 * 1000; // user active in last 5 minutes
const REFRESH_COOLDOWN_MS = 2 * 60 * 1000;

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
  const { user, logout } = useAuth();
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [sessionTimeout, setSessionTimeoutState] = useState<number>(() => {
    const stored = localStorage.getItem(SESSION_TIMEOUT_KEY);
    return stored ? parseInt(stored, 10) : DEFAULT_TIMEOUT;
  });
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [lastActivity, setLastActivity] = useState<Date>(new Date());
  const [tokenExpiryMs, setTokenExpiryMs] = useState<number | null>(() => readTokenExpiryMs());
  const [hasWarnedTenMinutes, setHasWarnedTenMinutes] = useState(false);
  const [lastSilentRefreshAttemptMs, setLastSilentRefreshAttemptMs] = useState(0);

  useEffect(() => {
    if (user) {
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
      setLastActivity(new Date());
      setTokenExpiryMs(readTokenExpiryMs());
      setHasWarnedTenMinutes(false);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  }, [user]);

  useEffect(() => {
    if (!user || !currentSession) return;

    const checkTimeout = () => {
      const now = new Date();
      const timeSinceActivity = (now.getTime() - lastActivity.getTime()) / 1000 / 60; // minutes

      if (timeSinceActivity >= sessionTimeout) {
        setIsSessionExpired(true);
        logout();
      }
    };

    const interval = setInterval(checkTimeout, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [user, currentSession, lastActivity, sessionTimeout, logout]);

  useEffect(() => {
    if (!user || !currentSession || isSessionExpired) return;
    const interval = window.setInterval(() => {
      const nowMs = Date.now();
      const expMs = readTokenExpiryMs();
      setTokenExpiryMs(expMs);
      if (expMs == null) return;
      const remainingMinutes = (expMs - nowMs) / 1000 / 60;

      if (remainingMinutes <= 0) {
        setIsSessionExpired(true);
        logout();
        return;
      }

      // Old 5/3/1 warnings removed: show only one warning at <=10 minutes remaining.
      if (remainingMinutes <= TOKEN_WARNING_MINUTES && !hasWarnedTenMinutes) {
        console.warn(`Session will expire in ${Math.ceil(remainingMinutes)} minute(s)`);
        setHasWarnedTenMinutes(true);
      } else if (remainingMinutes > TOKEN_WARNING_MINUTES && hasWarnedTenMinutes) {
        setHasWarnedTenMinutes(false);
      }

      // Silent validation/refresh if active recently and token near expiry.
      const isUserActiveRecently = nowMs - lastActivity.getTime() <= ACTIVE_WINDOW_MS;
      const canAttemptRefresh = nowMs - lastSilentRefreshAttemptMs >= REFRESH_COOLDOWN_MS;
      if (isUserActiveRecently && remainingMinutes <= TOKEN_REFRESH_WINDOW_MINUTES && canAttemptRefresh) {
        setLastSilentRefreshAttemptMs(nowMs);
        void getMeApi()
          .then(() => {
            setTokenExpiryMs(readTokenExpiryMs());
          })
          .catch(() => {
            // Global expired-session handling is done by appFetch.
          });
      }
    }, 60000);
    return () => window.clearInterval(interval);
  }, [
    user,
    currentSession,
    isSessionExpired,
    logout,
    hasWarnedTenMinutes,
    lastActivity,
    lastSilentRefreshAttemptMs,
  ]);

  const setSessionTimeout = useCallback((minutes: number) => {
    setSessionTimeoutState(minutes);
    localStorage.setItem(SESSION_TIMEOUT_KEY, minutes.toString());
  }, []);

  const updateActivity = useCallback(() => {
    setLastActivity(new Date());
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
    [currentSession, logout]
  );

  const forceLogoutAll = useCallback(() => {
    setActiveSessions([]);
    logout();
  }, [logout]);

  const getRemainingTime = useCallback((): number => {
    if (!currentSession) return 0;
    const now = new Date();
    const elapsed = (now.getTime() - lastActivity.getTime()) / 1000; // seconds
    const remaining = sessionTimeout * 60 - elapsed; // convert to seconds
    return Math.max(0, Math.floor(remaining));
  }, [currentSession, lastActivity, sessionTimeout]);

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
        sessionTimeout,
        setSessionTimeout,
        updateActivity,
        forceLogout,
        forceLogoutAll,
        getRemainingTime,
        isSessionExpired,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

