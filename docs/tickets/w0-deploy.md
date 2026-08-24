# [P0] w0-deploy — Déployer le corpus sur la base hébergée — **fait le 24 août**

**ID** `w0-deploy` · **vague 0** · **Q3 2026** · **P0**
**Dépend de** —
**Sources** `bdcom`, `bodacc`, `sirene`

## Pourquoi
Le chargement du distant **est fait depuis le 15 août** : `dbefhvmyfmmhjeetdddu` porte le schéma
et les données, 85 418 locaux et 228 275 relevés. Ce qui restait ouvert n'était pas le chargement
mais le **retrait à l'anonyme** : que 2017 et 2020 sortent en `withheld` et non en zéro pour un
visiteur sans clé.

## Comment
> **Périmé, constaté le 24 août.** Ce ticket demandait de poser
> `20260817000001_premises_within_withholding.sql` sur le distant, « le ledger distant est à 24
> migrations, `supabase/migrations/` en compte 25 ». **Le ledger distant est à 25.** La migration
> était déjà posée — corps de fonction identique au fichier versionné, ligne de ledger
> `premises_within_withholding` à quatre instructions. Le chiffre 24 venait de `docs/REPRISE.md`,
> mesuré le 17 août *avant* la poussée, et jamais remesuré depuis.
>
> Il ne restait donc que la seconde moitié : **rejouer la porte en anonyme**, que personne n'avait
> faite. C'est elle qui portait le critère d'acceptation, et elle seule a été exécutée.

## Doctrine
Rien n'est annoncé comme live s'il n'est pas interrogeable par un visiteur anonyme.

## Fait quand
Un appel anon PostgREST sur un point intra-muros renvoie des locaux 2023, et withheld (pas zéro)
pour 2017/2020.

**Démontré le 24 août**, Châtelet (48.8566, 2.3522), rayon 800 m, `compass_premises_within`
appelée en HTTP avec la seule clé publiable — aucune chaîne `DATABASE_URL` en jeu :

| Millésime | HTTP | Lignes | `withheld` | Contenu |
| --- | --- | --- | --- | --- |
| 2017 | 200 | **1** | **`true`** | toutes colonnes nulles |
| 2020 | 200 | **1** | **`true`** | toutes colonnes nulles |
| 2023 | 200 | 5 (limite) | `false` | `total_matched = 3059`, adresses réelles |
| 2023, rayon 1 m | 200 | **0** | — | un vrai vide reste un vrai vide |

Et le contrôle que la porte d'évaluation ne pouvait pas faire — elle pose `request.jwt.claims`
mais jamais `set local role anon`, donc elle n'exerçait pas RLS : la clé anon lisant
`premise_observation` en direct voit **60 845 relevés sur 228 275**, exactement le millésime
ODbL. Les deux millésimes non redistribuables ne sortent pas de la base.

**Rejouable** : `npm.cmd run eval:anon` (`scripts/eval/anon-http.ts`, bras D de la porte).
La porte complète est au vert contre le distant le même jour : **15/15 invariants, 24 baselines,
8 cas dorés**.

## Ce que ce ticket a trouvé et n'a pas corrigé
`compass_premise_history` porte le même défaut de licence que les trois fonctions corrigées,
sous une forme pire : elle rend `observed = false` et `is_vacant = false` là où le local était
relevé **et vacant**. Voir `DIAGNOSTIC.md` §10. Hors périmètre de ce ticket — à ouvrir séparément.

## Ce qui a été écarté, et pourquoi
- **Le correctif de `compass_premise_history`** — il change le type de retour, donc il se pose
  en migration et engage tout appelant futur. Le critère de ce ticket nommait
  `compass_premises_within` : élargir le périmètre en cours de route aurait mêlé une correction
  non demandée à une démonstration attendue.
- **`npm.cmd run lint` est cassé**, et l'était déjà avant cette session — vérifié sur un arbre
  propre par `git stash -u`. Incompatibilité ESLint 9 / `@typescript-eslint`. Détail et
  conséquences dans `docs/REPRISE.md`, « `npm.cmd run lint` ne tourne plus ». La sortie est une
  montée de dépendance, encadrée par `CLAUDE.md` — pas un à-côté de session.
- **GitHub n'a pas été touché.** L'issue #7 reste ouverte bien que son critère soit démontré, et
  le défaut du §10 n'a pas d'issue. À refermer à la main.

Voir [`docs/PLAN-ACTION-VACANCE.md`](../PLAN-ACTION-VACANCE.md). Relit `docs/PLAN.md`, `docs/PERIMETRE.md`.
