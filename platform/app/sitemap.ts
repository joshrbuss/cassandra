import type { MetadataRoute } from "next";
import { ARTICLES } from "@/lib/articles";
import { LOCALES } from "@/lib/i18n/locales";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cassandrachess.com";

// Since locale is cookie-based (not URL-based), all locales share the same URL.
// We emit one entry per URL with alternateRefs covering all locales.
function withAlternates(url: string) {
  return {
    url,
    alternates: {
      languages: Object.fromEntries(LOCALES.map((l) => [l, url])),
    },
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { ...withAlternates(BASE_URL), lastModified: now, changeFrequency: "daily", priority: 1 },
    { ...withAlternates(`${BASE_URL}/learn`), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { ...withAlternates(`${BASE_URL}/puzzles`), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { ...withAlternates(`${BASE_URL}/battles`), lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { ...withAlternates(`${BASE_URL}/leaderboard`), lastModified: now, changeFrequency: "hourly", priority: 0.7 },
    { ...withAlternates(`${BASE_URL}/creator`), lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { ...withAlternates(`${BASE_URL}/privacy`), lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { ...withAlternates(`${BASE_URL}/terms`), lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  const articleRoutes: MetadataRoute.Sitemap = ARTICLES.map((article) => ({
    ...withAlternates(`${BASE_URL}/learn/${article.slug}`),
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...articleRoutes];
}
