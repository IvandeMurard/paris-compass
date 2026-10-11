# [P0] w6-fiche-robuste — La fiche plante quand la source tombe, et le refus qu'elle devait montrer meurt avec elle

**ID** `w6-fiche-robuste` · **vague 6** · **P0**
**Dépend de** `w6-contexte`
**Sources** — *aucune source de données nouvelle*

## Pourquoi

**Mesuré le 13 septembre 2026, entre 16 h 05 et 16 h 30, sur `https://paris-compass.lovable.app`,
en visiteur anonyme.** Deux adresses, le parcours complet accueil → adresse → fiche :

| | `/contexte/rue-de-bretagne-paris` | `/contexte/avenue-daumesnil-paris` |
| --- | --- | --- |
| « Lecture du quartier en cours… » | 2 min 25 s | 2 min 20 s |
| État final | écran d'erreur | écran d'erreur |

L'écran d'erreur porte : `Cannot read properties of undefined (reading 'layerPointToLatLng')`.
`layerPointToLatLng` est une méthode de `L.Map` : c'est `ContextMap` qui meurt, et la frontière
d'erreur emporte **toute la page** — verdict, constats, bloc des trous.

**La chaîne de cause, maillon par maillon, chacun mesuré.**

1. **Overpass rend HTTP 504.** Mesuré hors navigateur, en direct :
   `POST https://overpass-api.de/api/interpreter` avec `[out:json][timeout:10];node(48.862,2.361,48.864,2.363);out count;`
   → **504 en 5,1 s, 695 octets, `Content-Type: text/html`, aucun en-tête `Access-Control-Allow-*`.**
   Le navigateur lit l'absence d'en-tête comme un blocage CORS et journalise
   *« has been blocked by CORS policy »*. **C'est une panne amont, pas une politique** — la
   question laissée ouverte par `#146` est tranchée, et la direction de l'erreur compte : un
   miroir surchargé reviendra, une politique aurait demandé un autre plan.
2. **Trois miroirs, 70 s de délai chacun** (`src/services/opendata/overpass.ts`, `timeoutMs: 70000`,
   `OVERPASS_ENDPOINTS` à trois entrées). D'où les 2 min 20 avant que la main revienne.
3. **Puis `ContextMap` plante.** `L.map()` puis `instance.fitBounds(circle.getBounds())` sur un
   objet Leaflet dont la carte n'est pas montée.

## Le point de doctrine qui décide

**La branche de refus est inatteignable exactement dans le cas qu'elle a été écrite pour couvrir.**

`src/hooks/useAddressContext.ts` porte cette phrase dans son en-tête, à propos du chemin où
Overpass ne répond pas :

> *« It is also the only path on which the browser can reach the refusal branch of
> `composeVerdict`, since the Overpass snapshot otherwise carries all three layers or none. »*

Le noyau est juste : le `catch` rend un contexte `loaded: []` et un `withheldBy` à
`source_injoignable` pour chaque couche, précisément pour que le verdict refuse et que le bloc
« ce que Compass ne sait pas ICI » nomme la panne. **Ce raisonnement est correct et il n'atteint
jamais l'écran** : la page meurt avant de le rendre.

C'est `#54 w0-conclusion` retourné. Le produit avait appris à ne pas conclure par-dessus une
retenue ; il n'a pas appris à **survivre** à celle-ci.

**Et 2 min 20, ce n'est pas une lenteur, c'est une absence.** Aucun preneur n'attend deux minutes
devant une ligne de chargement. Le délai doit être borné par ce qu'un humain tolère, pas par ce
qu'un miroir met à expirer.

## Comment

**Trois gestes, et le troisième est le livrable au sens de `CLAUDE.md`.**

1. **`ContextMap` ne peut plus tuer la fiche.** Une carte d'appui qui ne sait pas se dessiner est
   un constat manquant, pas une panne de page. Deux directions possibles, à trancher sur pièce :
   la frontière d'erreur descend autour de la carte, ou `ContextMap` refuse de se monter quand il
   n'a pas de bornes utilisables. La seconde est préférable — une garde vaut mieux qu'un filet.
