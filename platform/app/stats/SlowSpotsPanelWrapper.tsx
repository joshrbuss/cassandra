"use client";

import { useEffect, useState } from "react";
import { getAnonId } from "@/lib/anonymous-id";
import SlowSpotsPanel from "@/components/stats/SlowSpotsPanel";

export default function SlowSpotsPanelWrapper() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    setUserId(getAnonId());
  }, []);

  if (!userId) return null;

  return <SlowSpotsPanel userId={userId} />;
}
