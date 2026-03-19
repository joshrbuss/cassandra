import type { Locale } from "@/lib/i18n/locales";
import { LOCALES } from "@/lib/i18n/locales";

const NON_EN_LOCALES = LOCALES.filter((l): l is Exclude<Locale, "en"> => l !== "en");

/**
 * If the current pathname is a /learn page (including locale-prefixed variants),
 * returns the URL for the target locale. Otherwise returns null.
 *
 * Examples:
 *   /learn/chess-puzzles + "fr" → /fr/learn/chess-puzzles
 *   /fr/learn/chess-puzzles + "en" → /learn/chess-puzzles
 *   /fr/learn + "de" → /de/learn
 *   /home + "fr" → null (not a learn page)
 */
export function getLearnRedirectUrl(pathname: string, targetLocale: Locale): string | null {
  // Strip any existing locale prefix to get the bare /learn/... path
  let learnPath: string | null = null;

  // Check for locale-prefixed learn paths: /fr/learn, /fr/learn/slug
  for (const l of NON_EN_LOCALES) {
    const prefix = `/${l}/learn`;
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      learnPath = pathname.slice(prefix.length - "/learn".length); // extract /learn...
      break;
    }
  }

  // Check for bare /learn paths (English)
  if (!learnPath && (pathname === "/learn" || pathname.startsWith("/learn/"))) {
    learnPath = pathname;
  }

  if (!learnPath) return null;

  // Build the target URL
  if (targetLocale === "en") {
    return learnPath; // /learn or /learn/slug
  }
  return `/${targetLocale}${learnPath}`; // /fr/learn or /fr/learn/slug
}
