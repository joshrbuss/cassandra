import type { Locale } from "./locales";
import { isLocale, LOCALE_COOKIE } from "./locales";

import en from "./translations/en.json";
import es from "./translations/es.json";
import fr from "./translations/fr.json";
import de from "./translations/de.json";
import pt from "./translations/pt.json";
import ru from "./translations/ru.json";

type TranslationDict = Record<string, string>;

const translations: Record<Locale, TranslationDict> = { en, es, fr, de, pt, ru };

/**
 * Returns a translation function for the given locale.
 * Falls back to English for any missing key.
 * Supports simple variable interpolation: t("key", { name: "Josh" }) → "Hello Josh"
 */
export function getT(locale: Locale) {
  const dict: TranslationDict = { ...translations.en, ...translations[locale] };
  return (key: string, vars?: Record<string, string | number>): string => {
    let str = dict[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replaceAll(`{${k}}`, String(v));
      }
    }
    return str;
  };
}

/**
 * Reads preferred locale from a cookie string (for server components).
 * Pass `(await cookies()).get(LOCALE_COOKIE)?.value` as input.
 */
export function resolveLocale(cookieValue: string | undefined): Locale {
  return isLocale(cookieValue) ? cookieValue : "en";
}

export { LOCALE_COOKIE };
