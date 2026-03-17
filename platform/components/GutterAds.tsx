"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface GutterAdsProps {
  stripeLink?: string | null;
}

const PROMOS = [
  {
    key: "prophecy",
    href: "/prophecy",
    text: "Try Cassandra\u2019s Prophecy",
    sub: "Today\u2019s brilliant move awaits \u2192",
  },
  {
    key: "adfree",
    href: "__stripe__",
    text: "Go ad-free forever",
    sub: "\u00A34.99 one time",
  },
  {
    key: "referral",
    href: "/home#referral",
    text: "Refer 5 friends",
    sub: "\u2192 go ad-free free",
  },
] as const;

/**
 * Vertical 160x600 house ad columns that fill the desktop gutters
 * on either side of the main content. Hidden on mobile/tablet via CSS.
 * Only starts the rotation interval on xl+ screens to avoid wasted
 * JS execution on mobile.
 */
export default function GutterAds({ stripeLink }: GutterAdsProps) {
  const [idx, setIdx] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // Only run rotation on xl+ screens (1280px+)
    const mq = window.matchMedia("(min-width: 1280px)");
    setIsDesktop(mq.matches);

    function handleChange(e: MediaQueryListEvent) {
      setIsDesktop(e.matches);
    }
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!isDesktop) return;
    const timer = setInterval(() => {
      setIdx((prev) => (prev + 1) % PROMOS.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [isDesktop]);

  // Don't render anything on mobile/tablet — saves DOM nodes + event listeners
  if (!isDesktop) return null;

  const promo = PROMOS[idx];
  const href = promo.href === "__stripe__"
    ? (stripeLink ?? "/home")
    : promo.href;

  const card = (
    <div className="w-[160px] h-[600px] bg-[#0e0e0e] border border-[#2a2a2a] rounded-xl flex flex-col items-center justify-center px-4 text-center transition-opacity duration-700">
      <div className="w-8 h-8 rounded-lg bg-[#c8942a] flex items-center justify-center text-white font-bold text-sm mb-4">
        C
      </div>
      <p className="text-[#c8942a] font-semibold text-sm leading-tight mb-2">
        {promo.text}
      </p>
      <p className="text-gray-400 text-xs leading-snug">
        {promo.sub}
      </p>
    </div>
  );

  return (
    <>
      {/* Left gutter */}
      <div className="fixed left-4 top-1/2 -translate-y-1/2 z-30">
        <Link href={href}>{card}</Link>
      </div>
      {/* Right gutter */}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-30">
        <Link href={href}>{card}</Link>
      </div>
    </>
  );
}
