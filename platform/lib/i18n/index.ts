import type { Locale } from "./locales";
import { isLocale, LOCALE_COOKIE } from "./locales";

import enRaw from "./translations/en.json";

type TranslationDict = Record<string, string>;

const en: TranslationDict = enRaw as TranslationDict;

/** Lazy loaders for non-English translations — only fetched when needed */
const loaders: Record<string, () => Promise<{ default: TranslationDict }>> = {
  es: () => import("./translations/es.json"),
  fr: () => import("./translations/fr.json"),
  de: () => import("./translations/de.json"),
  pt: () => import("./translations/pt.json"),
  ru: () => import("./translations/ru.json"),
};

/** Cache for loaded translation dictionaries */
const cache: Partial<Record<Locale, TranslationDict>> = { en };

/** Load a locale's translations (returns from cache if already loaded) */
export async function loadLocale(locale: Locale): Promise<TranslationDict> {
  if (cache[locale]) return cache[locale];
  if (loaders[locale]) {
    const mod = await loaders[locale]();
    cache[locale] = mod.default;
    return mod.default;
  }
  return en;
}

/**
 * Build a translation function from a pre-loaded dictionary.
 * Falls back to English for any missing key.
 */
export function makeT(dict: TranslationDict) {
  const merged = { ...en, ...dict };
  return (key: string, vars?: Record<string, string | number>): string => {
    let str = merged[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replaceAll(`{${k}}`, String(v));
      }
    }
    return str;
  };
}

/**
 * Synchronous translation function — uses English + statically imported locale.
 * For server components that call getT() with all translations available.
 */
export function getT(locale: Locale) {
  const dict = cache[locale] ?? en;
  return makeT(dict);
}

/**
 * Synchronous preload for server components — loads all translations eagerly.
 * Call this once in server components that need non-English getT().
 */
export async function preloadLocale(locale: Locale): Promise<void> {
  await loadLocale(locale);
}

/**
 * Reads preferred locale from a cookie string (for server components).
 */
export function resolveLocale(cookieValue: string | undefined): Locale {
  return isLocale(cookieValue) ? cookieValue : "en";
}

export { LOCALE_COOKIE };
