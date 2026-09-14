# [P0] w6-amenites-corpus — Une seule couche empêche le verdict de se composer, et elle n'a qu'une source

**ID** `w6-amenites-corpus` · **vague 6** · **P0**
**Dépend de** `w6-fiche-corpus`
**Sources** — *aucune source nouvelle : IDFM et BDCom sont ingérées depuis le 7 septembre et le 9 août*

## Pourquoi

**Mesuré en production le 14 septembre 2026, après la publication de `w6-fiche-corpus`.**
`/contexte/rue-de-bretagne-paris` rend **un constat sur six** :

> **TISSU COMMERCIAL — 100/100 · fort**
> Source `APUR BDCom 2023` · Licence `ODbL-1.0` · Millésime `2023-06` · Méthode `derived`

Les cinq autres sont en `n/d`, et le verdict refuse :

> **Pas de verdict ici** — le passage : source injoignable ; la desserte : source injoignable ;
> les services à pied : source injoignable.

**Une seule couche explique les trois.** `VERDICT_AXES` (`src/core/verdict.ts`) :

| Axe | Porteur | Couches |
| --- | :---: | --- |
| `density` | oui | `premises` — **corpus depuis #157** |
| `footfall` | oui | `premises` + **`amenities`** |
| `transit` | oui | **`amenities`** |
| `walkability` | oui | **`amenities`** |
| `groceries` | non | `amenities` |
| `noise` | non | `roads` |

`amenities` n'a qu'une source, Overpass, et Overpass ne tient pas un budget humain. Mesuré le
14 septembre : miroir 1 alternant **200 en 6,7 s / 504 en 8,1 s / rejet navigateur en 68 ms** en
dix minutes ; miroirs 2 et 3 à **35 à 75 s** contre un budget de 10 s. `w1-overpass-ordre` (#163)
établit qu'**aucun ordre de ces trois-là ne tient dans le budget**.

**Et les deux surfaces sont bloquées par la même couche.** `mcp-server/src/context.ts:236` appelle
`fetchOverpassAmenities` à côté de `compass_scoring_context_within` : l'agent est exactement dans
l'état du navigateur. C'est pourquoi ce ticket sert les deux d'un coup — les deux passent par le
même `scoreLocation`.

## Comment

**Donner à `amenities` une origine dans le corpus, et garder Overpass en complément.** Rien de
nouveau n'est ingéré :

| Axe | Ce qui le remplit | Déjà en base |
| --- | --- | --- |
| `transit` | **IDFM** — `compass_station_profile`, comptages de validation réels par station | 258 stations, 29 489 lignes de profil, 85 410 locaux rattachés (7 septembre) |
| `walkability`, `groceries` | **BDCom** — locaux commerciaux et codes d'activité | déjà lus par `compass_scoring_context_within` |
| `footfall` | `premises` + les deux ci-dessus | — |

**Vérifier d'abord qu'un appelant anonyme atteint IDFM.** `eval:anon` ne le teste pas au
14 septembre, et `#97` a mesuré exactement ce piège : `idfm_validation_profile` avec RLS active et
**zéro politique de lecture** — 29 489 lignes présentes et muettes pour PostgREST, pendant que
`compass_station_profile`, `security definer`, répondait normalement. Corrigé par
`20260907000003`, mais à remesurer plutôt qu'à croire.

## Doctrine

**`walkability` change d'énoncé, et il le dit — tranché par Ivan le 14 septembre 2026.**
Les « aménités » d'OSM contiennent du **non marchand** : écoles, bureaux de poste, équipements.
BDCom ne connaît que le commerce. L'axe devient donc **« services marchands à pied »**, et
l'écran doit le nommer ainsi. Traduire l'ancien libellé sur la nouvelle mesure serait un chiffre
qui ment sur ce qu'il compte — exactement ce que `Measured<T>` existe pour empêcher.

**La source juste pour le non marchand est la BPE de l'INSEE — `w2-bpe-marches-velo` (#17),
à ingérer à terme**, décidé par Ivan le même jour. Elle n'est pas nécessaire pour qu'un verdict
se compose, et ce ticket ne l'attend pas.

**Les formules bougent, donc `Methodology.tsx` bouge.** Règle de `CLAUDE.md` : toute modification
de `src/core/scoring.ts` exige la mise à jour de la page publiée. Un axe qui change de population
est un cas de cette règle, pas une exception.

**`src/core/` reste pur** : le corpus arrive par l'appelant, comme `premises` depuis #157.

## Fait quand

1. **Overpass injoignable — coupé pour de bon, pas attendu — `/contexte/<adresse>` rend un
   verdict composé**, pas un refus. C'est le critère, et il se démontre à l'écran.
2. **Le même point rend le même verdict à un agent** : `npm.cmd run verify:mcp` au vert, famille
   `PARITE` comprise, miroirs coupés.
3. **Chaque constat neuf porte sa source, sa licence et son millésime** depuis `Measured<T>` —
   `IDFM` pour `transit`, `APUR BDCom 2023` pour les autres. Aucun libellé recopié.
4. **`walkability` s'affiche sous son nouvel énoncé**, et `Methodology.tsx` publie la formule
   correspondante.
5. **Contre-preuve** : un point hors du corpus — hors Paris intra-muros — rend toujours un refus
   nommé, pas un verdict composé sur rien. `compass_scoring_context_within` répond `hors_corpus`,
   et c'est la bonne réponse.
6. **La retenue de licence reste distincte de l'absence** : une adresse dont un millésime est
   retenu dit « retenue de licence », jamais « source injoignable ».

**Ce que ça ne rattrape pas.** Un verdict qui se compose n'est pas un verdict **utile** : il dira
la même chose pour deux locaux de la même rue tant que les axes restent des agrégats de quartier.
C'est le refus n° 2 de la doctrine, et il appartient à `w6-modes` (#36) et `w6-dossier` (#33), pas
ici. Et `walkability` restera aveugle au non marchand jusqu'à `#17`.

## Hors périmètre

Pas de BPE, pas de Bruitparif, pas de cache Overpass côté base, pas de refonte visuelle.
`noise` reste sur `roads` et n'est pas porteur : son absence ne bloque pas un verdict.

Voir [`w6-fiche-corpus.md`](./w6-fiche-corpus.md), [`w1-overpass-ordre.md`](./w1-overpass-ordre.md),
et `docs/PLAN.md` §3.2 pour IDFM.
