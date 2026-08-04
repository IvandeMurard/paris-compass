# Brancher des sources de données réelles dans Compass

Objectif : remplacer les données de démo (locaux, walkability, aménités, bruit/air/flux) par des données publiques réelles d'Île-de-France, ingérées dans le backend Compass et interrogeables depuis la carte et la liste.

## Principe d'architecture

```text
Sources ouvertes (API / fichiers)
        |
  Edge functions d'ingestion (cron)
        |
  Tables Cloud (locaux, POI, scores IRIS, transports, risques)
        |
  Fonction de scoring (PostGIS / SQL)
        |
  API de recherche -> carte Leaflet + liste + filtres
```

Tout est stocké côté serveur : les API publiques sont lentes, plafonnées et parfois sans CORS, donc on ne les appelle jamais depuis le navigateur.

## Sources retenues (toutes en licence ouverte)

| Bloc | Source | Usage dans Compass |
| --- | --- | --- |
| Locaux / entreprises | API Sirene (INSEE) + Base Sirene géolocalisée | établissements, locaux d'activité, dynamisme commercial |
| Prix immobilier | DVF (data.gouv / Cerema) | prix au m² réel par quartier |
| Adresses & géocodage | Base Adresse Nationale (api-adresse.data.gouv.fr) | géocodage des recherches et des adresses |
| Aménités | OpenStreetMap (Overpass) + BPE INSEE | commerces, écoles, santé, parcs |
| Transports | GTFS IDFM + arrêts | accessibilité transports, temps de marche |
| Socio-démo | INSEE IRIS (population, revenus, CSP) | pouvoir d'achat de la zone de chalandise |
| Environnement | Airparif (qualité de l'air), Bruitparif (bruit), Géorisques | indices air / bruit / risques |
| Contours | IGN Admin Express + IRIS | découpage communes / quartiers |

Le "footfall" (flux piéton) n'a pas de source ouverte fiable : il sera estimé à partir de la densité de POI, des arrêts de transport et de la population IRIS, et affiché comme estimation.

## Étapes de mise en œuvre

**1. Schéma de données**
Nouvelles tables : `zones` (IRIS/commune, géométrie), `pois`, `transit_stops`, `establishments`, `price_stats`, `env_indices`, `zone_scores`, `properties` (locaux réels), plus une table `ingestion_runs` pour suivre chaque import. Activation de PostGIS et index géographiques, RLS en lecture publique, écriture réservée au service backend.

**2. Fonctions d'ingestion (une par famille de source)**
Edge functions dédiées : `ingest-bal-adresses`, `ingest-sirene`, `ingest-osm-pois`, `ingest-idfm-transit`, `ingest-insee-iris`, `ingest-dvf`, `ingest-env-indices`. Chacune est idempotente (upsert par clé source), traite par lots avec pagination, journalise dans `ingestion_runs`. Planification quotidienne/mensuelle selon la fraîcheur des sources.

**3. Scoring**
Une fonction SQL calcule par zone : score de marche (POI dans 400/800 m), accessibilité transports, aménités par catégorie (écoles, santé, courses, parcs), indices air/bruit/risques normalisés 0-100, estimation de flux. Résultats matérialisés dans `zone_scores`, rafraîchis après ingestion.

**4. API de recherche**
Une edge function `search-properties` prend les filtres existants (prix, surface, walkability, scores d'aménités) plus une bbox de carte, et renvoie les locaux réels joints à leurs scores de zone.

**5. Branchement du front**
- `src/components/PropertyList.tsx` : suppression de `sampleProperties`, remplacement par une requête sur l'API de recherche.
- `src/data/mapData.ts` et `src/hooks/useMapLayers.ts` : couches walkability/aménités alimentées par `zone_scores` et `pois` selon la vue courante.
- `src/components/sidebar/*` et `useFilters` : les filtres deviennent des paramètres serveur.
- `src/components/PropertyCard.tsx` : affichage air / bruit / flux depuis les indices réels, avec mention de la source et de la date de mise à jour.
- Recherche en langage naturel : géocodage via la Base Adresse Nationale avant filtrage.

**6. Transparence et qualité**
Un panneau "sources" liste les jeux de données utilisés, leur licence et leur date de dernière ingestion. Les zones sans données affichent explicitement "donnée indisponible" plutôt qu'une valeur inventée.

## Ordre de livraison suggéré

1. Schéma + PostGIS + ingestion adresses et POI OSM (visible immédiatement sur la carte).
2. Transports IDFM + scoring marche/accessibilité (remplace la walkability de démo).
3. INSEE IRIS + DVF (contexte socio-économique et prix).
4. Sirene (établissements et dynamisme commercial).
5. Air / bruit / risques (indices environnementaux).
6. Nettoyage final : suppression de toutes les données de démo restantes.

## Notes techniques

- Périmètre initial : Île-de-France, pour limiter les volumes d'ingestion.
- Sirene demande une clé API INSEE ; les autres sources sont en accès libre. La clé sera demandée au moment de l'étape 4.
- Overpass et les API publiques sont limitées en débit : ingestion par tuiles avec backoff, jamais en boucle rapide.
- Les gros fichiers (DVF, IRIS, GTFS) sont téléchargés et traités par lots côté serveur, pas conservés en entier.
