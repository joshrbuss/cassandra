"use client";

import { createContext, useContext, useState, useEffect } from "react";
import type { Locale } from "@/lib/i18n/locales";
import { LOCALES, LOCALE_COOKIE, isLocale } from "@/lib/i18n/locales";
import { getT } from "@/lib/i18n";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: ReturnType<typeof getT>;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  setLocale: () => {},
  t: getT("en"),
});

export function useLocale() {
  return useContext(LocaleContext);
}

interface LocaleProviderProps {
  /** Locale resolved server-side from the cookie (avoids flash) */
  initialLocale: Locale;
  children: React.ReactNode;
}

export default function LocaleProvider({ initialLocale, children }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // On first client render, sync with localStorage in case it's more up-to-date
  useEffect(() => {
    const stored = localStorage.getItem(LOCALE_COOKIE);
    if (isLocale(stored) && stored !== locale) {
      setLocaleState(stored);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    localStorage.setItem(LOCALE_COOKIE, l);
    // Also write a cookie so server components can read it on next navigation
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  }

  const t = getT(locale);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useTranslation() {
  const { t } = useLocale();
  return { t };
}
