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
// Ce que ce test ne rattrape pas : il compare les fichiers entre eux et au dépôt, jamais au
// registre. Un nom déjà pris par quelqu'un d'autre, un compte GitHub connecté qui n'est pas le
// propriétaire du dépôt, ou une contrainte du schéma que personne n'a encore rencontrée, ne se
// voient qu'à la publication. Les trois règles ci-dessous sont d'ailleurs toutes nées comme ça —
// d'un refus du registre, le 3 septembre 2026, chacun découvert après la publication npm.

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
  repository: { url: string }
  name: string
  description: string
  version: string
  packages: { registryType: string; identifier: string; version: string }[]
}

/**
 * Le plafond que le registre applique, mesuré le 3 septembre 2026 en s'y cognant : il rend
 * `422 Unprocessable Entity — expected length <= 100` sur `body.description`, et seulement au
 * moment du `publish`. Écrit ici parce qu'une limite découverte en production et laissée dans un
 * terminal se redécouvre à la publication suivante.
 */
const DESCRIPTION_MAX = 100

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

  it("l'espace de noms reprend le propriétaire du dépôt, casse comprise", () => {
    // Le 3 septembre 2026, `publish` a rendu un 403 : « You have permission to publish:
    // io.github.IvandeMurard/*. Attempting to publish: io.github.ivandemurard/… ». Le registre
    // compare à la casse du login GitHub, alors que la convention DNS pousse aux minuscules —
    // et le paquet npm portant le mauvais nom, il a fallu republier pour corriger.
    //
    // Le propriétaire du dépôt EST ce login : le recouper ici rend le piège impossible sans
    // avoir à écrire le login une seconde fois quelque part.
    const proprietaire = /^https:\/\/github\.com\/([^/]+)\//.exec(`${serveur.repository.url}/`)?.[1]
    expect(proprietaire).toBeDefined()
    expect(serveur.name).toBe(`io.github.${proprietaire}/${paquet.name}`)
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

  it("la description tient sous le plafond du registre", () => {
    // Une description écrite pour un lecteur humain déborde sans prévenir : la première faisait
    // 209 caractères et n'a été refusée qu'au `publish`, après la publication npm.
    expect(serveur.description.length).toBeLessThanOrEqual(DESCRIPTION_MAX)
    // Et elle doit dire quelque chose : un champ vidé pour passer la limite passerait ce test.
    expect(serveur.description.length).toBeGreaterThan(30)
  })
})
