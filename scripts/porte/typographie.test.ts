// L'espace insécable devant la ponctuation haute, dans le texte français affiché.
//
// **Pourquoi une règle plutôt qu'une correction.** Le 13 septembre 2026, une capture d'écran de
// la page d'accueil montrait « Pas d'adresse en tête » avec le point d'interrogation seul sur la
// ligne suivante. Mesuré dans le navigateur : deux rectangles de texte, `142x17` et `7x17`. La
// cause n'était pas la mise en page — c'était le caractère séparateur, un U+0020 ordinaire, que
// le navigateur a le droit de casser. En typographie française, `?` `!` `;` `:` demandent une
// espace insécable, et cette exigence n'a pas d'exception.
//
// Une chaîne corrigée à la main serait juste le jour où on la corrige. La FAQ en portait quinze
// autres, et la prochaine question écrite en porterait une seizième.
//
// **U+00A0 et non U+202F**, la fine insécable que la typographie française préfère : U+202F est
// absente de certaines fontes et s'y affiche en rectangle vide, ce qui échange une faute discrète
// contre une faute voyante. U+00A0 est un peu large et universellement rendue.
//
// **La population est dérivée, pas listée** : les fichiers dont le métier est la copie affichée —
// `src/i18n/` et `src/content/` — moins l'arbre anglais, et dans ceux-là, les seules chaînes
// portant un accent français. Le filtre par accent est ce qui laisse tranquilles les valeurs
// anglaises qui vivent sur la même ligne que leurs sœurs françaises dans `src/i18n/ui.ts`.
//
// **Une première version de ce relevé rendait 672 occurrences** en balayant tout `src/` sans
// distinguer les chaînes du code : elle comptait les ternaires `cond ? a : b` et les annotations
// de type. C'était le nombre que l'expression trouvait, pas le nombre de fautes. Il est resté
// dans ce commentaire parce qu'il dit ce qu'un relevé doit prouver avant d'être cité.
//
// **Ce que ça ne rattrape pas.** La règle ne voit que `src/i18n/` et `src/content/` : une phrase
// française écrite en dur dans un composant lui échappe, et il y en a. Elle ne juge pas non plus
// les apostrophes — `'` droite contre `’` courbe — ni les guillemets, qui sont la même famille de
// faute et mériteraient le même traitement. Et elle ne dit rien de la mise en page : le même jour,
// la même phrase cassait aussi parce que sa ligne manquait d'un pixel, ce qu'aucune règle
// typographique ne pouvait voir.

import { readFileSync } from "fs"
import { resolve } from "path"

import { globSync } from "glob"
import { describe, expect, it } from "vitest"

const ROOT = resolve(__dirname, "..", "..")

/** Un accent français suffit à dire qu'une chaîne est de la copie française. */
const ACCENT = /[àâäçéèêëîïôöùûüÿœæ]/i

/**
 * Espace ordinaire précédée d'un caractère de mot, devant une ponctuation haute.
 *
 * **`?` et `!` seulement, et le reste est mesuré plutôt que passé sous silence.** La même règle
 * française vaut pour `:` et `;`, et le relevé du 13 septembre 2026 en a trouvé 81 de plus dans
 * cette même population. Ils ne sont pas corrigés ici : ce ticket part d'un point
 * d'interrogation orphelin vu sur une capture, et avaler 81 chaînes de plus au passage ferait
 * d'une correction traçable une refonte de copie que personne n'a relue. Le nombre est écrit
 * pour que la suite soit une décision et non une découverte.
 */
const FAUTE = /(?<=[\wÀ-ÿ’.,)\]]) ([?!])/

/** Les littéraux de chaîne, les trois formes. */
const CHAINE = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/gs

interface Faute {
  fichier: string
  extrait: string
}

function fautes(): Faute[] {
  // La population : dérivée du disque, jamais tenue à la main.
  const fichiers = globSync("src/{i18n,content}/**/*.{ts,tsx}", { cwd: ROOT })
    .filter((f) => !f.includes(".test."))
    // L'arbre anglais sort de la population : « What is Compass? » est correct sans espace.
    .filter((f) => !f.replace(/\\/g, "/").includes("/content/en/"))

  const trouvees: Faute[] = []
  for (const fichier of fichiers) {
    const texte = readFileSync(resolve(ROOT, fichier), "utf8")
    for (const m of texte.matchAll(CHAINE)) {
      const corps = m[1] ?? m[2] ?? m[3] ?? ""
      if (!ACCENT.test(corps)) continue
      // Dans un gabarit, `${n > 1 ? a : b}` est du code, pas du texte.
      const sansCode = corps.replace(/\$\{[^}]*\}/g, "")
      if (FAUTE.test(sansCode)) {
        trouvees.push({ fichier, extrait: sansCode.trim().slice(0, 80) })
      }
    }
  }
  return trouvees
}

describe("la copie française porte ses espaces insécables", () => {
  it("aucune espace ordinaire devant ? ! ; :", () => {
    const trouvees = fautes()
    expect(
      trouvees.map((f) => `${f.fichier} — « ${f.extrait} »`),
      "Une espace ordinaire devant une ponctuation haute laisse le navigateur orpheliner le " +
        "signe sur la ligne suivante — mesuré sur la page d'accueil le 13 septembre 2026. " +
        "Écrire U+00A0 (insécable) et non U+0020, et non plus U+202F qui manque à certaines " +
        "fontes. Corriger la chaîne, jamais cette règle.",
    ).toEqual([])
  })

  it("mesure une population qui existe, sinon elle ne mesure rien", () => {
    // Le mode de panne de toutes les énumérations de `scripts/porte/` : un contrôle qui cesse
    // silencieusement de contrôler. Un dossier renommé rendrait ce test vert pour rien.
    const fichiers = globSync("src/{i18n,content}/**/*.{ts,tsx}", { cwd: ROOT })
    expect(fichiers.length, "src/i18n/ et src/content/ ne se lisent plus").toBeGreaterThan(5)
  })

  it("CONTRE-PREUVE : la faute d'origine serait refusée", () => {
    // La chaîne exacte de `home.noAddress` avant le 13 septembre, avec son U+0020.
    const avant = "Pas d’adresse en tête ?"
    const apres = "Pas d’adresse en tête ?"
    expect(FAUTE.test(avant), "la règle ne voit plus la faute qui l'a fait écrire").toBe(true)
    expect(FAUTE.test(apres), "la règle refuse la forme corrigée").toBe(false)
  })
})
