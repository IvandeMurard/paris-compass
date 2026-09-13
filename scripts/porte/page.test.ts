// Le contrôle qui joue la règle du quinzième bras sans navigateur et sans réseau — #158.
//
// Deux moitiés, comme servi.test.ts, arms.test.ts et ledger.test.ts les ont. La première rejoue
// la règle sur des sondes RÉELLES, capturées au navigateur le 13 septembre 2026 — c'est là que
// vit la contre-preuve. La seconde vérifie ce qui peut l'être contre le dépôt tel qu'il est :
// que le bras cherche l'ancre que le composant pose vraiment, et que le délai dérive du budget
// que la fiche s'impose.
//
// Ouvrir la page est le travail du bras, scripts/porte/page-verify.ts, planifié sur porte.yml.

import { readFileSync } from "fs"
import { resolve } from "path"

import { describe, expect, it } from "vitest"

import { EXIT } from "./report"
import {
  ADRESSE,
  CONTEXT_BUDGET_MS,
  DELAI_MS,
  EXPRESSION_SONDE,
  MARGE_MS,
  lireSonde,
  titresAttendus,
  verdictPage,
} from "./page"

/**
 * La table des libellés, relue ici comme un TEXTE — jamais avec la regex de `page.ts`.
 *
 * `page.ts` dit pourquoi il ne l'importe pas ; recopier sa regex ici en ferait une seconde
 * implémentation, exactement ce que ./verdict.ts recense ailleurs. Ce contrôle vérifie donc
 * deux choses que la regex ne peut pas se donner toute seule : que chaque titre rendu figure
 * VERBATIM dans le fichier, et qu'il y en a autant que de blocs de langue.
 */
const COPIE = readFileSync(resolve(__dirname, "../../src/i18n/contextText.ts"), "utf8")

/**
 * Quatre sondes capturées, mot pour mot, au navigateur sans tête le 13 septembre 2026.
 *
 * Elles ne sont pas écrites à la main : chacune est la chaîne que `EXPRESSION_SONDE` a rendue
 * lors d'un passage nommé dans le ticket de clôture. Une règle éprouvée sur des sondes inventées
 * s'accorderait avec l'idée que son auteur se fait de la page, jamais avec la page.
 */
const SONDES = {
  /** Build de `main`, instantané Overpass rejoué au bord du réseau : verdict composé à 290 ms. */
  verdict:
    '{"titre":"Verdict","phrase":"Passage faible, desserte faible, services à pied rares.",' +
    '"ecran":"Compass Ouvrir la carte ADRESSE rue de bretagne paris Point 48.86310, 2.36210 — ' +
    "BAN (Etalab) VERDICT Passage faible, desserte faible, services à pied rares. Constats " +
    "utilisés : Passage, Desserte, Services à pied En appui : commerces alimentaires rares, " +
    'exposition au bruit routier faible La règle de "}',

  /** Build de `main`, les trois miroirs Overpass réellement muets : refus nommé à 10 214 ms. */
  refus:
    '{"titre":"Pas de verdict ici","phrase":"Compass ne compose pas de verdict pour cette ' +
    "adresse — le passage : source injoignable ; la desserte : source injoignable ; les " +
    'services à pied : source injoignable.","ecran":"Compass Ouvrir la carte ADRESSE Rue de ' +
    "Bretagne 75003 Paris Point 48.86310, 2.36210 — BAN (Etalab) PAS DE VERDICT ICI Compass ne " +
    "compose pas de verdict pour cette adresse — le passage : source injoignable ; la desserte " +
    ": source injoignable ; les services à pied : source injoignable. Un constat porte\"}",

  /**
   * LA CONTRE-PREUVE, premier temps — la production au bundle antérieur à #156, bloquée.
   *
   * C'est l'état exact que quatorze bras au vert décrivaient comme sain le 13 septembre 2026.
   */
  bloquee:
    '{"titre":null,"phrase":null,"ecran":"Compass Ouvrir la carte ADRESSE Rue de Bretagne ' +
    "75003 Paris Point 48.86310, 2.36210 — BAN (Etalab) Lecture du quartier en cours… Compass " +
    'Trouver un local commercial en Île-de-France par son environnement, à partir de données ' +
    'publiques."}',

  /**
   * LA CONTRE-PREUVE, second temps — la même production, plantée à 95 945 ms.
   *
   * La frontière d'erreur a emporté la page entière, `#verdict` compris : c'est le mode de panne
   * que `w6-fiche-robuste` (#156) a corrigé sur `main` et que le site servait encore.
   */
  plantee:
    '{"titre":null,"phrase":null,"ecran":"L’application a rencontré une erreur — the ' +
    "application hit an error Recharger la page suffit en général. Reloading usually clears it. " +
    'Cannot read properties of undefined (reading \'layerPointToLatLng\') Recharger / Reload"}',
} as const

