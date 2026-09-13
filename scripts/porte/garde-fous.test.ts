// Ce que les garde-fous refusent, ce qu'ils laissent passer, et qu'ils sont branchés.
//
// **Un crochet trop large se fait désarmer, et un crochet désarmé ne garde rien.** C'est la
// même leçon que `scripts/eval/upstream.ts` porte pour la porte : assouplir le rapport
// éteindrait les alertes là où personne ne le verrait. Ici le risque est symétrique et plus
// sournois — un refus abusif sur un geste courant du dépôt pousserait à retirer le crochet en
// entier, donc à reperdre les pièges qu'il existe pour attraper. D'où la proportion voulue des
// cas ci-dessous : plus de commandes qui doivent PASSER que de commandes refusées.
//
// Les cas « refusé » sont des commandes RÉELLEMENT jouées, recopiées depuis les transcriptions
// du 13 septembre 2026 — pas des inventions. Une règle de refus éprouvée sur des exemples
// fabriqués ne prouve rien de ce qu'elle fera sur les appels qu'elle va vraiment voir.
//
// **Ce que ce fichier ne prouve pas** : que le crochet est installé chez Ivan, au niveau
// utilisateur, pour toutes les sessions et tous les projets. Ça, aucun test de ce dépôt ne peut
// le voir — `~/.claude/` n'existe pas sur le coureur d'intégration. Le test de branchement
// ci-dessous ne vérifie que la copie de CE dépôt, qui couvre quiconque le clone.

import { existsSync, readFileSync } from "fs"
import { homedir } from "os"
import { join, resolve } from "path"

import { describe, expect, it } from "vitest"

import { REGLES, verdict } from "../../.claude/hooks/garde-fous.mjs"

const ROOT = resolve(__dirname, "..", "..")

describe("les garde-fous refusent ce qui a déjà coûté du temps", () => {
  const refuses: [string, string, string][] = [
    [
      "echappements-manges",
      "un heredoc python portant une classe de caractères",
      `python - <<'PY'\nimport re\nmotif = re.compile(r"[^\\s\\\\]( )([?!])")\nPY`,
    ],
    ["echappements-manges", "python -c avec un échappement unicode", `python -c "print('\\u0020')"`],
    [
      "echappements-manges",
      "node -e avec une expression régulière",
      `node -e "console.log('a'.replace(/\\r\\n/g, ''))"`,
    ],
    [
      "code-de-sortie-au-travers-d-un-tube",
      "le sessions:check annoncé vert qui sortait en 1",
      `npm.cmd run sessions:check 2>&1 | tail -20; echo "SORTIE=$?"`,
    ],
    [
      "code-de-sortie-au-travers-d-un-tube",
      "un eval canalisé vers grep puis jugé",
      `npm.cmd run eval | grep -E "FAIL"; echo $?`,
    ],
  ]

  for (const [regle, quoi, commande] of refuses) {
    it(`refuse (${regle}) : ${quoi}`, () => {
      const raison = verdict(commande)
      expect(raison, `aurait dû être refusé : ${commande}`).not.toBeNull()
      expect(raison).toContain(regle)
    })
  }
})

describe("les garde-fous laissent passer ce qui n'a jamais posé de problème", () => {
  const passent: [string, string][] = [
    [
      "un heredoc sans interpréteur — le geste normal de ce dépôt",
      `gh pr create --body-file - <<'EOF'\nUn corps, avec des \`backticks\`.\nEOF`,
    ],
    ["un commit par heredoc", `git commit -F - <<'EOF'\nUn message.\nEOF`],
    ["un interpréteur nourri par un FICHIER, la voie recommandée", `python C:/tmp/scratch/fix.py`],
    ["node sans antislash", `node -e "console.log(1 + 1)"`],
    ["un chemin Windows, plein d'antislashs mais sans code en ligne", `node C:\\tmp\\a\\b.mjs`],
    // Lire une sortie au tube reste parfaitement légitime — c'est en JUGER le code qui ne l'est
    // pas. Refuser le tube seul rendrait le crochet inutilisable au quotidien.
    ["un tube vers tail SANS lecture du code de sortie", `npm.cmd run test | tail -20`],
    ["une redirection puis lecture du code — la voie recommandée", `npm.cmd run test > out.txt 2>&1; echo $?`],
    ["un tube assumé, avec pipefail", `set -o pipefail; npm.cmd run test | tail -5; echo $?`],
    ["un tube dont le code est lu par PIPESTATUS", `npm.cmd run test | tail -5; echo \${PIPESTATUS[0]}`],
    ["un git log ordinaire au tube", `git log --oneline -20 | head -5`],
    // LE FAUX POSITIF DE LA PREMIÈRE VERSION, gardé comme cas de non-régression. Elle cherchait
    // un tube et un `$?` n'importe où dans la chaîne et refusait ceci, où les deux redirections
    // sont correctes, chaque `$?` lit bien ce qu'il croit lire, et le `grep | head` final n'est
    // jugé par personne. Refusé le 13 septembre 2026, dix minutes après l'écriture de la règle.
    [
      "deux redirections correctes suivies d'un tube que rien ne juge",
      `npm.cmd run typecheck > tc.txt 2>&1; echo "TYPECHECK=$?"; npm.cmd run test > t.txt 2>&1; echo "TEST=$?"; grep -E "Tests " t.txt | head -4`,
    ],
    // LE SECOND FAUX POSITIF, et il s'est pris sur le commit qui EXPLIQUAIT la règle du tube :
    // le message citait `| tail; echo $?` en prose. Un corps de heredoc est une donnée, pas du
    // shell. Les messages de ce dépôt citent des commandes en permanence — sans cette coupe, la
    // règle rendrait impraticable le geste le plus courant du dépôt.
    [
      "un commit dont le MESSAGE cite un tube jugé",
      `git commit -F - <<'EOF'\nCe depot a conclu faux avec npm.cmd run X | tail; echo $?\nEOF`,
    ],
    ["une commande vide", ""],
  ]

  for (const [quoi, commande] of passent) {
    it(`laisse passer : ${quoi}`, () => {
      expect(verdict(commande), `n'aurait pas dû être refusé : ${commande}`).toBeNull()
    })
  }
})

