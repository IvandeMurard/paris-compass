# [P1] w6-corpus-non-lu — Ce que Compass a payé pour obtenir et que personne ne regarde

**ID** `w6-corpus-non-lu` · **vague 6** · **P1**
**Dépend de** — *rien*
**Sources** — *aucune source nouvelle : tout est déjà payé*

> **Demandé par Ivan le 5 octobre 2026** : *« L'ensemble des jeux de données ingérés doivent être
> valorisés. »*
>
> **Élargi le même jour, sur sa relance** : *« Je pensais qu'il y avait davantage de jeux de
> données, notamment sur les stations de métro et leurs taux de fréquentation, toutes les données
> sur les commodités, l'environnement… »* La première version de ce ticket recensait les
> **requêtes écrites** dans la base. C'était la mauvaise population : elle passe à côté d'un jeu
> chargé sans requête, d'un service interrogé en direct, et d'un module de code sans écran. La
> question d'Ivan est **« qu'avons-nous payé pour obtenir ? »**, pas « quelles requêtes avons-nous
> écrites ».

## La population, et c'est tout l'enjeu du ticket

**Trois façons d'avoir une donnée, et les trois comptent :**

1. **Une table chargée** par un chargeur de `scripts/ingest/`.
2. **Une requête écrite** dans la base (`compass_*`) — une table peut en avoir zéro, une, ou
   plusieurs.
3. **Un service interrogé en direct**, qui ne laisse aucune table : OpenStreetMap par Overpass, la
   qualité de l'air, les risques.

**La population se dérive des trois**, jamais d'une liste tenue à la main. Une table sans requête
est invisible à un recensement des requêtes — c'est exactement le trou qui a fait réécrire ce
ticket.

## Ce qui a été mesuré le 5 octobre 2026

**Approximations assumées**, au `grep` sur `src/` et `mcp-server/src/`, types générés et tests
exclus. **À remesurer par la session** : un appel construit dynamiquement y échappe, et un lecteur
compté n'est pas forcément un écran.

### Les tables chargées

| Jeu | Table | Lu par la fiche |
| --- | --- | --- |
| Locaux BDCom, quartiers, voirie | `premise_location`, `premise_observation`, `quartier`, `street_segment` | **oui** |
| Stations et fréquentation horaire | `idfm_station`, `idfm_validation_profile` | **oui** depuis `w2-rythme` (#208) |
| Autorisations de terrasse | `terrasse_autorisation` | **oui** |
| BODACC | `bodacc_announcement`, `bodacc_establishment`, `bodacc_judgment` | **non** |
| Protections du PLU | `plu_linear_protection` | **non** |
| Chantiers perturbants | `chantier_perturbant` | **non** |
| Meublés touristiques | `meuble_autorisation` | **non** |
| **Revenus et population au carreau de 200 m** | `filosofi_grid_200m` | **non — et aucune requête `compass_*` ne l'expose** |
| SIRENE | `sirene_establishment`, `sirene_etablissement_stock` | partiellement |

### Les requêtes sans appelant

`compass_bodacc_within`, `compass_street_rotation`, `compass_voie_rotation`,
`compass_premise_history`, `compass_price_by_activity`, `compass_sales_vs_collective`,
`compass_meubles_within`.

**`street_rotation` et `voie_rotation` sont peut-être la même question à deux échelles** — non
vérifié, à trancher plutôt qu'à recopier.

### Ce qui n'est pas une table

- **Les commodités** — écoles, santé, parcs, transports, commerces de proximité — ne sont pas
  chargées : elles sont demandées à OpenStreetMap **à chaque ouverture de fiche**. Elles sont donc
  payées à chaque visite, et six axes qui en dérivent sont calculés puis jetés (`w6-appuis`, #206).
- **La qualité de l'air et les risques** existent dans `src/services/opendata/environment.ts` et
  ne sont lus que par `MapView`, `PropertyList` et `FiltersProvider` — **l'ancienne carte, jamais
  la fiche d'adresse**. Du code entretenu qu'aucun écran du produit actuel ne montre.

## Ce que le ticket demande, et ce n'est pas « tout afficher »

**Une décision écrite par jeu, et quatre issues possibles :**

1. **Un écran le montre déjà** — le dire, avec le fichier, et refermer la ligne.
2. **Un écran doit le montrer** — nommer lequel, et ouvrir le ticket s'il n'existe pas.
3. **Il ne doit pas être servi** — écrire pourquoi. Une licence non lue, un millésime retenu, un
   risque de réidentification sont des raisons. « Personne n'a eu le temps » n'en est pas une :
   c'est l'état actuel, pas une décision.
4. **Il ne doit plus être entretenu** — un chargeur, une table ou un module qu'on décide de ne pas
   servir et de ne pas garder se retire, et la décision se consigne. C'est l'issue qui manquait à
   la première version, et elle vise `environment.ts` en premier.

**La réserve de licence est une décision pleine.** `docs/HANDOFF-1d.md` § 0 l'écrit : BDCom 2017 et
2020 sont retenus tant que l'APUR n'a pas répondu, donc l'histoire d'un local et la rotation d'une
rue **ne peuvent pas être servies au public aujourd'hui**. L'état à afficher n'est pas un vide :
c'est *« nous l'avons et ne pouvons pas le servir »*, avec sa raison. C'est la distinction qui fait
la valeur du produit.

## Fait quand

1. **Chaque jeu des trois familles a sa ligne**, avec sa mesure **refaite** et son issue parmi les
   quatre.
2. **La population est dérivée**, pas recopiée de ce ticket : une table chargée demain, une requête
   écrite demain, un service interrogé demain entrent dans le recensement sans que personne n'y
   pense. **Une table sans requête doit y entrer** — c'est le défaut qui a fait réécrire ce ticket.
3. **Un contrôle tient la règle** : un jeu sans lecteur et sans décision écrite fait rougir `test`.
   Même forme que les sondes de catalogue et les cadences d'ingestion.
4. **Les décisions « retenu » nomment la condition qui les annulerait** — pour BDCom, la réponse de
   l'APUR.
5. **Rien n'est supprimé dans ce ticket.** L'issue 4 consigne une décision de retrait ; le retrait
   lui-même est un autre ticket, pour qu'il soit relu.

**Ce que ça ne rattrape pas.** Le recensement dit qu'un lecteur *existe*, jamais qu'il est *bon* :
un jeu lu par un écran qui l'affiche mal passera au vert. Et il ne dit rien de la **fraîcheur** —
une table chargée une fois et jamais rechargée est lue, donc verte ici, pendant que son contenu
vieillit. C'est `freshness` qui porte cette question, et il ne la porte que pour les sources qui
ont une cadence déclarée.

## Hors périmètre

Pas de suppression. Pas de nouvel écran — ce ticket ouvre les tickets, il ne les exécute pas. Pas
de levée de la réserve BDCom : elle appartient à l'APUR. Pas de rechargement.

Voir [`w6-accueil-reel.md`](./w6-accueil-reel.md), [`w6-appuis.md`](./w6-appuis.md),
[`w6-rue.md`](./w6-rue.md) et `docs/HANDOFF-1d.md` § 0.
