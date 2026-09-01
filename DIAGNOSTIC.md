# Diagnostic du code — défauts ouverts

Lecture du dépôt cloné, tenue depuis le 9 août 2026. **Le préambule d'origine annonçait
« quatre défauts, par ordre de gravité » : il en porte trente et un au 1er septembre 2026**, et la phrase
est restée fausse trois semaines.

Découpé en deux le 31 août 2026, comme `docs/REPRISE.md` la veille : cette page ne garde que
**ce qui est encore ouvert**. Les vingt-sept défauts clos sont dans
[`DIAGNOSTIC-CORRIGES.md`](./DIAGNOSTIC-CORRIGES.md), **avec leur numérotation d'origine** —
`docs/REPRISE.md`, `docs/PERIMETRE.md`, `eval/FAILURE_MODES.md` et les tickets y renvoient par
leur numéro de section.

**Le tableau ci-dessous est l'unité de lecture.** Y repérer la section utile, puis la lire seule
au `sed -n`. Personne n'a besoin des 175 Ko d'origine, et les lire coûtait plus cher que tout le
reste d'une session.

**Un renvoi « `DIAGNOSTIC.md` §N » écrit ailleurs dans le dépôt reste valide, et n'a pas été
réécrit.** Il y en a plus de cent trente — dans les migrations, les commentaires de `src/`, les
tickets, le journal, `eval/` — et beaucoup sont des enregistrements datés qu'on ne corrige pas
après coup. C'est le tableau qui les résout : il dit, pour chaque numéro, dans lequel des deux
fichiers la section vit. Une colonne à tenir à jour vaut mieux que cent trente renvois à
réécrire, et bien mieux que cent trente occasions de dérive.

| § | Défaut | État | Où |
| ---: | --- | --- | --- |
| 1 | Un loyer commercial fabriqué à partir d'une donnée d'habitation | **ouvert** | ici |
| 2 | Les scores dépendent du cadrage de la carte | **ouvert** — le plus ancien défaut de justesse | ici |
| 3 | L'écran vide : requête trop lourde, aucun état d'erreur | **partiel** — `e` corrigé le 9 août, `a` à `d` ouverts | ici |
| 4 | Le scoring est quadratique et s'exécute sur le fil principal | **ouvert** | ici |
| 5 | Trois filtres qui ne filtrent pas | clos le 15 août | corrigés |
| 6 | Deux rendus, deux comportements | clos le 15 août | corrigés |
| 7 | `react-router-dom` v7, et un vérificateur de types qui ne vérifiait rien | clos le 16 août | corrigés |
| 8 | `vite` 6 et `vitest` 3, les cinq dernières alertes fermées | clos le 16 août | corrigés |
| 9 | Un millésime retenu rendu comme un quartier sans commerces | clos le 24 août | corrigés |
| 10 | Une retenue de licence rendue comme un fait — `compass_premise_history` | clos le 24 août, `20260824000001` | corrigés |
| 11 | Une absence rendue comme une occupation — `is_vacant` | clos le 24 août, même migration | corrigés |
| 12 | La même retenue annoncée comme une absence à l'appelant connecté | clos le 24 août, `20260824000002` | corrigés |
| 13 | Une licence affirmée sur des données qui n'en relèvent pas — `scoreLocation` | clos le 24 août, `w0-provenance` | corrigés |
| 14 | Le serveur MCP n'atteignait jamais son miroir Overpass principal | clos le 24 août | corrigés |
| 15 | Une conclusion affirmée à partir de millésimes retenus — `compass_address_timeline` | clos le 26 août, `20260826000001` | corrigés |
| 16 | Un point hors corpus rendu comme un quartier sans commerces — `score_location` | clos le 25 août | corrigés |
| 17 | Un chargeur qui ne pouvait tourner qu'une fois — `bdcom.ts` | clos le 25 août | corrigés |
| 18 | `eval:anon` portait trois échecs non liés à `w0-plu` | clos les 25 et 27 août | corrigés |
| 19 | Une retenue rendue comme un fait chiffré — `compass_street_rotation` | clos le 26 août | corrigés |
| 20 | Un correctif sans règle derrière lui — le pont NAF | clos le 25 août, `I22` | corrigés |
| 21 | Une exemption écrite noir sur blanc, et fausse — les deux `_within` | clos le 25 août, `20260825000014` | corrigés |
| 22 | Un taux de rotation affirmé là où il n'y a rien à comparer | clos, même migration | corrigés |
| 23 | La règle de retenue n'était écrite nulle part | clos le 25 août, `I23` et `I24` | corrigés |
| 24 | Un taux dérivé qui ne cite que la licence du plus permissif | clos le 27 août, `20260827000001` | corrigés |
| 25 | La page publique des sources en omettait trois | clos le 26 août | corrigés |
| 26 | Le test d'appelant existait en six exemplaires, et répondait faux | clos le 26 août, `20260826000002` | corrigés |
| 27 | La carte ne tenait pas la fenêtre anonyme au rayon maximal — `compass_premises_within` | clos le 28 août, `20260828000001` et `…002` | corrigés |
| 28 | Les deux fonctions de rayon que `#62` n'avait pas corrigées | clos le 28 août, `20260828000003` | corrigés |
| 29 | L'estimation était fausse, et la corriger ne rachète rien | clos le 28 août — `#65` fermé **sans** migration | corrigés |
| 30 | La porte mourait dans son premier bras | clos le 31 août, `#69` | corrigés |
| 31 | Une cadence ajoutée à l'énumération et jamais à la table de tolérance | clos le 1er septembre, `#70` | corrigés |
| — | Points mineurs | clos le 15 août | corrigés |
| — | Reste à traiter (non bloquant) | **ouvert** | ici |
| — | Ordre d'attaque suggéré | **ouvert**, mais daté du 12 août — à recouper avant usage | ici |

