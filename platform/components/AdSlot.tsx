"use client";

import { useEffect, useRef, useState } from "react";

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

/**
 * Gold-bordered ad container that is ALWAYS visible for free users.
 * Shows a placeholder if AdSense hasn't loaded (consent declined, script blocked, etc).
 */
export default function AdSlot({
  slot,
  format = "auto",
  fullWidthResponsive = true,
  className = "",
}: AdSlotProps) {
  const pushed = useRef(false);
  const [adLoaded, setAdLoaded] = useState(false);

  useEffect(() => {
    if (pushed.current) return;
    // Check if adsbygoogle script is available
    if (typeof window !== "undefined" && window.adsbygoogle) {
      try {
        window.adsbygoogle.push({});
        pushed.current = true;
        setAdLoaded(true);
      } catch {
        // adsbygoogle failed to push
      }
    }
    // If not available yet, retry after a short delay (script loads async)
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
  }, []);

  return (
    <div
      className={`w-full rounded-lg border border-[#c8942a]/40 overflow-hidden ${className}`}
    >
      <p className="text-[11px] text-[#999] px-3 pt-2 pb-1">
        Ads keep Cassandra Chess free
      </p>
      {/* Always render the ins tag so AdSense can fill it */}
      <div className="px-2 pb-2" style={{ minHeight: adLoaded ? undefined : "90px" }}>
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client="ca-pub-1008999288444187"
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive={fullWidthResponsive ? "true" : "false"}
        />
        {/* Placeholder when ad hasn't loaded */}
        {!adLoaded && (
          <div className="flex items-center justify-center h-[80px] bg-[#f8f7f4] rounded text-xs text-[#bbb]">
            Ad space
          </div>
        )}
      </div>
    </div>
  );
}
