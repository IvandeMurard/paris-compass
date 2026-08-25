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
- **« 1e arrondissement ».** `PropertyCard.tsx` compose `{arrondissement}{'e arrondissement'}`,
  ce qui rend « 1e » pour le premier au lieu de « 1er ». Relevé le 24 août en branchant la
  fiche locale, qui a dû se donner sa propre fonction (`arrondissementLabel`) pour ne pas
  ajouter une troisième orthographe. À unifier dans `src/i18n/`.
- **Les pièces de la chronologie restent en français sur la page anglaise.** `evidence` et
  `confidence_reason` viennent de la base, qui n'écrit qu'en français, et la fiche les relaie
  **verbatim** — les traduire à la volée serait réécrire la pièce, ce que `PLAN.md` §2.5
  interdit. Le vrai correctif est côté base : une clé de message par ligne, rendue dans la
  langue du lecteur, plutôt qu'une phrase toute faite. Chantier, pas bug.

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

## 7. Dépendances : react-router-dom passé en v7 — et un vérificateur de types qui ne vérifiait rien, le 15 août

Migration menée en deux temps vérifiables, comme demandé. D'abord les *future flags* v6
(`v7_startTransition`, `v7_relativeSplatPath`) posées sur `<BrowserRouter>` dans `src/App.tsx`
et éprouvées en navigateur — les huit usages du dépôt (`Link`, `Navigate`, `useLocation`,
`useNavigate`, `useParams`, plus `BrowserRouter`/`Routes`/`Route`), aucun routeur de données,
zéro avertissement. Puis le bump vers `react-router-dom@7.18.2`. Le prop `future` disparaît du
composant déclaratif en v7 — les deux comportements deviennent permanents, sans flag — et a été
retiré après le bump plutôt que laissé en `future={{}}` mort.

**Découverte en cours de route : `npm.cmd run typecheck` ne vérifiait rien.** Le script
lançait `tsc --noEmit` sur `tsconfig.json`, un tsconfig « solution » — `"files": []`, seulement
des `references` vers `tsconfig.app.json` et `tsconfig.node.json`. Un `tsc` invoqué sans
`--build` ne construit pas les projets référencés : il n'y a aucun fichier à la racine, donc
rien à vérifier, et la commande sort en succès quel que soit le contenu de `src/`. Vérifié en
injectant un prop inexistant sur `<BrowserRouter>` et un import inexistant depuis
`react-router-dom` : zéro erreur remontée dans les deux cas. Corrigé en passant le script à
`tsc --build` (`package.json`), qui construit réellement les deux projets référencés.
`*.tsbuildinfo` (cache incrémental de `--build`) ajouté au `.gitignore`.

**Ce que la réparation a fait remonter, sans rapport avec React Router.**
`src/services/opendata/scoring.ts:22` importe `NoiseEstimate` depuis `./types`, un type qui
n'y est plus exporté — vestige du 12 août, quand le bruit a rejoint `AreaScores` sous la forme
`{ score, label }` (voir `docs/REPRISE.md`). Import mort : invisible à l'exécution (import de
type, effacé par esbuild) et invisible en test (vitest ne type-check pas). Non corrigé ici,
sans rapport avec la migration et hors périmètre de cette session — signalé séparément.

> **Corrigé le 16 août** (§8). Il a fallu le faire en préalable à la montée de vite : tant que
> `typecheck` échouait, il ne pouvait pas servir à distinguer une casse nouvelle d'une casse
> déjà présente.

