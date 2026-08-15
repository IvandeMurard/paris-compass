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

## Points mineurs

- ~~**Deux lockfiles.** En garder un.~~ **Tranché le 12 août dans l'autre sens : les deux
  sont conservés et *alignés*.** Lovable construit avec bun, la machine locale avec npm ;
  supprimer l'un aurait cassé une des deux chaînes. Ils sont vérifiés identiques paquet par
  paquet. Procédure de régénération dans `REPRISE.md` — bun ne tourne pas sur ce poste
  (Windows ARM64), elle passe par un conteneur `oven/bun`.
- ~~**Étiquettes en dur en français** (`CATEGORY_LABELS`, `premiseTitle`).~~ ~~**Accord
  grammatical** — « ancien Boulangerie ».~~ **Corrigés le 15 août, à la racine.**

  Le défaut était architectural : un *service* fabriquait des phrases d'affichage. `Premise`
  porte désormais `naming`, les valeurs OpenStreetMap brutes, et `src/i18n/premiseName.ts`
  les rend dans la langue du lecteur. L'adresse suit la même règle — `address` devient
  `string | null`, et c'est l'interface qui formule l'absence.

  L'accord est traité pour de bon : la table des métiers porte le **genre**, donc
  « ancienne boulangerie » et « ancien restaurant ». Un métier inconnu est affiché tel quel,
  sans article inventé. **11 tests**, dont la faute d'origine mot pour mot.

  La recherche textuelle porte maintenant sur les valeurs source et non sur le titre rendu :
  une requête doit trouver le même local quelle que soit la langue de l'interface.
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
  *Ironie relevée le 12 août :* `compass_premises_within` renvoie déjà `total_matched`
  **précisément pour corriger ce défaut** — le commentaire de la migration le dit — mais
  aucun code du front n'appelle cette fonction.
- ~~**Étiquettes en dur dans le popup de carte.**~~ **Corrigé le 15 août.** `useMapLayers`
  lit `useLocale`, et `locale` entre dans les dépendances de l'effet — le HTML des popups
  étant construit une fois, changer de langue doit reconstruire les couches, sinon les
  popups gardent la précédente. Les valeurs OpenStreetMap qui y entrent sont désormais
  **échappées** : ces popups sont des chaînes HTML, là où React protège partout ailleurs.

---

## 5. Trois filtres qui ne filtrent pas — relevé le 12 août, **corrigé le 15**

Découverts en inventoriant `src/`, tous trois corrigés ensemble avec le harnais de test qui
manquait. Ce qui suit garde le diagnostic d'origine, parce que la cause commune vaut plus
que les symptômes.

**5.a — Les cinq curseurs de minimum d'aménité sont inertes.** *C'est un vrai bug, pas un
oubli de câblage.* `sidebar/AccessibilityMetrics.tsx:75` appelle
`setAmenityScores((prev) => ({ ...prev, [name]: value[0] }))` — une **fonction de mise à
jour** — alors que `FiltersProvider.updateAmenityScores` attend un **objet** et fait
`{ ...prev.amenityScores, ...scores }`. Étaler une fonction ne produit aucune propriété
énumérable : l'état ne bouge jamais. Le défaut est masqué parce que la prop est typée
`(value: any) => void`, ce qui empêche TypeScript de le voir.

**5.b — Les sept cases d'aménités ne sont jamais lues.** `filters.selectedAmenities` est
bien basculé et stocké, mais `FiltersProvider.matches()` ne le consulte pas. Les valeurs des
cases (« Metro Station », « Park »…) ne correspondent d'ailleurs à aucune catégorie connue du
noyau — il faudra les aligner sur `AmenityCategory` avant de les brancher.

**5.c — Les vingt cases d'arrondissement sont décoratives.** `sidebar/BasicFilters.tsx:45-57`
les rend sans `checked`, sans `onCheckedChange`, sans état.

