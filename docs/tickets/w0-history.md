# [P0] w0-history — `compass_premise_history` : une retenue de licence rendue comme un fait

**ID** `w0-history` · **vague 0** · **Q3 2026** · **P0**
**Dépend de** —
**Bloque** `w0-fiche` (#8)
**Sources** `bdcom`

## Pourquoi
Quatrième occurrence du défaut du point 9 de `DIAGNOSTIC.md`, et **sa forme la plus dure**. Les
trois autres fonctions traversant `premise_observation` ont été corrigées —
`compass_address_timeline` par `20260809000011`, `compass_scoring_context_within` par
`20260816000001`, `compass_premises_within` par `20260817000001`. `compass_premise_history`
n'a jamais été regardée : elle est `security invoker`, ne lit pas `request.jwt.claims`, et
**ne porte aucune colonne `withheld`**.

Elle ne rend pas zéro ligne comme les trois autres. Elle rend une ligne par millésime et
remplit les colonnes manquantes par des valeurs par défaut. **La retenue devient une
affirmation fausse.** Mesuré le 24 août sur le distant, local 54652, `60 QU ORFEVRES`, 2017 :

| Chemin | `observed` | `is_vacant` | `activity_label` |
| --- | --- | --- | --- |
| privilégié | `true` | `true` | `Locaux Vacants` |
| **anonyme** | **`false`** | **`false`** | `null` |

Ce local **était vacant en 2017**. Un visiteur sans clé s'entend répondre qu'il n'a pas été
relevé, *et* qu'il n'était pas vacant. Deux faits fabriqués — et fabriqués précisément sur la
vacance, qui est le sujet du produit.

Zéro ligne est un silence : l'appelant peut choisir de ne rien conclure. `observed = false` et
`is_vacant = false` sont des réponses positives, indiscernables d'un relevé réel. Aucun
appelant, humain ou agent, ne peut s'en méfier.

## Comment
Le patron est écrit trois fois dans `supabase/migrations/` et n'a plus à être inventé : lire
`request.jwt.claims`, exposer une colonne `withheld`, et distinguer la retenue de licence de
l'absence réelle. Les invariants `I12`/`I13` et `I14`/`I15` de `eval/invariants.sql` donnent
le couple de tests à recopier — l'un contre la fuite, l'autre contre la retenue excessive.

Le correctif **change le type de retour**, donc il se pose comme migration et engage tout
appelant futur. C'est la raison pour laquelle il n'a pas été fait dans `w0-deploy`.

Ajouter le couple d'invariants correspondant, et une sonde dans `scripts/eval/anon-http.ts`
pour que le quatrième bras de la porte couvre cette fonction comme les trois autres.

> Une session de correction a été lancée en worktree le 24 août sur la branche
> `claude/clever-torvalds-1cc16f`. **Elle n'est pas sur le distant** (vérifié le 24 août) :
> ne pas supposer le travail fait, vérifier avant de commencer.

## Doctrine
Absent n'est pas zéro, et `withheld` n'est pas vide. Une licence non lue ne peut pas produire
une affirmation ; au pire un silence, et ce silence doit se nommer. Une fonction `compass_*`
reste exécutable par `anon` — c'est `I11` — donc la retenue se fait dans la réponse, jamais
par un refus d'exécution.

## Fait quand
Un appel anonyme sur le local 54652, millésime 2017, ne rend plus `observed = false` avec
`is_vacant = false`, mais une retenue nommée. Le couple d'invariants est dans
`eval/invariants.sql`, la sonde dans `npm.cmd run eval:anon`, et les deux passent.

Voir `DIAGNOSTIC.md` §10 et §9, et [`docs/PLAN-ACTION-VACANCE.md`](../PLAN-ACTION-VACANCE.md).
