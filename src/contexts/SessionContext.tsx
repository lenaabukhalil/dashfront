import { createContext, useState, useEffect, useCallback, ReactNode, useRef } from "react";
import { useAuth } from "./AuthContext";
import { getAuthToken, refreshTokenApi, handleSessionExpiredUi } from "@/services/api";

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
const TOKEN_WARNING_MINUTES = 10; // warn once at 10 minutes remaining
const TOKEN_REFRESH_WINDOW_MINUTES = 15; // try silent refresh if under 15 minutes
const ACTIVE_WINDOW_MS = 5 * 60 * 1000; // user active in last 5 minutes
const REFRESH_COOLDOWN_MS = 2 * 60 * 1000;
const TOKEN_CHECK_INTERVAL_MS = 60_000;

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
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [lastActivity, setLastActivity] = useState<Date>(new Date());
  const [hasWarnedTenMinutes, setHasWarnedTenMinutes] = useState(false);
  const [lastSilentRefreshAttemptMs, setLastSilentRefreshAttemptMs] = useState(0);
  const isSessionExpiredRef = useRef(false);

  const expireSession = useCallback(() => {
    if (isSessionExpiredRef.current) return;
    isSessionExpiredRef.current = true;
    setIsSessionExpired(true);
    handleSessionExpiredUi();
  }, []);

  const runTokenExpiryCheck = useCallback(() => {
    if (!user || !currentSession || isSessionExpiredRef.current) return;

    const nowMs = Date.now();
    const expMs = readTokenExpiryMs();
    if (expMs == null) return;

    const remainingMinutes = (expMs - nowMs) / 1000 / 60;

    if (remainingMinutes <= 0) {
      expireSession();
      return;
    }

    if (remainingMinutes <= TOKEN_WARNING_MINUTES && !hasWarnedTenMinutes) {
      console.warn(`Session will expire in ${Math.ceil(remainingMinutes)} minute(s)`);
      setHasWarnedTenMinutes(true);
    } else if (remainingMinutes > TOKEN_WARNING_MINUTES && hasWarnedTenMinutes) {
      setHasWarnedTenMinutes(false);
    }

    const isUserActiveRecently = nowMs - lastActivity.getTime() <= ACTIVE_WINDOW_MS;
    const canAttemptRefresh = nowMs - lastSilentRefreshAttemptMs >= REFRESH_COOLDOWN_MS;
    if (isUserActiveRecently && remainingMinutes <= TOKEN_REFRESH_WINDOW_MINUTES && canAttemptRefresh) {
      setLastSilentRefreshAttemptMs(nowMs);
      void refreshTokenApi()
        .then(() => {
          setHasWarnedTenMinutes(false);
        })
        .catch(() => {
          // 401 forced logout is handled globally by appFetch; other failures keep the current token.
        });
    }
  }, [
    user,
    currentSession,
    expireSession,
    hasWarnedTenMinutes,
    lastActivity,
    lastSilentRefreshAttemptMs,
  ]);

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
      setLastActivity(new Date());
      setHasWarnedTenMinutes(false);
      setIsSessionExpired(false);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  }, [user]);

  useEffect(() => {
    if (!user || !currentSession || isSessionExpired) return;

    runTokenExpiryCheck();

    const interval = window.setInterval(runTokenExpiryCheck, TOKEN_CHECK_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [user, currentSession, isSessionExpired, runTokenExpiryCheck]);

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
