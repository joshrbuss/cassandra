"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "@/components/i18n/LocaleProvider";

export const CONSENT_KEY = "cookie_consent_accepted";

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const val = localStorage.getItem(CONSENT_KEY);
    if (val === null) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem(CONSENT_KEY, "true");
    setVisible(false);
    window.location.reload();
  }

  function decline() {
    localStorage.setItem(CONSENT_KEY, "false");
    setVisible(false);
    window.location.reload();
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-[#0e0e0e] border-t border-[#333] px-4 py-4 sm:py-3">
      <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
        <p className="text-xs text-gray-400 leading-relaxed text-center sm:text-left flex-1">
          {t("cookie.message")}
        </p>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={accept}
            className="bg-[#c8942a] text-white text-sm font-semibold px-5 py-1.5 rounded-full hover:bg-[#b5852a] transition-colors"
          >
            {t("cookie.accept")}
          </button>
          <button
            onClick={decline}
            className="text-sm font-medium text-gray-400 px-4 py-1.5 rounded-full border border-[#444] hover:border-[#666] hover:text-gray-300 transition-colors"
          >
            {t("cookie.decline")}
          </button>
          <Link
            href="/privacy"
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors whitespace-nowrap"
          >
            {t("cookie.privacyLink")}
          </Link>
        </div>
      </div>
    </div>
  );
}
