"use client";

import { useTranslation } from "@/components/i18n/LocaleProvider";
import { CONSENT_KEY } from "./CookieConsentBanner";

export default function CookiePreferencesLink() {
  const { t } = useTranslation();

  function resetPreferences() {
    localStorage.removeItem(CONSENT_KEY);
    window.location.reload();
  }

  return (
    <button
      onClick={resetPreferences}
      className="text-xs text-[#c8942a]/70 hover:text-[#c8942a] transition-colors"
    >
      {t("cookie.preferences")}
    </button>
  );
}
