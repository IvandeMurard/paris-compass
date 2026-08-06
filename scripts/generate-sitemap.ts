// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.

import { writeFileSync } from "fs"
import { resolve } from "path"

import { GUIDES } from "../src/content/guides"
import { ARRONDISSEMENTS } from "../src/content/arrondissements"

const BASE_URL = "https://paris-compass.lovable.app"

interface SitemapEntry {
  path: string
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never"
  priority?: string
}

const entries: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
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

const allEntries: SitemapEntry[] = [
  ...entries,
  ...entries.map((e) => ({ ...e, path: e.path === "/" ? "/en" : `/en${e.path}` })),
]

function generateSitemap(entries: SitemapEntry[]) {
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

writeFileSync(resolve("public/sitemap.xml"), generateSitemap(allEntries))
console.log(`sitemap.xml written (${allEntries.length} entries)`)
