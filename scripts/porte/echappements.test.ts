// Ce que le crochet `.claude/hooks/echappements.mjs` refuse, et ce qu'il doit laisser passer.
//
// **Un crochet trop large se fait désarmer, et un crochet désarmé ne garde rien.** C'est la même
// leçon que `scripts/eval/upstream.ts` porte pour la porte : assouplir le rapport éteindrait les
// alertes là où personne ne le verrait. Ici le risque est symétrique et plus sournois — un
// refus abusif sur un geste courant du dépôt (`gh pr create --body-file - <<'EOF'`) pousserait
// à retirer le crochet en entier, donc à reperdre le piège qu'il existe pour attraper.
//
// Les cas « refusé » ci-dessous sont des commandes RÉELLEMENT jouées le 13 septembre 2026, pas
// des inventions : les trois arrêts de la journée, recopiés depuis la transcription.
//
// **Ce que ce test ne prouve pas** : que le crochet est branché. Un crochet juste mais absent de
// `.claude/settings.json` ne refuse rien — le fichier de réglages est vérifié séparément, plus bas.

import { readFileSync } from "fs"
import { resolve } from "path"

import { describe, expect, it } from "vitest"

import { verdict } from "../../.claude/hooks/echappements.mjs"

const ROOT = resolve(__dirname, "..", "..")

describe("le crochet refuse ce que l'outil amputerait", () => {
  const refuses: [string, string][] = [
    [
      "un heredoc python portant une classe de caractères",
      `python - <<'PY'\nimport re\nmotif = re.compile(r"[^\\s\\\\]( )([?!])")\nPY`,
    ],
    [
      "python -c avec un échappement unicode",
      `python -c "print('\\u0020')"`,
    ],
    [
      "node -e avec une expression régulière",
      `node -e "console.log('a'.replace(/\\r\\n/g, ''))"`,
    ],
  ]

  for (const [quoi, commande] of refuses) {
    it(`refuse : ${quoi}`, () => {
      const raison = verdict(commande)
      expect(raison, `aurait dû être refusé : ${commande}`).not.toBeNull()
      expect(raison).toContain("Write")
    })
  }
})

describe("le crochet laisse passer ce qui n'a jamais posé de problème", () => {
  const passent: [string, string][] = [
    [
      "un heredoc sans interpréteur — le geste normal de ce dépôt",
      `gh pr create --body-file - <<'EOF'\nUn corps de proposition, avec des \`backticks\`.\nEOF`,
    ],
    ["un commit par heredoc", `git commit -F - <<'EOF'\nUn message.\nEOF`],
    ["un interpréteur nourri par un FICHIER, la voie recommandée", `python C:/tmp/scratch/fix.py`],
    ["node sans antislash", `node -e "console.log(1 + 1)"`],
    ["une commande npm ordinaire", `npm.cmd run test -- scripts/porte/echappements.test.ts`],
    ["un chemin Windows, plein d'antislashs mais sans code en ligne", `node C:\\tmp\\a\\b.mjs`],
    ["une commande vide", ""],
  ]

  for (const [quoi, commande] of passent) {
    it(`laisse passer : ${quoi}`, () => {
      expect(verdict(commande), `n'aurait pas dû être refusé : ${commande}`).toBeNull()
    })
  }
})

describe("le crochet est branché", () => {
  it("`.claude/settings.json` le monte en PreToolUse sur Bash", () => {
    // Le mode de panne que les cas ci-dessus ne voient pas : une règle juste, jamais appelée.
    const reglages = JSON.parse(readFileSync(resolve(ROOT, ".claude/settings.json"), "utf8"))
    const surBash = (reglages.hooks?.PreToolUse ?? []).filter((e: { matcher?: string }) =>
      (e.matcher ?? "").includes("Bash"),
    )
    const commandes = surBash.flatMap((e: { hooks: { command?: string }[] }) =>
      e.hooks.map((h) => h.command ?? ""),
    )
    expect(
      commandes.some((c: string) => c.includes("echappements.mjs")),
      "le crochet n'est plus monté sur Bash dans .claude/settings.json",
    ).toBe(true)
  })
})
