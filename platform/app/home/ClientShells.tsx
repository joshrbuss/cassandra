"use client";

import dynamic from "next/dynamic";

export const GutterAds = dynamic(() => import("@/components/GutterAds"), { ssr: false });
export const EmailPopup = dynamic(() => import("@/components/EmailPopup"), { ssr: false });
