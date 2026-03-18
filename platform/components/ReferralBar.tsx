"use client";

import { useState } from "react";
import { useTranslation } from "@/components/i18n/LocaleProvider";
import { gtagEvent } from "@/lib/gtag";

interface Props {
  referralCode: string;
  referralCount: number;
}

const THRESHOLD = 5;

export default function ReferralBar({ referralCode, referralCount }: Props) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const referralLink = `https://cassandrachess.com/invite/${referralCode}`;
  const progress = Math.min(referralCount, THRESHOLD);
  const pct = (progress / THRESHOLD) * 100;

  function handleCopy() {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      gtagEvent("referral_link_copied");
    });
  }

  return (
    <div className="bg-[#eeebe6] border border-[#d8d4ce] rounded-xl px-4 py-3 mb-4 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-[#666]">
            {t("referral.progress", { count: progress, total: THRESHOLD })}
          </span>
          {progress >= THRESHOLD && (
            <span className="text-[10px] font-medium text-[#c8942a]">
              {t("referral.unlocked")}
            </span>
          )}
        </div>
        <div className="w-full h-2 bg-[#d8d4ce] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#c8942a] rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <button
        onClick={handleCopy}
        className="text-xs font-medium text-[#c8942a] hover:text-[#a67720] transition-colors whitespace-nowrap shrink-0"
      >
        {copied ? t("referral.copied") : t("dashboard.copyLink")}
      </button>
    </div>
  );
}
