"use client";

import { usePathname } from "next/navigation";
import LanguageToggle from "./LanguageToggle";

/**
 * Only renders the language toggle on dashboard/homepage.
 * Hidden on /train/* pages where the puzzle UI has its own nav bar.
 */
export default function LanguageToggleGuard() {
  const pathname = usePathname();

  // Hide on train pages — locale is inherited from the cookie
  if (pathname.startsWith("/train")) return null;

  return <LanguageToggle />;
}
