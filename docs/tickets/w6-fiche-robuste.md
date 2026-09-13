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
