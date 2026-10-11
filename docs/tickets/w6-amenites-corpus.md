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
nouveau n'est ingéré.

> ### Deux chiffres de cette section étaient faux, remesurés le 15 septembre 2026
>
> La table ci-dessous est celle du ticket d'origine, **corrigée**, et les deux corrections ont
> changé la conception plutôt que de l'ajuster. Les deux fausses lignes venaient de
> `docs/PLAN.md` §3.2, corrigé en même temps : les deux documents portaient la même erreur et
> ne pouvaient pas se corriger l'un l'autre.
>
> 1. **`compass_station_profile` ne rend AUCUN comptage.** Il rend `pct_validations` : la part
>    d'une journée de station tombant dans chaque tranche horaire — une **forme**, jamais un
>    volume. Le jeu IDFM ne publie pas de compte absolu, `20260907000002` le dit dans son
>    en-tête, et la mesure le confirme : 24 tranches JOHV sommant à **99,99 %** à Oberkampf.
>    Deux stations n'y sont donc pas comparables sur leur fréquentation. Ce que la fonction
>    rend d'utilisable est `distance_m` — les mètres jusqu'à l'arrêt le plus proche — et c'est
>    ce que l'axe lit.
> 2. **`compass_scoring_context_within` ne porte aucun code d'activité.** Six colonnes,
>    mesurées : `lat, lng, is_vacant, total_matched, withheld, out_of_corpus`. Les codes vivent
>    sur `compass_premises_within`, une autre fonction, avec son propre plafond de lignes.
>    Élargir la première aurait demandé une migration, et une migration ne peut pas être posée
>    depuis une session (`supabase db push` est lancé par Ivan).
>
> Les trois chiffres de volume, eux, **tiennent** : 258 stations, 29 489 lignes de profil,
> 85 410 locaux rattachés — remesurés le 15 septembre 2026, et 85 410 est bien le nombre de
> `premise_location` portant un `nearest_idfm_station_id`, sur 85 418 au total.

| Axe | Ce qui le remplit | Fonction lue |
| --- | --- | --- |
| `rail` (ex-`transit`) | **IDFM** — distance à l'arrêt ferré le plus proche, décroissance exponentielle | `compass_station_profile`, colonne `distance_m` |
| `services` (ex-`walkability`), `alimentaire` (ex-`groceries`) | **BDCom** — cinq familles marchandes, par groupe d'activité `niv18` | `compass_premises_within`, colonne `activity_niv18` |
| `footfall` | `premises` (65 %) + `rail` (35 %) | les deux ci-dessus |

**Vérifié : un appelant anonyme atteint IDFM.** Remesuré le 15 septembre 2026 avec la seule clé
publiable — `idfm_station` **258 lignes**, `idfm_validation_profile` **29 489 lignes**, les deux
lisibles ; `compass_station_profile` répond en **46 à 518 ms**. Le piège de `#97` — RLS active et
zéro politique de lecture — est bien levé par `20260907000003`, et c'est mesuré plutôt que cru.

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

## Livré — 15 septembre 2026

**Les six critères sont démontrés, et deux des mesures ont changé la conception en chemin.**

