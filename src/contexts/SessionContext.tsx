import { createContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "./AuthContext";

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

    const checkWarning = () => {
      const now = new Date();
      const timeSinceActivity = (now.getTime() - lastActivity.getTime()) / 1000 / 60;
      const warningThreshold = sessionTimeout - 5; // Warn 5 minutes before

      if (timeSinceActivity >= warningThreshold && timeSinceActivity < sessionTimeout) {
        const remainingMinutes = Math.ceil(sessionTimeout - timeSinceActivity);
        console.warn(`Session will expire in ${remainingMinutes} minute(s)`);
      }
    };

    const interval = setInterval(checkWarning, 60000);
    return () => clearInterval(interval);
  }, [user, currentSession, lastActivity, sessionTimeout, isSessionExpired]);

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

