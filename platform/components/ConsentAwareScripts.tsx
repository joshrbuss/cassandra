"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { CONSENT_KEY } from "./CookieConsentBanner";

interface Props {
  gaId?: string;
  metaPixelId?: string;
  isPaid: boolean;
}

/**
 * Conditionally loads analytics and advertising scripts based on cookie consent.
 *
 * Consent states:
 * - "true"  → full mode: GA4 + AdSense + Meta Pixel
 * - "false" → restricted: GA4 anonymous only, no AdSense, no Meta Pixel
 * - null    → no choice yet: same as "false" until user decides
 *
 * Paid users never load AdSense regardless of consent.
 */
export default function ConsentAwareScripts({ gaId, metaPixelId, isPaid }: Props) {
  const [consent, setConsent] = useState<"true" | "false" | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const val = localStorage.getItem(CONSENT_KEY);
    setConsent(val === "true" ? "true" : val === "false" ? "false" : null);
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const fullConsent = consent === "true";
  const loadMetaPixel = fullConsent && !!metaPixelId;

  return (
    <>
      {/* AdSense library — loaded for all non-paid users so Google can verify ads.txt.
          Ad units themselves are only rendered when consent is given (see AdSlot). */}
      {!isPaid && (
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1008999288444187"
          crossOrigin="anonymous"
          strategy="lazyOnload"
        />
      )}

      {/* GA4 — init inline so window.gtag is available for custom events;
          the gtm.js network fetch is deferred to lazyOnload */}
      {gaId && (
        <>
          <Script id="ga4-init" strategy="afterInteractive">
            {fullConsent
              ? `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`
              : `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('set',{'anonymize_ip':true,'allow_google_signals':false,'allow_ad_personalization_signals':false});gtag('config','${gaId}',{'anonymize_ip':true,'allow_google_signals':false,'allow_ad_personalization_signals':false});`}
          </Script>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="lazyOnload"
          />
        </>
      )}

      {/* Microsoft Clarity — only with full consent */}
      {fullConsent && (
        <Script id="ms-clarity-init" strategy="lazyOnload">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/vxtx370hio";y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,"clarity","script");`}
        </Script>
      )}

      {/* Microsoft UET — only with full consent */}
      {fullConsent && (
        <Script id="ms-uet-init" strategy="lazyOnload">
          {`(function(w,d,t,u,o){w[u]=w[u]||[];o.ts=(new Date).getTime();var n=d.createElement(t);n.src='https://bat.bing.net/bat.js?ti='+o.ti;n.async=1;n.onload=n.onreadystatechange=function(){var s=this.readyState;s&&'loaded'!==s&&'complete'!==s||(o.q=w[u],w[u]=new UET(o),w[u].push('pageLoad'),n.onload=n.onreadystatechange=null)};var i=d.getElementsByTagName(t)[0];i.parentNode.insertBefore(n,i)})(window,document,'script','uetq',{ti:'343239772',enableAutoSpaTracking:true});`}
        </Script>
      )}

      {/* Meta Pixel — only with full consent */}
      {loadMetaPixel && (
        <>
          <Script id="meta-pixel-init" strategy="lazyOnload">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId}');fbq('track','PageView');`}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}
    </>
  );
}