| Critère | Démonstration |
| --- | --- |
| 1 — verdict composé, Overpass coupé | `/contexte/rue-de-bretagne-paris` dans Chrome sans tête, contre le build local, les trois miroirs rendus **irrésolvables** (`--host-resolver-rules … ~NOTFOUND`) : **verdict composé en 1 316 à 2 411 ms**, « Tissu commercial dense, passage soutenu, desserte ferrée moyenne, services marchands à pied moyennement présents. » — **cinq constats sur six**, seul `bruit routier` en `n/d`. Avant : un sur six et un refus |
| 2 — même verdict à un agent | `npm.cmd run verify:mcp` **miroirs coupés**, sortie **0** : 47 contrôles, 46 au vert, 0 en échec, 1 suspendu (panne amont). Famille `PARITE` entière au vert, `V2` rendant la même phrase que l'écran |
| 3 — chaque constat porte sa source | Contrôle **`P4b`** ajouté au bras MCP : `rail` doit nommer `IDFM`, `density`/`services`/`alimentaire` doivent nommer `APUR BDCom`. Et `P4` change d'énoncé — `footfall` cite désormais **APUR + IDFM, jamais OpenStreetMap**, ce qui est la propriété qui le fait survivre à un miroir mort |
| 4 — `walkability` sous son nouvel énoncé | L'axe s'appelle `services`, s'affiche **« SERVICES MARCHANDS À PIED »**, et `Methodology.tsx` publie sa table de cinq familles avec ses constantes, plus une section `Desserte ferrée` avec sa formule |
| 5 — contre-preuve hors corpus | Massy : **« Pas de verdict ici — le tissu commercial : hors du corpus ; le passage : hors du corpus ; la desserte ferrée : hors du corpus ; les services marchands à pied : hors du corpus. »** |
| 6 — retenue distincte de l'absence | Trois causes côte à côte sur le même écran à Massy : **hors du corpus** (4 axes), **source injoignable** (bruit routier), **retenu pour licence** (la matrice de transitions) |

**Le critère 5 a trouvé un défaut, et il n'était pas dans le ticket.** Les deux fonctions neuves
**réussissent** hors de Paris et rendent zéro ligne : `compass_premises_within` n'a jamais porté
`out_of_corpus` (`DIAGNOSTIC.md` §36) et `idfm_station` est restreinte à Paris à l'ingestion.
Traitées isolément, elles comptaient donc comme « chargées et vides » et la fiche affichait
**« services marchands à pied 0/100 »** et **« desserte ferrée 0/100 »** à Massy — une commune qui
a des commerces et un RER. C'est `DIAGNOSTIC.md` §16 un cran plus loin, trouvé à l'écran et non en
relecture. Corrigé : `compass_scoring_context_within` reste la seule autorité sur la frontière, et
les deux autres couches tombent avec elle. `DIAGNOSTIC.md` §53.

**Les constantes ne sont pas recopiées, et c'est ce qui a coûté le plus.** Les constantes de
saturation d'OpenStreetMap (18 pour l'alimentaire) sizent un marquage bénévole ; BDCom trouve
**87 commerces alimentaires dans 400 m rue de Bretagne**. Les réutiliser aurait rendu **100
partout** dans Paris — le défaut que `DIAGNOSTIC.md` §52 consigne déjà contre `PREMISE_SATURATION`.
Chaque constante est donc la médiane mesurée de sa famille divisée par ln 2, sur douze points
parisiens. L'axe obtenu **sépare Auteuil (32) de Montorgueil (64)** là où `density` lit 97 contre
100 — c'est sa raison d'être.

**Ce qui reste ouvert, et qui est une décision d'Ivan.** `rail` change de prétention sans que le
ticket l'ait demandé : ce n'est plus un comptage d'arrêts mais une **distance**, et le référentiel
lu est **ferré seulement** — 258 arrêts, les bus n'y sont pas. Le comptage OSM qu'il remplace les
incluait. L'axe est donc plus fiable là où il regarde et aveugle là où il ne regarde pas ; c'est
écrit sur la méthodologie et dans `Measured.note`, mais personne n'a tranché que « desserte »
pouvait vouloir dire « desserte ferrée ». Le libellé a été changé pour le dire — même geste que
pour `walkability` — sans attendre.

## Hors périmètre

Pas de BPE, pas de Bruitparif, pas de cache Overpass côté base, pas de refonte visuelle.
`noise` reste sur `roads` et n'est pas porteur : son absence ne bloque pas un verdict.

Voir [`w6-fiche-corpus.md`](./w6-fiche-corpus.md), [`w1-overpass-ordre.md`](./w1-overpass-ordre.md),
et `docs/PLAN.md` §3.2 pour IDFM.
