// Le quinzième bras : celui qui OUVRE la page — w1-porte-page (#158).
//
//   npm.cmd run page
//
// La règle est ici, jouée hors ligne par ./page.test.ts ; la collecte est dans ./page-verify.ts,
// qui pilote un navigateur via ./chrome.ts. Même découpe que servi / servi-verify.
//
// ── Le trou, et il a coûté une journée de produit invisible ───────────────────────────────
//
// Le 13 septembre 2026 à 16 h 30, `npm.cmd run porte:etat` rendait « aucun rouge ouvert » et
// `/contexte/<adresse>` affichait une ligne de chargement pendant 2 min 20 avant un écran
// d'erreur. Quatorze bras vérifiaient la base, le ledger, le catalogue, les cadences, les avis,
// l'échappement, le plan du site, la parité agent/écran et le code servi. **Aucun n'ouvrait la
// page.** Deux passaient tout près, et la distance se mesure :
//
//   `verify:mcp` prouve que le serveur MCP rend la bonne phrase, et il ne lancera jamais de
//   navigateur — c'est écrit dans l'en-tête de ./verdict.ts et c'est un choix assumé ;
//   `servi` (#142) prouve que les routes servies sont celles que `main` déclare, et il a bien vu
//   `/contexte/` servie. **Une route servie n'est pas une page qui répond.**
//
// Le recensement statique de ./verdict.ts connaît sa limite depuis son origine : « ça voit qu'un
// fichier APPELLE le noyau, jamais qu'il AFFICHE ce que le noyau a rendu ». C'est exactement le
// trou par lequel ce défaut est passé.
//
// ── Le point de doctrine ──────────────────────────────────────────────────────────────────
//
// **Le seul consommateur jamais vérifié est le navigateur, c'est-à-dire le preneur.** `CLAUDE.md`
// porte la règle dans un sens — « une garde sur le chemin de l'écran laisse passer l'agent qui
// appelle PostgREST en direct ». Le symétrique manquait : **une garde sur le chemin de l'agent
// laisse passer l'écran qui plante.**
//
// ── Une seule affirmation ─────────────────────────────────────────────────────────────────
//
// Quelque chose de DÉCIDABLE arrive à l'écran : la section `#verdict` existe et porte une
// phrase. Rien d'autre. Ce bras ne juge pas le contenu du verdict — ./verdict.ts et `verify:mcp`
// le font déjà — et il ne juge pas non plus que la page est jolie, rapide ou lisible.
//
// **Un refus nommé est un succès, et c'est le cœur de la règle.** Si Overpass tombe et que la
// fiche rend « Compass ne compose pas de verdict pour cette adresse — … », le bras est VERT :
// c'est le comportement correct, celui que `w6-fiche-robuste` (#156) a construit. Il ne rougit
// que si la page ne dit RIEN. La place légitime pour décider qu'une panne amont cesse d'être un
// échec est le bras, jamais le rapport — `docs/REPRISE.md`, tranché le 31 août 2026.
//
// ── Ce que ça NE rattrape PAS ─────────────────────────────────────────────────────────────
//
//   - Un verdict FAUX reste vert ici. Ce bras juge qu'il y a une réponse, jamais qu'elle est
//     juste. La justesse appartient à `verify:mcp`, au recensement de ./verdict.ts et aux
//     invariants.
//   - **Une seule adresse.** Une fiche cassée pour une adresse particulière passe. Voir
//     `ADRESSE` pour pourquoi celle-là, et pourquoi une liste n'aiderait pas.
//   - Il ne voit pas ce qu'un humain comprend : un verdict rendu et illisible est vert.
//   - Il ne voit rien de ce qui est SOUS le verdict — constats, trous, carte, comparaison. La
//     carte a été la cause du plantage du 13 septembre et elle serait de nouveau invisible ici
//     si elle cessait de tuer la page en mourant.

import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { EXIT } from "./report"

const ROOT = resolve(import.meta.dirname, "../..")
const COPIE = resolve(ROOT, "src/i18n/contextText.ts")
const CROCHET = resolve(ROOT, "src/hooks/useAddressContext.ts")

