import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { cookies } from "next/headers";
import "./globals.css";
import LocaleProvider from "@/components/i18n/LocaleProvider";
import LanguageToggleGuard from "@/components/i18n/LanguageToggleGuard";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import ConsentAwareScripts from "@/components/ConsentAwareScripts";
import ChangelogBanner from "@/components/ChangelogBanner";
import { resolveLocale } from "@/lib/i18n";
import { LOCALES } from "@/lib/i18n/locales";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cassandrachess.com";
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

// hreflang: all locales point to the same URL (cookie-based locale switching)
const hreflangAlternates = Object.fromEntries(
  LOCALES.map((l) => [l, BASE_URL])
) as Record<string, string>;

export const metadata: Metadata = {
  title: {
    default: "Cassandra Chess — Train smarter. Chess On.",
    template: "%s | Cassandra Chess",
  },
  description:
    "Personalised chess puzzles from your own games. Connect Chess.com or Lichess and train on your actual blunders. Free, unlimited, no paywall.",
  metadataBase: new URL(BASE_URL),
  alternates: {
    languages: {
      ...hreflangAlternates,
      "x-default": BASE_URL,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
  openGraph: {
    siteName: "Cassandra Chess",
    type: "website",
    locale: "en_US",
    title: "Cassandra Chess — Train smarter. Chess On.",
    description:
      "Personalised chess puzzles from your own games. Connect Chess.com or Lichess and train on your actual blunders. Free, unlimited, no paywall.",
  },
  twitter: {
    card: "summary_large_image",
    site: "@joshrbuss",
    title: "Cassandra Chess — Train smarter. Chess On.",
    description:
      "Personalised chess puzzles from your own games. Connect Chess.com or Lichess and train on your actual blunders. Free, unlimited, no paywall.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read locale server-side so LocaleProvider hydrates without flash
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("preferred_locale")?.value);
  const session = await auth();

  // Check if logged-in user is paid (skip AdSense for paid users)
  let isPaid = false;
  if (session?.userId) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { isPaid: true },
    });
    isPaid = user?.isPaid ?? false;
  }

  return (
    <html lang={locale}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Consent-aware script loading — handles AdSense, GA4, Meta Pixel */}
        <ConsentAwareScripts
          gaId={GA_ID}
          metaPixelId={META_PIXEL_ID}
          isPaid={isPaid}
        />
        <LocaleProvider initialLocale={locale}>
          {/* Language toggle — fixed top-right, hidden on /train/* pages */}
          <div className="fixed top-3 right-3 z-40">
            <LanguageToggleGuard />
          </div>
          {session?.userId && <ChangelogBanner />}
          {children}
          <CookieConsentBanner />
          <Analytics />
          <SpeedInsights />
        </LocaleProvider>
      </body>
    </html>
  );
}