L'état de cette colonne est **dérivé du texte de chaque section**, pas affirmé par-dessus : une
section est dite close quand elle porte elle-même sa date de clôture ou sa migration. Une section
sans cette phrase est comptée ouverte.

---

## 1. Un loyer commercial fabriqué à partir d'une donnée d'habitation

**Fichiers :** `src/services/opendata/rents.ts`, `src/services/opendata/properties.ts:99`,
`src/providers/FiltersProvider.tsx:57-62`

`rents.ts` interroge le jeu `logement-encadrement-des-loyers` de la Ville de Paris avec ce filtre
codé en dur :

```ts
where: "piece=2 and meuble_txt='non meublé' and epoque='1946-1970'"
```

C'est le loyer de référence d'un **appartement de deux pièces non meublé construit entre 1946 et
1970**. L'encadrement des loyers parisien ne s'applique qu'au logement : il exclut explicitement
les locaux commerciaux et professionnels.

Ce chiffre n'est pas seulement affiché. Il est multiplié par la surface du local pour produire un
loyer commercial :

```ts
// properties.ts
estimatedMonthlyRent: rent && sizeM2 ? Math.round((rent.refEurM2 * sizeM2) / 10) * 10 : null,
```

Puis ce nombre fabriqué **filtre les résultats** :

```ts
// FiltersProvider.tsx
if (premise.estimatedMonthlyRent !== null) {
  if (premise.estimatedMonthlyRent < minPrice || premise.estimatedMonthlyRent > maxPrice) {
    return false;
  }
}
```

La chaîne complète est donc : mauvais marché → nombre dérivé faux → le nombre faux décide de ce que
l'utilisateur voit. Le curseur « Loyer mensuel » de la barre latérale agit sur une grandeur qui
n'existe pas.

Le commentaire de `rents.ts:43-44` reconnaît d'ailleurs le problème sans en tirer la conséquence :
« *Used as a market price benchmark; commercial rents are not published as open data.* »

**Correctif.** Supprimer `estimatedMonthlyRent` et le filtre de prix qui en dépend. Conserver la
donnée sous son vrai nom — un indicateur de niveau de vie résidentiel du quartier, donc un signal
de zone de chalandise — et la sortir de tout contexte de prix. Renommer `rents.ts` en
`householdIncome.ts` ou `neighbourhoodRent.ts` pour que l'erreur ne puisse pas se reproduire par
inadvertance.

*Note : `sizeM2` provient des tags OSM `building:area` / `area` / `shop:area`, qui sont presque
toujours absents. Le loyer fabriqué est donc rare — mais quand il apparaît, il est faux, et le
filtre de surface souffre du même vide.*

---

## 2. Les scores dépendent du cadrage de la carte

**Fichiers :** `src/services/opendata/scoring.ts`, `src/services/opendata/properties.ts:80-81`

`computeScores` compte les POI dans un rayon de 800 m **à l'intérieur du snapshot**, et le snapshot
ne contient que ce qui tombe dans la bbox courante :

```ts
const RADIUS_M = 800;
function countNear(pois, point, category) { /* parcourt snapshot.pois */ }
```

Un local situé près du bord de la fenêtre voit donc son cercle de 800 m tronqué : il obtient un
score plus faible **parce que l'utilisateur n'a pas assez dézoomé**, pas parce que son quartier est
moins bien équipé. Le même local affiche des scores différents selon le cadrage.

