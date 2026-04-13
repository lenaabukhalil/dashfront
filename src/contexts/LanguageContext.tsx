import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { getT } from "@/lib/translations";

const STORAGE_KEY = "app-locale";

interface LanguageContextValue {
  /** App UI is English-only; kept for compatibility with existing consumers. */
  language: "en";
  t: (key: string) => string;
  dir: "ltr";
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const t = useMemo(() => getT("en"), []);

  useEffect(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    const root = document.documentElement;
    root.setAttribute("lang", "en");
    root.setAttribute("dir", "ltr");
  }, []);

  const value = useMemo(
    () =>
      ({
        language: "en",
        t,
        dir: "ltr",
      }) satisfies LanguageContextValue,
    [t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
