# [P0] w6-fiche-corpus — La fiche décore OpenStreetMap : elle ne lit pas une seule fonction `compass_*`

**ID** `w6-fiche-corpus` · **vague 6** · **P0**
**Dépend de** `w6-fiche-robuste`
**Sources** — *aucune source nouvelle : celles qui sont déjà en base et que l'écran n'appelle pas*

## Pourquoi

**Mesuré le 13 septembre 2026 sur `main` à `396e16f`, et confirmé sur le site publié.**

La fiche de contexte — que `#146` appelle « LE produit » — a exactement **deux** sources : BAN pour
géocoder, et Overpass pour tout le reste. `src/pages/Context.tsx` ne monte que
`useAddressFromSlug` et `useAddressContext` ; `src/hooks/useAddressContext.ts` attribue **tous** les
axes à `uniformOrigins(OSM_ORIGIN(today()))` — OpenStreetMap, millésime *le jour de la visite*.
Zéro appel `compass_*`, zéro requête Supabase dans le journal réseau du navigateur.

**Le code le dit lui-même**, deux fois, comme une intention jamais tenue :

> `src/hooks/useAddressContext.ts` — *« The day the front reads `compass_*`, the premises origin
> becomes APUR's »*
>
> `src/services/opendata/scoring.ts` — *« This is exactly what stops being true when the front
> starts reading `compass_*` »*

**Ce qui n'est donc pas sur la page produit**, alors que c'est en base, daté, licencié et gardé par
la porte :

