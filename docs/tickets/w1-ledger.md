# [P1] w1-ledger — Onze bras regardent le dépôt et le distant, aucun ne les compare

**ID** `w1-ledger` · **vague 1** · **P1**
**Dépend de** —
**Sources** — *aucune source nouvelle*

## Pourquoi

**Le 5 septembre, le distant a porté pendant vingt-quatre heures un schéma que le dépôt
ignorait, et aucun des onze bras ne l'a vu.** La migration `20260905000006_geometrie_finie.sql`
était appliquée — ledger à 53 — pendant que `supabase/migrations/` n'en suivait que 52. Rendait
`geom` nullable et posait huit contraintes `CHECK` que le dépôt ne connaissait pas.

Aucun bras ne pouvait le voir, et c'est structurel :

| Bras | Ce qu'il compare |
| --- | --- |
| `eval`, `eval:anon` | le distant à des règles — il le trouve **sain**, et il l'était |
| `verify:mcp` | les outils MCP au distant |
| `catalogue` | le catalogue à des endpoints externes |
| `freshness` | les cadences aux dates de chargement |
| `sessions:check` | la table d'ordre à GitHub |
| `porte:publie` | le bundle servi à sa configuration |
| **— aucun —** | **le ledger de migrations au contenu de `supabase/migrations/`** |

La mesure qui a révélé l'écart a été faite **à la main**, le 6 septembre, parce que quelqu'un a
lu un message de session et s'est posé la question.

**Et la capacité a existé.** `scripts/eval/_dump-fn.ts` et `_cmp-fn.ts` comparaient le corps
d'une fonction en base au fichier versionné. Supprimés le 26 août avec `.fn-dump/`, comme
outillage jetable. Le manque a été signalé le jour même — *« le dépôt ne sait pas vérifier
mécaniquement que ce qui est déployé correspond à ce qui est versionné »* — et dix jours plus
tard c'est exactement ce trou qui a laissé passer l'incident.

**Ce que ça coûte quand ça arrive.** La porte du lendemain tourne depuis `main`, donc sur des
règles qui ignorent le nouveau schéma : trois écarts de baselines déjà expliqués et regelés sur
le disque, et un invariant écrit pour tenir le correctif qui n'est pas joué. Vert sans valeur
d'un côté, avertissement indiagnosticable de l'autre.

## Comment

1. **Comparer les deux listes.** `supabase_migrations.schema_migrations` contre les fichiers de
   `supabase/migrations/` **suivis par git** — pas ceux du disque, la nuance est le défaut
   même : le fichier était là, non suivi.

2. **Dire les deux sens, ils ne veulent pas dire la même chose.** Une migration au ledger et pas
   au dépôt, c'est un schéma que personne ne peut reconstruire. Une migration au dépôt et pas au
   ledger, c'est du travail non posé — moins grave, et normal entre l'écriture et la poussée.
   Le bras doit les distinguer, pas les additionner.

3. **Aller plus loin que les noms si c'est possible.** Deux fichiers peuvent porter le même
   identifiant et un corps différent. `_cmp-fn.ts` savait comparer les corps ; c'est la partie
   qui a été perdue et elle vaut d'être reprise. À mesurer avant de promettre : si le ledger ne
   garde pas le texte, dire que le bras ne compare que les identifiants.

4. **Le classer comme bras**, donc dans `porte.yml` avec sa cadence — sinon `test` le refuse, et
   ce serait ironique.

## Doctrine

Une documentation n'est pas une mesure, et un dépôt non plus : `supabase/migrations/` **décrit**
un schéma, il ne le constate pas. Le ledger est la mesure ; le dépôt est la prose. C'est le
douzième bras et le seul qui recoupe l'un par l'autre.

Un contrôle supprimé parce qu'il était jetable n'a pas rendu son besoin jetable.

## Fait quand

1. Un bras compare le ledger distant aux migrations **suivies par git**, distingue les deux sens
   et nomme les identifiants en écart.
2. Démontré par sabotage : une migration retirée du suivi doit faire rougir, la remettre doit
   reverdir. En transaction annulée si le sabotage touche la base.
3. Le bras est planifié dans `porte.yml`, ou porte sa raison dans `cadence.json`.
4. Rejoué contre l'incident du 5 septembre — `git stash` sur le fichier de migration doit
   reproduire le rouge qu'on aurait voulu voir ce jour-là.

**Dire ce que ça ne rattrape pas** : un schéma modifié à la main sur le distant sans passer par
une migration ne laisse aucune trace au ledger, et ce bras ne le verra jamais. C'est une limite
du ledger, pas du contrôle — mais elle doit être écrite.

Voir `#68` pour l'incident, `DIAGNOSTIC.md` §38, et la suppression du 26 août dans
`docs/JOURNAL.md`.
