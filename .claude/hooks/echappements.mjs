// Refuse un appel Bash dont l'outil mangerait les échappements avant que le shell les voie.
//
// **Le défaut.** L'outil Bash retire UN niveau d'antislash au passage. Un script d'interpréteur
// écrit en ligne — `python - <<'PY' … re.compile(r"[^\s\\]…")` — arrive donc au shell amputé :
// `\s` devient `s`, `\\` devient `\`. Le script part ensuite en erreur de syntaxe, ou pire,
// s'exécute en faisant autre chose que ce qui était écrit.
//
// **Pourquoi un crochet et pas une note.** Ce piège était déjà consigné dans la mémoire de
// session — « le tool Bash mange les antislashs » — et il a coûté trois arrêts dans la seule
// journée du 13 septembre 2026 : une énumération typographique, un compte de deux-points, un
// correctif de test. Une note ne se lit pas au moment du geste ; c'est exactement le reproche
// que ce dépôt fait ailleurs à une documentation qui remplace une mesure. La règle doit donc
// vivre là où la sortie est produite : dans l'appel lui-même.
//
// **Ce qu'il refuse, et rien d'autre** : un interpréteur (python, node, perl, ruby) nourri en
// ligne — par `-c`, `-e`, ou un heredoc — dont le corps porte au moins un antislash. Un heredoc
// sans interpréteur passe : `gh pr create --body-file - <<'EOF'` est le geste normal de ce
// dépôt et n'a jamais posé de problème, les antislashs y étant rares et non signifiants.
//
// **Ce que ça ne rattrape pas.** L'outil mange aussi les antislashs d'un `grep -E` ou d'un `sed`
// écrit en ligne, et ceux-là passent : leur corps est court, l'erreur y est visible tout de
// suite, et les refuser rendrait le crochet insupportable au point d'être désarmé — ce qui est
// la seule façon certaine de le rendre inutile. Le crochet ne vérifie pas non plus que le
// fichier écrit à la place est correct ; il déplace le risque vers un outil qui n'ampute rien.

const INTERPRETEUR = /(^|[\s;&|(])(python3?|node|perl|ruby)([\s]|$)/
const EN_LIGNE = /<<-?\s*['"]?\w+|(^|\s)-[ce](\s|$)/

/**
 * Le corps, une fois retirés les chemins de fichiers Windows.
 *
 * `node C:\tmp\a\b.mjs` est plein d'antislashs et ne contient aucun code en ligne : les compter
 * ferait refuser la voie que ce crochet recommande, ce qui serait absurde.
 */
function corpsUtile(commande) {
  return commande.replace(/[A-Za-z]:\\[^\s"']*/g, " ")
}

export function verdict(commande) {
  if (typeof commande !== "string" || commande.length === 0) return null
  if (!INTERPRETEUR.test(commande)) return null
  if (!EN_LIGNE.test(commande)) return null
  if (!corpsUtile(commande).includes("\\")) return null

  return (
    "Refusé par le crochet `.claude/hooks/echappements.mjs`.\n\n" +
    "Cet appel écrit du code d'interpréteur EN LIGNE et ce code contient des antislashs. " +
    "L'outil Bash en retire un niveau avant que le shell les voie : `\\s` arrive en `s`, " +
    "`\\\\` en `\\`. Le script échoue, ou fait silencieusement autre chose.\n\n" +
    "À faire à la place, et c'est la seule façon qui ait tenu :\n" +
    "  1. écrire le script dans un fichier avec l'outil Write (le scratchpad de session convient) ;\n" +
    "  2. le lancer par son chemin — `python <chemin>` / `node <chemin>`.\n\n" +
    "Piège payé trois fois le 13 septembre 2026, après avoir déjà été consigné en mémoire. " +
    "Si cet appel est vraiment sans risque, le contourner en écrivant le fichier reste plus " +
    "rapide que de diagnostiquer un échappement mangé."
  )
}

async function main() {
  let brut = ""
  for await (const morceau of process.stdin) brut += morceau

  let commande
  try {
    commande = JSON.parse(brut)?.tool_input?.command
  } catch {
    // Un crochet qui plante ne doit jamais bloquer le travail : en cas de doute, il laisse passer.
    process.exit(0)
  }

  const raison = verdict(commande)
  if (raison === null) process.exit(0)

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: raison,
      },
    }),
  )
}

// Importé par le test, exécuté par le crochet : ne lire stdin que dans le second cas.
if (process.argv[1] && process.argv[1].endsWith("echappements.mjs")) await main()
