"use client";

import { useEffect, useRef, useState } from "react";

interface AdSlotProps {
  /** AdSense slot ID */
  slot: string;
  /** Ad format — default "auto" */
  format?: string;
  /** Full-width responsive — default true */
  fullWidthResponsive?: boolean;
  /** When true, show thank-you message instead of ad */
  isPaid?: boolean;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

/**
 * Ad container:
 * - Paid users see a gold thank-you message on obsidian background
 * - Free users see the gold-bordered ad container with placeholder if AdSense hasn't loaded
 */
export default function AdSlot({
  slot,
  format = "auto",
  fullWidthResponsive = true,
  isPaid = false,
  className = "",
}: AdSlotProps) {
  const pushed = useRef(false);
  const [adLoaded, setAdLoaded] = useState(false);

  useEffect(() => {
    if (isPaid || pushed.current) return;
    if (typeof window !== "undefined" && window.adsbygoogle) {
      try {
        window.adsbygoogle.push({});
        pushed.current = true;
        setAdLoaded(true);
      } catch {
        // adsbygoogle failed to push
      }
    }
    const timer = setTimeout(() => {
      if (pushed.current) return;
      if (typeof window !== "undefined" && window.adsbygoogle) {
        try {
          window.adsbygoogle.push({});
          pushed.current = true;
          setAdLoaded(true);
        } catch {
          // adsbygoogle failed
        }
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [isPaid]);

  // Paid users: thank-you message
  if (isPaid) {
    return (
      <div className={`w-full rounded-xl bg-[#0e0e0e] border border-[#2a2a2a] p-5 text-center ${className}`}>
        <p className="text-[#c8942a] font-semibold text-sm">
          Thank you for supporting Cassandra &#9823;
        </p>
      </div>
    );
  }

  // Free users: ad container
  return (
    <div
      className={`w-full rounded-lg border border-[#c8942a]/40 overflow-hidden ${className}`}
    >
      <p className="text-[11px] text-[#999] px-3 pt-2 pb-1">
        Ads keep Cassandra free
      </p>
      <div className="px-2 pb-2" style={{ minHeight: adLoaded ? undefined : "90px" }}>
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client="ca-pub-1008999288444187"
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive={fullWidthResponsive ? "true" : "false"}
        />
        {!adLoaded && (
          <div className="flex items-center justify-center h-[80px] bg-[#f8f7f4] rounded text-xs text-[#bbb]">
            Ad space
          </div>
        )}
      </div>
    </div>
  );
}