/**
 * Les deux valeurs que ce bras emprunte à l'écran sont LUES dans la source, jamais importées.
 *
 * `servi.ts` importe `src/i18n/ui.ts`, qui n'a aucune dépendance. Ici, la chaîne d'imports
 * traverse React Query, Leaflet et le noyau : les tirer dans un processus Node pour deux
 * nombres et quatre chaînes ferait dépendre un bras de la porte de tout ce que la page charge,
 * et le jour où un de ces modules touche `window` au premier import, le bras meurt sans que la
 * page ait rien. Le projet `tsconfig.node.json` ne porte d'ailleurs ni l'alias `@/` ni la
 * bibliothèque DOM, et les lui donner élargirait le typage de `scripts/` à toute l'application.
 *
 * Lire la source est la même décision que `arms.ts` prend sur les workflows — « délibérément
 * sans analyseur YAML, les fichiers sont sous notre contrôle ». Ce qu'elle coûte est écrit :
 * une valeur DISPARUE se voit dans `test`, qui lève ici, et non dans `typecheck`. Les deux
 * tournent dans la même porte, le même matin.
 */
function lireNombre(fichier: string, nom: string): number {
  const source = readFileSync(fichier, "utf8")
  const trouve = new RegExp(`export const ${nom}\\s*=\\s*(\\d+)`).exec(source)
  if (!trouve) {
    throw new Error(
      `${nom} est introuvable dans ${fichier}. Le quinzième bras en dérive son délai : ` +
        "le renommer ou le déplacer demande de le dire ici.",
    )
  }
  return Number(trouve[1])
}