2. **Le délai est borné pour l'écran.** Trois miroirs à 70 s servent la carte libre de `/carte`,
   où l'utilisateur a demandé des données OSM et peut attendre. La fiche a un autre contrat : elle
   doit rendre son verdict ou son refus dans un délai lisible. Le budget d'attente appartient donc
   à l'appelant, pas au client HTTP.
3. **Le refus est démontré par contre-preuve, à l'écran.** Miroirs injoignables, la fiche rend le
   bloc des trous avec `source_injoignable` nommé ; miroirs rétablis, elle rend le verdict. Les
   deux sens, sinon la garde n'est pas prouvée.

## Fait quand

1. **Miroirs Overpass bloqués dans le navigateur**, `/contexte/rue-de-bretagne-paris` rend le bloc
   « ce que Compass ne sait pas ICI » avec la panne nommée, **et aucun écran d'erreur**.
2. **Le délai avant ce bloc est borné et mesuré**, pas subi : le nombre est écrit dans le ticket de
   clôture, avec la méthode qui l'a mesuré.
3. **Contre-preuve dans l'autre sens** : miroirs rétablis, la même adresse rend un verdict composé.
   Une garde qui reste verte quand la source revient ne garde rien.
4. **Le plantage a son test**, hors navigateur : `ContextMap` monté sans bornes utilisables ne jette
   pas. Le test échoue sur le code d'aujourd'hui — sinon il ne teste pas ce défaut.

**Ce que ça ne rattrape pas.** Ce ticket rend la fiche **survivable**, pas **utile** : quand
Overpass tombe, elle ne dira plus rien de faux, mais elle ne dira presque rien. Ce qui la remplit
quand même est `w6-fiche-corpus`, et les deux ne se remplacent pas. Et rien ici ne surveille la
page dans la durée — c'est `w1-porte-page`.

## Hors périmètre

Pas de reprise de la carte libre `/carte`, pas de changement de formule de scoring, aucune source
nouvelle, aucun cache côté base. Le découplage corpus/OSM appartient à `w6-fiche-corpus`.

Voir [`w6-contexte.md`](./w6-contexte.md), [`w6-fiche-corpus.md`](./w6-fiche-corpus.md),
[`w1-porte-page.md`](./w1-porte-page.md).

---

## Fait le 13 septembre 2026

### 1. La chaîne de cause avait un maillon de trop, et c'est ce qui a changé le travail

L'énoncé lit le plantage comme le troisième maillon d'une panne amont : 504 → trois miroirs à
70 s → `ContextMap` meurt. **Le troisième maillon ne tient à aucun des deux premiers.**

`ContextMap` créait sa carte par `L.map(node, options)` **sans vue**. Une carte Leaflet qui n'a
jamais reçu de `setView` n'est pas « chargée », et `Map.addLayer` ne pose pas `layer._map`
lui-même : il appelle `this.whenReady(layer._layerAdd, layer)`, qui sur une carte non chargée
s'abonne à un événement `load` que personne n'émettra. Le cercle restait donc sans carte, et
`Circle.getBounds()` — qui fait `this._map.layerPointToLatLng(...)` — jetait. Miroirs debout ou
non, la carte était dessinée dans les deux cas, **donc le plantage était inconditionnel**.

**Démontré, pas déduit.** Dans Chrome sans tête, contre le build de `3cb9b5d`, avec un
instantané Overpass **réel rejoué** — 3 744 éléments, 1 215 572 octets, enregistrés le jour même
depuis `overpass.private.coffee` pour la boîte exacte que la fiche envoie — la page meurt quand
même, et le corps de l'écran d'erreur porte mot pour mot
`Cannot read properties of undefined (reading 'layerPointToLatLng')`.

C'est aussi ce qui rend le critère 3 utile au-delà de sa lettre : la contre-preuve ne vérifie pas
seulement que la garde reste verte quand la source revient, elle établit que la source n'était
pas la cause.

### 2. Ce qui a été écrit

**Geste 1 — la carte ne peut plus tuer la fiche.** Direction retenue : la garde, comme le ticket
la préférait. `src/lib/contextMapFrame.ts` calcule le cadre depuis le point, **sans Leaflet et
sans carte** — même arithmétique que `boxAround`, et le cadre est vérifié par
`boundsCoverRadius`, le test du noyau, donc le cercle dessiné et le cercle compté ne peuvent pas
diverger en silence. Trois refus nommés : un rayon qui n'est pas une longueur, un point qui n'est
pas un point, des bornes qui sortent du monde. `ContextMap` pose ensuite la vue **avant la
première couche**, ne demande plus ses bornes à personne, et rend une absence écrite quand le
cadre est refusé — plus un filet : un montage qui jette malgré tout dégrade vers la même absence
au lieu d'atteindre la frontière d'erreur. Le filet est nommé à l'écran, jamais silencieux.

