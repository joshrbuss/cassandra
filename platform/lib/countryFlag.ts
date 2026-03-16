/**
 * Convert ISO 3166-1 alpha-2 country code to flag emoji.
 * "GB" → "🇬🇧", "US" → "🇺🇸"
 */
export function countryToFlag(code: string | null | undefined): string {
  if (!code || code.length !== 2) return "";
  const upper = code.toUpperCase();
  return String.fromCodePoint(
    ...Array.from(upper).map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}
