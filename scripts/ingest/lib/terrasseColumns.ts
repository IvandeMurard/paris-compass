// The columns terrasses.ts writes and the row key built from them, in their own module for the
// reason ./terrasseAddress.ts gives: importing terrasses.ts would run main(), so no test could
// reach them there. The test pins the row key to the expression written by hand before #262 —
// a key that changed would make the next load remove and re-add every row (#265).

import { comparable, type Columns } from "./columns"

/**
 * Every column the loader writes, in the order `stage` binds them — `id` and the generated
 * `street_key` excepted. The only copy: `checkColumns` holds it to the table before the load,
 * and the row key below is built from it (#262).
 */
export const TERRASSE_COLUMNS = [
  "typologie", "categorie", "adresse", "arrondissement", "nom_enseigne", "nom_societe", "siret",
  "longueur", "largeur", "lien_affichette", "house_number", "way_type", "way_name", "geom",
]

/**
 * What identifies a row: its whole content. The source publishes no identifier, so a row is
 * "the same" when every column is — the geometry compared as binary, never by the `=` of
 * geography, which compares bounding boxes. Identical rows do occur in a source like this one;
 * they are told apart by their rank (`rn`), so two copies in the batch keep two in the table.
 */
export function rowKey(columns: Columns): string {
  return `md5(row(${comparable(columns)})::text)`
}