**Geste 2 — le budget appartient à l'appelant.** `fetchOverpassSnapshot(bbox, { budgetMs })` :
chaque miroir reçoit `Math.min(MIRROR_TIMEOUT_MS, ce qui reste)`, et la marche s'arrête quand il
ne reste rien. `CONTEXT_BUDGET_MS = 10000` vit dans `src/hooks/useAddressContext.ts`, pas dans le
client HTTP. `/carte` n'a pas bougé : sans budget, trois miroirs à 70 s.

**Geste 3 — le refus est nommé dans le bloc des trous.** `collectGaps` prend les motifs
structurés et les résout par `findingsFromScores`, jamais par une seconde copie de sa règle ; le
libellé vient de `withholdingText`, exporté du noyau pour la même raison que `clauseText`. Le
bloc dit « Passage : source injoignable — … » au lieu de ne nommer que la couche muette.

### 3. Démontré, dans un navigateur réel et hors navigateur

**Le navigateur.** Chrome sans tête piloté par le protocole DevTools, Node parlant WebSocket
sans dépendance, le build de production servi depuis le disque, URL
`/contexte/rue-de-bretagne-paris?lat=48.863100&lng=2.362100`. L'état des miroirs est imposé au
bord du réseau par le domaine `Fetch` : `failRequest` pour un refus, aucune réponse pour un
miroir pendu, `fulfillRequest` avec l'instantané réel enregistré pour le rétablissement. Le code
de la page, l'analyse, le calcul, le verdict et la carte sont ceux qui partent en production.

| Miroirs | Avant (`3cb9b5d`) | Après |
| --- | --- | --- |
| refusant d'emblée | **écran d'erreur**, 244 ms, 0 carte, 0 constat, 0 trou | **refus + 5 trous nommés**, 272 ms, carte montée |
| pendus | **écran d'erreur**, **210 203 ms** — trois miroirs à 70 s — 0 carte, 0 constat, 0 trou | **refus + 5 trous nommés, 10 224 ms**, carte montée, **un seul miroir interrogé** |
| rétablis (instantané réel rejoué) | **écran d'erreur**, `layerPointToLatLng`, 243 ms | **verdict composé**, 260 ms |

Le verdict rendu miroirs rétablis : « Passage soutenu, desserte forte, services à pied
nombreux. » Le refus rendu miroirs injoignables : « Compass ne compose pas de verdict pour cette
adresse — le passage : source injoignable ; la desserte : source injoignable ; les services à
pied : source injoignable. » Et le bloc des trous, miroirs rétablis, **cesse** de porter
« source injoignable » : il ne reste que les réserves vraies — l'approximation du passage, le
modèle de bruit, le marquage bénévole des locaux, l'absence de loyer commercial.

**Le critère 2, chiffré.** 10 224 ms de la navigation au bloc des trous, ligne de chargement
visible à 166 ms, contre **210 203 ms** avant — **vingt fois moins**. Un seul appel Overpass
part : le premier miroir consomme le budget entier, ce qui est le comportement voulu —
l'appelant a demandé une réponse dans un délai, pas trois essais. Avant, les trois partaient, à
133 ms, 70 144 ms et 140 152 ms : les 70 s de `MIRROR_TIMEOUT_MS`, trois fois, à la milliseconde.

**Pourquoi 3 min 30 ici et 2 min 20 en production.** C'est le même mécanisme à deux latences de
miroir. Le scénario « pendus » est le pire cas — les requêtes sont acceptées et jamais répondues,
donc chaque miroir coûte ses 70 s pleines ; le 13 septembre au matin, les miroirs rendaient un
504 avant la fin de leur fenêtre. Le budget, lui, ne dépend d'aucune des deux : il borne la somme.

**Hors navigateur.** `src/components/context/ContextMap.test.tsx`, sous
`@vitest-environment jsdom` avec le vrai Leaflet — premier fichier de ce dépôt qui monte un
composant, et `node` reste le défaut pour tout le reste. **Quatre de ses cinq cas échouent sur
`3cb9b5d`** :