Même défaut pour `estimateNoise` (rayon 500 m) et pour le proxy de passage (rayon 400 m,
`properties.ts` via `computeScores`).

C'est une atteinte directe à la contrainte fondatrice du produit : un chiffre censé décrire un lieu
décrit en réalité un lieu *et* un état de l'interface.

**Correctif.** À court terme, requêter une couronne plus large que la fenêtre affichée (bbox
étendue de ~1 km) et ne rendre que les locaux de la fenêtre. À terme, c'est ce que résout le passage
à une base spatiale : on interroge un rayon autour d'un point, pas un rectangle d'affichage.

---

## 3. L'écran vide : une requête trop lourde et aucun état d'erreur

**Fichiers :** `src/services/opendata/overpass.ts:30-48`, `src/hooks/useOpenData.ts:14-24`,
`src/services/opendata/http.ts:60-62`

Contrairement à mon hypothèse initiale, il n'y a **aucun garde de zoom**. Le problème est ailleurs,
et il est cumulatif.

**a. La requête par défaut est démesurée.** `PARIS_BBOX` couvre 48.84–48.885 × 2.31–2.40, soit
environ 6,5 × 5 km de Paris dense. `buildQuery` y demande d'un seul coup tous les `shop`, tous les
`office`, écoles, santé, alimentation, parcs, stations, entrées de métro, arrêts de bus, **et**
toutes les voies primaires à autoroutes, avec `out center tags`. L'ordre de grandeur se compte en
dizaines de milliers d'éléments. Overpass répond fréquemment par un timeout ou un 429.

**b. Une réponse vide est traitée comme une panne.**

```ts
validate: (payload) => Array.isArray(payload?.elements) && payload.elements.length > 0,
```

Zéro élément déclenche une exception, donc le passage au miroir suivant, puis l'échec global.

**c. L'échec n'a pas d'affichage propre.** Les trois miroirs épuisés, `fetchOverpassSnapshot` lève
`Overpass unavailable`, `usePremises` passe en erreur (`retry: 1`, donc deux tentatives), et
l'interface rend « 0 locaux · 0 aménités dans la vue ». L'utilisateur lit un résultat là où il y a
une panne.

**d. Même en cas de succès, le fil principal bloque.** Voir le point 4.

**e. Overpass signale ses pannes en bande, pas par le statut HTTP.** *Corrigé le 9 août.* Une
requête qui expire ou sature la mémoire répond **200** avec `elements: []` et un champ `remark`.
Une fois la contrainte `length > 0` retirée (point 4 ci-dessous), ce corps devenait un quartier
vide parfaitement valide : tous les scores à 0, et un bruit à 0 que `noiseLabel` traduisait en
« très faible ». Une panne se lisait comme une rue calme. `remarkOf` rejette désormais toute
réponse portant un `remark`, ce qui bascule sur le miroir suivant. Couvert par
`src/services/opendata/overpass.test.ts`.

**Correctif, dans l'ordre :**
1. Réduire l'emprise par défaut à un secteur dense et lisible plutôt qu'au centre de Paris entier.
2. Découper la requête par famille de tags plutôt qu'un `union` unique, ou plafonner par `[maxsize]`.
3. Distinguer trois états dans l'UI : chargement, panne de source, et zéro résultat réel.
4. ~~Retirer la contrainte `length > 0` de `validate`, et traiter le vide comme un vide.~~ Fait —
   mais à ne pas faire sans le point **e**, sinon on échange une panne bruyante contre une panne
   silencieuse.

---

## 4. Le scoring est quadratique et s'exécute sur le fil principal

**Fichier :** `src/services/opendata/properties.ts:74-80`

`computeScores` est appelé dans un `.map()` sur un maximum de 120 locaux
(`.slice(0, 120)`), et chaque appel parcourt l'intégralité de `snapshot.pois` — cinq fois, une par
catégorie — plus `snapshot.premises` et `snapshot.roads`.

Avec un snapshot de plusieurs dizaines de milliers de POI, cela représente plusieurs millions à
plusieurs dizaines de millions d'appels à `distanceM`, chacun avec quatre appels trigonométriques,
en synchrone sur le fil principal. L'onglet se fige.

**Correctif.** Indexer les POI dans une grille spatiale simple avant la boucle, ou passer par la
base spatiale de la phase 2 et sortir ce calcul du navigateur. Le refactor du noyau de scoring
(phase 1 du plan) est le bon moment.

---

## Reste à traiter (non bloquant)

