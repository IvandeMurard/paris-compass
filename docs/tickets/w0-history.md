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

> ~~Une session de correction a été lancée en worktree le 24 août sur la branche
> `claude/clever-torvalds-1cc16f`.~~ **Vérifié le 24 août, et la question est
> close : cette branche a atterri.** `git merge-base --is-ancestor` la donne
> **entièrement contenue dans `main`**, qui porte quatre commits de plus ;
> `git diff main...claude/clever-torvalds-1cc16f` est vide. Elle ne contenait rien
> sur `compass_premise_history` — c'est elle qui a **trouvé** le défaut, pas qui
> l'a corrigé. Le worktree local existe encore et n'a plus d'objet.
>
> `git cherry -v main <branche>` est l'outil à sortir si le cas se représente à nouveau sur
> une branche rebasée : il compare les patchs, là où `git log main..<branche>`
> compare les identifiants.

## Fait le 24 août — et ce qui manque

**Corrigé dans le dépôt** par `supabase/migrations/20260824000001_premise_history_withholding.sql`.
`I16`/`I17` dans `eval/invariants.sql`, sonde dans `scripts/eval/anon-http.ts`.
Détail en `DIAGNOSTIC.md` §10.

**Les chiffres du ticket ont été remesurés sur le distant le 24 août avant d'être
réutilisés**, et ils tenaient : local 54652 `60 QU ORFEVRES`, 2017, privilégié
`observed = true, is_vacant = true, Locaux Vacants` contre anonyme
`observed = false, is_vacant = false, null`. Le tableau du « Pourquoi » est juste.

**Un cinquième défaut trouvé en chemin, et corrigé dans la même migration.**
`coalesce(a.is_vacant, false)` affirmait « pas vacant » de tout local absent d'un
millésime — **24 573 locaux** pour le seul millésime 2023 `retail_only`, mesuré le
24 août. Même fabrication, même colonne, mais **sur le chemin privilégié** : aucune
licence n'y est pour rien. Corriger la retenue sans corriger l'absence aurait
inscrit l'incohérence dans le schéma, à deux lignes d'écart. `DIAGNOSTIC.md` §11.
Élargissement assumé, hors de la lettre de ce ticket.

**Posée sur le distant le 24 août.** `supabase db push` a d'abord été refusé par
le classificateur du mode auto — écriture de schéma sur une base vivante, même
refus qu'au 17 août — puis lancé à la main depuis PowerShell, où il passe. Ledger
remesuré à **26**, `20260824000001` enregistrée sous `premise_history_withholding`,
corps en base identique au fichier versionné aux fins de ligne près, `SECURITY
INVOKER` conservé, treize colonnes dans l'ordre du fichier.

**Éprouvé, pas supposé.** La migration a tourné dans une transaction jamais
validée contre le distant, I16 et I17 joués dedans, les deux au vert. Le couple a
été passé contre deux sabotages, chacun dans une transaction annulée :

| Sabotage | `I16` | `I17` |
| --- | --- | --- |
| marqueur posé, valeurs par défaut conservées | **échoue**, 20 lignes | vert |
| tous les millésimes retenus | vert | **échoue**, 2 lignes |
| migration telle qu'écrite | vert | vert |

> **Ce que le bras A n'aurait jamais pu trouver.** L'ancienne fonction ne lisait
> pas le claim du tout : lui faire dire `anon` sur une connexion privilégiée
> rendait **tout le contenu**, sans rien d'anormal. Seule une vraie clé publiable,
> avec RLS derrière, montrait la ligne fabriquée. D'où la règle inscrite dans la
> migration : la fonction **nulle ses colonnes elle-même**, elle ne compte pas sur
> RLS pour avoir vidé la jointure.

## Doctrine
Absent n'est pas zéro, et `withheld` n'est pas vide. Une licence non lue ne peut pas produire
une affirmation ; au pire un silence, et ce silence doit se nommer. Une fonction `compass_*`
reste exécutable par `anon` — c'est `I11` — donc la retenue se fait dans la réponse, jamais
par un refus d'exécution.

## Fait quand
Un appel anonyme sur le local 54652, millésime 2017, ne rend plus `observed = false` avec
`is_vacant = false`, mais une retenue nommée. Le couple d'invariants est dans
`eval/invariants.sql`, la sonde dans `npm.cmd run eval:anon`, et les deux passent.

**Démontré le 24 août**, par un appel PostgREST avec la seule clé publiable et
aucun identifiant de base, local 54652 :

| Millésime | `withheld` | `observed` | `is_vacant` | `activity_label` |
| --- | --- | --- | --- | --- |
| 2017 — avant | *(colonne absente)* | `false` | `false` | `null` |
| 2017 — après | `true` | **`null`** | **`null`** | `null` |
| 2020 — après | `true` | `null` | `null` | `null` |
| 2023 — après | `false` | `true` | `false` | `Antiquités` |

`npm.cmd run eval` rend **17/17** invariants, 24 baselines et 8 cas dorés au vert
contre le distant ; `npm.cmd run eval:anon` rend 9 contrôles au vert, dont les deux
sondes `premise_history`. Composition de fiabilité inchangée à **57,31 %**
établi+corroboré, dérive nulle : le correctif ne déplace aucun chiffre publié.

**Issue [#51](https://github.com/IvandeMurard/paris-compass/issues/51) fermée** le
24 août à 15h48 UTC. Rien ne reste.

Voir `DIAGNOSTIC.md` §10 et §9, et [`docs/PLAN-ACTION-VACANCE.md`](../PLAN-ACTION-VACANCE.md).
