"use client";

import { useEffect, useRef } from "react";

interface AdSlotProps {
  /** AdSense slot ID */
  slot: string;
  /** Ad format — default "auto" */
  format?: string;
  /** Full-width responsive — default true */
  fullWidthResponsive?: boolean;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

export default function AdSlot({
  slot,
  format = "auto",
  fullWidthResponsive = true,
  className = "",
}: AdSlotProps) {
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // adsbygoogle not loaded
    }
  }, []);

  return (
    <div
      className={`w-full ${className}`}
      style={{
        border: "1px solid #c8942a",
        borderRadius: "8px",
        padding: "8px",
      }}
    >
      <p style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>
        Ads keep Cassandra Chess free
      </p>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-1008999288444187"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={fullWidthResponsive ? "true" : "false"}
      />
    </div>
  );
}