- **La couche Marchabilité ne s'affiche pas systématiquement.** Piste la plus probable :
  `useMapLayers` reconstruit ses `LayerGroup` à chaque changement de `premises` ou `pois`,
  et son `cleanup` retire les anciens. L'effet de `MapView` qui rattache la couche active
  dépend de `[dataLayer, walkabilityLayer, accessibilityLayer]` : selon l'ordre des rendus,
  la nouvelle couche peut être créée après le dernier rattachement, et rester détachée
  jusqu'au prochain changement d'onglet. À vérifier en même temps que le refactor du
  noyau (phase 1), qui déplacera de toute façon ce calcul.
- **Troncature silencieuse à 120 locaux.** `properties.ts` applique `.slice(0, 120)` après
  avoir trié les vacants en tête. L'utilisateur croit voir l'exhaustivité de sa vue. Soit
  lever le plafond maintenant que la surface interrogée est bornée, soit l'afficher.
  *Ironie relevée le 12 août :* `compass_premises_within` renvoie déjà `total_matched`
  **précisément pour corriger ce défaut** — le commentaire de la migration le dit — mais
  aucun code du front n'appelait cette fonction.
  **Mis à jour le 24 août :** le front l'appelle désormais, dans
  `src/services/compass/premiseHistory.ts`, et **affiche** son `total_matched` quand la liste
  de candidats est tronquée. Mais c'est le compte du rayon de rattachement (25 m), pas celui
  de la vue : la troncature à 120 de `properties.ts` reste silencieuse, et elle porte sur une
  couche OpenStreetMap qui n'a pas de `total_matched`.
- ~~**Étiquettes en dur dans le popup de carte.**~~ **Corrigé le 15 août.** `useMapLayers`
  lit `useLocale`, et `locale` entre dans les dépendances de l'effet — le HTML des popups
  étant construit une fois, changer de langue doit reconstruire les couches, sinon les
  popups gardent la précédente. Les valeurs OpenStreetMap qui y entrent sont désormais
  **échappées** : ces popups sont des chaînes HTML, là où React protège partout ailleurs.

---

## Ordre d'attaque suggéré

1. Point 1 — c'est une donnée fausse qui pilote un filtre. Rien d'autre ne devrait passer avant.
2. Point 3 — sans cela, rien n'est démontrable.
3. Point 4 — conditionne le confort dès que le point 3 laisse passer des données.
4. Point 2 — résolu proprement par la phase 2 du plan, palliatif possible avant.

> **Relecture du 12 août.** Le point 2 est le plus ancien défaut de justesse encore ouvert
> **en production**. Il devait être « résolu proprement par la phase 2 » — mais la phase 2
> est construite et **jamais déployée**, et le palliatif proposé ici (interroger un anneau
> plus large que la fenêtre, n'afficher que la fenêtre) n'a jamais été fait.

### Le palliatif chiffré, le 15 août — et pourquoi il est écarté

Le palliatif a été instruit avant d'être écrit, et **il coûte plus cher que le défaut**.

Couvrir le rayon d'aménité impose d'élargir la boîte de 800 m de chaque côté. À la latitude
de Paris, cela fait **+0,0144° en latitude** et **+0,0218° en longitude** (la longitude coûte
plus cher, un degré n'y valant que ~73 km à 48,87°).

Appliqué à la vue d'ouverture elle-même — 0,01 × 0,018, soit environ 1,1 × 1,3 km :

| | Surface |
| --- | --- |
| Fenêtre affichée | 0,00018 deg² |
| Boîte à interroger | **0,00097 deg²**, soit **5,4×** |
| Plafond Overpass actuel | 0,0006 deg² |

**La vue d'ouverture par défaut dépasserait donc le plafond d'un facteur 1,6.** Tenir le
plafond sur la boîte *interrogée* ramènerait la fenêtre utilisable à environ 400 × 480 m —
quelques pâtés de maisons. Le relever, c'est rouvrir le point 3 : des requêtes trop lourdes
que les miroirs publics refusent, et un refus que l'utilisateur lit comme « aucun résultat ».

**Ce qui fait pencher la balance** : la troncature n'est pas silencieuse. `coverageNote`
(`src/core/scoring.ts:143`) pose déjà une réserve sur chaque chiffre dont le disque de 800 m
sort de la boîte, et l'interface la rend en marqueur cliquable vers la méthodologie — « le
compte est un plancher, pas un total ». Le défaut est donc **déclaré**, ce qui n'est pas
l'être corrigé, mais n'est pas non plus mentir.

**Décision : report assumé.** Échanger un chiffre déclaré comme plancher contre une carte
utilisable sur trois rues serait un mauvais troc. Le vrai correctif reste le RPC point +
rayon, qui interroge un disque et non un rectangle — et qui ne dépend que du déploiement.

---

