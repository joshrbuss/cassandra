"use client";

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
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
      <StatCell label="Puzzles solved" value={puzzlesSolved.toLocaleString()} />
      <StatCell label="Puzzles from real games" value={fromRealGames.toLocaleString()} />
      <StatCell label="Total players" value={totalPlayers.toLocaleString()} />
      <StatCell
        label="Online now"
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
