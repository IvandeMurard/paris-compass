// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.
//
// The entry table is EXPORTED rather than written straight to disk — w6-contexte (#119),
// criterion 6. `scripts/porte/sitemap.ts` reads it back and cross-checks it against the route
// table of src/App.tsx and the `noindex` each page declares, so a route that is noindexed and
// listed here (or indexable and forgotten) fails `npm.cmd run test`. A check that read the
// generated XML would only prove the generator copied its own list; reading the list itself is
// what lets the rule compare two independent statements about the same route.

import { writeFileSync } from "fs"
import { resolve } from "path"

import { GUIDES } from "../src/content/guides"
import { ARRONDISSEMENTS } from "../src/content/arrondissements"
import { localizePath } from "../src/i18n/routes"

const BASE_URL = "https://paris-compass.lovable.app"

export interface SitemapEntry {
  path: string
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never"
  priority?: string
}

/**
 * The canonical (French) URLs of the site, in reading order.
 *
 * `/contexte/:slug` is deliberately absent and must stay absent: those pages are generated,
 * one per address consulted, and they ship `noindex` — Ivan, 10 September 2026. Listing them
 * would contradict the meta tag, and nobody would ever see the contradiction. The rule that
 * holds that promise is in scripts/porte/sitemap.ts, not in this comment.
 */
export const canonicalEntries: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  // Second rank since w6-contexte: free exploration for a visitor with no address. Indexable,
  // and legitimately so — there is exactly one of it, unlike a context sheet.
  { path: "/carte", changefreq: "daily", priority: "0.9" },
  { path: "/presentation", changefreq: "monthly", priority: "0.9" },
  { path: "/a-propos", changefreq: "monthly", priority: "0.7" },
  { path: "/methodologie", changefreq: "monthly", priority: "0.8" },
  { path: "/sources", changefreq: "monthly", priority: "0.8" },
  { path: "/guides", changefreq: "weekly", priority: "0.8" },
  { path: "/faq", changefreq: "monthly", priority: "0.8" },
  { path: "/glossaire", changefreq: "monthly", priority: "0.6" },
  { path: "/paris", changefreq: "weekly", priority: "0.8" },
  ...GUIDES.map((g) => ({
    path: `/guides/${g.slug}`,
    changefreq: "monthly" as const,
    priority: "0.7",
  })),
  ...ARRONDISSEMENTS.map((a) => ({
    path: `/paris/${a.slug}`,
    changefreq: "weekly" as const,
    priority: "0.6",
  })),
]

/**
 * Both locales.
 *
 * The English half goes through `localizePath` rather than a `/en` prefix: two routes are
 * served at a translated segment (`/carte` → `/en/map`, `/contexte` → `/en/context`), and a
 * prefix would have written a URL no route answers — a sitemap full of soft 404s being
 * measurably worse than a sitemap missing a page.
 */
export const allEntries: SitemapEntry[] = [
  ...canonicalEntries,
  ...canonicalEntries.map((e) => ({ ...e, path: localizePath(e.path, "en") })),
]

export function generateSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  )

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n")
}

// Only when run as a script. Importing this module from a test must not write to public/.
if (process.argv[1] && resolve(process.argv[1]).endsWith("generate-sitemap.ts")) {
  writeFileSync(resolve("public/sitemap.xml"), generateSitemap(allEntries))
  console.log(`sitemap.xml written (${allEntries.length} entries)`)
}