**Vulnérabilités : 9 → 7 côté `npm audit`, 8 → 5 côté Dependabot.** Les deux outils ne comptent
pas pareil — `npm audit` compte un chemin de dépendance par paquet affecté (`vite`, `esbuild`,
`vitest`, `vite-node`, `@vitest/mocker`, `@vitejs/plugin-react-swc`, `lovable-tagger`),
Dependabot déduplique sur l'avis réel. Vérifié après coup via `gh api
repos/IvandeMurard/paris-compass/dependabot/alerts` : `react-router-dom`, `react-router` et
`@remix-run/router` sont passés à `fixed` à l'heure du push (2026-08-15T13:43:23Z). Le
« 8 vulnérabilités » affiché par GitHub juste après le `git push` était un instantané pris
avant la fin du re-scan — trompeur sur le moment, pas sur le fond.

Il reste cinq alertes ouvertes, la même famille vite/esbuild/vitest déjà documentée dans
`docs/REPRISE.md` — sauf une qui mérite une nuance non notée jusqu'ici :

| GHSA | Paquet | Gravité | Portée réelle |
| --- | --- | --- | --- |
| GHSA-5xrq-8626-4rwp | `vitest` | critique | Serveur UI de Vitest (`--ui`), jamais lancé ici |
| GHSA-fx2h-pf6j-xcff | `vite` | haute | Contournement de `server.fs.deny`, serveur de dev |
| GHSA-4w7w-66w2-5vf9 | `vite` | modérée | Traversée de chemin dans les deps optimisées, serveur de dev |
| GHSA-67mh-4wv8-2f99 | `esbuild` | modérée | Le serveur de dev répond à n'importe quel site |
| GHSA-v6wh-96g9-6wx3 | `vite` | modérée | Voir ci-dessous — pas un pur « inatteignable » |

Les quatre premières visent strictement le **serveur de développement**, jamais exposé en
production sur un produit qui est un site statique — inatteignables par construction, comme
l'affirme `docs/REPRISE.md`.

**La cinquième (`GHSA-v6wh-96g9-6wx3`) ne vise pas le réseau mais le poste du développeur.**
Elle passe par `launch-editor`, la dépendance de Vite qui ouvre un fichier dans l'éditeur
depuis l'overlay d'erreur en dev. Sous Windows, un chemin UNC forgé dans ce lien peut faire
fuiter un hash NTLMv2 vers un serveur SMB distant au moment du clic. Toujours inatteignable par
un visiteur du site déployé — mais le vecteur (`npm run dev`, overlay d'erreur, clic sur un
lien malveillant, sur Windows) touche la machine du développeur, pas un serveur qu'on ne fait
jamais tourner. Aucune de ces conditions n'est réunie en usage normal ; ce n'est donc pas non
plus une urgence. Correctif = vite 8 pour les cinq, une majeure non tentée ici.

> **Faux, corrigé le 16 août** (§8). « vite 8 » était la version que proposait
> `npm audit fix --force`, c'est-à-dire la dernière majeure publiée — pas la plus petite qui
> corrige. Les cinq avis sont en réalité couverts par **vite 6.4.3** et **vitest 3.2.7**, deux
> majeures plus bas. Les cinq alertes sont fermées.

**`bun.lockb` régénéré** via le conteneur `oven/bun:1.1.38`, procédure de `docs/REPRISE.md`.
Les paquets nommés par les avis de sécurité portent exactement les mêmes versions dans les deux
verrous — `vite` 5.4.21, `esbuild` 0.21.5 (la copie imbriquée sous `vite`, pas celle hissée
pour `tsx`, qui en réclame une plus récente sans rapport avec l'avis), `vitest` et `vite-node`
et `@vitest/mocker` 2.1.9, `nanoid` 3.3.18 — ainsi que `react-router`/`react-router-dom`,
7.18.2 des deux côtés. `@vitejs/plugin-react-swc` et `lovable-tagger` divergent en version
mineure (résolution fraîche côté bun le 15 août, verrou npm non retouché depuis le 12) : sans
conséquence, leur propre vulnérabilité déclarée est entièrement héritée de `vite`, identique
dans les deux arbres.

> **Divergence résorbée le 16 août** (§8) : `package.json` épingle désormais ces deux paquets,
> les deux verrous portent les mêmes versions partout où un avis est en jeu.

---

## 8. Dépendances : vite 6 et vitest 3, les cinq dernières alertes fermées, le 16 août

Le récit complet — ce qui a été analysé, fait, vérifié, et le seul point de vigilance restant —
est dans `docs/REPRISE.md`, section « Vulnérabilités : 21 → 9 → 7 → 0 ». Ce qui relève du
diagnostic de code, et seulement lui :

**Le défaut de §7 corrigé.** L'import mort de `NoiseEstimate` supprimé de
`src/services/opendata/scoring.ts:22`. Une ligne, aucun effet à l'exécution — le type était
effacé au build de toute façon. Son intérêt est ailleurs : `npm.cmd run typecheck` repasse au
vert, et redevient donc un garde-fou utilisable. Réparé en §7, il échouait depuis, ce qui le
rendait inexploitable pour juger d'une migration.

**Aucun autre code n'a bougé.** Ni `vite.config.ts`, ni `vitest.config.ts`, ni un fichier de
`src/` : les deux configurations n'utilisent aucune interface supprimée par vite 6, et les 73
tests passent sans retouche sous vitest 3.

**Un angle mort de vérification, désormais couvert.** `npm.cmd run build` construit en mode
production, où `lovable-tagger` n'est pas monté (`mode === 'development' && componentTagger()`
dans `vite.config.ts`). Vérifier une montée de `vite` avec cette seule commande laisse le lien
avec Lovable non testé. `npm.cmd run build:dev` est le chemin qui l'exerce ; il fait
maintenant partie du contrôle.

---

## 9. Un millésime retenu par licence rendu comme un quartier sans commerces — corrigé le 16 août

**Le défaut.** `compass_scoring_context_within` rendait **zéro ligne, sans erreur ni marqueur**, à
un appelant anonyme demandant un millésime non redistribuable. Or zéro ligne est exactement ce
qu'elle rend pour un rayon réellement vide. Les deux cas étaient indistinguables.

**Mesuré sur la base locale**, Châtelet, rayon 800 m, avant correction :

| Rôle | 2017 | 2020 | 2023 |
| --- | --- | --- | --- |
| privilégié | 3 855 locaux | 3 825 | 3 059 |
| **anonyme** | **0, sans erreur** | **0, sans erreur** | 3 059 |

Il y a bien 3 855 commerces à cet endroit en 2017. Un appelant public en recevait l'équivalent
d'un désert commercial.

**Ce qui était correct, et qu'il ne faut pas défaire.** La licence *était* respectée : la
politique RLS de `20260809000008` fait son travail, la fonction est `security invoker`, et aucune
ligne 2017 ou 2020 n'a jamais fuité. Le défaut n'est pas une fuite — c'est l'inverse. La donnée
était bien retenue, puis mal rapportée.

**Pourquoi c'était grave en aval.** `NeighbourhoodContext.loaded` (`src/core/scoring.ts:57`)
distingue « rien ici » de « on ne sait pas », et **seul l'appelant peut trancher**. Un résultat
vide mais sans erreur faisait déclarer la couche `premises` comme chargée avec succès : le noyau
calculait alors l'indicateur de passage comme un **zéro mesuré**. Un agent aurait annoncé
« aucun commerce à proximité » sur la foi d'une licence non lue.

C'est le défaut §3.e transposé : Overpass répondant `200` avec un tableau vide faisait affirmer
une rue calme à partir d'une panne. Ici, un quartier mort à partir d'une restriction de licence.
Et c'est le défaut que `20260809000011` avait déjà corrigé pour `compass_address_timeline` — la
leçon avait été apprise sur une fonction et jamais reportée sur sa voisine.

**Trouvé** en auditant ce que les descriptions d'outils MCP disent de la réserve de licence.
Elles n'en disaient rien : le mot `withheld` n'apparaissait nulle part dans le serveur, alors que
les trois outils `score_location`, `compare_locations` et `explain_score` proposent
`vintage_year: 2017 | 2020 | 2023` dans leur schéma — ils *invitaient* l'agent à demander
précisément les années qu'il ne recevrait pas.

**Le correctif, en trois points.**

- `20260816000001_scoring_context_withholding.sql` : la fonction rend désormais **une ligne**
  portant `withheld = true` et aucune coordonnée, au lieu de zéro ligne. Zéro ligne reprend son
  sens unique — le rayon est vraiment vide. Le test d'appelant privilégié est **recopié
  littéralement** de `20260809000011` pour que les deux fonctions ne puissent pas diverger. RLS
  reste ce qui *applique* la retenue ; la fonction se contente de l'*annoncer*.
- `mcp-server/src/context.ts` : la retenue lève une erreur, ce qui la range dans `failures` au
  lieu de `loaded`. Le noyau rend alors `unavailable` avec son motif, et les trois outils
  remontent déjà `context_failures` à l'appelant.
- Les trois schémas d'entrée décrivent maintenant la réserve : seul 2023 est ODbL, 2017 et 2020
  reviennent indisponibles plutôt que nuls.

**Vérifié** contre la base locale, avec le vrai noyau, appelant anonyme :

| Millésime | Couche `premises` | `footfall` |
| --- | --- | --- |
| 2017 — avant | déclarée chargée | `0` (zéro mesuré) |
| 2017 — après | non chargée, échec consigné | `null` + « inconnue, pas absente » |
| 2023 — après | chargée | `65`, inchangé |

Rayon de 1 m sur 2023 : toujours zéro ligne et aucun marqueur — le vrai vide reste un vrai vide.

~~**Reste ouvert.**~~ **Clos le 24 août.** La migration est posée sur `dbefhvmyfmmhjeetdddu`
et la sérialisation PostgREST de `withheld` a été jouée par une vraie clé publiable, sans aucun
identifiant de base — ce que la vérification d'origine, passée par le pilote `pg`, ne couvrait
pas. Mesures dans `docs/REPRISE.md`, « La porte anonyme », et rejouables par
`npm.cmd run eval:anon`.

---

## 10. Une retenue de licence rendue comme un fait — `compass_premise_history`, corrigé le 24 août

**Le même défaut que le point 9, une quatrième fois, et sous sa forme la plus dure.** Les points
9 et son correctif frère de `20260817000001` ont couvert `compass_scoring_context_within` et
`compass_premises_within` ; `compass_address_timeline` l'était depuis `20260809000011`. La
quatrième fonction qui traverse `premise_observation`, **`compass_premise_history`, n'a jamais été
regardée** — elle est `security invoker`, ne lit pas `request.jwt.claims`, et **ne porte aucune
colonne `withheld`**.

Elle ne rend pas zéro ligne comme les trois autres : elle rend une ligne par millésime, et
remplit les colonnes manquantes par des valeurs par défaut. La retenue ne devient donc pas un
silence ambigu — elle devient **une affirmation fausse**.

**Mesuré le 24 août sur le distant**, local 54652, `60 QU ORFEVRES`, millésime 2017 :

| Chemin | `observed` | `is_vacant` | `activity_label` |
| --- | --- | --- | --- |
| privilégié | `true` | **`true`** | `Locaux Vacants` |
| **anonyme** | **`false`** | **`false`** | `null` |

Ce local **était vacant en 2017**. Un visiteur sans clé s'entend répondre qu'il n'a pas été
relevé cette année-là, *et* qu'il n'était pas vacant. Deux faits fabriqués à partir d'une licence
que personne n'a lue — et fabriqués précisément sur la vacance, qui est le sujet de
`docs/PLAN-ACTION-VACANCE.md`.

**Pourquoi c'est pire que le point 9.** Zéro ligne est un silence : l'appelant peut au moins
choisir de ne rien conclure. `observed = false` et `is_vacant = false` sont des réponses
positives, indiscernables d'un relevé réel. Aucun appelant, humain ou agent, ne peut s'en méfier.

**Ce qui limite la portée, sans l'annuler.** Aucun appelant expédié ne s'en sert : ni `src/` ni
`mcp-server/` n'appellent `compass_premise_history` (vérifié le 24 août). Mais elle est
`grant execute ... to anon` et répond en HTTP dès aujourd'hui, et la fiche de local de
`PLAN.md` §2.7 — le prochain appelant prévu — est exactement ce qui l'appellera.

**Trouvé** en rejouant la porte en anonyme pour `w0-deploy` : la sonde balayait les quatre
fonctions de licence, pas seulement celle du ticket.

~~**Pas corrigé ici.**~~ **Corrigé le 24 août par `20260824000001_premise_history_withholding.sql`**,
ticket `w0-history` (#51). Le correctif change le type de retour, donc il s'est posé comme
migration et engage tout appelant futur — raison pour laquelle il sortait du périmètre de
`w0-deploy`.

**Ce qui change.** Une colonne `withheld`, placée contre `observed` comme dans
`compass_address_timeline` — la fonction sœur la plus proche, une ligne par millésime pour un
local. `observed` devient **nul** et non faux quand le millésime est retenu ; toutes les colonnes
de contenu sont **nullées explicitement**, et non laissées vides par la jointure. Ce dernier point
n'est pas de la ceinture-et-bretelles : le bras A de la porte fait dire `anon` à une connexion
**privilégiée**, où RLS ne s'applique pas — sans ce nullage, I16 lirait du vrai contenu 2017 sur
une ligne marquée retenue. `changed_from_previous` se garde désormais d'un `observed` nul : `not
null` vaut nul, la branche du CASE ne se déclenchait pas, et la retombée comparait deux nuls avec
`IS DISTINCT FROM` — ce qui vaut **faux**, soit « rien n'a changé ici » affirmé depuis une licence.

~~`SECURITY INVOKER` est **conservé**, délibérément.~~ **Faux, et corrigé le jour même par
`20260824000002` : voir le point 12.** L'argument était que `compass_premise_history` ne lit que
`premise_observation`, donc que RLS suffirait à *appliquer* la règle et que la fonction n'aurait
qu'à l'*annoncer*. Cela tient pour un appelant `anon` et tombe pour un appelant `authenticated`,
que la politique RLS restreint et que le test de claim juge privilégié. `20260809000008` avait
écrit la bonne règle quinze jours plus tôt, dans le fichier d'à côté.

**Vérifié en comportement** — d'abord dans une transaction jamais validée contre le distant, puis
**en direct après la poussée**, par un appel PostgREST avec la seule clé publiable et aucun
identifiant de base. Local 54652, `60 QU ORFEVRES` :

| Chemin | Millésime | `withheld` | `observed` | `is_vacant` | `activity_label` |
| --- | --- | --- | --- | --- | --- |
| anonyme — avant | 2017 | *(colonne absente)* | `false` | `false` | `null` |
| anonyme — après | 2017 | `true` | **`null`** | **`null`** | `null` |
| anonyme — après | 2020 | `true` | `null` | `null` | `null` |
| anonyme — après | 2023 | `false` | `true` | `false` | `Antiquités` |
| privilégié — après | 2017 | `false` | `true` | `true` | `Locaux Vacants` |

La dernière ligne compte autant que les autres : le chemin privilégié est inchangé, et le local
est toujours vu vacant en 2017.

**Le couple d'invariants**, `I16` et `I17` de `eval/invariants.sql`, sur le patron de `I12`/`I13`
et `I14`/`I15` — l'un contre l'affirmation fabriquée, l'autre contre la retenue excessive.
**Éprouvés contre deux sabotages**, chacun dans une transaction annulée : une version qui pose le
marqueur mais garde les valeurs par défaut (I16 **échoue**, 20 lignes ; I17 reste au vert), et une
version qui retient tous les millésimes (I17 **échoue**, 2 lignes ; I16 reste au vert). Aucun des
deux n'est vide, et aucun ne couvre le défaut de l'autre.

**Et une sonde dans `npm.cmd run eval:anon`**, quatrième bras de la porte, sur les deux locaux
54652 et 5. Jouée contre la fonction défectueuse encore en ligne, elle **échouait** — même
signature que I14 en son temps.

**Posé sur le distant le 24 août**, ledger remesuré à **26**. Les deux portes rejouées derrière :
`npm.cmd run eval` rend 17/17 invariants, 24 baselines et 8 cas dorés ; `npm.cmd run eval:anon`
rend 9 contrôles. La composition de fiabilité ne bouge pas — **57,31 %** établi+corroboré, dérive
nulle sur les quatre niveaux — ce qui était attendu : la fonction n'a aucun appelant et ne nourrit
aucun chiffre publié.

> **Ce que le bras A n'aurait jamais pu trouver.** L'ancienne fonction ne lisait pas du tout le
> claim : faire dire `anon` à une connexion privilégiée lui rendait **tout le contenu**, et rien
> n'avait l'air anormal. Seule une vraie clé publiable, avec RLS derrière, montrait la ligne
> fabriquée. C'est l'argument le plus net pour l'existence du bras D — et il ne se déduit pas du
> code des trois autres fonctions, qui, elles, lisent le claim.

---

## 11. Une absence rendue comme une occupation — `is_vacant`, le 24 août

**Trouvé en corrigeant le point 10, et c'est le même défaut sans la licence.** Là où le point 10
fabrique un fait à partir d'une retenue, celui-ci en fabrique un à partir d'une **absence** — et il
est visible sur le **chemin privilégié**, donc il n'a jamais eu besoin d'un visiteur anonyme pour
se produire.

`compass_premise_history` calculait `coalesce(a.is_vacant, false)`. Quand le local ne figure pas
dans un millésime, la jointure ne rend rien, `a.is_vacant` est nul, et le `coalesce` répond
**`false`** : « ce local n'était pas vacant cette année-là », affirmé d'un local qui n'a pas été
relevé du tout.

**Mesuré le 24 août sur le distant** : **24 573 locaux** sur 85 418 sont absents du millésime 2023,
qui est `retail_only`. Chacun s'entendait dire qu'il n'était pas vacant en 2023. Exemple, local 5 :

| Millésime | `observed` | `is_vacant` — avant | `is_vacant` — après |
| --- | --- | --- | --- |
| 2017 | `true` | `false` | `false` |
| 2020 | `true` | `false` | `false` |
| 2023 | **`false`** | **`false`** | **`null`** |

**Pourquoi c'est la même faute.** Le point 9 le dit déjà pour une couche entière : « rien ici » et
« on ne sait pas » sont deux réponses différentes, et seul l'appelant peut trancher. Ici la
confusion porte sur la colonne dont `docs/PLAN-ACTION-VACANCE.md` fait le sujet du produit. Un
local sorti du périmètre commerce en 2023 n'est pas *non vacant* : il n'est pas relevé.

**Corrigé dans la même migration**, `20260824000001` : `is_vacant` est nul dès que le local n'est
pas observé, retenue ou pas. Le faire d'un côté et pas de l'autre aurait inscrit l'incohérence dans
le schéma — nul pour une licence non lue, faux pour une absence, à deux lignes d'écart, et un
lecteur futur l'aurait prise pour une doctrine.

**Portée élargie assumée.** Le ticket `w0-history` ne demandait que la retenue de licence. La
correction touche la même colonne, dans la même fonction réécrite, et n'a aucun appelant à casser
(ni `src/` ni `mcp-server/` n'appellent cette fonction — revérifié le 24 août). `I17` couvre les
deux moitiés, et la sonde du bras D aussi.

**Ce qui n'est pas traité ici.** `compass_premises_within` porte le même `coalesce(a.is_vacant,
false)`, mais dans une jointure **interne** sur `premise_observation` : le relevé existe toujours,
et le nul ne peut venir que d'un code d'activité absent de la nomenclature — que `I5` interdit par
ailleurs. Situation différente, hors périmètre, non modifiée.

---

## 12. La même retenue, annoncée comme une absence à l'appelant connecté — le 24 août

**Le correctif du point 10 n'a tenu que six heures, et il a raté la moitié du problème.**
`20260824000001` a rendu le chemin **anonyme** honnête et laissé le chemin **authentifié**
affirmer — avec, cette fois, un marqueur qui vouche activement pour le mensonge.

**La cause est un désaccord entre deux règles qui ne se regardaient pas.**

| | Qui est restreint |
| --- | --- |
| La politique RLS de `20260809000008` | `to anon, authenticated` |
| Le test d'appelant de `20260809000010` | tout ce qui n'est pas `anon` est **privilégié** |

Une fonction `SECURITY INVOKER` hérite des deux. Pour un appelant `authenticated`, le test de
claim conclut « privilégié » et pose donc `withheld = false` — *rien ne vous est caché* — pendant
que RLS retire silencieusement les lignes 2017 en dessous. La jointure ne trouve rien et
`observed` revient **`false`**.

**Mesuré le 24 août sur le distant**, contre `20260824000001` telle que déployée, local 54652,
avec `set local role authenticated` pour que RLS s'applique vraiment :

| Millésime | `withheld` | `observed` | `is_vacant` | Vérité |
| --- | --- | --- | --- | --- |
| 2017 | `false` | **`false`** | `null` | relevé, et **vacant** |
| 2020 | `false` | **`false`** | `null` | relevé, galerie d'art |
| 2023 | `false` | `true` | `false` | correct |

`withheld = false` est désormais une **dénégation explicite** : le point 10 a remplacé un silence
ambigu par une affirmation contresignée. Pour l'appelant anonyme le correctif tenait ; pour
l'appelant connecté il a empiré la lisibilité du défaut.

**Et la règle était écrite depuis le 9 août, dans le fichier d'à côté.** `20260809000008` décrit
ce défaut avant qu'il n'arrive, à propos de la fonction sœur :

> `compass_address_timeline` est `SECURITY INVOKER`, donc elle obéit à RLS. Avec la politique
> ci-dessus, un relevé 2017 ne joindrait tout simplement pas — et la fonction émettrait
> `observed = false`, c'est-à-dire « ce local n'a pas été relevé cette année-là ». C'est faux.
> [...] Donc la fonction devient `SECURITY DEFINER` : elle voit toutes les lignes et décide de ce
> qu'elle divulgue.

Ce paragraphe décrit `compass_premise_history` mot pour mot. Il était dans une migration que rien
n'obligeait à lire, et `20260824000001` a argumenté l'inverse dans son propre en-tête.

**Corrigé par `20260824000002_premise_history_definer.sql`, posée sur le distant le 24 août**
(ledger remesuré à **27**, `SECURITY DEFINER` confirmé en base) : la fonction passe `SECURITY
DEFINER`, voit toutes les lignes, et la divulgation redevient une décision qu'elle prend au lieu
d'un effet de bord de ce que la jointure a bien voulu rendre. Le correctif d'`is_vacant` du
point 11 est conservé — le brouillon dont vient ce raisonnement, lui, ne l'avait pas.

**La règle devient mécanique, `I18`** : une fonction `compass_*` qui porte une colonne `observed`
**doit** être `SECURITY DEFINER`. C'est un invariant **structurel** et non comportemental, et
délibérément : le lanceur pose `request.jwt.claims` sur une connexion privilégiée et n'émet jamais
`set local role`, donc **RLS ne s'applique jamais pendant qu'il tourne**. Ce défaut est invisible à
tout test de comportement que la porte sait exprimer. Mesuré : deux fonctions portent `observed`,
la requête rendait **une** ligne avant `20260824000002` et zéro après.

**Vérifié après la poussée**, sur le chemin qu'aucune porte ne sait atteindre — appelant
`authenticated` avec `set local role` pour que RLS s'applique vraiment, local 54652, 2017 :
`observed = true, is_vacant = true, « Locaux Vacants »`, là où la veille au soir la même requête
répondait `observed = false`. Et le pire cas du passage en `DEFINER`, où RLS ne protège plus rien :
l'appelant anonyme, par le claim seul **et** par HTTP avec la clé publiable, reçoit toujours
`withheld = true` et rien d'autre. Le local 5 reste lisible comme absent de 2023 pour l'appelant
connecté également.

Les deux fonctions `_within` restent `INVOKER` légitimement : elles n'ont pas de colonne
`observed`, donc RLS leur coûte des **lignes** et non la vérité.

**Trouvé** en lisant un brouillon non commité laissé dans le worktree de la session qui avait
découvert le point 10 — elle était arrivée à `SECURITY DEFINER` par ce même chemin, et n'a jamais
atterri. La leçon n'est pas sur SQL : **une session qui se termine sans pousser emporte son
raisonnement avec elle**, et le suivant refait le trajet ou, ici, prend le mauvais embranchement.

---

## 13. Une licence affirmée sur des données qui n'en relèvent pas — `scoreLocation`, le 24 août

**Corrigé le 24 août par `w0-provenance` (#10).** Le défaut était connu et écrit depuis le
15 août — `docs/PLAN.md` §4.1 le consigne comme l'un des « deux manques restants » du serveur
MCP — mais il n'avait jamais eu de numéro ici, et c'est le seul des treize points de cette page
à avoir été *documenté avant d'être diagnostiqué*.

**La forme.** `scoreLocation(point, index, origin)` prenait un `Origin` **unique** et le posait
sur les huit champs de `AreaScores`. Or `mcp-server/src/context.ts` assemble son contexte à
partir de **deux** sources : les aménités et les routes viennent d'Overpass, les locaux de la
BDCom de l'APUR via `compass_scoring_context_within`. Les deux appelants passaient
`OSM_ORIGIN(aujourd'hui)`. Donc, côté agent :

| Champ | Couche réellement lue | Ce qui était affiché |
| --- | --- | --- |
| `schools`…`transit`, `walkability` | Overpass | `OpenStreetMap via Overpass`, ODbL — **juste** |
| `noise` | Overpass | `OpenStreetMap via Overpass`, ODbL — **juste** |
| `footfall` | **65 % BDCom** + 35 % Overpass | `OpenStreetMap via Overpass`, ODbL — **faux** |

**Ce n'est pas une imprécision d'affichage, c'est une licence.** Un chiffre qui cite ODbL
autorise implicitement la rediffusion sous ODbL. Les millésimes 2017 et 2020 de la BDCom portent
une licence APUR que personne n'a lue, avec la mention explicite « ne pas rediffuser avant
vérification » ; le millésime 2023 est bien ODbL-1.0, mais l'appelant l'apprenait par accident.
Le champ `asOf` était pire encore : `new Date()`, soit **la date de la requête** posée sur un
relevé de terrain de **juin 2023**, trois ans d'écart annoncés comme frais du jour.

**Le front n'était pas menteur, seulement indistinct.** Ses trois couches sortent bien du même
instantané Overpass. C'est ce qui a fait durer le défaut : la signature était vraie là où elle
était le plus lue.

**Corrigé** en remplaçant le troisième paramètre par un `Origin` **par couche**
(`LayerOrigins`). Trois conséquences qui ne se déduisent pas du diagnostic :

- **La licence et la date du millésime BDCom se lisent dans `compass_vintages`**, jamais dans une
  constante du code. Mesuré sur le distant le 24 août par PostgREST en appelant anonyme : 2023 →
  `ODbL-1.0`, `as_of = 2023-06`, portée `retail_only` ; 2017 et 2020 → `custom`, `as_of` = leur
  année, portée `all_premises`. Si l'appel échoue, la couche des locaux est déclarée **non
  chargée** : un chiffre qui ne sait pas énoncer sa provenance ne s'affiche pas.
- **Le flux piéton nomme ses deux sources**, cumule les licences et porte la **plus ancienne**
  des deux dates. Un composé n'est jamais plus frais que son ingrédient le plus vieux.
- **`OSM_ORIGIN` passe de `ODbL` à `ODbL-1.0`**, l'orthographe de `bdcom_vintage.licence`. Sans
  cela le composé aurait annoncé `ODbL-1.0 + ODbL` — deux obligations là où il n'y en a qu'une.
  Aucun rendu du front n'affiche ce champ (`MeasuredOrigin` montre source et date, pas la
  licence), donc le changement ne se voit que dans les réponses MCP.

