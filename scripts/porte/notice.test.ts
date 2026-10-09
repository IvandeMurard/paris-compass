// The control that fails when NOTICE, or the "Official sources" banner of the MCP package README,
// stops naming what the repository actually publishes — #255, 9 October 2026.
//
// Both texts are kept by hand, and the reviews of #254 and #256 said so: a URL that moves (the
// website leaving Lovable, the repository renamed) would leave them wrong with nothing turning red.
// So the expected references are DERIVED from the files that decide them — the package name and
// `mcpName` from mcp-server/package.json, the registry name from mcp-server/server.json, the
// repository from both, the website from the README's demo link — and never listed here.
//
// **What this does not catch.** It compares texts with each other, never with the world: it will
// not say that a URL still answers, nor what a directory such as mcprush actually displays. It
// sees URLs with a scheme, not a bare domain written as plain text. And
// whether the published package carries LICENSE and NOTICE is checked by `mcp:paquet` on the
// installed archive, not here.

import { readFileSync } from "fs"
import { resolve } from "path"

import { describe, expect, it } from "vitest"

const ROOT = resolve(__dirname, "..", "..")
// Line endings normalised: this checkout extracts CRLF, the runner LF, and the block boundaries
// below must not move with them (review of #257).
const read = (path: string) => readFileSync(resolve(ROOT, path), "utf8").replace(/\r\n/g, "\n")

const pkg = JSON.parse(read("mcp-server/package.json"))
const server = JSON.parse(read("mcp-server/server.json"))
const readme = read("README.md")
const notice = read("NOTICE")
const packageReadme = read("mcp-server/README.md")

function repositoryUrl(raw: string): string {
  return raw.replace(/^git\+/, "").replace(/\.git$/, "")
}

function demoUrl(): string {
  const match = readme.match(/\*\*\[Open the demo[^\]]*\]\((https:[^)]+)\)/)
  if (!match) throw new Error("README.md has no « Open the demo » link to derive the website from")
  return match[1]
}

const expected = {
  npm: `https://www.npmjs.com/package/${pkg.name}`,
  registry: server.name as string,
  repository: repositoryUrl(pkg.repository.url),
  website: demoUrl(),
}

// The NOTICE block between "Official sources" and the blank line after its list.
function noticeSources(): string {
  const start = notice.indexOf("Official sources")
  if (start < 0) throw new Error("NOTICE has no « Official sources » block")
  const end = notice.indexOf("\n\n", start)
  return notice.slice(start, end < 0 ? undefined : end)
}

// The banner only counts where a directory copying the README will show it: right under the title.
function packageBanner(): string {
  const lines = packageReadme.split("\n")
  const start = lines.findIndex((l, i) => i > 0 && l.trim() !== "")
  if (start < 0 || !lines[start].startsWith("> **Official sources**")) return ""
  const block: string[] = []
  for (const line of lines.slice(start)) {
    if (!line.startsWith(">")) break
    block.push(line)
  }
  return block.join("\n")
}

const urlsIn = (text: string) =>
  new Set([...text.matchAll(/https?:\/\/[^\s)>\]]+/g)].map((m) => m[0].replace(/[.,]$/, "")))

describe("the sources that decide the references agree with each other", () => {
  it("names one registry entry in package.json and server.json", () => {
    expect(pkg.mcpName).toBe(server.name)
  })

  it("names one repository in package.json and server.json", () => {
    expect(repositoryUrl(server.repository.url)).toBe(expected.repository)
  })
})

describe("NOTICE names what the repository publishes", () => {
  const block = noticeSources()

  it.each(Object.entries(expected))("cites the %s", (_, ref) => {
    expect(block).toContain(ref)
  })

  it("cites no URL that the repository does not derive", () => {
    const derived = new Set([expected.npm, expected.repository, expected.website])
    expect([...urlsIn(block)].filter((u) => !derived.has(u))).toEqual([])
  })

  it("names only data licences that README.md lists under « Licence and attribution »", () => {
    const start = readme.indexOf("## Licence and attribution")
    const section = readme.slice(start, readme.indexOf("\n## ", start + 1))
    const named = notice.match(/own terms \(([^)]+)\)/)
    expect(named, "NOTICE no longer names the data licences in parentheses").not.toBeNull()
    for (const licence of named![1].split(",").map((s) => s.trim())) {
      expect(section, `${licence} is named in NOTICE but absent from README.md`).toContain(licence)
    }
  })
})

describe("the MCP package README carries the same references as NOTICE", () => {
  const banner = packageBanner()

  it("still opens with the « Official sources » banner, right under the title", () => {
    expect(banner).not.toBe("")
  })

  it.each(Object.entries(expected))("cites the %s", (_, ref) => {
    expect(banner).toContain(ref)
  })

  it("cites no URL that the repository does not derive", () => {
    const derived = new Set([expected.npm, expected.repository, expected.website])
    expect([...urlsIn(banner)].filter((u) => !derived.has(u))).toEqual([])
  })
})
