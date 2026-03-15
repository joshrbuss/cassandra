"use client";

import { useEffect, useState } from "react";
import { getAnonId } from "@/lib/anonymous-id";
import TacticBreakdownTable from "@/components/stats/TacticBreakdownTable";

export default function TacticBreakdownTableWrapper() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    setUserId(getAnonId());
  }, []);

  if (!userId) return null;

  return <TacticBreakdownTable userId={userId} />;
}
