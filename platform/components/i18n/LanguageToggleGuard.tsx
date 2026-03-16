"use client";

import { usePathname } from "next/navigation";
import LanguageToggle from "./LanguageToggle";

/**
 * Only renders the language toggle on dashboard/homepage.
 * Hidden on /train/* pages where the puzzle UI has its own nav bar.
 */
export default function LanguageToggleGuard() {
  const pathname = usePathname();

  // Hide on pages that have their own nav or don't need toggle
  if (
    pathname.startsWith("/train") ||
    pathname === "/" ||
    pathname === "/connect" ||
    pathname === "/analysing" ||
    pathname === "/prophecy"
  ) return null;

  return <LanguageToggle />;
}