**La leçon, et c'est celle de la page entière sous une forme nouvelle** : les onze premiers
points portent sur une **absence** rendue comme un fait. Celui-ci porte sur une **attribution**.
`Measured<T>` rendait mécanique l'obligation de *porter* une source ; il ne pouvait rien contre
le fait d'en porter la mauvaise. Un type ne vérifie que ce qu'on lui donne à vérifier — ici, un
`Origin` unique lui semblait complet.

---

## 14. Le serveur MCP n'a jamais atteint son miroir Overpass principal — le 24 août

**Corrigé le 24 août.** Trouvé en voulant démontrer le critère de `w0-provenance`, pas en le
cherchant : le flux piéton restait `null` alors que la couche BDCom arrivait sans problème.

**La cause.** `overpass-api.de` répond **406 Not Acceptable** à une requête POST qui ne porte
pas d'en-tête `User-Agent`, et le `fetch` de Node n'en envoie aucun. Mesuré le 24 août, même
requête, même point, à la seconde près :

| En-têtes | Réponse |
| --- | --- |
| `Content-Type` seul | **406** |
| `Content-Type` + `User-Agent: paris-compass-mcp/0.1` | **200** |
| `Content-Type` + `Accept: application/json` | **406** |

Donc `mcp-server/src/overpass.ts` échouait **systématiquement** sur son premier miroir et
tournait depuis toujours sur les deux suivants — plus lents, et tous deux en panne ce jour-là.
`src/services/opendata/overpass.ts` n'a jamais eu le problème : le navigateur pose son propre
`User-Agent`. C'est un défaut que seul le chemin agent pouvait porter.

