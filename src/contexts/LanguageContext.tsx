import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { Locale } from "@/lib/translations";
import { getT } from "@/lib/translations";

const STORAGE_KEY = "app-locale";

function getStoredLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "ar" || stored === "en") return stored;
  return "en";
}

interface LanguageContextValue {
  language: Locale;
  setLanguage: (locale: Locale) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Locale>(getStoredLocale);
  const setLanguage = useCallback((locale: Locale) => {
    setLanguageState(locale);
    localStorage.setItem(STORAGE_KEY, locale);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("lang", language);
    root.setAttribute("dir", language === "ar" ? "rtl" : "ltr");
  }, [language]);

  const t = getT(language);
  const dir = language === "ar" ? "rtl" : "ltr";

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
