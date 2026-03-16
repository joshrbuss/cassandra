import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { cookies } from "next/headers";
import "./globals.css";
import LocaleProvider from "@/components/i18n/LocaleProvider";
import LanguageToggleGuard from "@/components/i18n/LanguageToggleGuard";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import ChangelogBanner from "@/components/ChangelogBanner";
import { resolveLocale } from "@/lib/i18n";
import { LOCALES } from "@/lib/i18n/locales";
import { auth } from "@/auth";

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
  openGraph: {
    siteName: "Cassandra Chess",
    type: "website",
    locale: "en_US",
    title: "Cassandra Chess — Train smarter. Chess On.",
    description:
      "Personalised chess puzzles from your own games. Connect Chess.com or Lichess and train on your actual blunders. Free, unlimited, no paywall.",
  },
  twitter: {
    card: "summary",
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

  return (
    <html lang={locale}>
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1008999288444187"
          crossOrigin="anonymous"
        />

        {/* GA4 */}
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
            </Script>
          </>
        )}

        {/* Meta Pixel */}
        {META_PIXEL_ID && (
          <>
            <Script id="meta-pixel-init" strategy="afterInteractive">
              {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`}
            </Script>
            <noscript>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                height="1"
                width="1"
                style={{ display: "none" }}
                src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
                alt=""
              />
            </noscript>
          </>
        )}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <LocaleProvider initialLocale={locale}>
          {/* Language toggle — fixed top-right, hidden on /train/* pages */}
          <div className="fixed top-3 right-3 z-40">
            <LanguageToggleGuard />
          </div>
          {session?.userId && <ChangelogBanner />}
          {children}
          <CookieConsentBanner />
          <Analytics />
        </LocaleProvider>
      </body>
    </html>
  );
}