describe("la liste de règles reste une liste, et reste branchée", () => {
  it("chaque règle porte un nom, une détection et une issue écrite", () => {
    // Le refus doit dire quoi faire à la place : un blocage sans issue se fait contourner,
    // puis désarmer. C'est une propriété de CHAQUE règle, donc elle se vérifie sur la
    // population, jamais sur les deux qu'on a écrites aujourd'hui.
    expect(REGLES.length).toBeGreaterThan(0)
    for (const regle of REGLES) {
      expect(regle.nom, "une règle sans nom ne peut pas être citée dans son refus").toMatch(
        /^[a-z0-9-]+$/,
      )
      expect(typeof regle.detecte, regle.nom).toBe("function")
      expect(regle.message, `${regle.nom} ne dit pas quoi faire à la place`).toMatch(
        /À faire à la place/,
      )
    }
  })

  it("les noms sont uniques", () => {
    // Deux règles homonymes rendraient un refus impossible à attribuer — le même défaut que
    // les identifiants d'invariants, qui ont déjà collisionné entre deux sessions parallèles.
    const noms = REGLES.map((r) => r.nom)
    expect(new Set(noms).size, `noms en double : ${noms.join(", ")}`).toBe(noms.length)
  })

  it("la copie utilisateur, quand elle existe, ne dérive pas de celle-ci", () => {
    // Installer le crochet au niveau utilisateur — pour qu'il vaille dans TOUTES les sessions
    // et tous les projets, ce qu'Ivan a demandé le 13 septembre 2026 — crée une seconde copie.
    // Deux copies que rien ne recoupe, c'est le défaut de `#128`, ouvert le matin même. Alors
    // on les recoupe.
    //
    // Le test SE TAIT quand la copie n'existe pas : le coureur d'intégration n'a pas de
    // `~/.claude/`, et une règle qui échoue là où elle ne peut rien voir se fait désactiver.
    // Ce que ça ne rattrape pas : une machine où la copie manque n'est pas protégée, et rien
    // ici ne le dira — ce test voit la dérive, jamais l'absence.
    const chez = join(homedir(), ".claude", "hooks", "garde-fous.mjs")
    if (!existsSync(chez)) return

    const ici = readFileSync(resolve(ROOT, ".claude/hooks/garde-fous.mjs"), "utf8")
    expect(
      readFileSync(chez, "utf8").replace(/\r\n/g, "\n"),
      `${chez} a dérivé de la copie du dépôt. Recopier celle du dépôt, qui est la référence : ` +
        "c'est elle que les tests ci-dessus jugent.",
    ).toBe(ici.replace(/\r\n/g, "\n"))
  })

  it("`.claude/settings.json` les monte en PreToolUse sur Bash", () => {
    // Le mode de panne que les cas ci-dessus ne voient pas : une règle juste, jamais appelée.
    const reglages = JSON.parse(readFileSync(resolve(ROOT, ".claude/settings.json"), "utf8"))
    const surBash = (reglages.hooks?.PreToolUse ?? []).filter((e: { matcher?: string }) =>
      (e.matcher ?? "").includes("Bash"),
    )
    const commandes = surBash.flatMap((e: { hooks: { command?: string }[] }) =>
      e.hooks.map((h) => h.command ?? ""),
    )
    expect(
      commandes.some((c: string) => c.includes("garde-fous.mjs")),
      "le crochet n'est plus monté sur Bash dans .claude/settings.json",
    ).toBe(true)
  })
})
