/**
 * Writing a dossier to the visitor's disk — w6-dossier (#33).
 *
 * Separate from `src/core/dossier.ts` because this half touches the DOM, and `src/core/` is pure
 * by contract (`CLAUDE.md`). `docs/PLAN.md` §2.6 draws the line in the same place: « le contenu
 * … est du noyau ; le bouton, sa place et la génération du fichier » are the front's. The
 * consequence that matters is that an agent obtains the dossier through the core without ever
 * loading this file.
 *
 * **An object URL and an anchor, and no dependency.** A file-saver package would add a
 * dependency, an `npm audit` surface and a verdict to write in `scripts/porte/avis.json` for a
 * behaviour every browser since 2016 has natively. The URL is revoked on the next frame: revoking
 * it synchronously cancels the download in Safari, and never revoking it leaks the blob for the
 * lifetime of the tab.
 *
 * **What this does NOT catch.** It reports that the click was issued, not that a file landed:
 * a browser configured to ask where to save, or a download blocked by policy, is indistinguishable
 * from a success here. That is why the ticket's demonstration drives a real browser and reads the
 * bytes back rather than trusting this function's return.
 */

import { dossierFilename, dossierToJson, type Dossier } from '@/core';

export const DOSSIER_MIME = 'application/json';

/**
 * Hand one dossier to the visitor. One address in, one file out.
 *
 * There is no plural of this function, and that is the doctrine of `docs/PERIMETRE.md` §1 held in
 * the structure rather than in a habit: a `downloadDossiers(list)` is the broker's export, and the
 * shortest path to it is someone writing the loop here « just for two ».
 */
export function downloadDossier(dossier: Dossier, doc: Document = document): string {
  const name = dossierFilename(dossier);
  const blob = new Blob([dossierToJson(dossier)], { type: `${DOSSIER_MIME};charset=utf-8` });
  const url = URL.createObjectURL(blob);

  const anchor = doc.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.rel = 'noopener';
  // Appended rather than clicked detached: Firefox ignores a click on an anchor outside the
  // document, and the download silently does not happen.
  doc.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  // `setTimeout(0)` and not a synchronous revoke: Safari reads the blob after the click returns.
  setTimeout(() => URL.revokeObjectURL(url), 0);

  return name;
}