describe("ce que la sonde rapporte", () => {
  it("lit les trois champs d'une sonde bien formée", () => {
    const sonde = lireSonde(SONDES.verdict)
    expect(sonde?.titre).toBe("Verdict")
    expect(sonde?.phrase).toBe("Passage faible, desserte faible, services à pied rares.")
  })

  it("rend null sur une sonde vide ou illisible, jamais un objet à demi rempli", () => {
    expect(lireSonde("")).toBeNull()
    expect(lireSonde("   ")).toBeNull()
    expect(lireSonde("{ceci n'est pas du JSON")).toBeNull()
  })

  it("refuse un champ d'un autre type plutôt que de le croire", () => {
    // Une page qui rendrait un nombre là où la sonde attend une phrase ne doit pas passer pour
    // une phrase : `verdictPage` verrait un titre sans texte et dirait « muet », ce qui est vrai.
    const sonde = lireSonde('{"titre":42,"phrase":null,"ecran":""}')
    expect(sonde?.titre).toBeNull()
  })
})

describe("la règle du quinzième bras", () => {
  it("sort en 0 quand la page rend un verdict", () => {
    const verdict = verdictPage(lireSonde(SONDES.verdict), 290)
    expect(verdict.sortie).toBe(EXIT.pass)
    expect(verdict.issue).toBe("rendu")
    expect(verdict.rendu).toBe("verdict")
  })

  it("sort en 0 quand la page rend un refus nommé — Overpass tombé n'est pas un rouge", () => {
    // C'est le point que le ticket défend le plus fermement : la fiche qui explique pourquoi
    // elle ne décide pas fait son travail. Un bras qui rougirait ici serait coupé en quinze
    // jours, et il aurait supprimé la vigilance sans fournir la garantie — #71.
    const verdict = verdictPage(lireSonde(SONDES.refus), 10214)
    expect(verdict.sortie).toBe(EXIT.pass)
    expect(verdict.rendu).toBe("refus")
    expect(verdict.dire).toContain("un refus nommé")
  })

  it("CONTRE-PREUVE — sort en 1 sur la fiche bloquée du 13 septembre 2026", () => {
    const verdict = verdictPage(lireSonde(SONDES.bloquee), DELAI_MS)
    expect(verdict.sortie).toBe(EXIT.fail)
    expect(verdict.issue).toBe("muet")
    // Le rapport doit dire ce qu'il y avait À LA PLACE, sinon le lecteur rouvre le navigateur.
    expect(verdict.dire).toContain("Lecture du quartier en cours")
  })

  it("CONTRE-PREUVE — sort en 1 sur la même fiche une fois plantée", () => {
    const verdict = verdictPage(lireSonde(SONDES.plantee), DELAI_MS)
    expect(verdict.sortie).toBe(EXIT.fail)
    expect(verdict.dire).toContain("layerPointToLatLng")
  })

  it("sort en 1 sur un titre sans phrase : un montage à demi fait n'est pas une réponse", () => {
    const verdict = verdictPage(lireSonde('{"titre":"Verdict","phrase":"","ecran":"…"}'), 500)
    expect(verdict.sortie).toBe(EXIT.fail)
  })

  it("sort en 2, jamais en 1, quand la sonde elle-même n'a rien rendu", () => {
    // Une mesure cassée qui se rendrait en rouge dirait « le produit est en panne » là où la
    // vérité est « l'instrument n'a pas mesuré ». C'est la distinction que #142 a payée en
    // publiant deux zéros faux avant un vrai.
    const verdict = verdictPage(null, 0)
    expect(verdict.sortie).toBe(EXIT.error)
    expect(verdict.issue).toBe("mesure cassée")
  })

  it("sort en 3 quand quelque chose de décidable arrive sous un libellé que main ne déclare plus", () => {
    // L'affirmation du bras est tenue — il y a une phrase à l'écran — mais le servi et le suivi
    // ne s'accordent plus sur les mots. Dire « le produit est en panne » serait faux, et c'est
    // `servi` qui mesure le retard de déploiement.
    const sonde = lireSonde('{"titre":"Notre avis","phrase":"Passage soutenu.","ecran":"…"}')
    const verdict = verdictPage(sonde, 400)
    expect(verdict.sortie).toBe(EXIT.unsettled)
    expect(verdict.issue).toBe("libellé inconnu")
  })
})