**La cause commune est structurelle** : `vitest.config.ts` fixe `include: ['src/**/*.test.ts']`
et `environment: 'node'`, donc **aucun `.tsx` n'est testable** et `FiltersProvider.matches`
— où vivent ces trois défauts — n'a aucun test. Corriger les filtres sans ouvrir cette zone
aveugle laisserait la prochaine régression tout aussi invisible.

### Ce qui a été fait le 15 août

**La règle a quitté le `.tsx`.** `matchesPremise` vit désormais dans
`src/providers/matchPremise.ts`, un module pur — même déplacement que `figureText.ts`, et
pour la même raison : le rendre atteignable par un lanceur qui ne sait pas rendre de
composant. **19 tests** le couvrent, dont un par défaut ci-dessus. Aucune dépendance
ajoutée : pas de jsdom, pas de bibliothèque de rendu.

**5.a — corrigé à la racine, pas au symptôme.** Le site d'appel passe maintenant un patch
(`{ [name]: value[0] }`) et la prop est typée `(scores: Partial<AmenityScore>) => void`. Le
`any` disparaît : la même faute ne compilerait plus.

**5.b — supprimé plutôt que câblé.** Les sept cases promettaient de filtrer sur des
catégories dont Compass n'a **aucune donnée** — parking disponible, centre commercial,
quartier de restaurants. Les câbler aurait exigé soit d'inventer une correspondance avec les
cinq catégories réelles, soit de promettre des données inexistantes. Un filtre qui ne repose
sur rien est le même défaut que le zéro à la place d'une absence. `AmenitiesList.tsx`,
`selectedAmenities` et les sept clés i18n devenues orphelines sont retirés ; les cinq
curseurs, eux, portent les catégories que le noyau mesure vraiment.

**5.c — câblé, parce que la donnée existe.** `premise.arrondissement` est dérivé du code
postal OSM, donc le filtre repose sur une vraie colonne. Réserve tenue et testée : un
arrondissement **inconnu n'exclut jamais** — OSM omet souvent le code postal, et exclure
reviendrait à affirmer que le local est ailleurs.

**Code mort retiré au passage** : `QualityIndicator.tsx` (version pré-provenance de la
carte, que quelqu'un aurait fini par réutiliser), `usePropertyNotifications.ts`,
`typedSupabaseQuery`, `reverseGeocode`. `isReliable` est conservé : il appartient au
vocabulaire de `provenance.ts` que le serveur MCP consommera.

---

## 6. Deux rendus, deux comportements — corrigé le 15 août

Les popups Leaflet ne peuvent pas rendre `MeasuredScore` : ils sont construits en HTML brut,
hors de React. Ils **réimplémentaient donc ses règles**, et moins bien. `outOf100` savait
qu'une valeur absente s'écrit « n/d » et qu'une estimation se signale, mais ignorait qu'une
`note` l'emporte sur la formulation générique, et ne disait jamais *pourquoi* la valeur
manquait. Deux rendus, deux comportements, dont un discrètement plus pauvre.

`describeFigure` décide désormais pour les deux ; seul le balisage diffère. La réserve
devient un `title` plutôt qu'un lien — un popup n'est pas un endroit d'où l'on navigue.

Le module a suivi : `figureText.ts` passe de `components/` à `i18n/`, à côté de
`premiseName.ts`. Il n'appartenait plus aux composants dès lors qu'un hook le consomme, et
les deux modules font la même chose — décider d'un affichage, sans JSX, testables sans DOM.

**Une divergence plus discrète corrigée au passage.** `walkabilityColor` portait ses propres
seuils — 80/60/40/**20** — quand `scoreLabel` en publie quatre, 80/60/40. La carte et la
fiche se contredisaient : un score de 30 et un score de 10 formaient un seul libellé sur la
fiche et deux couleurs sur la carte, et **le seuil de 20 n'apparaissait dans aucune
méthodologie**. La couleur se lit maintenant depuis `scoreLabel` : une seule échelle, celle
qui est publiée.

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
