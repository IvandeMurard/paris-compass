// La cohérence entre les deux manifestes du serveur MCP, avant que le registre la refuse.
//
// **Pourquoi ce test plutôt qu'une relecture.** Publier au registre MCP demande que quatre
// valeurs soient les mêmes dans deux fichiers qui ne se voient pas : `mcp-server/package.json`,
// qui part sur npm, et `mcp-server/server.json`, qui part au registre. Le registre télécharge le
// paquet npm et vérifie que son `mcpName` égale le `name` déclaré ; en cas d'écart il rend
// « Registry validation failed for package », après la publication npm — donc trop tard pour la
// reprendre sans monter une version de plus.
//
// C'est exactement la forme de #70 et #71 : deux endroits à tenir en phase, et rien qui le dise.
// Ici, le désaccord passe `npm.cmd run test` au rouge, donc aussi la porte planifiée.
//
// Ce que ce test ne rattrape pas : il compare les fichiers entre eux, jamais au registre. Un nom
// déjà pris par quelqu'un d'autre, ou un compte GitHub qui ne correspond pas au préfixe, ne se
// voient qu'à la publication.

import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

const ROOT = resolve(__dirname, "..")

const paquet = JSON.parse(readFileSync(resolve(ROOT, "mcp-server/package.json"), "utf8")) as {
  name: string
  version: string
  mcpName?: string
}

const serveur = JSON.parse(readFileSync(resolve(ROOT, "mcp-server/server.json"), "utf8")) as {
  name: string
  version: string
  packages: { registryType: string; identifier: string; version: string }[]
}

describe("les deux manifestes du serveur MCP disent la même chose", () => {
  it("le nom de registre est déclaré des deux côtés, à l'identique", () => {
    // La condition que le registre vérifie lui-même en téléchargeant le paquet.
    expect(paquet.mcpName).toBeDefined()
    expect(serveur.name).toBe(paquet.mcpName)
  })

  it("le nom de registre porte le préfixe qu'impose l'authentification GitHub", () => {
    // « You do not have permission to publish this server » sinon — et le message ne dit pas
    // que c'est le préfixe qui cloche.
    expect(serveur.name.startsWith("io.github.")).toBe(true)
  })

  it("les trois versions avancent ensemble", () => {
    const npmPackage = serveur.packages.find((p) => p.registryType === "npm")
    expect(npmPackage).toBeDefined()
    expect(serveur.version).toBe(paquet.version)
    expect(npmPackage!.version).toBe(paquet.version)
  })

  it("le paquet npm désigné est bien celui que ce dépôt publie", () => {
    const npmPackage = serveur.packages.find((p) => p.registryType === "npm")
    expect(npmPackage!.identifier).toBe(paquet.name)
  })
})
