"use client";

import { useState, useRef, useEffect } from "react";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/locales";
import { useLocale } from "./i18n/LocaleProvider";

/** Dark-themed language toggle for obsidian nav bars. */
export default function NavLanguageToggle() {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = LOCALE_LABELS[locale];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Select language"
        className="flex items-center gap-1.5 rounded-lg border border-[#333] bg-[#1a1a1a] px-2.5 py-1.5 text-xs font-medium text-gray-400 hover:border-[#555] hover:text-gray-200 transition-colors"
      >
        <span>{current.flag}</span>
        <span>{current.label}</span>
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl border border-[#333] bg-[#1a1a1a] shadow-lg overflow-hidden">
          {LOCALES.map((l) => {
            const info = LOCALE_LABELS[l];
            return (
              <button
                key={l}
                onClick={() => {
                  if (l === locale) { setOpen(false); return; }
                  setLocale(l);
                  window.location.reload();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-[#222] transition-colors ${
                  l === locale ? "font-semibold text-[#c8942a] bg-[#c8942a]/10" : "text-gray-300"
                }`}
              >
                <span>{info.flag}</span>
                <span>{info.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
