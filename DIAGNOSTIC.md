# Diagnostic du code — défauts ouverts

Lecture du dépôt cloné, tenue depuis le 9 août 2026. **Le préambule d'origine annonçait
« quatre défauts, par ordre de gravité » : il en porte 55 au 15 septembre 2026**, et la
phrase est restée fausse trois semaines. Le nombre est désormais dérivé du tableau
ci-dessous par `scripts/porte/documents.test.ts` : le recopier faux fait rougir `test`.

Découpé en deux le 31 août 2026, comme `docs/REPRISE.md` la veille : cette page ne garde que
**ce qui est encore ouvert**. Les trente-trois défauts clos sont dans
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
| 32 | La configuration publique du front ignorée par git — bundle publié sans clé, page blanche | clos le 2 septembre 2026 | corrigés |
| 33 | `verify:mcp` lançait esbuild par `node`, ce qui n'est juste que sur Windows | clos le 2 septembre 2026, prouvé sur le runner le 3 | corrigés |
| 34 | Une tolérance de comptage appliquée à un quantile — bloquante sur une marche, muette sur ce qui change le chiffre publié | clos le 2 septembre 2026 | corrigés |
| 35 | Un fourre-tout de mappage : une typologie de terrasse que personne n'a lue devient « permanente » | **ouvert** — trouvé le 5 septembre 2026 par `w1-catalogue`, [#79](https://github.com/IvandeMurard/paris-compass/issues/79) | ici |
| 36 | `compass_premises_within` ne distingue pas un rayon vide d'un point hors corpus | **ouvert** — trouvé le 5 septembre 2026 par `w1-observabilite`, [#80](https://github.com/IvandeMurard/paris-compass/issues/80) | ici |
| 37 | `I23` ne voyait pas une table restreinte par l'ABSENCE de politique | clos le 5 septembre 2026, `w1-observabilite` | corrigés |
| 38 | Une absence de coordonnée rendue comme une coordonnée — quinze `POINT(NaN NaN)`, et aucune règle derrière | clos le 5 septembre 2026, `20260905000006` et `I42` | corrigés |
| 39 | Deux migrations réécrites après leur application — le distant porte deux commentaires que le dépôt n'annonce plus | **ouvert** — trouvé le 6 septembre 2026 par `w1-ledger`, [#83](https://github.com/IvandeMurard/paris-compass/issues/83) | ici |
| 40 | Quatre colonnes de texte BODACC portent de l'UTF-8 doublement encodé — 19 natures de jugement sont des doublons | **ouvert** — trouvé le 6 septembre 2026 par `w6-analyse`, [#88](https://github.com/IvandeMurard/paris-compass/issues/88) | ici |
| 41 | Les quatre prix par métier du `README` ne sont reproductibles par aucune méthode | **ouvert** — trouvé le 6 septembre 2026 par `w6-analyse`, [#89](https://github.com/IvandeMurard/paris-compass/issues/89), décision Ivan | ici |
| 42 | `src/services/opendata/sources.ts` omet des sources déjà ingérées — pas seulement les trois de §25 | **ouvert** — trouvé le 7 septembre 2026 par `w2-idfm`, P2 | ici |
| 43 | `docs/REPRISE.md` documente encore « on pousse sur `main` sans PR », périmé depuis le 6 septembre 2026 | **ouvert** — trouvé le 7 septembre 2026 par `w2-idfm`, P2 | ici |
| 44 | L'exclusion de Porte de Clichy porte plus loin que le défaut : 156 locaux reçoivent une station qui n'est pas la plus proche | **ouvert** — trouvé le 7 septembre 2026 par la revue de #97, P2 | ici |
| 45 | La sonde de catalogue IDFM dérivera vers le VERT sur une édition gelée, jamais vers le rouge | **ouvert** — trouvé le 7 septembre 2026 par la revue de #97, P2 | ici |
| 46 | La table Filosofi carroyée ne porte pas `i_est_200`, l'indicateur d'imputation qu'INSEE dit obligatoire | **ouvert** — trouvé le 8 septembre 2026 par `w2-filosofi`, [#18](https://github.com/IvandeMurard/paris-compass/issues/18) | ici |
| 47 | La `cadence_note` de `filosofi` annonce « NON CHARGÉ » à tout appelant, alors que la source est chargée depuis le 8 septembre 2026 | **ouvert** — trouvé le 8 septembre 2026 par `w2-filosofi`, P2 | ici |
| 48 | Deux tables neuves sur trois ont oublié la contrainte de finitude, et la troisième dit pourquoi | **ouvert** — mesuré le 10 septembre 2026 par `w4-meubles`, P2 | ici |
| 49 | Les raisons d'absence de `src/core` s'affichent en anglais sur les pages françaises | clos le 16 septembre 2026, `w6-langue-absences` (#181) — le noyau produit un motif, plus une phrase | ici |
| 50 | La fiche de contexte plante quand Overpass tombe, et n'appelle aucune fonction `compass_*` | clos les 13 et 14 septembre 2026 — le plantage par `#156`, l'absence de corpus par `#157` | ici |
| 51 | Un compte de locaux plafonné à mille par PostgREST, rendu comme un total — `compass_scoring_context_within` | clos le 14 septembre 2026 par `w6-fiche-corpus`, `#157` | ici |
| 52 | L'axe `tissu commercial` lit 100 sur la moitié de Paris : honnête, et presque sans pouvoir discriminant | **ouvert** — mesuré le 14 septembre 2026 par `w6-fiche-corpus`, P2, **décision Ivan** | ici |
| 53 | Hors corpus, deux couches neuves rendaient un ZÉRO mesuré au lieu d'une absence — `services` et `stations` | clos le 15 septembre 2026 par `w6-amenites-corpus`, trouvé à l'écran | ici |
| 54 | `brief` assemblait un prompt de session complet pour une issue FERMÉE, sans le dire | clos le 15 septembre 2026 — trouvé en étant la victime | ici |
| 55 | Le dossier exporté citait la BAN sur un libellé qu'elle n'avait pas rendu, et perdait « mesure en cours » | clos le 15 septembre 2026 par `w6-dossier`, trouvé à l'écran | ici |
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

---

## 35. Un fourre-tout de mappage : une typologie de terrasse que personne n'a lue devient « permanente »

**Trouvé le 5 septembre 2026 en écrivant `w1-catalogue`
([#73](https://github.com/IvandeMurard/paris-compass/issues/73)) — porté par
[#79](https://github.com/IvandeMurard/paris-compass/issues/79). C'est exactement la
classe de défaut que le ticket existe pour rendre visible : volume inchangé, sens faux.**
Aucune baseline ne pouvait le voir — le nombre de lignes est juste, c'est ce que chacune
*veut dire* qui ne l'est pas.

`scripts/ingest/terrasses.ts` dérive `categorie` du champ libre `typologie` de la source :

```ts
if (upper.includes("ESTIVALE")) return "estivale"
if (upper.includes("TALAGE")) return "etalage"
return "permanente"          // <- le fourre-tout
```

Le commentaire au-dessus dit que le vocabulaire a été lu le 25 août 2026 sur la page
réglementaire de la Ville, et que « ESTIVALE » et « (É)TALAGE » sont des sous-chaînes que la
source écrit elle-même. C'est vrai. Ce qui n'a pas été lu, c'est **ce que contient le reste**.

**Mesuré le 5 septembre 2026 sur le distant.** La colonne `typologie` porte **32 valeurs
distinctes**. Quatre d'entre elles ne nomment ni une terrasse ni un étalage, et tombent
pourtant en `permanente` :

| `typologie` | Lignes | Ce que le produit en dit |
| --- | ---: | --- |
| `COMMERCE ACCESSOIRE` | 303 | « terrasse permanente » |
| `PLANCHER MOBILE` | 246 | « terrasse permanente » |
| `JARDINIÈRE` | 7 | « terrasse permanente » |
| `ECRAN PARALLÈLE À LA FAÇADE` | 2 | « terrasse permanente » |

**558 autorisations**, sur 24 237. Une jardinière n'est pas une terrasse, et un écran
parallèle à la façade non plus.

**Ce que ça produit à l'écran.** `src/i18n/terrasseText.ts` rend « Type autorisé : terrasse
permanente ». Mesuré le même jour, en ne comptant que les locaux dont le `terrasse_permanente`
ne repose sur **aucune** autorisation nommant une terrasse :

| | Locaux |
| --- | ---: |
| `terrasse_permanente = true` en tout | 14 818 |
| dont `terrasse_status = 'oui'` — attribué sans ambiguïté à ce local | 2 776 |
| **`permanente` reposant seulement sur du hors-vocabulaire** | **61** |
| **dont `terrasse_status = 'oui'`** | **6** |

Six fiches affirment sans réserve « Terrasse ou étalage autorisé à cette adresse — Type
autorisé : terrasse permanente » là où la Ville a autorisé une jardinière, un plancher mobile
ou un commerce accessoire. C'est petit, et c'est précisément le genre de chiffre qu'un contrôle
de volume ne verra jamais bouger.

**Ce qui n'est PAS le correctif.** Remapper les quatre valeurs à la main referait le geste du
25 août : une lecture de la nomenclature du jour, sans rien qui attrape la cinquième. Et
`w1-catalogue` interdit à son propre protocole de remapper un code hors domaine — il détecte et
signale, il ne décide pas.

**Ce qu'il faut, et pourquoi c'est une décision et pas un correctif mécanique.** Il faut
énumérer le vocabulaire plutôt que le laisser tomber dans une branche par défaut : une valeur
inconnue doit rougir, comme `chantiers.ts` lève déjà sur un `statut` inconnu. Mais décider ce
que `COMMERCE ACCESSOIRE` devient change **ce que la fiche dit à un preneur**, et il n'y a pas
de bonne réponse dans les trois catégories existantes : ni terrasse, ni étalage. Une quatrième
catégorie oblige à trancher ce que `terrasse_status` vaut pour un local qui n'a que
ça — « non », qui est vrai pour un panneau intitulé « Terrasse et étalage », mais qui tait une
autorisation réelle. C'est un arbitrage de produit.

**La limite de ce constat**, et elle vaut d'être écrite : les 28 autres valeurs n'ont été
jugées que sur leur libellé. `CONTRE TERRASSE SUR TROTTOIR` est classée `permanente` parce
qu'elle ne dit pas « estivale » — c'est plausible et ce n'est pas vérifié. Seule la Ville peut
dire si une contre-terrasse sans mention de saison est annuelle.

Reproduire :

```sql
select typologie, categorie, count(*)
  from public.terrasse_autorisation
 where categorie = 'permanente' and upper(typologie) !~ 'TERRASSE'
 group by 1, 2 order by 3 desc;
```

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

---

## 36. `compass_premises_within` ne distingue pas un rayon vide d'un point hors corpus — trouvé le 5 septembre 2026

**Le défaut.** C'est §16 sur sa fonction voisine, et c'est la troisième fois que ce dépôt
constate qu'une leçon apprise sur une fonction n'a pas été reportée sur l'autre — §9 le disait
déjà en 2026-08 : « la leçon avait été apprise sur une fonction et jamais reportée sur sa
voisine ».

`compass_scoring_context_within` porte un marqueur `out_of_corpus` depuis `20260825000003` :
un point qui n'est dans aucun des 80 quartiers reçoit une ligne qui le dit, au lieu de zéro
ligne qui se lirait « il n'y a rien ici ». `compass_premises_within` — la fonction de la carte
et de l'outil MCP `find_premises` — n'en a jamais reçu. Un point à Massy y rend **zéro ligne**,
octet pour octet ce que rend un rayon réellement vide dans Paris.

**Ce qui atténue, et qu'il faut dire pour ne pas surestimer le défaut.** §16 avait examiné
`find_premises` et l'avait jugé honnête : zéro local BDCom à 18 km de Paris est *vrai*. Le
défaut de §16 était `score_location`, qui calculait un `footfall` sur ce zéro. Ici, aucun
chiffre n'est dérivé de l'absence : l'appelant reçoit une liste vide et n'en tire rien.

**Ce qui reste, et pourquoi c'est ouvert.** L'appelant ne peut pas expliquer le vide. « Aucun
local dans ce rayon » et « ce lieu n'est pas couvert par le recensement » sont deux réponses
qui n'appellent pas la même suite — la seconde dit qu'il faut une source hors Paris, la
première ne réclame rien. Un agent qui relaie la première là où la seconde est vraie affirme
que Massy est un désert commercial.

**Contourné pour le journal, pas corrigé pour l'appelant.** `compass_record_question`
(`20260905000001`) résout déjà le quartier du point qu'on lui donne : elle sait donc, et elle
requalifie un `vide` sans quartier en `hors_corpus`. Le journal ne confond pas les deux. **Ce
qui reste ouvert est le chemin de l'appelant** : la fonction rend toujours zéro ligne sans rien
dire, et la corriger est un **changement de type de retour** — `drop function` puis `create`,
comme `20260825000003` a dû le faire — donc un chantier à part entière avec son propre
invariant de comportement.

*Mesuré le 5 septembre 2026 :* démontré dans l'acte 5 de `npm.cmd run eval:sabotage`, où un
point à (48,70 · 2,20) écrit `vide` par son appelant ressort `hors_corpus` dans
`question_tally`, quartier nul.

## 39. Deux migrations réécrites après leur application — trouvé le 6 septembre 2026 par `w1-ledger`

**Le défaut.** `20260825000002_ingestion_run_trigger.sql` et
`20260825000003_scoring_context_out_of_corpus.sql` ont été **modifiées après avoir été posées
sur le distant**, par le commit `89aa8ac` du 25 août 2026, dont le message le dit en toutes
lettres : *« les commentaires que j'avais ecrits en francais repassent en anglais : CLAUDE.md le
demande »*. Le fichier suivi par git n'est donc plus celui qui a été appliqué, et rien dans le
dépôt ne pouvait le dire — c'est la moitié « corps » de `w1-ledger` (#82) qui l'a trouvé à sa
première exécution.

**Mesuré le 6 septembre 2026 sur `dbefhvmyfmmhjeetdddu`**, en comparant chaque fichier suivi au
texte que `supabase_migrations.schema_migrations` a gardé de lui :

| | Corps identique | Empreinte dépôt | Empreinte ledger |
| --- | --- | --- | --- |
| Les 51 autres migrations | **oui**, caractère pour caractère après normalisation | — | — |
| `20260825000002` | non | `27336c93b6ad` | `ef22ff3f99e7` |
| `20260825000003` | non | `35bf8d33a0ce` | `391e44f3d86a` |

**Rien d'exécutable ne diffère, et c'est mesuré plutôt que supposé.** Statement par statement,
la divergence est **entièrement du commentaire** :

- `20260825000003` — hors commentaires `--` et hors littéraux, le SQL est identique caractère
  pour caractère. Ce qui diffère : l'en-tête du fichier, les commentaires `--` **à l'intérieur
  du corps plpgsql** de `compass_scoring_context_within`, et le texte du `comment on function`.
- `20260825000002` — même chose, plus une reflow : le `comment on column
  public.ingestion_run.run_by` est concaténé en **quatre** littéraux au ledger et en **trois**
  dans le fichier. La chaîne finale diffère : le distant porte ce commentaire de colonne en
  **français**, le dépôt l'annonce en **anglais**.

**Ce qui est réellement faux aujourd'hui, et c'est petit.** Deux commentaires de catalogue —
une colonne et une fonction — sont en français sur le distant quand le dépôt les déclare en
anglais, et les commentaires internes du corps de `compass_scoring_context_within` tel que
`pg_proc` le porte sont ceux d'avant la traduction. Aucun comportement n'en dépend : un
commentaire ne s'exécute pas. Ce que ça coûte est de la lecture — quelqu'un qui interroge le
catalogue pour comprendre `run_by` ne lit pas la phrase que le dépôt lui promet.

**Ce qui est irréparable, et il faut le dire plutôt que de promettre une correction.** Le ledger
garde le texte **appliqué ce jour-là**. Aucune migration future ne peut réécrire une ligne du
passé, donc ces deux lignes divergeront de leur fichier pour toujours. C'est la raison d'être de
`corps-diverge` dans `scripts/porte/ledger.json` : la divergence y est consignée avec sa cause et
avec **les deux empreintes qu'elle couvre**, de sorte qu'elle cesse d'être excusée le jour où
l'un des deux côtés rebouge. Une entrée sans empreinte aurait été une excuse à vie.

**Ce qui reste ouvert, et qui est une décision — [#83](https://github.com/IvandeMurard/paris-compass/issues/83).** Aligner l'**état vivant** — pas le ledger — est
possible en une migration qui rejoue les deux `comment on` en anglais. Elle ne ferait pas
disparaître les deux lignes de `ledger.json`, qui parlent du passé ; elle ferait seulement que
le catalogue du distant dise ce que le dépôt annonce. Ça se décide, ça ne se déduit pas : c'est
une poussée sur une base vivante pour deux phrases de commentaire.

**La leçon, et elle est plus grande que ces deux fichiers.** Une migration posée est un fait
daté, pas un document qu'on entretient. La réécrire — même pour appliquer une règle du dépôt,
même sans toucher au SQL — fait diverger silencieusement ce qui est déployé de ce qui est
versionné. Écrit dans `docs/REPRISE.md`, « Ce qu'il ne faut pas faire ».

## 40. Quatre colonnes de texte BODACC portent de l'UTF-8 doublement encodé — trouvé le 6 septembre 2026 par `w6-analyse`

Mesuré le 6 septembre 2026 sur `dbefhvmyfmmhjeetdddu`, en instruisant §6.5 :

| Colonne | Lignes portant `Ã` | Population |
| --- | ---: | ---: |
| `bodacc_judgment.nature` | **231** | 120 719 |
| `bodacc_judgment.family` | **175** | 120 719 |
| `bodacc_establishment.activity` | **210** | 165 000 environ |
| `bodacc_announcement.trader_name` | **74** | 164 035 |

C'est le motif classique : de l'UTF-8 lu comme du Latin-1 puis ré-encodé en UTF-8, si bien que
`é` devient `Ã©`. Il vient de la source ou du chargeur, pas de l'affichage — la valeur est
fausse **en base**, et un `select` la rend fausse à tout appelant.

**Le coût réel n'est pas l'accent, c'est la CATÉGORIE.** `nature` porte **79 valeurs
distinctes, dont 19 sont des doublons doublement encodés** de valeurs déjà présentes :
« Jugement prononçant la résolution du plan de redressement et la liquidation judiciaire »
(937 lignes) et « Jugement prononÃ§ant la rÃ©solution… » (3 lignes) sont deux catégories pour
un seul fait. Toute lecture qui grouperait sur cette colonne compterait 79 natures là où il y
en a 60, et répartirait le même jugement sur deux lignes.

**C'est la raison mesurée pour laquelle `compass_sales_vs_collective` n'est pas nommée
« ventes contre liquidations »**, comme le ticket le demandait. L'axe servi est l'énumération
`bodacc_announcement.family` — `vente` contre `collective` — parce qu'elle est typée par le
schéma. Restreindre `collective` aux seules liquidations exigerait de lire `nature`, donc de
classer sur du texte libre : c'est le geste que
[`#61`](https://github.com/IvandeMurard/paris-compass/issues/61) a refusé pour les pannes
amont, et cette colonne montre pourquoi. Un deuxième piège l'accompagne, indépendant de
l'encodage : « Liste des créances nées après le jugement d'ouverture d'une procédure de
liquidation judiciaire » **contient le mot sans être une liquidation**. Un `ilike
'%liquidation%'` compterait des listes de créances comme des morts d'entreprise.

**Ce qui n'est pas fait, et pourquoi ce défaut reste ouvert.** Réparer les lignes est
possible — la transformation est déterministe. Mais rien n'empêche le prochain chargement de
les réintroduire, et la règle du dépôt est explicite : corriger une donnée n'est pas corriger
un défaut. Le livrable serait un invariant recensant les colonnes de texte BODACC et refusant
`Ã`, plus le point du chargeur où l'encodage se perd — que cette session n'a pas cherché. Suivi
en [#88](https://github.com/IvandeMurard/paris-compass/issues/88).

**Ce que ça ne dit pas.** 231 sur 120 719 est 0,19 % : le volume est petit, et aucune baseline
ne l'aurait vu — elles comptent des lignes, et le compte est juste. C'est un défaut de **sens à
volume constant**, exactement la famille que `I22` et `I38` existent pour attraper sur les
nomenclatures. Aucune règle ne le couvre aujourd'hui sur BODACC.


## 41. Les quatre prix par métier du `README` ne sont reproductibles par aucune méthode — trouvé le 6 septembre 2026 par `w6-analyse`

`README.md` publie quatre prix médians de fonds par métier :

| Food shop | Café / restaurant | Clothing | Personal services |
| --- | --- | --- | --- |
| 250 000 € | 220 000 € | 86 000 € | 50 000 € |

**Aucune requête du dépôt ne les produit.** Les deux baselines gelées de
`eval/baselines/ingestion.json` couvrent la médiane **toutes activités confondues**
(`prix_median_local_identifiable`, 160 868 €) et sa population (5 942 cessions) — jamais le
détail par métier. `note_prix` décrit la méthode en prose — groupé sur le code d'activité
BDCom, restreint aux cessions dont le local est seul à son numéro — sans porter le SQL.

Reconstruites le 6 septembre 2026 sur le distant, selon cette méthode, **quatre variantes du
millésime dont on lit le métier** :

| Métier (niv18) | 2023 | dernier millésime observé | 2017 | `README` |
| --- | ---: | ---: | ---: | ---: |
| Alimentaire | 230 000 | 220 000 | 230 000 | **250 000** |
| Café et Restaurant | 210 000 | 210 000 | 220 000 | **220 000** |
| Equipement de la personne | 120 000 | 120 000 | 105 000 | **86 000** |
| Service aux particuliers | 50 000 | 50 000 | 50 000 | **50 000** |

Aucune colonne ne reproduit les quatre. Le millésime 2017 en rend deux sur quatre
(220 000 et 50 000) et manque les deux autres. **86 000 € n'est atteint par aucune variante**,
ni au grain niv18 ni au grain niv47 — « Habillement » seul, le candidat le plus étroit pour
« Clothing », mesure **103 100 €** sur 135 cessions.

**Ce que ça veut dire, prudemment.** Ça ne prouve pas que les chiffres étaient faux le jour où
ils ont été écrits : la méthode réellement employée n'existe nulle part, donc elle n'est pas
recoupable, et c'est **ça** le défaut. Un chiffre publié dont personne ne peut rejouer le calcul
ne peut être ni confirmé ni corrigé, et il vieillit sans que rien ne le dise —
`docs/REPRISE-PIEGES.md` l'avait déjà nommé comme risque en fermant §34 : « les prix par métier
du `README` ne sont sous aucune baseline. Ils peuvent vieillir en silence, exactement comme la
médiane l'aurait fait. » Le risque est désormais mesuré.

**Ce qui a été fait, et ce qui ne l'a pas été.** `compass_price_by_activity` (`w6-analyse`,
#50) rend la médiane par métier avec son effectif, groupée sur le code d'activité BDCom : le
chiffre devient reproductible, ce qui est la condition préalable pour le corriger. **Le
`README` n'a pas été modifié** — un chiffre publié est une décision produit, pas l'effet de
bord d'une migration, et le corriger demande de trancher quel millésime fait foi pour le métier
d'un local vendu. Ce dernier point n'est pas une évidence : le métier de 2023 est celui d'après
la vente, celui de 2017 celui d'avant, et les deux répondent à des questions différentes. Suivi
en [#89](https://github.com/IvandeMurard/paris-compass/issues/89), qui attend une décision
d'Ivan avant toute écriture.


## 42. `src/services/opendata/sources.ts` omet des sources déjà ingérées — trouvé le 7 septembre 2026 par `w2-idfm`

Trouvé en passant, en cherchant où une nouvelle source rejoint l'écran « Sources » avant
d'y ajouter IDFM. §25 (clos le 26 août 2026) a réparé un même symptôme — trois sources
manquantes — mais le mécanisme qui a permis §25 n'a pas survécu : `DATA_SOURCES` dans
`src/services/opendata/sources.ts` ne cite ni `chantiers-perturbants` ni SIRENE (stock ou
géolocalisé), alors que les deux sont `ingérée` dans `docs/PLAN-ACTION-VACANCE.md` et
possèdent une migration, un chargeur et une entrée `ingestion_run` depuis le 25 août 2026.

**Pourquoi ce n'est pas nécessairement un défaut pour ces deux-là aujourd'hui.** La règle du
prompt commun est « une source rejoint `sources.ts` le jour où un ÉCRAN LA LIT » — et ni
`chantier_exposed` ni les tables SIRENE stock ne sont aujourd'hui lues par un composant React,
seulement par `compass_premises_within` et le serveur MCP. Sous cette lecture stricte, l'absence
est correcte, pas un oubli.

**Ce qui reste un vrai défaut** : rien ne VÉRIFIE cette règle. `scripts/porte/catalogue.json`
vérifie que le catalogue documentaire cite une sonde ; aucun bras équivalent ne vérifie que
`DATA_SOURCES` reste en phase avec ce que l'écran lit réellement. Le jour où un composant
commence à lire `chantier_exposed` sans que quelqu'un pense à `sources.ts`, rien ne le signale
— exactement le trou que §25 a réparé une fois à la main, sans laisser de garde derrière lui.

**Non traité par cette session** : hors périmètre de `w2-idfm`, qui n'ajoute lui-même aucun
écran lisant IDFM (voir `docs/tickets/w2-idfm.md`, § Avancement) et ne touche donc pas
`sources.ts`. À reprendre par le ticket qui ajoutera le premier écran lisant `chantier_exposed`
ou les tables SIRENE stock, ou par un ticket d'outillage dédié si Ivan le juge prioritaire —
`CLAUDE.md` du 7 septembre 2026 interdit explicitement d'ouvrir ce chantier en passant.


## 43. `docs/REPRISE.md` documente encore « on pousse sur `main` sans PR », périmé depuis le 6 septembre 2026 — trouvé le 7 septembre 2026 par `w2-idfm`

Trouvé en passant, en ajoutant une entrée à « Décisions qui ne se déduisent pas du code ».
Cette section porte encore, datée du 2 septembre 2026, la décision « On pousse sur `main` sans
passer par une PR, pour l'instant » — avec sa justification et son coût assumé. `CLAUDE.md`
dit depuis le 6 septembre 2026 l'inverse : « `main` refuse la poussée directe : une session,
une branche, une proposition », décision d'Ivan qui inverse explicitement celle du 2 septembre.

**Pourquoi ce n'est pas anodin.** `docs/REPRISE.md` est le document lu EN PREMIER en début de
session (`CLAUDE.md`, tableau des documents). Une session qui lirait cette section sans
recouper `CLAUDE.md` en tirerait la conclusion inverse de la règle réellement en vigueur — le
risque exact que `docs/REPRISE-PIEGES.md` catalogue pour d'autres pièges, appliqué ici à une
règle de gouvernance plutôt qu'à un fait technique.

**Non corrigé par cette session** : la section documente une décision RÉVOLUE avec sa date et
son raisonnement, ce qui a sa valeur d'archive (même logique que
`docs/REPRISE-ARCHIVE.md`) ; la retirer ou la corriger est un choix éditorial qui dépasse le
périmètre de `w2-idfm`. À trancher : soit biffer la section et noter qu'elle est remplacée par
la règle du 6 septembre (avec renvoi), soit la déplacer dans `docs/REPRISE-ARCHIVE.md` comme
les points 1, 3, 4, 8, 9, 10, 11 l'ont été.


## 44. L'exclusion de Porte de Clichy porte plus loin que le défaut : 156 locaux reçoivent une station qui n'est pas la plus proche — trouvé le 7 septembre 2026 par la revue de #97

**Le fait sale est le PROFIL, la POSITION est propre, et le chargeur écarte les deux.**
`scripts/ingest/idfm.ts` (`aggregateProfiles`) refuse la zdc `71545` « Porte de Clichy » parce
que la source publie jusqu'à quatre lignes pour un même (code, jour, tranche horaire) avec des
pourcentages différents et aucun champ pour les départager — décision juste, et elle ne porte
que sur le RYTHME. Mais `loadStations` ne charge dans `idfm_station` que les zdc qu'un profil
nomme, donc la station disparaît aussi de la recherche du plus proche.

**Mesuré le 7 septembre 2026**, en transaction annulée contre `dbefhvmyfmmhjeetdddu`, la zdc
71545 réinsérée avec le centroïde que `buildParisStations` lui donnerait (4 zdaid, Lambert-93
x=649699,5 y=6866273,5, lus sur `zones-d-arrets` ce jour-là) :

| | mesuré |
| --- | ---: |
| locaux dont la station stockée n'est pas la plus proche | **156** sur 85 410 |
| pire surestimation de distance | **603 m** |
| pire cas — `10 AV PORTE DE CLICHY` | **877 m** annoncés vers Brochant, **274 m** réels |

**Pourquoi aucun invariant ne le voit.** `I47` recalcule le plus proche **parmi les stations
chargées** : il valide donc ce rattachement, et son en-tête le dit déjà honnêtement (« cet
invariant ne peut jamais la voir »). `I50` ne le voit pas davantage — la station n'est dans
aucune des deux tables. C'est structurel : aucune règle écrite sur le contenu de la base ne peut
rattraper une ligne que l'ingestion n'y a jamais mise.

**Ce qui a été fait le 7 septembre**, et ce n'est pas la correction : la conséquence est
désormais écrite là où un appelant la lit — `comment on column
premise_location.idfm_station_distance_m` (migration `20260907000003`) dit que cette colonne est
une borne **supérieure** de la distance à une station réelle, jamais la distance à la station
réellement la plus proche. Le silence est corrigé, pas le rattachement.

**Ce qui reste à trancher, et pourquoi ça n'a pas été tranché en session de correction.**
Charger la station sans son profil rendrait le rattachement honnête, mais change deux
sémantiques publiées : `compass_station_profile`, dont le commentaire dit aujourd'hui que zéro
ligne signifie « aucune station à profil dans le rayon », en rendrait zéro pour un motif
nouveau ; et `idfm_station_name` nommerait une station muette. Il faudrait vraisemblablement une
colonne `idfm_station.profil_disponible` et une reprise des deux commentaires — un choix de
périmètre, pas une correction de revue. À reprendre par le ticket qui ajoutera le premier écran
lisant IDFM, qui aura de toute façon à décider quoi montrer d'une station sans rythme.


## 45. La sonde de catalogue IDFM dérivera vers le VERT sur une édition gelée, jamais vers le rouge — trouvé le 7 septembre 2026 par la revue de #97

`scripts/porte/catalogue.json` épingle, pour « Validations transport IDFM », l'identifiant
`validations-reseau-ferre-profils-horaires-par-jour-type-4eme-trimestre` — l'édition que
`resolveDataset` a trouvée le 7 septembre 2026. Sa note défend ce choix contre un **404** à
l'échéance semestrielle.

**Mesuré le 7 septembre 2026 contre le portail : les quatre éditions COEXISTENT.**

```
2026-03-10  validations-reseau-ferre-profils-horaires-par-jour-type-4eme-trimestre
2025-12-29  validations-sur-le-reseau-ferre-profils-horaires-par-jour-type-2eme-trimestre-2025
2025-11-27  validations-reseau-ferre-profils-horaires-par-jour-type-3eme-trimestre
2025-07-23  validations-reseau-ferre-profils-horaires-par-jour-type-1er-trimestre
```

Donc l'id épinglé **ne rendra pas 404** : il répondra 200 sur une édition gelée pendant que
`resolveDataset` emmènera le chargeur sur une plus récente. La sonde dépense ses mots à défendre
la panne improbable et ne dit rien de celle qui arrivera — **une licence vérifiée chaque matin
sur une édition que le produit ne charge plus**. Une sonde qui verdit sur une source figée ne
vérifie rien, et c'est le sens de dérive le plus dangereux : personne ne va lire un vert.

**Pire, trois des quatre ids ne portent pas d'année.** Si IDFM réemploie
`…-4eme-trimestre` pour l'édition 2026, la sonde restera verte sur une ressource silencieusement
remplacée sous une URL consignée — c'est **#56** exactement, ce que le chargeur a été conçu pour
éviter et que la sonde, elle, ne fait pas.

**Le correctif, et pourquoi il n'a pas été fait le 7 septembre.** La sonde peut résoudre par
titre exactement comme le chargeur : la dérivation existe déjà dans le dépôt
(`scripts/ingest/lib/idfmOpendata.ts`, `resolveDataset`). Mais le schéma de
`scripts/porte/catalogue.json` ne connaît qu'un `endpoint` littéral et quatre `lecture`
(`opendatasoft`, `datagouv`, `arcgis`, `http`) ; en ajouter une cinquième qui résout avant de
lire est un chantier d'outillage, que `CLAUDE.md` du 7 septembre 2026 interdit d'ouvrir en
passant. La note de `catalogue.json` a été réécrite pour dire ce qui arrivera vraiment plutôt
que de défendre un 404 que la mesure dit improbable — la sonde ment moins, elle ne vérifie pas
plus. **À reprendre** par le ticket qui touchera `scripts/porte/catalogue.ts`, ou plus tôt si un
second jeu à identifiant tournant entre au catalogue : la règle ne vaut pas pour IDFM seul.


## 46. La table Filosofi carroyée ne porte pas `i_est_200`, l'indicateur d'imputation qu'INSEE dit obligatoire — trouvé le 8 septembre 2026 par `w2-filosofi`

`docs/tickets/w2-filosofi.md` renvoyait déjà ici pour le numéro de section avant que cette
section n'existe — trouvé en reprenant une session coupée par une limite d'API, la référence
manquante plutôt qu'ajoutée en même temps que le reste.

INSEE documente (dictionnaire des variables Filosofi, §I.5 et §III) que 79 % des carreaux de
200 m sont, au niveau national, sous le seuil de confidentialité de 11 ménages fiscaux et donc
**imputés** — leurs chiffres reconstitués en répartissant ceux d'un groupe de carreaux voisins
fusionnés, jamais mesurés sur le carreau seul — et que `i_est_200` doit être lu avant de faire
confiance à un carreau donné.

**Mesuré le 8 septembre 2026** : le republish GeoParquet que `scripts/ingest/filosofi.ts` lit
sur data.gouv.fr ne porte que les « variables communes aux trois grilles » du dictionnaire
INSEE (`idcar_200m`, `ind`, `men`, `men_pauv`, `ind_snv`, les ventilations âge/logement) —
aucune des « variables complémentaires de la grille de 200 m » : ni `i_est_200`, ni `idcar_1km`,
ni `lcog_geo`. `public.filosofi_grid_200m` (migration `20260908000001`) ne peut donc pas
distinguer, mécaniquement, un carreau mesuré d'un carreau imputé par groupe.

**Pourquoi ce n'est pas traité comme bloquant.** INSEE écrit elle-même la précaution : « en zone
urbaine, du fait des fortes densités, on peut considérer que les données sont fiables » — Paris
est exactement ce cas. Mais c'est une précaution documentée sur une CLASSE de territoire, jamais
une vérification carreau par carreau, et le risque documenté reste réel pour tout carreau
parisien à faible densité (bois, emprises ferroviaires, grandes parcelles peu peuplées).

**Ce qui n'a pas été fait, et pourquoi** : ni la migration `20260908000001` ni
`scripts/ingest/filosofi.ts` ne portent de contournement — aucune source alternative publiant
`i_est_200` à cette maille n'a été identifiée le 8 septembre 2026, et en fabriquer un proxy
serait une décision de méthode dépassant le périmètre d'une session de reprise. **À reprendre**
par qui trouve une distribution INSEE de ce dispositif portant les variables complémentaires
(le CSV/shapefile natif de l'INSEE plutôt que ce republish, par exemple), ou par une décision
d'Ivan d'accepter le risque résiduel tel quel et de le documenter comme assumé plutôt qu'ouvert.

---

## 47. La `cadence_note` de `filosofi` annonce « NON CHARGÉ » à tout appelant, alors que la source est chargée — trouvé le 8 septembre 2026 par `w2-filosofi`

`ingestion_run.cadence_note` **n'est pas un commentaire interne** : `compass_source_freshness()`
la rend, `scripts/ingest/freshness.ts` l'affiche, et surtout `mcp-server/src/tools/listSources.ts`
la sert telle quelle sous `cadenceNote` à n'importe quel agent qui interroge le serveur MCP
publié. C'est du texte servi, pas de la documentation.

**Mesuré le 8 septembre 2026** : la ligne posée par `20260908000001` porte encore
« NON CHARGÉ dans la foulée de cette migration — aucune base n'était joignable depuis cette
session […] à charger dès que la migration est posée ». C'était vrai à l'écriture — la session
qui l'a écrite travaillait dans un arbre isolé sans `DATABASE_URL`. Ça ne l'est plus : le
chargement est passé le même jour, 2 170 carreaux, millésime 2021, et `npm.cmd run freshness`
affiche `filosofi` chargé. Un appelant lit donc une phrase qui contredit la ligne d'à côté.

**Pourquoi ce n'est pas réparé ici, et ce que ça coûterait de le faire.** La migration
`20260908000001` est posée et suivie par le ledger : la réécrire est exactement le geste qui a
produit [§39](#39-deux-migrations-réécrites-après-leur-application) et `#83`. Le corriger demande
donc une migration **neuve** faisant `update public.ingestion_run set cadence_note = … where
source = 'filosofi'` — et **aucune migration du dépôt n'a jamais fait d'`update` sur cette
table**, vérifié le 8 septembre 2026 : ce serait une pratique nouvelle, inaugurée sur une
branche déjà en attente de revue. La décision de l'inaugurer revient à la file, pas à une
session de correction de chargement.

**Ce que la correction devra faire, quand elle viendra** : c'est bien la donnée qu'il faut
corriger ici, et elle survit au rechargement — `recordRun` ne touche jamais `cadence_note`, et
la migration d'origine ne se rejouera pas. Mais la note dit aussi que **le défaut se
reproduira** : toute migration qui enregistre une source décrit dans sa `cadence_note` un état
de chargement qu'elle ne peut pas connaître à l'écriture (`idfm` affirme symétriquement
« Chargé une fois dans la foulée de cette migration », ce qui n'était vrai qu'après coup). La
vraie règle à écrire est qu'une `cadence_note` décrive la **cadence**, jamais l'état d'un
chargement — cet état a déjà sa colonne, `last_success_at`, et un invariant peut recouper les
deux.

## 48. Deux tables neuves sur trois ont oublié la contrainte de finitude, et la troisième dit pourquoi — mesuré le 10 septembre 2026

**Le fait, corrigé par la revue de #100 le 10 septembre.** Une version antérieure de cette
section disait « trois sur trois » ; la mesure en dit **deux**, et la troisième est
l'enseignement. `I42` exige qu'une colonne géographique porte une contrainte `CHECK` validée
interdisant `NaN` et `Infinity` :

| Table | Posée | Contrainte ajoutée par |
| --- | --- | --- |
| `idfm_station` | 7 septembre 2026 | `20260907000003`, après la revue de `#97` |
| `filosofi_grid_200m` | 8 septembre 2026 | **portée dans sa migration d'origine** (`20260908000001` l. 93) — attrapée par une revue AVANT la pose, zéro migration supplémentaire |
| `meuble_autorisation` | 10 septembre 2026 | `20260910000004`, après `I42` |

**Ce que ça dit, et ce n'est pas que les sessions sont distraites.** L'invariant fonctionne : il
n'a laissé passer aucune des trois. Mais il ne les attrape qu'**après la pose**, et une migration
posée ne se réécrit plus — donc chaque oubli coûte une migration supplémentaire, et le ledger
garde la trace des deux. Trois fois de suite, le même correctif en deux temps.

Une règle qu'on redécouvre à chaque table neuve n'est pas tenue par ce qui écrit les tables
neuves. `I42` mesure la population et c'est ce qui le rend juste ; ce qui manque est en amont —
le patron dont une session part quand elle crée une colonne `geography`.

**Ce que la correction n'est pas.** Ce n'est pas d'assouplir `I42` : il a raison à chaque fois.
Ce n'est pas non plus une liste des tables à surveiller — elle serait fausse à la quatrième. Le
livrable est ce qui fait que la contrainte parte **avec** la table : un modèle de migration, ou
un test hors-base qui refuse un fichier de migration créant une colonne `geography` sans la
contrainte dans le même fichier. Le second a l'avantage de se jouer avant la pose, donc de
coûter zéro migration.

**Ce que ça ne rattrape pas.** Une contrainte de finitude garde ce qui **entre** dans la colonne,
jamais ce que la source publie : une adresse géocodée au centroïde de son arrondissement porte un
point parfaitement fini et parfaitement faux. C'est au chargeur de le refuser.

---

## 49. Les raisons d'absence de `src/core` s'affichent en anglais sur les pages françaises — mesuré le 10 septembre 2026 par `w6-contexte`

**Ce qui est mesuré, et où.** Les chaînes `MISSING` et les `note` de `src/core/scoring.ts` sont
écrites en anglais — commentaires et messages du noyau le sont par convention (`CLAUDE.md`,
« Style »). Elles ne restent pas dans le noyau : `Measured.missingReason` et `Measured.note` sont
**rendus tels quels** à l'écran, par `src/i18n/figureText.ts` depuis le 12 août et, depuis
`w6-contexte`, par le bloc des trous et le détail du refus de `/contexte/:slug`. Relevé le
10 septembre 2026 sur `/contexte/rue-montorgueil-75002-paris`, mirroirs Overpass coupés, cinq
lignes sur six du bloc des trous sont en anglais dans une page en français — par exemple
*« The premises layer did not load for this area, so surrounding activity is unknown rather than
absent. »* sous le titre « Ce que Compass ne sait pas ici ».

**Pourquoi ce n'est pas un défaut de la page.** La page a raison de préférer `missingReason` à
une formule générique : c'est la seule phrase qui sait **quelle** couche manquait. Le défaut est
un cran plus bas — le noyau produit de la prose destinée à l'affichage, et de la prose affichée a
une langue. Deux consommateurs la lisent aujourd'hui, l'écran et le serveur MCP, et ils n'ont pas
la même.

**Ce que serait la correction, et pourquoi elle n'est pas dans ce ticket.** Faire porter à
`Measured<T>` un **motif structuré** en plus de sa phrase — la même distinction que
`mcp-server/src/context.ts` a déjà tranchée pour `QuestionOutcome`, et que `#61` a refusé de
relire dans une chaîne — puis traduire le motif dans `src/i18n/`. Ça touche `src/core/scoring.ts`,
`figureText.ts` et la réponse du serveur MCP : c'est un chantier à soi, pas un correctif de page.
Le contournement bon marché — traduire au `includes()` sur la phrase anglaise — est exactement ce
que `#61` interdit.

**Ce que ça ne rattrape pas.** Même corrigée, la règle ne dira rien des phrases écrites en SQL :
les `evidence` de la base sont produites hors de TypeScript, et `I21` les garde séparément.

> **CLOS le 16 septembre 2026 — `w6-langue-absences` (#181).** Le correctif est celui qui était
> annoncé ci-dessus, et rien d'autre : `src/core/motif.ts` porte `FigureMotif`, une union
> discriminée de six genres, et `motifText(motif, locale)` l'écrit dans la langue du lecteur.
> `Measured<T>` gagne `missing` et `caveats` **à côté de** `missingReason` et `note`, qui
> restent et sont maintenant **dérivés** du motif dans sa colonne anglaise — une source, deux
> langues.
>
> **Ce qui rend le défaut irréversible et pas seulement réparé** : `unavailable(origin, motif)`
> refuse une `string`. Une absence qui ne saurait dire pourquoi que dans une langue ne compile
> plus, y compris sur un axe qui n'existe pas encore — c'est le livrable, pas les cinq phrases
> traduites. Les deux langues vivent dans `src/core/` et non dans `src/i18n/` : ce module est
> celui du navigateur, le serveur MCP ne compile que le noyau, et l'anglais ici avec le français
> là aurait fait deux foyers pour une phrase. La raison est écrite en tête de `motif.ts`.
>
> **Un symétrique non consigné a été trouvé et corrigé avec** : `truncatedNote` de
> `useAddressContext.ts` était écrite en français et partait telle quelle sur `/en/context/`,
> pendant que `mcp-server/src/context.ts` écrivait sa propre version anglaise de la même mise en
> garde. Le défaut n'était donc pas « le noyau est anglais » mais « chaque producteur choisit une
> langue pour un lecteur qu'il ne connaît pas ».
>
> **Mesures, le 16 septembre 2026** : `test` **798 sur 56 fichiers** (785 sur 55 sur `main`),
> `verify:mcp` **48 contrôles, 48 au vert**, dont le contrôle neuf `E8b` qui exige le motif à
> côté de la phrase — **démontré rouge** motif retiré, phrase gardée. Le recensement du critère 1
> est dans `src/core/motif.test.ts` et `src/lib/contextGaps.test.ts`, populations dérivées de
> `MOTIF_KINDS` et de `LAYERS`. Le détail : `docs/tickets/w6-langue-absences.md`, « Livré ».
>
> **Ce que ça ne rattrape toujours pas** : les phrases SQL, comme annoncé — et deux limites que
> le ticket n'avait pas vues. Ces contrôles jugent qu'il y a deux langues, jamais que chacune dit
> vrai ; et aucun bras n'ouvre `/en/context/`, donc une régression propre à la page anglaise
> passerait au vert chaque matin.

---

## 50. La fiche plante quand Overpass tombe, et ne lit pas le corpus — mesuré le 13 septembre 2026

Deux défauts sur le même écran, gardés dans une seule section parce qu'ils se masquent l'un
l'autre : tant que la page meurt, personne ne voit ce qu'elle n'affiche pas.

> **Le plantage est corrigé — `#156`, le 13 septembre 2026 au soir.** Ce qui suit reste écrit
> tel qu'il a été mesuré ; le correctif et **la correction de la chaîne de cause** sont en fin
> de section. L'absence de corpus, elle, est entière et reste `#157`.

**Le plantage.** `/contexte/<adresse>` affiche « Lecture du quartier en cours… » pendant
**2 min 20** — trois miroirs Overpass à 70 s chacun — puis meurt sur
`Cannot read properties of undefined (reading 'layerPointToLatLng')` dans `ContextMap`, et la
frontière d'erreur emporte toute la page. Mesuré en visiteur anonyme sur deux adresses, même
résultat. Overpass rendait **504 sans en-tête `Access-Control-Allow-*`** — mesuré hors
navigateur, 5,1 s, 695 octets, `Content-Type: text/html` : une panne amont, pas une politique,
et le navigateur ne peut que la lire comme un blocage CORS.

**Ce qui rend ce défaut pire que sa cause** : `src/hooks/useAddressContext.ts` écrit que ce
chemin est *« the only path on which the browser can reach the refusal branch of
`composeVerdict` »*. Le refus que `w6-contexte` existe pour produire est donc inatteignable
dans le seul cas qui l'atteint. C'est `#54` retourné — le produit avait appris à ne pas
conclure par-dessus une retenue, pas à y survivre.

**L'absence de corpus.** `useAddressContext.ts` attribue tous les axes à
`uniformOrigins(OSM_ORIGIN(today()))`. Aucun appel `compass_*` sur le chemin de l'écran : ni
BDCom 2023, ni les cessions BODACC, ni `compass_address_timeline`, ni les quatre fonctions de
la phase 6. Le code l'annonce lui-même, deux fois, comme une intention jamais tenue — *« The
day the front reads `compass_*` … »*.

**Pourquoi c'est écrit ici et pas seulement dans une issue** : la répétition est le risque. Une
session qui rebranche la fiche sans lire ceci refera dépendre le corpus d'un miroir public
gratuit, et une issue fermée ne se relit pas. Les mesures complètes, les contre-preuves et les
« Fait quand » sont dans [`#156`](https://github.com/IvandeMurard/paris-compass/issues/156) et
[`#157`](https://github.com/IvandeMurard/paris-compass/issues/157) — cette section ne les
recopie pas.

**Ce que ça ne rattrape pas.** Rien ici ne surveille la page dans la durée : la porte était
entièrement au vert pendant les deux mesures. C'est
[`#158`](https://github.com/IvandeMurard/paris-compass/issues/158), et c'est un défaut distinct
de ces deux-là.

### Le plantage, corrigé le 13 septembre 2026 — et la chaîne de cause était fausse d'un maillon

**Le plantage ne dépendait pas d'Overpass.** C'est la seule chose que ce ticket a dû corriger
dans son propre énoncé. La chaîne écrite plus haut lit le plantage comme le troisième maillon
d'une panne amont ; il est **inconditionnel**. `ContextMap` créait sa carte par `L.map()` **sans
vue**, et une carte Leaflet sans vue n'attache aucune des couches qu'on lui ajoute :
`Map.addLayer` diffère par `whenReady`, qui sur une carte non chargée s'abonne à un événement
`load` que personne n'émettra. Le cercle gardait donc `_map === undefined`, et
`circle.getBounds()` — qui lit `this._map.layerPointToLatLng(...)` — jetait. Que les miroirs
répondent ou non ne changeait rien : la carte était dessinée dans les deux cas.

**Démontré dans les deux sens, hors navigateur puis dans un navigateur réel.**
`src/components/context/ContextMap.test.tsx` monte le composant sous jsdom avec le vrai Leaflet ;
sur le code du 13 septembre au matin (`3cb9b5d`) **quatre de ses cinq cas échouent**, dont deux
sur le message exact de production, et le premier de ces deux monte un instantané **complet** —
miroirs debout — ce qui est la démonstration que la panne amont n'était pas la cause. Et dans
Chrome sans tête, contre le build de production servi depuis le disque, miroirs refusant
d'emblée : **écran d'erreur à 244 ms, zéro carte, zéro constat, zéro trou**. Le détail des
scénarios est dans `docs/tickets/w6-fiche-robuste.md`.

**Les trois gestes.** Le cadre de la carte se calcule depuis le point sans carte du tout
(`src/lib/contextMapFrame.ts`), la vue est posée avant la première couche, et un point sans
bornes utilisables rend une absence écrite ; le budget d'attente appartient à l'appelant
(`CONTEXT_BUDGET_MS`, 10 s pour la fiche, marche entière pour `/carte`) ; et le bloc des trous
nomme la panne — « source injoignable » vient de `withholdingText`, dans le noyau.

**Les miroirs remesurés le même jour, en fin d'après-midi**, requête réelle de la fiche, cinq
adresses, chemin agent avec un `User-Agent` de navigateur :

| Miroir | Ce qu'il a rendu |
| --- | --- |
| `overpass-api.de` | **406 Not Acceptable** (Apache) en **149 à 277 ms**, cinq fois sur cinq — il refuse la requête d'emblée |
| `overpass.kumi.systems` | **504** à 34 955, 40 179, 42 701 et 43 315 ms, ou rien au-delà de 70 s |
| `overpass.private.coffee` | **200** en **8 981**, **10 587** et **19 513 ms** ; **504** à 36 574, 38 481 et 40 915 ms ; ou rien au-delà de 70 s |

Marches complètes des trois miroirs : avenue Daumesnil **aucune réponse après 112 981 ms**,
boulevard Barbès **aucune après 140 175 ms**, rue de Rivoli répondue après 59 869 ms, rue du
Commerce après 79 156 ms. Le 504 de 695 octets en `text/html` sans `Access-Control-Allow-*` est
confirmé sur deux miroirs.

**Le « 504 en 5,1 s » de l'énoncé ne se reproduit pas**, et c'est à savoir avant de s'en servir
comme d'un ordre de grandeur : le même endpoint rend maintenant **406 en 0,2 s**, et les 504
observés ailleurs prennent **35 à 43 secondes**. La conclusion du ticket tient — 406 comme 504
sont des pannes amont, aucune ne porte d'en-tête CORS, et le navigateur ne peut que lire les
deux comme un blocage — mais le chiffre, lui, était un échantillon.

**Ce que le correctif ne rattrape pas.** La fiche est **survivable**, pas **utile** : sous ce
budget, et avec le miroir qui répond en troisième position derrière un qui met 40 s à expirer,
elle refuse. C'est `#157` qui la remplit. §49 n'est pas touché non plus : le motif est
désormais en français — « source injoignable » — mais la phrase qui le suit vient toujours de
`src/core` en anglais.

### Corrigé sur `main`, et le visiteur le rencontre encore — mesuré le 13 septembre 2026 au soir

**Le correctif est fusionné depuis 21:07 UTC et la production plante toujours.** Premier relevé
du quinzième bras (`#158`), le soir même, sur `https://paris-compass.lovable.app` :
`/contexte/rue-de-bretagne-paris?lat=48.863100&lng=2.362100` reste sur « Lecture du quartier en
cours… » au-delà du délai de 14 000 ms — bras en **1** à deux passages, 14 176 et 14 055 ms —
puis meurt à **95 945 ms** sur le message exact d'avant le correctif, `Cannot read properties of
undefined (reading 'layerPointToLatLng')`. Au même moment, le build de `main` servi depuis le
disque rend son **refus nommé à 10 214 ms** et son **verdict à 9 580 ms** quand un miroir répond.

**La cause n'est pas dans le dépôt** : `npm.cmd run servi` sort en **1** le même soir — 623 736
octets en deux bundles, `index-C6IZoiXB.js` et `App-DyTrLRE9.js`, **274 jetons sur 276 trouvés**,
les deux manquants étant `map.unreachable [fr]` et `[en]`, posés par `#145`. Le bundle servi est
donc antérieur non pas à `#156` mais à une fusion encore plus ancienne. Lovable n'a pas republié.

**Ce que ça change à la lecture de cette section.** Le plantage reste écrit « corrigé » parce
qu'il l'est là où ce dépôt peut agir ; mais **un défaut corrigé que le visiteur rencontre encore
n'est pas un défaut résolu pour lui**, et rien avant le quinzième bras ne pouvait le dire.
`porte:publie` lit une configuration, qu'un bundle de trois semaines porte aussi bien qu'un
neuf ; `servi` dit que le site est en retard, jamais ce que ce retard coûte à l'écran. C'est
exactement la distinction que `#158` existe pour tenir, et son premier passage l'a rendue.

**Ce que ça ne rattrape toujours pas.** Ni ce dépôt ni ce bras ne publient : le déploiement
appartient à Lovable. Le bras dit que la page est muette, jamais pourquoi, et il restera rouge
chaque matin jusqu'à la republication — ce qui est le comportement voulu, et non un bras à
désarmer.

### L'absence de corpus, close le 14 septembre 2026 — `w6-fiche-corpus` (`#157`)

**La fiche appelle `compass_*`.** Les locaux viennent de `compass_scoring_context_within`,
millésime 2023, avec la licence et la date lues sur `compass_vintages` — jamais écrites dans le
code, parce que seule la base les connaît. Les équipements et la voirie restent sur Overpass, donc
`LayerOrigins` cesse d'être uniforme sur cette page comme elle l'a cessé sur le chemin de l'agent
le 15 août. Un axe neuf, **`density`**, ne lit que la couche du corpus : c'est le constat qui reste
affiché quand les trois miroirs sont muets, et il est porteur.

**Ce que ça règle, et ce que ça ne règle pas.** L'inversion de dépendance est défaite : mesuré rue
de Bretagne le 14 septembre 2026, chemin anonyme, **920 locaux dans 400 m en 144 à 735 ms** contre
8 981 à 43 315 ms pour un miroir Overpass quand il répond. Mais servir le corpus ne le rend pas
lisible : la fiche porte désormais **six** constats, borne haute de ce que `w6-contexte` demande,
et le choix de ce qu'on montre reste ouvert. §49 n'est pas touché — les raisons d'absence écrites
par `src/core` sont toujours en anglais, et les trois raisons neuves du corpus sont en français,
ce qui rend le mélange plus visible, pas moins.

**Et la vacance n'est toujours pas servie, pour une raison de licence et non de code.** BDCom 2023
est `retail_only` : **0 local vacant sur 60 845 relevés**, contre 7 853 en 2017 et 8 764 en 2020,
mesuré le 14 septembre 2026. `PremisePoint.status` ne peut donc valoir que `occupied` sur cette
couche, des deux côtés. La distinction est morte dans les données et vivante dans le type — la
supprimer ferait ressembler la réponse de l'APUR à un changement de code.

---

## 51. Un compte de locaux plafonné à mille, rendu comme un total — mesuré le 14 septembre 2026 par `w6-fiche-corpus`

**Fichiers :** `mcp-server/src/context.ts` (`fetchPremises`), `src/core/scoring.ts`

`compass_scoring_context_within` sélectionne tous les locaux du rayon et rend `total_matched` sur
chaque ligne — le compte AVANT tout plafond. PostgREST, lui, plafonne la réponse à sa propre limite
de lignes. La colonne était dans le type de ligne du serveur MCP **depuis le 15 août** et n'était
lue nulle part : la couche était déclarée chargée, la mandataire de passage calculée sur ce qui
était arrivé, et le chiffre rendu à l'agent comme un nombre mesuré estampillé « APUR BDCom 2023 »,
sans la moindre réserve.

**Mesuré rue de Bretagne (48.8631 / 2.3621), BDCom 2023, par PostgREST en `anon`, le 14 septembre
2026** — et l'en-tête `Range` ne le lève pas, c'est un réglage de serveur :

| Rayon | Lignes rendues | `total_matched` | Part rendue |
| ---: | ---: | ---: | ---: |
| 300 m | 584 | 584 | 100 % |
| 400 m | 920 | 920 | 100 % |
| 500 m | 1 000 | 1 416 | 70,6 % |
| 600 m | 1 000 | 1 981 | 50,5 % |
| 800 m | 1 000 | 3 528 | 28,3 % |
| 2 000 m | 1 000 | **17 190** | **5,8 %** |

**Le rayon de 2 000 m n'est pas théorique** : c'est celui que `score_location`, `explain_score` et
`compare_locations` annoncent dans leur schéma d'entrée (`radius_m: z.number().positive().max(2000)`),
et un agent qui lit ce schéma le croit — c'est l'argument exact qui a fait reconduire le plafond en
fermant `#64`. À ce rayon l'agent recevait donc **5,8 %** du corpus, présenté comme le tout.

**C'est §16 sous une autre forme** — un point hors corpus rendu comme un quartier sans commerces —
et la parenté est utile : dans les deux cas la requête RÉUSSIT, la couche compte comme chargée, et
le défaut n'a aucun symptôme. Ici il est même plus discret, parce que le chiffre rendu est
plausible : une densité calculée sur mille locaux au lieu de dix-sept mille ne ressemble pas à une
erreur, elle ressemble à un quartier moins dense.

**Corrigé le 14 septembre 2026, sur les deux surfaces à la fois**, parce qu'une réserve qui ne
tiendrait que sur l'écran ferait diverger les deux réponses — ce que `#157` exige au contraire de
tenir. `scoreLocation` prend un quatrième argument facultatif, `LayerNotes`, et la troncature y
remonte en `note` plutôt qu'en absence : un plancher est une vraie lecture, et le retirer coûterait
plus qu'il ne protège. Le noyau ne peut pas la déduire seul — on lui passe un tableau, et un
tableau est tout ce qu'il a —, donc elle vient de l'appelant qui a fait la requête et détient les
deux nombres. La fiche, elle, demande le corpus à **400 m** et pas plus : c'est le rayon que ses
deux chiffres comptent, donc demander plus large achèterait une troncature et pas des lignes.

**Ce que ça ne rattrape pas.** La limite du serveur n'est pas levée, seulement dite : au-delà
d'environ mille locaux dans le rayon, la réponse reste un plancher, et un appelant qui veut le
total doit rétrécir son rayon. Pagination et agrégation côté base sont toutes deux possibles et
aucune n'est faite ici — ce serait un ticket, pas un à-côté de session.

---

## 52. L'axe `tissu commercial` lit 100 sur la moitié de Paris — mesuré le 14 septembre 2026 par `w6-fiche-corpus`

**Fichier :** `src/core/scoring.ts` (`PREMISE_SATURATION`)

L'axe neuf de `#157` est honnête — un compte de locaux relevés, une courbe saturante publiée, une
provenance qui se déplie — et **presque constant sur la population qui compte**. La constante de
saturation vaut 90, héritée de la moitié « locaux » de la mandataire de passage, où elle ne pesait
que 65 % d'un mélange. Seule, elle atteint 100 dès **415 locaux**, ce qu'une rue commerçante
parisienne dépasse largement.

**Mesuré à 400 m, BDCom 2023, appelant anonyme, douze points**, avec ce que d'autres constantes
auraient rendu sur les mêmes comptes :

| Lieu | Locaux | s = 90 | s = 200 | s = 400 |
| --- | ---: | ---: | ---: | ---: |
| Les Halles (1er) | 1 200 | 100 | 100 | 95 |
| rue Montorgueil (2e) | 1 171 | 100 | 100 | 95 |
| rue de Bretagne (3e) | 920 | **100** | 99 | 90 |
| Batignolles (17e) | 745 | 100 | 98 | 84 |
| place d'Italie (13e) | 425 | 99 | 88 | 65 |
| rue de Belleville (19e) | 404 | 99 | 87 | 64 |
| avenue Foch (16e) | 261 | 94 | 73 | 48 |
| porte de Vanves (14e) | 104 | 69 | 41 | 23 |
| quai de Bercy (12e) | 95 | 65 | 38 | 21 |
| parc des Buttes-Chaumont (19e) | 80 | 59 | 33 | 18 |
| bois de Boulogne (16e) | 1 | 1 | 0 | 0 |
| bois de Vincennes (12e) | 0 | 0 | 0 | 0 |

**Six points sur douze rendent 99 ou 100**, et ce sont exactement les adresses qu'un preneur
regarde. L'axe sépare un parc d'une rue ; il ne sépare pas Belleville des Halles, qui est la
question posée.

**Ce n'est pas corrigé, et le refus de corriger est le fond du point.** Trois raisons, dans
l'ordre : `PREMISE_SATURATION` est **partagée** avec la mandataire de passage et **publiée** sur
`src/pages/Methodology.tsx` (« même courbe saturante, constante 90 »), donc la bouger change un
chiffre rendu à l'agent comme au visiteur, sur un axe dont `#157` ne traite pas ; lui donner une
constante propre ferait deux nombres comptant la même chose dans le même rayon, ce que ce dépôt
range parmi les manières dont deux nombres divergent ; et **choisir 200 ou 400 aujourd'hui sur
douze points serait choisir un nombre parce que le tableau est plus joli** — le geste que la règle
des baselines refuse ailleurs. Ce qu'il faut est une décision produit sur ce que « dense » veut
dire pour un preneur, et une mesure sur une population, pas douze points.

**Ce que ça ne remet pas en cause.** L'axe reste porteur à bon droit : ce qu'il porte est la
**disponibilité** — il est le seul constat qui survit à trois miroirs morts — et le **refus** hors
corpus, où il rend `n/d` et empêche un verdict composé sur Massy à partir d'OpenStreetMap seul. Les
deux tiennent quelle que soit la constante. Ce qui est faible est son pouvoir *discriminant* à
l'intérieur de Paris commerçant, et rien de ce qu'il affiche n'est faux.

**Décision attendue d'Ivan**, et elle est étroite : garder 90 partagée, ou publier une constante
propre au tissu commercial avec la mesure qui la justifie. `#157` n'a pas tranché seul parce que la
première branche touche une formule publiée que son périmètre écarte.

---

## 53. Hors corpus, deux couches neuves rendaient un zéro mesuré au lieu d'une absence

**Trouvé à l'écran le 15 septembre 2026, pendant la démonstration du critère 5 de
`w6-amenites-corpus`, et corrigé avant la livraison.** Pas en relecture : la contre-preuve du
ticket — « un point hors de Paris intra-muros rend toujours un refus nommé » — a été jouée dans
Chrome sans tête contre le build local, et l'écran a montré autre chose que ce que le code était
censé faire.

**Ce que Massy affichait**, miroirs Overpass coupés, avant correction :

> **Pas de verdict ici** — le tissu commercial : hors du corpus ; le passage : hors du corpus.
>
> DESSERTE FERRÉE **0/100** · SERVICES MARCHANDS À PIED **0/100**

Le refus était juste — `density` et `footfall` lisent `premises`, qui porte bien
`out_of_corpus` — mais **deux axes affichaient un chiffre**, et ce chiffre était fabriqué. Massy
a des commerces et une gare du RER B.

**La cause, et elle est structurelle plutôt qu'accidentelle.** Les deux fonctions que les couches
neuves appellent **réussissent** hors de Paris et rendent zéro ligne :

| Fonction | Pourquoi zéro ligne hors de Paris | Marqueur ? |
| --- | --- | :---: |
| `compass_premises_within` | aucun local dans les 80 quartiers | **aucun** — c'est le §36, encore ouvert |
| `compass_station_profile` | `idfm_station` est restreinte à Paris **à l'ingestion** (`zdapostalregion like '751%'`) | aucun |
| `compass_scoring_context_within` | idem | **`out_of_corpus`**, posé par `20260825000003` |

Une couche qui répond et ne rend rien compte comme « chargée et vide », et `src/core` lit alors un
vrai zéro — ce qui est le comportement CORRECT et voulu à l'intérieur de Paris : le bois de
Vincennes n'a réellement aucun local dans 400 m ni aucun arrêt ferré dans 800 m, et effacer cette
réponse détruirait la seule chose que la couche dit avec certitude. La distinction ne peut donc pas
se faire sur la vacuité ; elle ne peut se faire que sur la frontière, et **une seule fonction la
connaît**.

**C'est `DIAGNOSTIC.md` §16 un cran plus loin.** §16 était « un point hors corpus rendu comme un
quartier sans commerces », clos le 25 août par le marqueur `out_of_corpus`. Le marqueur a tenu ; ce
qui n'a pas tenu est qu'il n'existe que sur **une** des trois fonctions, et que deux couches neuves
sont arrivées à côté sans hériter de sa réponse.

**Corrigé** dans `src/hooks/useAddressContext.ts` et `mcp-server/src/context.ts`, des deux côtés
et par la même règle : `compass_scoring_context_within` reste la **seule autorité** sur la
frontière, et les couches `services` et `stations` sont retirées avec `premises` quand elle répond
`hors_corpus`. Un second test de frontière dans chaque couche aurait été une deuxième autorité sur
la même question, libre de contredire la première.

**Ce que le correctif ne rattrape pas**, et il faut le nommer :

- Il protège les **appelants** de ces fonctions, pas les fonctions elles-mêmes. Un agent qui
  appelle `compass_premises_within` en direct par PostgREST reçoit toujours zéro ligne à Massy,
  indistinguable d'un rayon vide : **c'est exactement le §36, qui reste ouvert**
  ([#80](https://github.com/IvandeMurard/paris-compass/issues/80)). La sortie durable est un
  marqueur `out_of_corpus` sur cette fonction-là, donc une migration.
- Il est tenu par un test unitaire (`src/hooks/useAddressContext.test.ts`) et non par un
  invariant : rien dans la base n'empêche une **troisième** couche d'arriver demain sans hériter
  de la frontière. La règle est écrite ici et dans les deux fichiers ; elle n'est pas mécanique.
## 54. `brief` assemblait un prompt de session complet pour une issue fermée, sans le dire

**Mesuré le 15 septembre 2026, en en étant la victime.** Une session a été lancée sur
`w6-fiche-delai` (`#180`) alors que l'issue était **fermée depuis 11:09** — livrée par `#185`,
complétée par `#186`, démonstration en commentaire, table d'ordre déjà régénérée et
`sessions:check` vert. Rien dans le prompt assemblé ne le disait. La session a payé la lecture du
ticket, de `REPRISE.md`, des pièges et du code avant de découvrir elle-même que son « Fait quand »
était un critère périmé.

**Deux défauts indépendants, tous deux dans `scripts/brief.ts`.**

**a. L'état de l'issue était demandé puis jeté.** `issueNumber()` appelait
`gh issue list --state all` — donc les fermées comprises, volontairement — mais ne lisait que
`--json number,title`. Le champ `state` n'était jamais demandé, donc jamais lu. Une issue fermée
et une issue ouverte produisaient exactement le même prompt. C'est le défaut porteur : à lui seul
il aurait arrêté la session en trois lignes.

**b. La coupe du rapport de clôture ne reconnaissait pas le vocabulaire courant.** Le brief dit à
la session quelle part du ticket est le sujet et quelle part est le rapport d'une session déjà
close. La coupe cherchait `^#{1,3} Fait (le|les) `. Population mesurée le 15 septembre :
**20 fichiers de `docs/tickets/` portent un rapport de clôture, 4 ne correspondaient à rien** —
`w0-provenance` (`## Fait — mesuré le …`), `w6-fiche-corpus`, `w6-amenites-corpus` et
`w6-fiche-delai` (`## Livré …`). **Les trois plus récents sont des ratés** : la convention
`Livré` est la plus neuve, donc le défaut s'aggravait. Pour `w6-fiche-delai`, le brief disait
`docs/tickets/w6-fiche-delai.md — en entier`, servant à la session son propre rapport de clôture
comme travail à faire.

### Ce qui est corrigé, et démontré

`issueDuTicket()` lit `state` et rend `clos: boolean | null`. Sur `clos === true`, un bloc
`ARRÊTE-TOI ET LIS CECI D'ABORD` ouvre la sortie collable **avant** le prompt commun — même place
que le rouge en retard, et pour la même raison — et un `[STOP]` part sur `stderr` pour la personne
devant le terminal. `clos === null` (GitHub injoignable, ou aucune issue ne nomme le ticket) dit
qu'il ne sait pas, et **ne se fait jamais passer pour « ouvert »**.

La coupe devient `coupeRapport()`, exportée et testée : `Fait le`, `Fait les`, `Fait —`, `Livré`.

Démonstration, le 15 septembre 2026 :

| `npm.cmd run brief <ticket>` | avant | après |
| --- | --- | --- |
| `w6-fiche-delai` (#180, **fermée**) | aucune mention ; `— en entier` | bandeau `#180 est FERMEE` + `[STOP]` ; `les 71 premières lignes seulement`, 68 lignes de rapport écartées |
| `w6-langue-absences` (#181, **ouverte**) | prompt ordinaire | **inchangé** — aucun bandeau, aucun `[STOP]` |

**Une regex qui ne pouvait pas marcher, et qui est le vrai enseignement.** La première correction
écrivait `/Livré\b/`. Elle ne matchait **jamais** : `é` n'est pas un caractère de mot pour une
regex JavaScript, donc il n'existe aucune frontière `\b` entre lui et l'espace qui suit. Les trois
rapports `Livré` continuaient de passer au travers, et le test l'a montré avant que le code ne
parte. Remplacé par `(?=\s|$)`.

**Pourquoi la coupe reste lexicale.** Reconnaître un rapport de clôture à sa *date* plutôt qu'à son
*verbe* a été essayé et mesuré : six titres datés vivent dans des tickets **ouverts** —
`## Avancement — …`, `## État — …`, `## Relevé des appelants … — mesuré le …`, `## Ce que la pose
a mesuré — …`, et deux décisions d'Ivan. Couper dessus amputerait six briefs de leur sujet. Le
verbe est donc le signal, et la liste des verbes est une liste, avec ce que ça implique ci-dessous.

### Ce que ça ne rattrape pas

- **La liste des verbes reste une liste.** Un septième mot de clôture inventé demain ne sera pas
  reconnu. `scripts/brief.test.ts` rougit dès qu'un titre commençant par `Fait`, `Livr`, `Clos`,
  `Fermé` ou `Terminé` échappe à la coupe — mais ce filet est lui-même une liste de mots, et il ne
  voit pas un verbe hors de ces cinq.
- **Rien n'apparie l'état GitHub au fichier du ticket.** Une issue fermée dont le ticket ne porte
  aucun titre de clôture n'est signalée par personne. L'appariement demanderait un jeton, donc un
  bras à la manière de `sessions:check`, et il n'existe pas. C'est le défaut `a` qui protège ce
  cas, pas le défaut `b` : le bandeau se déclenche sur l'état de l'issue, jamais sur la prose.
- **Le garde-fou protège `brief`, pas une session lancée à la main.** Une session dont le prompt
  est écrit sans passer par `npm.cmd run brief` ne voit aucun bandeau. C'est exactement ce qui
  s'est produit ici.

## 55. Le dossier exporté citait la Base Adresse Nationale sur un libellé qu'elle n'avait pas rendu

**Trouvé à l'écran le 15 septembre 2026**, à la première exécution de la démonstration de
`w6-dossier` (#33) — pas en relecture, et pas par un test : le fichier téléchargé par un vrai
Chrome sans tête a été ouvert et lu ligne à ligne, et son en-tête disait ceci.

> `"address": { "label": "rue de bretagne paris", "source": "Base Adresse Nationale",`
> `"licence": "Licence Ouverte (Etalab 2.0)" }`

**Ni la moitié ni l'autre ne venaient de la BAN.** `src/pages/Context.tsx` rend
`geocoded.data?.label ?? search`, où `search` est le slug de l'URL dé-slugifié — d'où les
minuscules et l'accent manquant, que la BAN n'aurait jamais rendus. Les coordonnées, elles,
viennent de la chaîne de requête. Le clic a eu lieu **2,1 s** après le verdict, c'est-à-dire
pendant que la BAN répondait encore : la fiche affiche à ce moment-là le texte provisoire, ce qui
est son comportement voulu depuis `w6-contexte`, et le dossier le recopiait en lui attribuant un
producteur.

**C'est `Measured<T>` à l'envers, à l'endroit exact où ça compte le plus** : une provenance qui
nomme quelqu'un qui n'a rien produit, dans le seul document de ce produit qui soit destiné à être
transmis à un tiers et signé. Un lecteur qui voudrait recouper ce libellé auprès de la BAN ne le
retrouverait pas, et conclurait que c'est la BAN qui a tort.

**Corrigé dans `src/services/opendata/geocoding.ts`** : `banSource(locale, resolved)` rend la
provenance de la BAN **seulement** quand elle a répondu, et sinon celle de l'URL, nommée comme
telle — « Libellé et coordonnées lus dans l'URL — la Base Adresse Nationale n'avait pas
répondu », licence « indéterminée ». Les deux cas sont mesurés dans le même navigateur : clic à
0,9 s, provenance URL ; clic après 13 s, « Rue de Bretagne 75003 Paris », BAN, Licence Ouverte
(Etalab 2.0).

**Le second défaut de la même exécution, et il a la même forme.** `noise` descendait en
`indetermine` alors que la couche OpenStreetMap était encore **en route** : `#180` a construit à
l'écran la distinction entre « source injoignable » — un trou sur lequel revenir — et « mesure en
cours » — une réponse qui arrive, et le fichier la perdait au dernier pas, dans l'objet qui
circule. `DossierFigure.pending` la porte désormais, et ce n'est **pas** un cinquième
`Withholding` : les quatre reflètent `public.question_outcome` et nomment chacun une issue
décidée, celle-ci nomme une issue non décidée.

### Ce que ça ne rattrape pas

- **La provenance de l'adresse est déclarée par l'appelant, jamais vérifiée.** `banSource` croit
  le booléen qu'on lui passe ; un appelant qui passerait `true` sur un libellé inventé produirait
  la même fausse citation. La règle vit dans `src/pages/Context.tsx`, qui est le seul appelant, et
  elle n'est pas mécanique.
- **Aucun des deux défauts n'était visible sans ouvrir le fichier.** Le test unitaire du dossier
  était vert sur les deux, et il le serait resté : il joue des gabarits où la BAN a toujours
  répondu et où rien n'est en vol. Ce qui les a montrés est d'avoir lu un fichier réel, produit
  par un vrai navigateur contre le vrai distant — et le test qui les tient aujourd'hui a été écrit
  **après**, ce qui est l'ordre que `DIAGNOSTIC.md` §53 avait déjà établi.
