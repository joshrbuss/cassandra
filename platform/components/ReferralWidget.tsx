"use client";

import { useState } from "react";
import { useTranslation } from "@/components/i18n/LocaleProvider";

interface ReferralWidgetProps {
  referralCode: string;
  referralCount: number;
}

const THRESHOLD = 5;

export default function ReferralWidget({ referralCode, referralCount }: ReferralWidgetProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const referralLink = `https://cassandrachess.com/invite/${referralCode}`;
  const progress = Math.min(referralCount, THRESHOLD);
  const pct = (progress / THRESHOLD) * 100;
  const shareText = `Join me on Cassandra Chess — free game analysis and puzzles from your own blunders! ${referralLink}`;

  function handleCopy() {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({ text: shareText, url: referralLink }).catch(() => {});
    } else {
      handleCopy();
    }
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm mb-4">
      <h2 className="text-sm font-semibold text-stone-700 mb-2">{t("referral.title")}</h2>
      <p className="text-xs text-stone-500 mb-3">
        {t("referral.desc")}
      </p>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-bold text-stone-700">
            {t("referral.progress", { count: progress, total: THRESHOLD })}
          </span>
          {progress >= THRESHOLD && (
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {t("referral.unlocked")}
            </span>
          )}
        </div>
        <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-600 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Referral link */}
      <div className="flex items-center gap-2 mb-3">
        <input
          type="text"
          readOnly
          value={referralLink}
          className="flex-1 text-xs text-stone-600 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 select-all"
        />
        <button
          onClick={handleCopy}
          className="text-xs font-medium text-stone-700 bg-stone-100 border border-stone-200 px-3 py-2 rounded-lg hover:bg-stone-200 transition-colors whitespace-nowrap"
        >
          {copied ? t("referral.copied") : t("referral.copy")}
        </button>
      </div>

      {/* Share button */}
      <button
        onClick={handleShare}
        className="w-full text-sm font-medium text-white bg-stone-800 rounded-lg py-2.5 hover:bg-stone-700 transition-colors"
      >
        {t("referral.share")}
      </button>
    </div>
  );
}
