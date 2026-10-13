import { describe, expect, it } from "vitest"

import { columnsFrom } from "./columns"
import { rowKey, TERRASSE_COLUMNS } from "./terrasseColumns"

/**
 * The row key as it was written by hand before #262 (terrasses.ts at 0aa98cb). The hashes in
 * terrasse_autorisation were computed with it: a key that differs — one column more, fewer, or
 * in another order — would make the next load treat every row as new, remove the 25 000 rows
 * and add them back. Copied here on purpose, never derived: it is the reference.
 */
const ROW_KEY_BEFORE_262 = `md5(row(typologie, categorie, adresse, arrondissement, nom_enseigne, nom_societe,
    siret, longueur, largeur, lien_affichette, house_number, way_type, way_name,
    ST_AsBinary(geom))::text)`

const squash = (sql: string) => sql.replace(/\s+/g, " ").replace(/\( /g, "(").trim()

describe("terrasses row key", () => {
  // Only the type matters to the key: it decides which column compares as binary.
  const catalog = TERRASSE_COLUMNS.map((name) => ({ name, type: name === "geom" ? "geography" : "text" }))

  it("is the expression written by hand before #262, so the stored hashes still match", () => {
    const columns = columnsFrom("terrasse_autorisation", TERRASSE_COLUMNS, catalog)
    expect(squash(rowKey(columns))).toBe(squash(ROW_KEY_BEFORE_262))
  })
})
