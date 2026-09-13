// Le bras qui ouvre la page produit sur le site publié — w1-porte-page (#158).
//
//   npm.cmd run page
//
// La règle est dans ./page.ts et jouée hors ligne par ./page.test.ts ; le navigateur est dans
// ./chrome.ts. Ce fichier ne fait que relier les trois, comme servi-verify relie servi.ts aux
// bundles. Même découpe, mêmes codes de sortie.
//
// **Il vise le site PUBLIÉ, jamais un serveur de développement.** Un `vite dev` local ne prouve
// rien du bundle servi : le 2 septembre 2026 la production a rendu une page blanche pendant que
// `dev` et `build` étaient verts sur le même arbre, parce que `.env.local` masquait l'absence
// des variables (`docs/REPRISE-PIEGES.md`). `porte:publie` existe pour cette distinction, et ce
// bras la reprend. `PORTE_PAGE_URL` ne sert qu'à rejouer le bras contre un bouchon local — c'est
// ce que fait la contre-preuve de ./page.test.ts, et c'est l'usage que ./publie.ts et
// ./servi-verify.ts donnent déjà à leur variable.

import { EXIT } from "./report"
import { NavigateurAbsent, PageInjoignable, sonder } from "./chrome"
import { ADRESSE, DELAI_MS, EXPRESSION_SONDE, lireSonde, verdictPage } from "./page"

const SITE = process.env.PORTE_PAGE_URL ?? "https://paris-compass.lovable.app"

function out(line: string): void {
  console.log(line)
}

/**
 * Ce qui arrête la sonde avant le délai.
 *
 * Elle s'arrête dès que la section `#verdict` porte une phrase — et pas une milliseconde plus
 * tôt. Un titre sans phrase est un rendu à demi monté ; l'accepter ferait mesurer le montage de
 * React plutôt que l'arrivée du verdict.
 */
function decidable(brut: string): boolean {
  const sonde = lireSonde(brut)
  return sonde !== null && sonde.titre !== null && (sonde.phrase?.trim() ?? "") !== ""
}

async function main(): Promise<void> {
  const url = new URL(ADRESSE, SITE).href
  out(`  ouvre ${url}`)
  out(`  délai ${DELAI_MS} ms — le budget de la fiche, plus la marge de chargement (./page.ts)`)

  const observation = await sonder(url, EXPRESSION_SONDE, decidable, DELAI_MS)
  const sonde = lireSonde(observation.brut)
  const verdict = verdictPage(sonde, observation.msEcoule)

  if (sonde?.titre) out(`  titre  « ${sonde.titre} »`)
  out(`  mesure ${observation.msEcoule} ms`)
  out("")

  if (verdict.sortie === EXIT.pass) {
    out(`PASS — ${verdict.dire}`)
    return
  }
  if (verdict.sortie === EXIT.unsettled) {
    out(`INDÉTERMINÉ — ${verdict.dire}`)
    process.exitCode = EXIT.unsettled
    return
  }
  if (verdict.sortie === EXIT.error) {
    out(`ERREUR — ${verdict.dire}`)
    process.exitCode = EXIT.error
    return
  }
  out(`ÉCHEC — ${verdict.dire}`)
  process.exitCode = EXIT.fail
}

main().catch((error: unknown) => {
  if (error instanceof PageInjoignable) {
    // Le document n'a pas été servi. C'est la même clémence que les autres bras accordent à
    // l'amont, et elle vit ICI plutôt que dans le rapport — `docs/REPRISE.md`, 31 août 2026.
    out(
      `INDÉTERMINÉ — le site publié n'a pas servi la page (${error.message}) : panne amont, ` +
        "rien n'a été jugé. Rejouer.",
    )
    process.exitCode = EXIT.unsettled
    return
  }
  if (error instanceof NavigateurAbsent) {
    // Pas une panne amont : sans navigateur, ce bras n'a aucune raison d'exister, et un 3 le
    // rangerait dans « changé sans décision » — là où personne ne regarde.
    out(
      `ERREUR — ${error.message} Le quinzième bras ne peut pas ouvrir la page : ` +
        "la mesure manque, rien n'a été jugé.",
    )
    process.exitCode = EXIT.error
    return
  }
  out(`ERREUR — ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = EXIT.error
})
