"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "@/components/i18n/LocaleProvider";

const CURRENT_VERSION = "v1.2";
const STORAGE_KEY = "last_seen_update_version";

export default function ChangelogBanner() {
  const [visible, setVisible] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (seen !== CURRENT_VERSION) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-[#0e0e0e] border-b border-[#c8942a]/30 px-4 py-3">
      <div className="max-w-3xl mx-auto flex items-center gap-3">
        <span className="text-[10px] font-bold text-[#c8942a] bg-[#c8942a]/10 border border-[#c8942a]/30 px-2 py-0.5 rounded-full uppercase shrink-0">
          {CURRENT_VERSION}
        </span>
        <p className="text-xs text-gray-300 leading-relaxed flex-1">
          {t("changelog.message")}
          {" "}
          <Link href="/privacy" className="text-[#c8942a] hover:underline">
            {t("changelog.seeMore")}
          </Link>
        </p>
        <button
          onClick={dismiss}
          className="text-gray-500 hover:text-gray-300 transition-colors text-lg leading-none shrink-0 px-1"
          aria-label="Dismiss"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
