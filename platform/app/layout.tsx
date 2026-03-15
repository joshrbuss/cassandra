import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { cookies } from "next/headers";
import "./globals.css";
import LocaleProvider from "@/components/i18n/LocaleProvider";
import LanguageToggle from "@/components/i18n/LanguageToggle";
import { resolveLocale } from "@/lib/i18n";
import { LOCALES } from "@/lib/i18n/locales";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cassandra-chess.vercel.app";

// hreflang: all locales point to the same URL (cookie-based locale switching)
const hreflangAlternates = Object.fromEntries(
  LOCALES.map((l) => [l, BASE_URL])
) as Record<string, string>;

export const metadata: Metadata = {
  title: {
    default: "Cassandra Chess Puzzles",
    template: "%s | Cassandra Chess",
  },
  description:
    "Chess puzzles with retrograde analysis, opponent prediction training, and timed solving with percentile feedback.",
  metadataBase: new URL(BASE_URL),
  alternates: {
    languages: {
      ...hreflangAlternates,
      "x-default": BASE_URL,
    },
  },
  openGraph: {
    siteName: "Cassandra Chess Puzzles",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    site: "@cassandrachess",
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

  return (
    <html lang={locale}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <LocaleProvider initialLocale={locale}>
          {/* Language toggle — fixed top-right, above page content */}
          <div className="fixed top-3 right-3 z-40">
            <LanguageToggle />
          </div>
          {children}
          <Analytics />
        </LocaleProvider>
      </body>
    </html>
  );
}
