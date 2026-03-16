"use client";

import { useTranslation } from "@/components/i18n/LocaleProvider";

interface HomepageStatsProps {
  puzzlesSolved: number;
  fromRealGames: number;
  totalPlayers: number;
  onlineNow: number;
}

export default function HomepageStats({
  puzzlesSolved,
  fromRealGames,
  totalPlayers,
  onlineNow,
}: HomepageStatsProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
      <StatCell label={t("landing.stats.puzzlesSolved")} value={puzzlesSolved.toLocaleString()} />
      <StatCell label={t("landing.stats.fromRealGames")} value={fromRealGames.toLocaleString()} />
      <StatCell label={t("landing.stats.totalPlayers")} value={totalPlayers.toLocaleString()} />
      <StatCell
        label={t("landing.stats.onlineNow")}
        value={onlineNow.toLocaleString()}
        greenDot
      />
    </div>
  );
}

function StatCell({
  label,
  value,
  greenDot,
}: {
  label: string;
  value: string;
  greenDot?: boolean;
}) {
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 text-center">
      <p className="text-2xl font-extrabold text-white tabular-nums flex items-center justify-center gap-1.5">
        {value}
        {greenDot && (
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block animate-pulse" />
        )}
      </p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
