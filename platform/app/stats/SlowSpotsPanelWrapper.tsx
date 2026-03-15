"use client";

import SlowSpotsPanel from "@/components/stats/SlowSpotsPanel";

interface Props {
  userId: string | null;
}

export default function SlowSpotsPanelWrapper({ userId }: Props) {
  if (!userId) return null;
  return <SlowSpotsPanel userId={userId} />;
}
