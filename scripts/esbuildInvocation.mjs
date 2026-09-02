// Comment lancer le binaire esbuild — et pourquoi ça se lit au lieu de se déduire.
//
// `node_modules/esbuild/bin/esbuild` n'est pas le même objet selon le système : sur Windows
// c'est un script Node (`#!/usr/bin/env node`), partout ailleurs l'installation d'esbuild y
// copie le binaire natif. `scripts/verify-mcp.mjs` l'appelait par `node <chemin>` — vrai sur le
// poste où la porte a été écrite, faux sur un runner Linux, où Node lit un en-tête `ELF` et
// meurt sur `SyntaxError: Invalid or unexpected token`. Le bras `verify:mcp` est resté rouge
// deux jours pour ça : issue #74, ouverte le 1er septembre 2026.
//
// **La décision se prend en lisant le fichier, pas en lisant `process.platform`.** Ce qui
// compte n'est pas le système, c'est « script ou binaire » — et c'est une propriété du fichier,
// mesurable. Passer par la plateforme serait une supposition sur l'empaquetage d'un tiers,
// c'est-à-dire exactement la classe d'erreur qui a produit ce défaut.
//
// Ce module est séparé, sans effet de bord, pour une seule raison : `verify-mcp.mjs` s'exécute
// dès qu'on l'importe. Une détection qui vit dedans ne peut être éprouvée qu'en jouant la porte
// entière contre le distant — donc jamais sur les deux branches, puisqu'il n'y a qu'un système
// d'exploitation par machine. Ici, les deux se jouent en mémoire.

import { readFileSync } from "node:fs"

/** Les deux premiers octets suffisent : `#!` pour un script, `\x7fELF` pour un exécutable. */
export function isNodeScript(path) {
  // `latin1` plutôt que `utf8` : un binaire n'est pas de l'UTF-8 valide, et le décodage
  // remplacerait des octets par U+FFFD avant qu'on ait pu les regarder.
  return readFileSync(path, "latin1").startsWith("#!")
}

/**
 * Ce qu'il faut passer à `spawnSync` pour lancer esbuild, sur n'importe quel système.
 *
 * Rend `{ command, args }` : les arguments de l'appelant viennent après `args`, jamais avant —
 * un script Node veut son chemin en premier, un binaire ne veut rien devant lui.
 */
export function esbuildInvocation(path, { execPath = process.execPath } = {}) {
  return isNodeScript(path) ? { command: execPath, args: [path] } : { command: path, args: [] }
}
