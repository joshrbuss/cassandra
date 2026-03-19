import type { MetadataRoute } from "next";
import { ARTICLES } from "@/lib/articles";
import { LOCALES } from "@/lib/i18n/locales";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cassandrachess.com";

const NON_EN_LOCALES = LOCALES.filter((l) => l !== "en");

// For non-learn pages: cookie-based locale, all locales share the same URL
function withCookieAlternates(url: string) {
  return {
    url,
    alternates: {
      languages: Object.fromEntries(LOCALES.map((l) => [l, url])),
    },
  };
}

// For /learn pages: URL-based locale routing
// en → /learn/slug, others → /locale/learn/slug
function learnAlternates(path: string) {
  const enUrl = `${BASE_URL}${path}`;
  return {
    "x-default": enUrl,
    en: enUrl,
    ...Object.fromEntries(NON_EN_LOCALES.map((l) => [l, `${BASE_URL}/${l}${path}`])),
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { ...withCookieAlternates(BASE_URL), lastModified: now, changeFrequency: "daily", priority: 1 },
    { ...withCookieAlternates(`${BASE_URL}/puzzles`), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { ...withCookieAlternates(`${BASE_URL}/trials`), lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { ...withCookieAlternates(`${BASE_URL}/leaderboard`), lastModified: now, changeFrequency: "hourly", priority: 0.7 },
    { ...withCookieAlternates(`${BASE_URL}/creator`), lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { ...withCookieAlternates(`${BASE_URL}/privacy`), lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { ...withCookieAlternates(`${BASE_URL}/terms`), lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  // /learn index — English + locale variants
  const learnIndexRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/learn`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: { languages: learnAlternates("/learn") },
    },
    ...NON_EN_LOCALES.map((locale) => ({
      url: `${BASE_URL}/${locale}/learn`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
      alternates: { languages: learnAlternates("/learn") },
    })),
  ];

  // /learn/[slug] articles — English + locale variants
  const articleRoutes: MetadataRoute.Sitemap = ARTICLES.flatMap((article) => {
    const path = `/learn/${article.slug}`;
    const alternates = { languages: learnAlternates(path) };

    return [
      // English version
      {
        url: `${BASE_URL}${path}`,
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: 0.7,
        alternates,
      },
      // Non-English locale versions
      ...NON_EN_LOCALES.map((locale) => ({
        url: `${BASE_URL}/${locale}${path}`,
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: 0.6,
        alternates,
      })),
    ];
  });

  return [...staticRoutes, ...learnIndexRoutes, ...articleRoutes];
}