function lireLibelles(nom: string): string[] {
  const source = readFileSync(COPIE, "utf8")
  const trouves = [...source.matchAll(new RegExp(`\\b${nom}:\\s*'((?:[^'\\\\]|\\\\.)*)'`, "g"))]
  if (trouves.length === 0) {
    throw new Error(
      `${nom} est introuvable dans ${COPIE}. Le quinzième bras y lit les titres qu'il ` +
        "accepte à l'écran ; sans eux il ne saurait plus reconnaître un verdict d'un refus.",
    )
  }
  return trouves.map((m) => m[1].replace(/\\'/g, "'"))
}

/** Le budget que la fiche s'impose à elle-même — `src/hooks/useAddressContext.ts`. */
export const CONTEXT_BUDGET_MS = lireNombre(CROCHET, "CONTEXT_BUDGET_MS")

/**
 * L'adresse ouverte, et elle porte ses coordonnées.
 *
 * **Les coordonnées sont dans l'URL pour sortir la BAN du chemin critique.** `useAddressFromSlug`
 * ne fournit alors que le LIBELLÉ ; les chiffres, eux, ne dépendent plus d'un géocodeur qui
 * répond. Sans elles, une BAN muette rendrait `c.notFound` — ni verdict ni refus — et ce bras
 * rougirait sur une panne amont qui n'est pas celle qu'il surveille.
 *
 * **Pourquoi celle-là.** C'est l'adresse sur laquelle `w6-fiche-robuste` (#156) a démontré le
 * plantage puis sa correction, dans le même navigateur sans tête : les mesures des deux tickets
 * se comparent donc directement. Un quartier dense, où les trois couches Overpass ont de quoi
 * répondre — une adresse en bordure de corpus rendrait un refus pour une raison qui n'a rien à
 * voir avec la santé de la page.
 *
 * **Une liste n'aiderait pas beaucoup**, et le ticket le dit : ce bras est un contrôle de
 * VIVACITÉ, pas une couverture. Trois adresses coûteraient trois démarrages de navigateur pour
 * rejouer le même chemin de code. Le jour où une fiche casse par adresse, c'est un invariant ou
 * un test du noyau qui doit le dire, pas un bras qui ouvre un navigateur.
 */
export const ADRESSE = "/contexte/rue-de-bretagne-paris?lat=48.863100&lng=2.362100"

/**
 * La marge laissée au chargement, en plus du budget que la page s'est donné.
 *
 * **Mesurée le 13 septembre 2026, pas choisie au doigt.** Quatre relevés, tous dans ce même
 * navigateur sans tête :
 *
 *   le montage de l'application contre la PRODUCTION — de l'ordre de navigation au premier
 *   `<h1>` — **470, 365 et 331 ms** sur trois passages : c'est le transport, réseau compris ;
 *   un verdict composé, instantané Overpass rejoué au bord du réseau : **290 ms** ;
 *   un verdict composé, Overpass RÉEL répondant : **9 580 ms**, dont presque tout le budget ;
 *   le pire cas, les trois miroirs muets et le budget consommé en entier : **10 136 à
 *   10 389 ms** sur huit passages, soit **136 à 389 ms** au-delà du budget.
 *
 * La marge couvre donc la navigation, le téléchargement des morceaux, le montage de React, la
 * lecture de l'instantané et le pas de 250 ms de la sonde. **Quatre secondes est dix fois le
 * dépassement le plus large mesuré et huit fois le montage le plus lent**, et l'ampleur est
 * délibérée : un runner GitHub partagé est plus lent qu'un poste, et un bras qui rougit sur la
 * charge du runner est un bras qu'on coupe en deux semaines.
 *
 * **Elle ne peut rien cacher**, et c'est ce qui autorise sa générosité : passé le budget, la
 * fiche a déjà composé l'un ou l'autre — `fetchCorpusContext` ne lève jamais et `useQuery` ne
 * réessaie pas. Ce qui reste après le budget est du transport, et une page qui met quatorze
 * secondes à ne rien dire n'a rien dit.
 *
 * **Et depuis `w6-fiche-delai` (#180) elle est très large plutôt que généreuse**, parce que la
 * fiche ne s'accorde plus le budget entier : elle rend son verdict dès que le corpus a répondu,
 * mesuré 573 à 1 115 ms miroirs pendus. Ce bras reste borné par `DELAI_MS` parce que son
 * affirmation est la VIVACITÉ et pas la vitesse — mais il ne verrait donc pas un retour à
 * l'attente de dix secondes. Ce qui garde cette propriété-là est `npm.cmd run test`, hors
 * réseau : `src/hooks/useAddressContext.test.ts` fait répondre le corpus seul contre un miroir
 * qui ne répond JAMAIS.
 */
export const MARGE_MS = 4000

/**
 * Le délai borné, et il est DÉRIVÉ du budget que la page s'impose à elle-même.
 *
 * `CONTEXT_BUDGET_MS` vit dans `src/hooks/useAddressContext.ts` et vaut 10 000 ms depuis #156 :
 * c'est le temps maximal que la fiche accorde à Overpass. Depuis `w6-fiche-delai` (#180) ce
 * n'est plus « avant de composer son refus » — la fiche compose son verdict sans attendre ce
 * miroir, et ce budget ne borne plus qu'une couche NON PORTEUSE, celle de `noise`. Le
 * recopier ici en ferait un second chiffre, qui deviendrait faux en silence le jour où le
 * premier bouge — exactement ce que ce dépôt refuse ailleurs. Il est donc IMPORTÉ : si quelqu'un
 * le double, ce bras suit le même jour ; si quelqu'un le supprime, `typecheck` rougit.
 *
 * **Ce n'est pas un délai de client HTTP.** Il ne vient ni de `fetch`, ni de `MIRROR_TIMEOUT_MS`
 * (70 000 ms), ni d'un défaut de Node. Il vient de la promesse que la page fait au visiteur.
 */
export const DELAI_MS = CONTEXT_BUDGET_MS + MARGE_MS

/**
 * L'expression évaluée dans la page, et elle ne lit que ce que le composant pose lui-même.
 *
 * `ContextVerdict` rend les deux branches sous `<section aria-labelledby="verdict">` avec un
 * `<h2 id="verdict">`, et la phrase — `verdict.sentence`, composée par `src/core/verdict.ts` —
 * est le premier `<p>` de cette section dans les deux cas. Un seul sélecteur couvre donc le
 * verdict et son refus, ce qui est la propriété qui rend ce bras court.
 */
export const EXPRESSION_SONDE = `(() => {
  const h = document.querySelector('#verdict');
  const sec = h ? h.closest('section') : null;
  const p = sec ? sec.querySelector('p') : null;
  const corps = document.body ? document.body.innerText : '';
  return JSON.stringify({
    titre: h ? h.textContent.trim() : null,
    phrase: p ? p.textContent.trim() : null,
    ecran: corps.replace(/\\s+/g, ' ').trim().slice(0, 300),
  });
})()`

export interface Sonde {
  /** Le texte du `<h2 id="verdict">`, ou `null` quand la section n'est pas là. */
  titre: string | null
  /** La phrase composée par le noyau, ou `null`. */
  phrase: string | null
  /** Ce que le corps de la page affichait, tronqué — pour dire ce qu'il y avait À LA PLACE. */
  ecran: string
}

/** Lit ce que le navigateur a rendu. Une sonde illisible est une mesure cassée, jamais un rouge. */
export function lireSonde(brut: string): Sonde | null {
  if (!brut.trim()) return null
  try {
    const objet = JSON.parse(brut) as Partial<Sonde>
    return {
      titre: typeof objet.titre === "string" ? objet.titre : null,
      phrase: typeof objet.phrase === "string" ? objet.phrase : null,
      ecran: typeof objet.ecran === "string" ? objet.ecran : "",
    }
  } catch {
    return null
  }
}

export type Rendu = "verdict" | "refus"

/**
 * Les titres attendus, toutes langues confondues, DÉRIVÉS de `src/i18n/contextText.ts`.
 *
 * Aucune chaîne n'est écrite ici. Reformuler « Pas de verdict ici » dans la table des libellés
 * change donc ce que ce bras cherche, le même jour et sans que personne y pense — c'est la
 * discipline de ./servi.ts, qui dérive ses jetons de `src/i18n/ui.ts` pour la même raison. Une
 * troisième langue entre dans la population à l'écriture de son bloc, sans toucher à ce fichier.
 */
export function titresAttendus(): { rendu: Rendu; texte: string }[] {
  return [
    ...lireLibelles("verdictHeading").map((texte) => ({ rendu: "verdict" as const, texte })),
    ...lireLibelles("refusalHeading").map((texte) => ({ rendu: "refus" as const, texte })),
  ]
}

export type Issue = "rendu" | "muet" | "libellé inconnu" | "mesure cassée"

export interface VerdictPage {
  issue: Issue
  /** Lequel des deux est arrivé à l'écran, quand il est reconnu. */
  rendu: Rendu | null
  dire: string
  sortie: number
}

/**
 * La règle, et c'est la seule affirmation du bras.
 *
 * **Codes de sortie**, convention de ./report.ts :
 *   0 la page rend un verdict, ou un refus nommé · 1 elle ne rend ni l'un ni l'autre dans le délai
 *   3 elle rend quelque chose de décidable sous un libellé que `main` ne déclare plus
 *   2 la sonde n'a rien rendu de lisible : la mesure est cassée, pas la page.
 *
 * Le cas 3 mérite son mot. La section est là, la phrase est là — donc l'affirmation de ce bras
 * est tenue — mais le titre ne correspond à aucun de ceux que `src/i18n/contextText.ts` déclare.
 * Ce n'est pas un défaut du produit : c'est l'instrument qui dit que sa population a dérivé, le
 * plus souvent parce que le bundle servi est antérieur à une fusion. Décider que le site est en
 * retard appartient à `servi`, qui mesure exactement ça ; rendre 1 ici doublerait son rouge avec
 * une cause moins précise.
 */
export function verdictPage(
  sonde: Sonde | null,
  msEcoule: number,
  delaiMs = DELAI_MS,
): VerdictPage {
  if (sonde === null) {
    return {
      issue: "mesure cassée",
      rendu: null,
      dire:
        "la sonde n'a rien rendu de lisible : le navigateur n'a pas évalué la page. " +
        "Rien n'a été jugé — ce n'est pas un verdict sur le produit.",
      sortie: EXIT.error,
    }
  }

  const phrase = sonde.phrase?.trim() ?? ""
  if (sonde.titre === null || phrase === "") {
    const aLaPlace = sonde.ecran.trim() === "" ? "un écran vide" : `« ${sonde.ecran.trim()} »`
    return {
      issue: "muet",
      rendu: null,
      dire:
        `La page n'a rendu ni verdict ni refus nommé en ${delaiMs} ms — ` +
        `${aLaPlace} à la place. La fiche compose son verdict sur le corpus seul, sans ` +
        `attendre Overpass (#180) ; le budget de ${CONTEXT_BUDGET_MS} ms ne borne qu'une couche ` +
        "non porteuse. Elle n'a donc composé ni verdict ni refus bien après avoir eu de quoi.",
      sortie: EXIT.fail,
    }
  }

  const reconnu = titresAttendus().find((t) => t.texte === sonde.titre)
  if (!reconnu) {
    return {
      issue: "libellé inconnu",
      rendu: null,
      dire:
        `La page rend une phrase sous « ${sonde.titre} », un titre que ` +
        "`src/i18n/contextText.ts` ne déclare plus. Quelque chose de décidable est arrivé à " +
        "l'écran, donc ce bras est tenu ; mais le servi et le suivi ne s'accordent pas sur les " +
        "mots. C'est `servi` qui dit si le site est en retard, pas ce bras-ci.",
      sortie: EXIT.unsettled,
    }
  }

  const quoi = reconnu.rendu === "verdict" ? "un verdict" : "un refus nommé"
  return {
    issue: "rendu",
    rendu: reconnu.rendu,
    dire:
      `La page rend ${quoi} en ${msEcoule} ms (délai ${delaiMs} ms) : ` +
      `« ${phrase} »`,
    sortie: EXIT.pass,
  }
}
