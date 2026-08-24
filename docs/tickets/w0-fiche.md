# [P0] w0-fiche — Fiche locale + timeline dans l'interface

**ID** `w0-fiche` · **vague 0** · **Q3 2026** · **P0**
**Dépend de** `w0-deploy`
**Sources** `bdcom`, `bodacc`

## Pourquoi
Le MCP a trace_premise ; le navigateur non. L'historique du local est le produit, pas un accessoire.

## Comment
Brancher compass_address_timeline sur la fiche. Chaque ligne : source, date, niveau, justification. observed=false → « non observé », jamais vacant ni « plus un commerce ».

## Doctrine
L'historique justifie le taux de rotation rapporté à la rue ; il ne le remplace pas.

## Fait quand
Un local des Halles affiche 2017 → 2020 → 2023 (ou withheld) + événements BODACC, sans coalesce sur le libellé.

Voir [`docs/PLAN-ACTION-VACANCE.md`](../PLAN-ACTION-VACANCE.md). Relit `docs/PLAN.md`, `docs/PERIMETRE.md`.

---

## Fait le 24 août 2026 — le critère est démontré en direct

**Ce ticket redit `docs/PLAN.md` §2.7**, « La fiche locale : le consommateur qui manque »,
qui porte le même manque depuis le 12 août. `docs/PLAN-ACTION-VACANCE.md` l'avait déjà
relevé dans « Ce que ce document ne couvre pas ». Les deux sont clos ensemble et se citent
l'un l'autre, plutôt que laissés diverger.

### Le chiffre d'entrée, remesuré

Le ticket affirme « le MCP a `trace_premise` ; le navigateur non ». **Vrai, et plus fort que
ça** : `grep -rn "\.rpc(" src/` rendait **zéro occurrence** le 24 août avant ce chantier, et
`compass_` n'apparaissait dans aucun fichier de `src/`. Supabase n'y servait qu'à
l'authentification et aux quatre tables utilisateur. C'est le constat de `PLAN.md` §2.7 mot
pour mot, toujours exact douze jours plus tard.

### Ce qui est démontré, contre le distant et dans le navigateur

`npm.cmd run dev`, clé publiable seule, appelant **anonyme** — le seul que le navigateur
sache être. Local **3 RUE JOUR**, quartier **Halles**, 1er arrondissement, identifiant BDCom
**1250**, ouvert depuis la carte du local OpenStreetMap « Local vacant (ancien sewing) »,
9-11 rue du Jour :

| Date | Ce que la fiche affiche | Niveau | Source |
| --- | --- | --- | --- |
| 16 septembre 2015 | Dépôt de l'état des créances · LITTLE FASHION GALLERY | Corroboré | BODACC · Licence Ouverte · `A201501771875` |
| 3 mars 2016 | Jugement de clôture pour insuffisance d'actif · LITTLE FASHION GALLERY | Corroboré | BODACC · Licence Ouverte · `A201600441603` |
| **2017** | **Millésime retenu** | Indéterminé | APUR BDCom 2017 · Licence custom |
| 23 juin 2017 | Autre jugement prononçant · EXCELLENCE & COMPAGNIE | Corroboré | BODACC · Licence Ouverte · `A201701192518` |
| 8 avril 2018 | Jugement de clôture pour insuffisance d'actif · EXCELLENCE & COMPAGNIE | Corroboré | BODACC · Licence Ouverte · `A201800681758` |
| **2020** | **Millésime retenu** | Indéterminé | APUR BDCom 2020 · Licence custom |
| **2023** | **Prêt-à-porter Homme** · AGNES B | Établi | APUR BDCom 2023 · ODbL-1.0 · `bdcom:2023:1250` |

**2017 → 2020 → 2023 (ou `withheld`) + événements BODACC** : c'est le « Fait quand », et il
est joué, pas supposé. **Sans coalesce sur le libellé** : les lignes 2017 et 2020 n'affichent
ni l'activité 2023, ni l'enseigne, ni le nom OpenStreetMap de la carte d'où le panneau a été
ouvert — elles disent « Millésime retenu », et rien d'autre.

Vérifié aussi en anglais (`/en`) sur 82 rue Montorgueil : « Withheld vintage », « Undetermined ».

### `observed = false` : implémenté et testé, mais pas atteignable aujourd'hui

Le piège du ticket est tenu — `observed = false` rend **« Non observé »**, jamais « vacant »
ni « plus un commerce » — et c'est vérifié par test unitaire sur la ligne exacte que le
distant renvoie (local 54653, millésime 2023).

