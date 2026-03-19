"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Locale } from "@/lib/i18n/locales";
import { LOCALES, LOCALE_COOKIE, isLocale } from "@/lib/i18n/locales";
import { loadLocale, makeT } from "@/lib/i18n";

type TFunc = (key: string, vars?: Record<string, string | number>) => string;

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: TFunc;
}

// Default English t() — no async needed, English is statically imported
const defaultT = makeT({});

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  setLocale: () => {},
  t: defaultT,
});

export function useLocale() {
  return useContext(LocaleContext);
}

interface LocaleProviderProps {
  initialLocale: Locale;
  children: React.ReactNode;
}

export default function LocaleProvider({ initialLocale, children }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [t, setT] = useState<TFunc>(() => defaultT);

  // Load translations for the current locale
  const loadTranslations = useCallback(async (l: Locale) => {
    const dict = await loadLocale(l);
    setT(() => makeT(dict));
  }, []);

  // On mount: check URL locale prefix (for /fr/learn etc.), then localStorage
  useEffect(() => {
    // URL-based locale takes priority on locale-prefixed routes (e.g. /fr/learn/...)
    const pathSegment = window.location.pathname.split("/")[1];
    const urlLocale = LOCALES.find((l) => l === pathSegment && l !== "en");

    let resolvedLocale = locale;
    if (urlLocale) {
      resolvedLocale = urlLocale;
    } else {
      const stored = localStorage.getItem(LOCALE_COOKIE);
      if (isLocale(stored) && stored !== locale) {
        resolvedLocale = stored;
      }
    }
    if (resolvedLocale !== locale) {
      setLocaleState(resolvedLocale);
    }
    loadTranslations(resolvedLocale);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When locale changes (e.g. user switches language), load new translations
  // and sync the <html lang> attribute
  useEffect(() => {
    loadTranslations(locale);
    document.documentElement.lang = locale;
  }, [locale, loadTranslations]);

  function setLocale(l: Locale) {
    setLocaleState(l);
    localStorage.setItem(LOCALE_COOKIE, l);
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: l }),
    }).catch(() => {});
  }

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
