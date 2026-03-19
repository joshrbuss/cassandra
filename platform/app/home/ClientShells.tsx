"use client";

import dynamic from "next/dynamic";

export const GutterAds = dynamic(() => import("@/components/GutterAds"), { ssr: false });
export const EmailPopup = dynamic(() => import("@/components/EmailPopup"), { ssr: false });
export const SyncButton = dynamic(() => import("@/components/SyncButton"), { ssr: false });
export const BackgroundAnalysisBar = dynamic(() => import("@/components/BackgroundAnalysisBar"), { ssr: false });