**Pourquoi il est resté invisible.** La boucle sur les miroirs ne gardait que `lastError`. Un
406 permanent sur le premier miroir disparaissait donc derrière le 500 passager du troisième,
et le message remonté à l'appelant accusait un miroir en bonne santé la veille. Les trois
erreurs sont désormais rendues, endpoint par endpoint. C'est cette ligne-là qui a coûté le
temps, pas le 406 : le diagnostic était perdu à chaque fois que les trois miroirs échouaient.

**Deux leçons qui ne sont pas sur HTTP.**

- **Un client qui essaie N serveurs doit rendre N erreurs.** Réduire à la dernière transforme
  une panne permanente en panne intermittente aux yeux de celui qui lit.
- **Le chemin agent n'hérite pas des politesses du navigateur.** Tout ce que le navigateur pose
  gratuitement — `User-Agent`, cookies, `Origin` — est absent côté serveur, et un service
  public a le droit de s'en formaliser. `mcp-server/` est un consommateur *séparé* de
  `src/core`, ce qui est un choix d'architecture assumé ; ce défaut en est la contrepartie.

**Vérifié après correctif**, contre le distant `dbefhvmyfmmhjeetdddu` et les vrais miroirs :
`explain_score` rend `groceries = 100`, `noise = 51` et `footfall = 97` à Montorgueil sur 800 m.

