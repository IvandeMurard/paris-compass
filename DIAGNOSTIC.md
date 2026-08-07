# Diagnostic du code — août 2026

Lecture du dépôt cloné. Quatre défauts, par ordre de gravité.
Les deux premiers sont des problèmes de justesse, pas de confort.

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

**Correctif, dans l'ordre :**
1. Réduire l'emprise par défaut à un secteur dense et lisible plutôt qu'au centre de Paris entier.
2. Découper la requête par famille de tags plutôt qu'un `union` unique, ou plafonner par `[maxsize]`.
3. Distinguer trois états dans l'UI : chargement, panne de source, et zéro résultat réel.
4. Retirer la contrainte `length > 0` de `validate`, et traiter le vide comme un vide.

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

## Points mineurs

- **Deux lockfiles.** `bun.lockb` et `package-lock.json` coexistent. En garder un.
- **Étiquettes en dur en français.** `properties.ts:7-15` (`CATEGORY_LABELS`) et
  `premiseTitle` produisent du français alors que le projet a une couche i18n (`src/i18n/`).
  L'interface anglaise affichera « Local vacant (ancien Boulangerie) ».
- **Accord grammatical.** `premiseTitle` produit « ancien Boulangerie » : le genre n'est pas géré.
- **`fetchRentReferences` avale ses erreurs** (`catch` → `return []`), donc une panne de source est
  indistinguable d'une absence de donnée. Le même motif que le point 3c, en plus discret.

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
- **Étiquettes en dur dans le popup de carte.** `useMapLayers` produit du français quelle
  que soit la langue de l'interface.

---

## Ordre d'attaque suggéré

1. Point 1 — c'est une donnée fausse qui pilote un filtre. Rien d'autre ne devrait passer avant.
2. Point 3 — sans cela, rien n'est démontrable.
3. Point 4 — conditionne le confort dès que le point 3 laisse passer des données.
4. Point 2 — résolu proprement par la phase 2 du plan, palliatif possible avant.