| Cas | Ce qu'il rend sur le code d'avant |
| --- | --- |
| se monte sans jeter, et monte vraiment une carte | `TypeError: Cannot read properties of undefined (reading 'layerPointToLatLng')` |
| rend le refus de verdict sans carte | le même message |
| refuse de se monter sans bornes utilisables | `Error: Invalid LatLng object: (NaN, 2.3621)` |
| ne laisse pas un instantané malformé emporter ce qui l'entoure | `TypeError: families[layer] is not iterable` |

Le cinquième passe des deux côtés, et c'est voulu : il éprouve le **contrat de Leaflet**, pas le
composant — un cercle posé sur une carte sans vue ne sait pas ses bornes. Le jour où la
bibliothèque change là-dessus, la prémisse de la garde est rediscutée au lieu d'être supposée.

Total : **640 tests sur 48 fichiers**, contre 625 sur 46 avant la session.

### 4. Les miroirs, remesurés

Le « 504 en 5,1 s » de l'énoncé ne s'est pas reproduit une seule fois. Requête réelle de la
fiche, cinq adresses, `User-Agent` de navigateur :

- `overpass-api.de` : **406 Not Acceptable** (Apache) en **149 à 277 ms**, cinq fois sur cinq ;
- `overpass.kumi.systems` : **504** à 34 955, 40 179, 42 701 et 43 315 ms, ou rien au-delà de 70 s ;
- `overpass.private.coffee` : **200** en 8 981, 10 587, 19 513 et 49 520 ms ; **504** à 36 574,
  38 481 et 40 915 ms ; ou rien au-delà de 70 s.

Marches complètes des trois miroirs : avenue Daumesnil **aucune réponse après 112 981 ms**,
boulevard Barbès **aucune après 140 175 ms**, rue de Rivoli répondue après 59 869 ms, rue du
Commerce après 79 156 ms. La conclusion du ticket tient — 406 comme 504 sont des pannes amont,
aucune ne porte d'en-tête `Access-Control-Allow-*`, et le navigateur ne peut lire les deux que
comme un blocage — mais le chiffre de 5,1 s était un échantillon, pas un ordre de grandeur.

**Et un fait qui décide le budget** : le seul miroir qui répond est **troisième**, derrière un
qui met 35 à 43 s à expirer. Sous n'importe quel budget d'échelle humaine il n'est jamais
atteint. Monter le budget n'achète donc pas une réponse, seulement une attente plus longue avant
le même refus — mesuré, et c'est la raison pour laquelle dix secondes tient.

### Ce que ça ne rattrape pas

- **La fiche est survivable, pas utile.** Sous ce budget et avec cette liste de miroirs, elle
  refuse presque toujours. Elle ne dit plus rien de faux ; elle ne dit presque rien. C'est
  `w6-fiche-corpus` (#157), et les deux ne se remplacent pas.
- **`contextMapFrame` juge le point, jamais le conteneur.** Un hôte de largeur nulle, une version
  de Leaflet qui change son contrat de projection, un serveur de tuiles qui refuse : rien de tout
  cela n'est visible d'ici. C'est le reste que couvre la dégradation du montage, et elle est
  **synchrone** : une tuile qui échoue après coup laisse un carré gris, ce qui n'a jamais été
  fatal.
- **Le filet attrape un jet, pas une promesse rejetée.** Si une version future de `ContextMap`
  faisait du travail asynchrone, le `try` autour du montage ne le verrait pas.
- **Rien ici ne surveille la page dans la durée.** La porte était entièrement au vert pendant la
  panne, et elle le resterait si la fiche replantait demain : c'est `w1-porte-page` (#158). Le
  harnais Chrome de cette session vit dans le bloc-notes de session, pas dans le dépôt —
  l'institutionnaliser est le travail de `#158`, pas un à-côté de celui-ci.
- **§49 n'est pas touché.** Le motif est désormais en français — « source injoignable » — mais la
  phrase qui le suit vient toujours de `src/core` en anglais.
- **`bun.lockb` ne porte pas `jsdom`.** Écart connu et écrit, voir `docs/REPRISE-PIEGES.md`.
