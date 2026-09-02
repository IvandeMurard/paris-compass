// Les deux branches de la détection, jouées sur la même machine — ce que #74 n'avait pas.
//
// Le défaut n'était pas une faute de frappe : c'était une règle vraie sur le système où elle a
// été écrite, et jamais éprouvée ailleurs. Un test qui ne jouerait que la branche du poste
// courant reproduirait exactement ce trou, en donnant l'impression contraire.

import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { esbuildInvocation, isNodeScript } from "./esbuildInvocation.mjs"

const DIR = mkdtempSync(join(tmpdir(), "esbuild-invocation-"))

/** Le shim que npm pose sur Windows, ses deux premières lignes telles quelles. */
function shim(): string {
  const path = join(DIR, "esbuild-shim")
  writeFileSync(path, '#!/usr/bin/env node\n"use strict";\nvar __create = Object.create;\n')
  return path
}

/** Un ELF64 : le nombre magique `\x7fELF`, puis des octets qui ne sont pas de l'UTF-8 valide. */
function binary(): string {
  const path = join(DIR, "esbuild-binaire")
  writeFileSync(path, Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00, 0xff, 0xfe]))
  return path
}

describe("lancer esbuild sans supposer le système", () => {
  it("reconnaît le shim Node à son `#!`", () => {
    expect(isNodeScript(shim())).toBe(true)
  })

  it("reconnaît le binaire natif, sans se faire abîmer les octets par le décodage", () => {
    expect(isNodeScript(binary())).toBe(false)
  })

  it("passe le shim à `node`, avec son chemin en premier argument", () => {
    const path = shim()
    expect(esbuildInvocation(path, { execPath: "/usr/bin/node" })).toEqual({
      command: "/usr/bin/node",
      args: [path],
    })
  })

  it("lance le binaire directement, sans rien devant lui", () => {
    // La branche qui manquait : `node <ELF>` est ce qui a tenu #74 rouge deux jours.
    const path = binary()
    expect(esbuildInvocation(path, { execPath: "/usr/bin/node" })).toEqual({ command: path, args: [] })
  })
})
