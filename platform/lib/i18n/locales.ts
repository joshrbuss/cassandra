export const LOCALES = ["en", "es", "fr", "de", "pt", "ru"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, { flag: string; label: string }> = {
  en: { flag: "🇬🇧", label: "English" },
  es: { flag: "🇪🇸", label: "Español" },
  fr: { flag: "🇫🇷", label: "Français" },
  de: { flag: "🇩🇪", label: "Deutsch" },
  pt: { flag: "🇧🇷", label: "Português" },
  ru: { flag: "🇷🇺", label: "Русский" },
};

export const LOCALE_COOKIE = "preferred_locale";

export function isLocale(v: unknown): v is Locale {
  return LOCALES.includes(v as Locale);
}