> **Quatre des chiffres de ce tableau étaient faux, remesurés sur `dbefhvmyfmmhjeetdddu` le
> 14 septembre 2026** — colonne de droite ajoutée le même jour. Les deux comptes BODACC avaient
> simplement vieilli : la source se recharge toutes les semaines, et l'énoncé datait du 13. Le
> **107 499 attribué à BDCom 2023 n'a jamais désigné BDCom** : c'était l'ordre de grandeur des
> **établissements BODACC géolocalisés** (108 059 aujourd'hui). BDCom 2023 porte **60 845**
> relevés sur **85 418** locaux distincts, et le millésime est `retail_only` — d'où l'écart avec
> les 84 031 de 2017.

| En base, servi par PostgREST | Sur la fiche | Remesuré le 14 septembre 2026 |
| --- | :---: | --- |
| BDCom 2023 — ~~107 499 établissements sur adresse~~ | **oui, depuis le 14/09** | **60 845 relevés**, 85 418 locaux distincts, 0 vacant |
| BODACC — ~~43 057~~ cessions, prix lu sur ~~25 496~~ | non | **43 347** avis `vente`, prix lu sur **25 661** |
| `compass_address_timeline` — la chronologie d'un local | non | demande un `location_id`, pas un point |
| `compass_activity_transitions` — vers quoi un local a changé (§6.1) | **oui, comme trou déclaré** | 1 ligne marquée `withheld`, 68 ms |
| `compass_voie_rotation` — la rotation d'une voie entière (§6.3) | non | — |
| `compass_price_by_activity` — le prix par métier (§6.4) | non | — |
| `compass_sales_vs_collective` — la rue qui se renouvelle contre celle qui meurt (§6.5) | non | — |
| Analyse de survie par quartier et par métier (§6.2) | non | — |

`docs/PLAN.md` §6.3 le notait déjà pour l'une d'elles : *« `compass_street_rotation`, seule
fonction qui descend au tronçon, n'a toujours aucun appelant **produit** — ni front ni MCP »*. La
mesure d'aujourd'hui étend le constat à la fiche entière.

## Le point de doctrine qui décide

**Quinze bras gardent un corpus que la page produit ne demande jamais.**

> **Deux chiffres remesurés le 14 septembre 2026.** « Quatorze » était vrai le matin du
> 13 septembre et faux le soir même : `page` (`#158`) est le **quinzième**, et il est né
> précisément parce que les quatorze autres étaient au vert pendant que la fiche ne disait rien.
> Et `eval` tient **56** invariants, pas 50 — `grep -c '^-- @invariant' eval/invariants.sql`.
> Le fond de l'argument n'en est pas affaibli : il en est renforcé.

`eval` tient 56 invariants sur les retenues de licence, les millésimes et les gardes RLS.
`ledger`, `catalogue`, `cadence`, `observabilite`, `avis`, `servi` tiennent le reste. Tout cet
appareil protège des données que l'écran n'appelle pas — et la seule source que l'écran appelle
vraiment, un miroir OSM public et gratuit, n'est gardée par rien et est tombée aujourd'hui
(`w6-fiche-robuste`).

C'est aussi la deuxième question du prompt PM, qui attendait une réponse mesurée :

> *« Sans adresse : la carte dit-elle ce qui se libère, ou décore-t-elle OSM ? »*

Au 13 septembre 2026 : **elle décore OSM.**

**Et c'est la doctrine du dépôt appliquée à contre-emploi.** `CLAUDE.md` dit qu'une garde sur le
chemin de l'écran laisse passer l'agent qui appelle PostgREST en direct. Le symétrique n'a jamais
été écrit : **une garde sur le chemin de l'agent laisse passer un écran qui ne lit pas le corpus.**
Le serveur MCP, lui, lit `compass_*` depuis le 15 août — l'agent reçoit donc une réponse que le
preneur ne reçoit pas.

## Comment

**Le corpus d'abord, OSM en second — décidé par Ivan le 13 septembre 2026.**

La fiche rend d'abord ce que `compass_*` donne : toujours disponible, daté, licencié, gardé. Elle
**complète** ensuite avec OSM quand un miroir répond. Un miroir mort dégrade la fiche au lieu de la
vider, et l'inversion de dépendance est le fond du ticket : aujourd'hui une source publique gratuite
tient en otage un corpus que le projet a passé un mois à rendre traçable.

**Ce que ça exige, et qu'il ne faut pas escamoter.**

- **`LayerOrigins` cesse d'être uniforme.** `w0-provenance` (#10) a rendu l'origine par couche
  précisément pour ce cas : les locaux viennent d'APUR BDCom 2023 avec sa licence et son millésime,
  les aménités d'OpenStreetMap avec la date du jour. Les afficher sous une seule origine serait un
  chiffre sans sa source, et `Measured<T>` existe pour l'interdire.
- **La retenue de licence remonte jusqu'à l'écran.** 2017 et 2020 sont retenus ; `compass_*` rend
  des lignes marquées plutôt qu'un vide, et le bloc des trous doit dire *retenue de licence*, jamais
  *absent*. C'est `I12` à `I17` transposé à l'écran.
- **Le verdict garde son refus.** Un constat porteur retenu ou indéterminé fait toujours refuser la
  composition — un corpus plus riche ne doit pas faire disparaître le refus, il doit le rendre plus
  rare et mieux motivé.
- **Aucun chiffre littéral dans un composant.** Critère n° 5 de `w6-contexte`, il reste en vigueur.

## Fait quand

1. **Sur une adresse réelle, au moins un constat de la fiche porte `APUR BDCom 2023`**, sa licence et
   son millésime, dérivé d'une fonction `compass_*` — et chaque chiffre déplie sa provenance depuis
   `Measured<T>`, jamais recopiée.
2. **Miroirs Overpass injoignables, la fiche rend quand même ces constats-là.** C'est la contre-preuve
   du découplage : si tout disparaît encore, le corpus n'est pas devenu premier.
3. **Une adresse dont un millésime est retenu affiche « retenue de licence »**, pas une absence — et
   la contre-preuve est une adresse dont le rayon est réellement vide, qui affiche autre chose.
4. **Le verdict refuse toujours** quand un constat porteur est retenu ou indéterminé, démontré sur une
   adresse à l'écran.
5. **La parité agent/écran tient** : `npm.cmd run verify:mcp` au vert, et le recensement de
   `scripts/porte/verdict.ts` toujours satisfait des deux surfaces.

## Livré le 14 septembre 2026 — ce qui est démontré, et les deux limites mesurées

**Démontré à l'écran**, build de la branche servi depuis le disque, Chrome sans tête, sur
`/contexte/rue-de-bretagne-paris?lat=48.863100&lng=2.362100` :

| Critère | Ce que l'écran a rendu |
| ---: | --- |
| 1 | `TISSU COMMERCIAL 100/100` · **Source APUR BDCom 2023 · Licence ODbL-1.0 · Millésime 2023-06**, dépliés depuis `Measured<T>` sous le chevron ; et `PASSAGE` porte `APUR BDCom 2023 + OpenStreetMap via Overpass`, millésime `2023-06` — le plus ancien de ses deux ingrédients |
| 2 | Miroirs **bloqués au protocole DevTools** : la fiche se pose en **292 ms** et le constat APUR reste entier, quand les cinq axes OpenStreetMap tombent en « source injoignable ». Sans blocage elle met **10 287 ms** et rend exactement la même chose |
| 3 | « Ce qu'un local d'ici est devenu entre deux millésimes — **retenu pour licence** », sur une adresse parisienne ordinaire. **Contre-preuve** : bois de Vincennes, `TISSU COMMERCIAL 0/100 faible` — un zéro mesuré, pas une absence ; et Massy, `n/d` + « **hors du corpus** ». Trois réponses, trois textes |
| 4 | Le refus tient et se motive : « Compass ne compose pas de verdict — le passage : source injoignable ; la desserte : source injoignable ; les services à pied : source injoignable » ; à Massy il nomme d'abord « le tissu commercial : hors du corpus » |
| 5 | `npm.cmd run verify:mcp` — **46 contrôles, 45 au vert, 0 en échec, 1 suspendu** (Overpass 429, panne amont), sortie **0** ; `scripts/porte/verdict.test.ts` **26 cas au vert**, les deux surfaces toujours recensées |

**Le verdict composé, lui, a demandé un instantané rejoué**, et c'est une mesure en soi : **six
passages consécutifs, six refus**, 10 119 à 10 328 ms — aucun miroir public n'a répondu dans le
budget de dix secondes. En rejouant un instantané Overpass réel capturé le même jour sur
`overpass.private.coffee` (53 654 ms, 1 215 572 octets, 3 744 éléments), la fiche compose en
**815 ms** : « *Tissu commercial dense, passage soutenu, desserte forte, services à pied
nombreux.* » Le corpus n'y est pour rien — c'est `w1-overpass-ordre` (`#163`).

**Les deux limites mesurées**, écrites plutôt que découvertes plus tard :

- **L'axe discrimine mal dans Paris commerçant.** `DIAGNOSTIC.md` §52 : la constante de
  saturation est partagée avec la mandataire de passage et publiée, donc elle n'a pas été
  touchée. **Décision attendue d'Ivan.**
- **La vacance n'est pas servie, et ce n'est pas du code.** BDCom 2023 est `retail_only` :
  **0 local vacant sur 60 845 relevés**, contre 7 853 en 2017 et 8 764 en 2020. `PremisePoint.status`
  vaut donc toujours `occupied` sur cette couche. C'est la réponse de l'APUR qui l'ouvre.

**Et un défaut trouvé en chemin, sur le chemin de l'agent** : `DIAGNOSTIC.md` §51 — PostgREST
plafonnait la couche à mille lignes et personne ne lisait `total_matched`. À 2 000 m, le rayon que
`score_location` annonce, l'agent recevait **1 000 locaux sur 17 190** comptés comme un total.
Corrigé sur les deux surfaces.

**Ce que ça ne rattrape pas.** Servir le corpus ne le rend pas *lisible* : quatre à six constats
scannables restent la contrainte de `w6-contexte`, et brancher huit sources ne donne pas huit
constats. Le choix de ce qu'on montre est un travail produit distinct, et la phase 6 de `PLAN.md`
attend au P2 pour cette raison. Et rien ici ne dit qu'un preneur décide autrement — seuls trois
entretiens le diront.

## Hors périmètre

Pas de source nouvelle, pas de cache OSM côté base (posé au backlog le 13 septembre, vague 2), pas
de refonte visuelle, pas de nouveau mode métier. Les modes appartiennent à `w6-modes` (#36).

Voir [`w6-contexte.md`](./w6-contexte.md), [`w6-fiche-robuste.md`](./w6-fiche-robuste.md),
[`../PLAN.md`](../PLAN.md) phase 6, [`../PERIMETRE.md`](../PERIMETRE.md) §8.
