# BDCom (APUR) — schéma vérifié et pièges

Relevé directement sur le service ArcGIS de l'APUR le 8 août 2026. Tout ce qui suit est
**vérifié sur le service**, pas déduit de la documentation.

---

## 1. Pas besoin de télécharger de fichier : il y a une API REST

Les jeux sont servis par un ArcGIS MapServer public, interrogeable en JSON et GeoJSON, avec
pagination et agrégation côté serveur.

| Millésime | Service |
| --- | --- |
| 2023 | `https://carto2.apur.org/apur/rest/services/BDCOM/bdcom2023/MapServer/0` |
| 2020 | `https://carto2.apur.org/apur/rest/services/BDCOM/bdcom2020/MapServer` |
| 2017 | via le portail `opendata.apur.org` (item ArcGIS séparé) |

Paramètres utiles :

```
?f=json                                   → schéma de la couche (champs + domaines)
/query?where=1=1&returnCountOnly=true     → comptage
/query?where=1=1&outFields=*&f=geojson&resultOffset=0&resultRecordCount=1000
/query?...&groupByFieldsForStatistics=niv8&outStatistics=[...]   → agrégats
```

**`maxRecordCount` vaut 1000** : l'ingestion doit paginer via `resultOffset`. La pagination est
supportée (`supportsPagination: true`), le format GeoJSON aussi.

**Projection source : Lambert 93 (EPSG:2154)**, annoncée `wkid 102110 / latestWkid 2154`. À
reprojeter en WGS 84 à l'ingestion, ou à demander directement au service via `outSR=4326`.

---

## 2. Schéma vérifié — BDCOM 2023, couche 0

| Champ | Type | Signification |
| --- | --- | --- |
| `OBJECTID` | OID | Identifiant technique ArcGIS, **non stable entre publications** |
| `c_ord` | Integer | Alias « Identifiant » — identifiant métier du local |
| `arro` | Integer | Arrondissement |
| `qua` | Integer | Quartier |
| `num` | Integer | Numéro dans la voie |
| `let` | String(1) | Lettre dans la voie (bis, ter…) |
| `typ_voie` | String(5) | Type de voie |
| `lib_voie` | String(60) | Libellé de la voie |
| `seq` | Integer | Rang dans la pile de l'adresse |
| `sit` | String(2) | Situation : `R` sur rue, `A` en angle, `CI` en cour d'immeuble, `CC` en concentration commerciale |
| `type` | String | Type du local, 12 valeurs : `C` Commerce, `A` Atelier, `B` Bureau, `E` Équipement, `K` Kiosque, `S` Entrepôt, `T` Commerce de gros, **`V` Local vacant**, `X` Services aux entreprises, `Y` Médical, `Z` Spectacles, `D` Distributeur automatique |
| `codact` | String(5) | Code d'activité fin — inclut `AA101` Local vacant, `AA102` Local en travaux, `AF106` Dark store, `AF107` Dark kitchen |
| `ens` | String(120) | Enseigne / nom du magasin |
| `bio` | Integer | Appartenance à une filière bio (0/1) |
| `surf` | Integer | Tranche de surface : `1` < 300 m², `2` 300–1000 m², `3` > 1000 m² |
| `cc_id` | Integer | Identifiant de concentration commerciale (~103 valeurs nommées) |
| `cc_niv` | String(5) | Étage dans la concentration |
| `niv47` `niv18` `niv8` `niv2` | Integer | Niveaux de regroupement de la nomenclature |
| `xbis` `ybis` | Double | **Coordonnées d'affichage** — voir §4 |

**Bonne nouvelle pour la nomenclature :** les libellés sont fournis en `codedValues` directement
dans la réponse `?f=json`. La table de correspondance se construit depuis le service, sans passer
par le fichier xlsx.

Les niveaux réellement présents sont **224 (codact), 47, 18, 8 et 2** — la fiche produit APUR se
contredisait en annonçant « 13 ou 6 postes » dans ses détails techniques. C'est faux.

---

## 3. Confirmé : le millésime 2023 ne contient aucun local vacant

Comptage par `niv8` sur la couche 2023, vérifié par requête d'agrégation :

| `niv8` | Libellé | Enregistrements |
| --- | --- | --- |
| 1 | Grand magasin | 9 |
| 2 | Alimentaire | 8 018 |
| 3 | Non alimentaire | 19 122 |
| 4 | Service commercial | 16 347 |
| 5 | Restauration | 15 419 |
| 8 | Hôtel | 1 930 |
| **6** | **Local vacant** | **absent** |
| **7** | **Autre local** | **absent** |
| | **Total** | **60 845** |

Les codes 6 et 7 existent dans le domaine — c'est une table de correspondance partagée — mais
**aucune ligne ne les porte**. Les 22 000 locaux manquants par rapport aux 83 154 de l'enquête
sont précisément les vacants et les « autres locaux ».

**Conséquences, non négociables :**

1. **La vacance 2023 n'est pas calculable depuis cette couche.** Ne pas la déduire par absence
   entre millésimes : un local disparu peut être vacant, transformé, ou hors périmètre de
   publication.