---

## 15. Une conclusion affirmée à partir de millésimes retenus — `compass_address_timeline`, le 24 août

**Ouvert**, issue [#54](https://github.com/IvandeMurard/paris-compass/issues/54), le 24 août.
Trouvé en branchant la fiche locale (`w0-fiche`, #8), et **hors du périmètre de ce ticket** :
le correctif est dans le SQL, la fiche est de l'interface. Consigné ici plutôt que corrigé à
la volée.

Sur un millésime au périmètre `retail_only` — c'est le cas de 2023 — une ligne
`observed = false` porte cette justification, écrite dans `20260809000011` :

> Millésime restreint aux commerces : une absence signifie « plus un commerce », pas « vacant ».

**La phrase est juste pour un appelant privilégié, et trop forte pour un appelant anonyme.**
« Plus un commerce » suppose que le local en était un **avant**. Or c'est exactement ce que la
même réponse retient : pour un appelant anonyme, 2017 et 2020 reviennent `withheld = true`,
`observed = null`, « ni le contenu ni l'existence ». La ligne affirme donc une transition à
partir de deux millésimes dont elle vient de dire qu'elle ne dirait rien.

C'est la famille des points 9 à 12, dans une variante nouvelle : non plus une **retenue rendue
comme un fait**, mais une **conclusion tirée par-dessus une retenue**. Le mécanisme de
divulgation est correct ; c'est la prose qui va plus loin que ce qu'elle laisse voir.

**Mesuré le 24 août**, distant `dbefhvmyfmmhjeetdddu`, clé publiable seule, local 54653 :

| Millésime | `observed` | `withheld` | `evidence` |
| --- | --- | --- | --- |
| 2017 | `null` | `true` | « ni son contenu ni son existence » |
| 2020 | `null` | `true` | « ni son contenu ni son existence » |
| 2023 | `false` | `false` | « une absence signifie « plus un commerce » » |

**Ce que fait la fiche en attendant.** `src/i18n/timelineText.ts` rend `observed = false` par
**« Non observé »** et rien d'autre — c'est le piège que `w0-fiche` nommait, et il est tenu et
testé. `evidence` reste affiché **tel quel**, sous l'étiquette « Justification de la source » :
c'est la pièce, et la réécrire serait le geste qui a produit les deux erreurs de `PLAN.md`
§2.5. L'interface ne conclut donc pas ; elle montre que la source conclut.

**Ce qu'il faudrait trancher**, et qui demande une décision plutôt qu'un correctif mécanique :
la phrase doit-elle dépendre du privilège de l'appelant, comme les autres colonnes de cette
fonction, ou faut-il la réduire à ce qu'un lecteur peut recouper dans les deux cas ? Le second
choix est le plus simple et le plus proche de la règle uniforme retenue en `20260809000011`.

> **Elle est aussi dans `PLAN.md`**, §« Changement d'activité n'est pas changement de
> propriétaire » : « Une disparition en 2023 signifie « ce n'est plus un commerce », jamais
> « c'est vacant » ». Écrite le 9 août, avant que la retenue de licence n'existe. Corriger le
> SQL sans corriger `PLAN.md` laisserait la doctrine contredire la base.

---

## 16. Un point hors corpus rendu comme un quartier sans commerces — `score_location`, **corrigé le 25 août**

Le défaut du point 9 dans sa variante **géographique** : là où 9 à 12 venaient d'une couche
retenue par licence, celui-ci vient d'une couche **absente parce que le corpus s'arrête**. La
forme est la même — un vide lu comme un zéro — et la conséquence aussi : un chiffre fabriqué qui
porte une source.

**Mesuré le 24 août 2026** contre `dbefhvmyfmmhjeetdddu`, à travers le serveur MCP, appelant
anonyme, point **(48,7 · 2,2)** — Massy/Palaiseau, à environ 18 km du 1er arrondissement :

| Outil | Réponse |
| --- | --- |
| `find_premises`, rayon 500 m | `returned: 0`, `total_matched: 0` — **honnête** |
| `score_location`, rayon 800 m | `footfall: 22`, `missingReason: null`, `context_failures: null` |

Le `footfall` de 22 est cité `« APUR BDCom 2023 + OpenStreetMap via Overpass »`, licence
`ODbL-1.0`, `asOf: 2023-06`. **Aucun local BDCom n'a pourtant été lu**, puisqu'il n'y en a aucun
à cet endroit : le corpus est Paris intra-muros. La formule de `src/core/scoring.ts` est
`saturating(occupiedNearby, 90) × 0,65 + transit × 0,35` ; avec `occupiedNearby = 0` et
`transit = 62`, elle rend `62 × 0,35 = 21,7 → 22`. Le chiffre est donc **entièrement** dérivé
d'OpenStreetMap, et il nomme l'APUR comme co-source d'une contribution nulle.

### Pourquoi le garde-fou existant ne l'attrape pas

`context.ts` sait déjà refuser une couche absente, et le fait dans les deux autres cas :

| Cause | Ce que fait la requête | `loaded` | `footfall` |
| --- | --- | --- | --- |
| Millésime retenu par licence | rend une ligne `withheld` → `fetchPremises` **lève** | sans `premises` | `null` + raison |
| Base injoignable | `fetch` **échoue** | sans `premises` | `null` + raison |
| **Point hors corpus** | **réussit, zéro ligne** | **avec `premises`** | **22** |

La troisième ligne est le défaut. La requête a réussi, donc la couche compte comme chargée,
donc `scoreLocation` calcule. C'est exactement la phrase du `README.md` du serveur MCP à propos
de `compass_premises_within` — « un vrai vide reste un vrai vide » — retournée contre elle-même :
ici le vrai vide n'en est pas un, c'est une absence de couverture.

### Ce qui le rend atteignable

La boîte de coordonnées que les outils acceptent est **48,6–49,1 / 2,1–2,5**, soit une bonne
part de la petite couronne. Les descriptions zod annoncent pourtant « Paris intra-muros
(roughly 48.81–48.91) » : la boîte est délibérément plus large que la promesse, et rien entre
les deux ne refuse ni ne réserve. Un agent qui reçoit `footfall: 22` avec une licence ODbL et une
date de recensement n'a aucun moyen de se méfier — c'est le critère de `Measured<T>`, satisfait
dans la forme et vide sur le fond.

### Ce qu'il faut trancher avant de corriger

Deux corrections possibles, et le choix n'appartient pas au ticket qui a trouvé le défaut :

1. **Refuser le point.** Resserrer la boîte zod sur l'emprise réelle de Paris. Simple, mais la
   boîte englobe encore Boulogne et Vincennes, et un rectangle ne décrit pas une commune.
2. **Retirer la couche.** Traiter « zéro local rendu » comme une couche non chargée, donc
   `footfall: null` avec une raison. Correct partout, mais indiscernable d'un rayon
   réellement désert dans Paris — le contre-test du `README.md`, à ne pas casser.

Une troisième voie existe et coûte une migration : demander à PostGIS si le point tombe dans un
des 80 quartiers, ce qui est la seule définition non arbitraire de « dans le corpus ».

### Corrigé le 25 août — voie 3, plus la voie 1 en hygiène

**[#55](https://github.com/IvandeMurard/paris-compass/issues/55) fermée.** La décision a été
prise après mesure : les voies 1 et 2 sont l'une insuffisante et l'autre fausse.

**La voie 1 seule ne corrige rien.** Le rectangle le plus serré autour de Paris —
**48,8156–48,9022 / 2,2241–2,4698**, `ST_Extent` des 80 quartiers, mesuré le 25 août — contient
encore Boulogne-Billancourt (48,835 · 2,240), Levallois, Saint-Mandé et Montreuil. Elle ne fait
que rétrécir le défaut à l'anneau collé au périphérique, c'est-à-dire là où l'erreur est la plus
vraisemblable. Retenue quand même, mais **comme hygiène de schéma** : les descriptions zod
annonçaient « Paris intra-muros » pendant que la boîte acceptait 48,6–49,1.

**La voie 2 aurait détruit une information vraie.** Traiter « zéro ligne » comme une couche
absente est plus simple et faux : mesuré le 25 août, le **Bois de Vincennes** (48,828 · 2,440)
est dans le quartier Picpus et porte **zéro local BDCom dans 400 m**. C'est un vrai zéro.

**Voie 3, en migration `20260825000003`.** `compass_scoring_context_within` teste
l'appartenance aux 80 polygones de `quartier` et rend une **ligne-marqueur `out_of_corpus`** —
exactement la forme que `20260816000001` avait donnée à `withheld`. `context.ts` lève dessus,
la couche est retirée, `footfall` revient inconnu avec sa raison. Les trois réponses sont
désormais distinctes :

| Situation | Réponse |
| --- | --- |
| Millésime retenu | ligne `withheld` → `footfall: null`, « licence non lue » |
| **Point hors corpus** | **ligne `out_of_corpus`** → `footfall: null`, « hors de la zone recensée » |
| Dans le corpus, rayon vide | **zéro ligne** → `footfall` calculé — le Bois de Vincennes n'a pas de commerces |

L'ordre des deux tests porte du sens : la retenue de licence passe **avant** le test de corpus,
sans quoi une réponse « hors zone » sur un millésime retenu divulguerait que la zone, elle,
aurait répondu.

**Démontré des deux côtés**, contre le distant, appelant anonyme :

| Contrôle | Point | Résultat |
| --- | --- | --- |
| `E11` | Boulogne-Billancourt | `footfall = null` + raison — plus de chiffre fabriqué |
| `E12` | Bois de Vincennes | `footfall = 0` — le vrai zéro survit |
| `I19` / `I20` | les deux mêmes | zéro ligne, porte au vert |

Le contre-test n'est pas décoratif : c'est lui qui interdit le correctif paresseux. `E11` seul
serait passé au vert avec la voie 2, qui est fausse.

**Le front n'était pas concerné** : `src/` n'appelle `compass_scoring_context_within` nulle
part — il appelle `compass_premises_within` et `compass_address_timeline`, laissées intactes par
le correctif. Le défaut était atteignable par l'agent, qui est le second ICP de `PERIMETRE.md`
§8 — donc il comptait.

---

## 17. Un chargeur qui ne pouvait tourner qu'une fois — `bdcom.ts`, corrigé le 25 août

Trouvé en rejouant les quatre chargeurs pour `w0-cron` (#6), et **il invalidait la prémisse du
ticket** : « les scripts sont idempotents mais rien ne les rejoue » était faux pour BDCom, qui
n'était pas rejouable du tout.

`scripts/ingest/bdcom.ts` vidait la nomenclature avant de la réécrire :

```ts
await client.query("delete from public.bdcom_activity")
```

Or `premise_observation.activity_code` référence `bdcom_activity.code`. **Mesuré le 25 août**
contre le distant chargé :

```
ÉCHEC — update or delete on table "bdcom_activity" violates foreign key constraint
        "premise_observation_activity_code_fkey" on table "premise_observation"
```

### Pourquoi personne ne l'avait vu

L'ordre de `main()` le cachait exactement une fois. Au **premier** chargement, la nomenclature
s'écrit *avant* la promotion : `premise_observation` est encore vide, rien ne référence les
codes, le `delete` passe. À partir du **second**, la table est peuplée par l'exécution
précédente et le `delete` échoue — donc toute la transaction.

Le chargement du 15 août était un premier chargement. Le défaut attendait le second, qui n'a
eu lieu que le 25.

### Le correctif, et pourquoi ce n'est pas seulement une question d'idempotence

Le `delete` est supprimé, et les deux insertions passent en `on conflict (code) do update`.
Mais le fond est plus simple que l'idempotence : **une entrée de nomenclature que des relevés
référencent ne doit pas pouvoir disparaître.** La supprimer orphelinerait des relevés réels —
ou, avec une cascade, les effacerait. Un code devenu inutilisé coûte une ligne et ne trompe
personne ; un code manquant emporte des observations avec lui.

Le `do update` a une seconde vertu : un code vu d'abord en 2017/2020 ne porte qu'un
regroupement à 8 postes, et il est promu à la hiérarchie complète le jour où le service 2023 le
publie.

### Ce qui le démontre

Rejoué immédiatement après le correctif, contre le distant, il rend **exactement les mêmes
chiffres** qu'au 15 août — 84 031 relevés en 2017, 83 399 en 2020, 60 845 en 2023, 85 418
locaux distincts, 228 275 relevés au total. L'idempotence n'est plus supposée : elle est
mesurée sur deux exécutions successives.

> **Et la table de fraîcheur a tenu sa promesse par accident.** L'exécution ratée n'a rien
> écrit : `compass_source_freshness()` rendait toujours `bdcom` en « jamais chargé » juste
> après l'échec. C'est la garantie que `20260825000001` doit offrir — une exécution ratée ne
> rajeunit rien — démontrée par un vrai échec plutôt que par un test fabriqué.

### Le second défaut du même fichier : la promotion dépendait de l'ordre de chargement

Trouvé juste après, par la porte d'évaluation, et **de la même famille** : un chargeur qui ne
rend pas la même base selon qu'il tourne sur une base vierge ou sur une base pleine.

Le drapeau `ordre_address_conflict` — posé sur un relevé dont l'`ordre` BDCom a été réattribué
à une autre adresse — se calculait **pendant** chaque promotion, contre l'état *courant* de
`premise_location` :

```sql
when l.ordre in (select ordre from public.premise_location group by ordre having count(*) > 1)
```

Au premier chargement, la passe 2017 ne voyait pas encore les doublons que 2020 et 2023
allaient créer : seul le dernier millésime finissait marqué. Au rechargement, la table étant
déjà pleine, les trois l'étaient.

| | 2017 | 2020 | 2023 | total |
| --- | --- | --- | --- | --- |
| chargement initial, 15 août | 0 | 0 | 74 | **74** |
| rechargement, 25 août | 73 | 73 | 74 | **220** |

**Les deux chiffres sont vrais et ne mesurent pas la même chose.** Il y a bien **74 identifiants
réattribués** — c'est une propriété du corpus, stable — et ils touchent **220 relevés**. Le
métrique s'appelait `identifiants_reattribues` mais sa requête comptait des *relevés* : les deux
ne coïncidaient que par l'artefact ci-dessus.

Corrigé des deux côtés. Le drapeau se pose désormais **après** les trois promotions, en une
passe globale, idempotente et indépendante de l'ordre. Et la requête de
`eval/baselines/ingestion.json` compte `count(distinct l.ordre)`, ce que son nom annonce : elle
rend **74** quel que soit l'ordre de chargement, et la valeur gelée n'a pas eu à bouger.

> **Ce que ça corrige dans l'en-tête de `bdcom.ts`** : « Re-running yields the same database »
> était faux deux fois — sur la nomenclature, qui empêchait tout rechargement, et ici, où le
> rechargement réussissait mais produisait une base différente. C'est le second cas le plus
> instructif : rien n'échouait.

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