describe("la population des titres, et elle est dérivée", () => {
  it("accepte à l'écran chaque titre qu'elle a dérivé, et le classe du bon côté", () => {
    // Aucune chaîne n'est écrite ici : la population est parcourue. Le jour où `page.ts`
    // figerait « Verdict » et « Pas de verdict ici » en dur, une langue ajoutée ou un mot
    // changé le laisserait chercher des phrases qui n'existent plus.
    for (const { texte, rendu } of titresAttendus()) {
      const sonde = lireSonde(JSON.stringify({ titre: texte, phrase: "Une phrase.", ecran: "" }))
      const verdict = verdictPage(sonde, 400)
      expect(verdict.sortie, `« ${texte} »`).toBe(EXIT.pass)
      expect(verdict.rendu, `« ${texte} »`).toBe(rendu)
    }
  })

  it("ne rend que des titres qui figurent VERBATIM dans la table des libellés", () => {
    // Le risque propre à une regex est de capturer à côté — une clé voisine, une moitié de
    // phrase. Ce cas le verrait : rien d'inventé ne se retrouve dans le fichier.
    for (const { texte } of titresAttendus()) {
      expect(texte.length, `« ${texte} »`).toBeGreaterThan(0)
      expect(COPIE.includes(`'${texte}'`), `« ${texte} »`).toBe(true)
    }
  })

  it("en porte un par bloc de langue, des deux côtés", () => {
    // Compté autrement que par la regex de `page.ts` : le nombre de blocs de langue est le
    // nombre de fois où la table déclare un titre de verdict. Une langue ajoutée sans son
    // refus — ce que TypeScript interdit, mais que ce fichier ne saurait pas — se verrait ici.
    const langues = [...COPIE.matchAll(/\bverdictHeading:/g)].length
    expect(langues).toBeGreaterThan(1)
    expect(titresAttendus().filter((t) => t.rendu === "verdict")).toHaveLength(langues)
    expect(titresAttendus().filter((t) => t.rendu === "refus")).toHaveLength(langues)
  })
})

describe("ce que le bras cherche existe vraiment dans le composant", () => {
  const source = readFileSync(
    resolve(__dirname, "../../src/components/context/ContextVerdict.tsx"),
    "utf8",
  )

  it("le composant pose bien l'ancre que la sonde interroge", () => {
    // Sans ce cas, renommer l'ancre rendrait la porte rouge le lendemain matin devant personne,
    // pour un défaut qui n'existe pas. Ici, `npm.cmd run test` le dit tout de suite et sans
    // réseau — c'est la règle que #71 applique partout ailleurs.
    expect(EXPRESSION_SONDE).toContain("#verdict")
    expect(source).toContain('id="verdict"')
  })

  it("les deux branches du composant rendent leur titre depuis CONTEXT_COPY", () => {
    // Si une branche écrivait son titre en dur, la dérivation de `titresAttendus` cesserait de
    // décrire l'écran sans que rien ne le dise.
    expect(source).toContain("c.verdictHeading")
    expect(source).toContain("c.refusalHeading")
  })

  it("la phrase est le premier paragraphe de la section, dans les DEUX branches", () => {
    // La sonde prend le premier `<p>` de la section `#verdict`. Les deux branches y rendent
    // `verdict.sentence` ; un paragraphe glissé avant — une note, un fil d'Ariane — ferait
    // mesurer autre chose sans que rien ne le dise.
    const sections = [...source.matchAll(/aria-labelledby="verdict"/g)].map((m) => {
      const fin = source.indexOf("</section>", m.index)
      return source.slice(m.index, fin === -1 ? undefined : fin)
    })
    expect(sections).toHaveLength(2)
    for (const section of sections) {
      const premier = section.indexOf("<p")
      const phrase = section.indexOf("{verdict.sentence}")
      expect(premier).toBeGreaterThan(-1)
      expect(phrase).toBeGreaterThan(premier)
      // Rien ne referme un paragraphe entre l'ouverture du premier et la phrase : la phrase EST
      // dans le premier `<p>`.
      expect(section.slice(premier, phrase)).not.toContain("</p>")
    }
  })
})

describe("le délai, et il n'est pas hérité d'un client HTTP", () => {
  it("dérive du budget que la fiche s'impose, jamais d'une copie", () => {
    expect(DELAI_MS).toBe(CONTEXT_BUDGET_MS + MARGE_MS)
  })

  it("laisse à la page le temps de composer son refus APRÈS son propre budget", () => {
    // Un délai inférieur ou égal au budget ferait rougir le bras sur le comportement correct :
    // la fiche qui consomme ses dix secondes puis rend son refus est le cas que #156 a construit.
    expect(DELAI_MS).toBeGreaterThan(CONTEXT_BUDGET_MS)
    expect(MARGE_MS).toBeGreaterThan(0)
  })

  it("reste très en deçà du délai d'un miroir, qui n'a jamais été la bonne borne", () => {
    // `MIRROR_TIMEOUT_MS` vaut 70 000 ms et c'est la borne de `/carte`, pas celle de la fiche.
    // Le 13 septembre, trois miroirs à 70 s ont fait 2 min 20 d'écran blanc : hériter de ce
    // chiffre-là aurait fait un bras vert pendant quatre minutes de produit muet.
    expect(DELAI_MS).toBeLessThan(70000)
  })
})

describe("l'adresse ouverte", () => {
  it("porte ses coordonnées, pour que la BAN ne soit pas sur le chemin critique", () => {
    // Sans coordonnées, un géocodeur muet rendrait `c.notFound` — ni verdict ni refus — et le
    // bras rougirait sur une panne amont qui n'est pas celle qu'il surveille.
    const url = new URL(ADRESSE, "https://exemple.test")
    expect(url.pathname.startsWith("/contexte/")).toBe(true)
    expect(Number(url.searchParams.get("lat"))).toBeGreaterThan(48)
    expect(Number(url.searchParams.get("lng"))).toBeGreaterThan(2)
  })
})