**Mais un appelant anonyme ne peut pas atteindre cette ligne aujourd'hui.** La liste de
candidats est tirée de `compass_premises_within` épinglé sur 2023 : un local y figure
*parce qu'il a une observation 2023*, donc sa ligne 2023 vaut toujours `observed = true`.
Et 2017 comme 2020 reviennent `withheld`, jamais `false`. La branche s'allumera le jour où la
licence APUR sera lue : un local relevé en 2023 mais absent de 2017 affichera alors
« Non observé » pour 2017. C'est donc du travail **prêt d'avance**, pas du travail
non fait — et il ne fallait surtout pas l'écrire au moment où la licence tombe.

### Le rattachement OpenStreetMap → BDCom, et pourquoi la fiche ne choisit pas

**Mesuré le 24 août 2026** sur 658 locaux OpenStreetMap autour des Halles (boîte
48,8595–48,8650 / 2,3400–2,3500, `shop` + `disused:shop` + `was:shop`), contre les locaux
BDCom 2023 dans 800 m :

| Distance au local BDCom le plus proche | p10 | p25 | **p50** | p75 | p90 | max |
| --- | --- | --- | --- | --- | --- | --- |
| mètres | 1 | 2 | **5** | 24 | 58 | 101 |

| Rayon | Aucun candidat | Exactement un | Médiane des candidats | Maximum |
| --- | --- | --- | --- | --- |
| 10 m | 35 % | 17 % | 1 | 13 |
| 15 m | 29 % | 8 % | 2 | 120 |
| 20 m | 26 % | 4 % | 3 | 120 |
| **25 m** | **24 %** | **3 %** | **5** | **125** |
| 40 m | 18 % | 1 % | 13 | 136 |

**Les deux jeux ne partagent aucun identifiant.** Sur les 275 locaux OpenStreetMap qui
portent une adresse, **154 seulement** ont le même numéro et la même voie que leur plus
proche voisin BDCom. Et le plus proche est souvent le mauvais commerce : « Les Trésors Pets »
dans OpenStreetMap a **« BA&SH » à 0 m** dans BDCom ; « Carhartt Work in Progress » a
« STUDIO PIERRE CARDIN ».

**Choisir le plus proche aurait donc rattaché l'histoire d'un local à un autre** — la seconde
des deux erreurs fondatrices de `PLAN.md` §2.5, refaite à un nouvel endroit. La fiche liste
les candidats dans 25 m avec leur adresse, leur activité, leur enseigne et leur distance, et
laisse le lecteur trancher. Le cas « Mariage Frères » le montre : 13 candidats dans 25 m, dont
le bon à 3 m — mais aussi LE REPAIRE DE BACCHUS à 6 m et LITTLE ITALY à 6 m.

Rayon retenu : **25 m**. Plus serré exclut le bon candidat une fois sur quatre de plus
(le p75 est à 24 m) ; plus large rend la liste illisible (médiane 13 à 40 m).

### Ce qui a été écrit

| Fichier | Rôle |
| --- | --- |
| `src/i18n/timelineText.ts` | Ce qu'une ligne a le droit de dire. Pur, sans DOM, **17 tests**. |
| `src/services/compass/premiseHistory.ts` | Les deux premiers appels `.rpc()` du navigateur. Relaie, ne reformule pas. |
| `src/hooks/usePremiseHistory.ts` | Les deux requêtes, tirées seulement quand le panneau s'ouvre. |
| `src/components/PremiseHistorySheet.tsx` | Le panneau en deux temps : rattachement, puis chronologie. |
| `src/components/PropertyCard.tsx` | Le bouton « Historique », distinct de « Détail » qui reste OpenStreetMap. |
| `src/types/database.ts` | Signatures des deux RPC, pour que l'appel soit typé. |
| `src/pages/Methodology.tsx` | La règle des trois états, les quatre niveaux et la mesure ci-dessus, publiés. |

**Portes au vert** : `tsc --build` sans erreur, **96 tests** sur sept fichiers (73 le 23 août,
94 après ce chantier hors correctifs, 96 au final), `build` **et** `build:dev` passent.

### Ce qui reste, et qui n'était pas dans le critère

- **Le panneau ne s'ouvre que depuis la vue liste.** Les popups Leaflet sont des chaînes HTML
  brutes (`useMapLayers.ts`) : y poser un bouton demande un pont d'événements dans une couche
  qui porte déjà un défaut ouvert au `DIAGNOSTIC.md`. Volontairement laissé de côté.
- **Les quatre chantiers que `PLAN.md` §2.7 met « à faire dans la foulée »** — dénominateur
  par couche, cinq scores par catégorie, troncature à 120 affichée, air par local — ne sont
  pas faits. Ils restent sous §2.7.
- **`evidence` et `confidence_reason` restent en français sur la page anglaise.** Ce sont les
  pièces, relayées telles quelles ; les traduire serait les réécrire. Consigné au
  `DIAGNOSTIC.md`.