2. **Comparer 83 399 (2020) à 60 845 (2023) est un contresens.** Toute statistique d'évolution
   doit être restreinte au périmètre commun, et cette restriction doit être **dans la requête**,
   pas seulement dans un commentaire.
3. Les millésimes 2017 (84 031) et 2020 (83 399) portent l'ensemble des locaux, donc a priori
   les vacants — à confirmer par le même comptage sur `niv8` avant de s'y fier.

---

## 4. Les coordonnées `xbis` / `ybis` sont de l'affichage, pas de la position

L'APUR empile les commerces d'une même adresse sur une coordonnée unique, puis fournit une
coordonnée « bis » qui les écarte parallèlement à la voie **pour qu'ils soient lisibles sur une
carte**.

- **Ne jamais utiliser `xbis`/`ybis` pour un calcul de distance, un appariement ou un
  rattachement spatial.** Uniquement pour le rendu.
- **Ne jamais apparier deux millésimes sur la seule géométrie** : plusieurs locaux partagent
  exactement le même point.

Marquer ces colonnes comme donnée d'affichage dès le schéma — par leur nom ou un commentaire de
colonne — pour qu'aucune requête ne s'en serve par erreur.

---

## 5. L'identifiant : `c_ord` existe, sa stabilité reste à prouver

Le champ `c_ord` porte l'alias « Identifiant » et il y a un `seq` qui donne le rang dans la pile
d'une adresse. Leur existence change la conception — mais **rien ne garantit que `c_ord` désigne
le même local d'un millésime à l'autre**, l'enquête étant refaite porte-à-porte.

Le test à faire en premier, avant toute migration : tirer quelques centaines de `c_ord` de 2020,
les chercher dans 2023, et regarder si l'adresse concorde. Cinq minutes de requêtes qui décident
du schéma.

- Si `c_ord` est stable → clé naturelle de la trajectoire.
- Sinon → appariement sur **adresse normalisée** (`num` + `let` + `typ_voie` + `lib_voie`),
  désambiguïsée par `seq`, puis par `type` ou `niv18`.

Dans les deux cas, concevoir la trajectoire **à l'adresse et au tronçon**, pas au local :
`c_ord` devient une colonne qui améliore l'appariement, jamais son fondement.

---

## 6. Une piste sérieuse : le service d'évolution 2003–2020

Le serveur expose `BDCOM/bdcom20032020/MapServer`, décrit comme « données utilisées dans
l'application BDCom », avec sept couches datées et une étendue temporelle de 2003 à 2020 :

`..._alimentaire_date`, `..._nonAlimentaire_date`, `..._restauration_date`, `..._hotels_date`,
`..._services_date`, `..._autres_date`, et **`bdcom_evolution20032020_vacants_date`**.

C'est-à-dire l'évolution déjà calculée par l'APUR sur dix-sept ans, vacants compris.

⚠️ **Réserve importante.** Ce service porte la mention « Ne pas supprimer » et alimente
l'application interne de l'APUR. Il est techniquement joignable, mais **techniquement joignable
n'est pas juridiquement réutilisable** : contrairement aux couches publiées sur
`opendata.apur.org`, celle-ci ne porte pas de licence explicite. Écrire à `data@apur.org` avant
de l'exploiter, en expliquant l'usage. C'est aussi l'occasion de demander si une couche 2023
complète, vacants inclus, est diffusable.

---

## 7. Les licences diffèrent selon le millésime

| Millésime | Licence annoncée |
| --- | --- |
| 2023 | **ODbL 1.0** (confirmée `licenseConstraintId: ODbL-1.0`) |
| 2020 | « Licence personnalisée » |
| 2017 | « Licence personnalisée » |

Le README et le panneau Sources annoncent ODbL pour BDCom. **À corriger si 2017 ou 2020 sont
utilisés**, après lecture de ce que dit exactement cette licence personnalisée.

---

## 8. En résumé, pour le schéma

- Ingestion **par l'API REST paginée**, pas par téléchargement de fichier. `outSR=4326` pour
  éviter de reprojeter soi-même.
- Une couche **staging** qui conserve les noms de colonnes de la source tels quels
  (`c_ord`, `arro`, `lib_voie`…), puis un modèle applicatif en anglais. Ne pas mélanger les deux.
- **Nomenclature dans sa propre table**, alimentée depuis les `codedValues` du service, avec les
  niveaux 224 / 47 / 18 / 8 / 2 comme colonnes parentes.
- **Une table d'observations par millésime**, sans supposer `c_ord` stable tant que ce n'est pas
  vérifié.
- **`xbis`/`ybis` marquées comme donnée d'affichage** dans le schéma lui-même.
- **Une colonne licence par millésime**, puisqu'elles diffèrent.
- Toute statistique d'évolution **restreinte au périmètre commun**, dans la requête.
- Et tant que la couche 2023 complète n'est pas obtenue : parler de **rotation commerciale**,
  jamais de vacance, pour ce millésime.
