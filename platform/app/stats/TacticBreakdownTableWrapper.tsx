"use client";

import TacticBreakdownTable from "@/components/stats/TacticBreakdownTable";

interface Props {
  userId: string | null;
}

export default function TacticBreakdownTableWrapper({ userId }: Props) {
  if (!userId) return (
    <p className="text-sm text-gray-500 text-center py-8">
      Sign in to see your stats.
    </p>
  );
  return <TacticBreakdownTable userId={userId} />;
}
