# Compass — trouver un local commercial par son environnement

Compass est une application de recherche de locaux commerciaux à Paris qui ne se
contente pas d'afficher des offres : elle **replace chaque local dans son
environnement réel** (marchabilité, commerces, transports, écoles, santé, parcs,
bruit, qualité de l'air, risques) à partir de données publiques ouvertes.

Fait par Ivan de Murard.

## Ambition

La plupart des plateformes immobilières décrivent un bien (surface, loyer,
photos) et laissent l'utilisateur deviner le reste. Compass part du principe
inverse : **le contexte est le produit**.

1. **Contextualiser les résultats** — chaque local est accompagné de scores
   calculés à partir de son voisinage réel dans un rayon de 400 à 800 m, et non
   de descriptions déclaratives.
2. **Placer les offres dans leur environnement** — la carte superpose les
   couches d'aménités et de marchabilité aux locaux, et un panneau
   environnemental affiche en direct l'indice de qualité de l'air, les PM2,5 et
   les risques recensés autour du point observé.
3. **Chercher par besoin, pas par référence** — on décrit ce qu'on veut
   (« 50 m² dans le 10e près d'un parc ») et les filtres portent sur des
   critères d'usage : marchabilité, densité de commerces, accessibilité
   transports, proximité écoles/santé, flux piéton estimé, locaux vacants
   uniquement.
4. **Transparence** — chaque jeu de données est listé dans le panneau
   « Sources » avec son producteur et sa licence. Une donnée absente est
   affichée comme indisponible, jamais inventée.

## Stack

- React 18 + TypeScript + Vite 5
- Tailwind CSS + shadcn/ui (Radix)
- Leaflet / react-leaflet pour la cartographie
- TanStack Query pour le cache des requêtes open data
- Supabase (Lovable Cloud) pour l'authentification, les préférences et les
  recherches sauvegardées

Les API publiques sont appelées directement depuis le navigateur, avec un cache
`sessionStorage` de courte durée et une bascule automatique entre miroirs
Overpass en cas de saturation.

## Installation

Prérequis : Node.js 18+ et npm (ou bun).

```sh
git clone <URL_DU_REPO>
cd compass
npm install
npm run dev
```

L'application est servie sur http://localhost:8080.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Serveur de développement Vite avec HMR (port 8080) |
| `npm run build` | Build de production dans `dist/` |
| `npm run build:dev` | Build en mode development (source maps, non minifié) |
| `npm run preview` | Sert localement le build de production |
| `npm run lint` | Analyse ESLint du projet |

## Variables d'environnement

Le projet fonctionne sans configuration : les identifiants Supabase publics sont
inscrits dans `src/integrations/supabase/client.ts`, et toutes les sources open
data utilisées sont en accès libre et sans clé.

Si vous déployez sur votre propre backend, créez un fichier `.env` à la racine :

```sh
VITE_SUPABASE_URL="https://<votre-projet>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<votre-clé-anon-publique>"
```

Puis lisez-les via `import.meta.env` dans `src/integrations/supabase/client.ts`.

Règles :

- Seules les variables préfixées `VITE_` sont exposées au navigateur.
- N'y placez jamais de clé privée (service role, clés d'API payantes) : elles
  seraient publiées dans le bundle. Les secrets serveur vont dans les variables
  d'environnement des edge functions.
- Une clé INSEE Sirene n'est nécessaire que si vous passez de l'API publique
  `recherche-entreprises` à l'API Sirene officielle
  (`VITE_` interdit dans ce cas : passer par une edge function).

## Sources de données

### Branchées aujourd'hui

| Source | Producteur | Usage dans Compass | Licence |
| --- | --- | --- | --- |
| OpenStreetMap (Overpass API) | Contributeurs OSM | Locaux commerciaux vacants et occupés, commerces, écoles, santé, parcs, arrêts de transport, voirie | ODbL |
| Base Adresse Nationale | Etalab / IGN | Géocodage des recherches et des adresses | Licence Ouverte 2.0 |
| Recherche d'entreprises (Sirene) | INSEE / DINUM | Établissements actifs autour du local, dynamisme commercial | Licence Ouverte 2.0 |
| Encadrement des loyers | Ville de Paris | Loyer de référence €/m² par quartier | ODbL |
| CAMS Europe (Open-Meteo) | Copernicus | Indice ATMO européen, PM2,5, NO₂ en temps réel | CC BY 4.0 |
| Géorisques | BRGM / MTE | Risques naturels et technologiques dans un rayon de 1 km | Licence Ouverte 2.0 |

Scores dérivés calculés côté client : marchabilité, accessibilité transports,
densité par catégorie d'aménités, bruit estimé (proximité et classe des axes
routiers), flux piéton estimé (densité de commerces actifs + desserte). Ces deux
derniers sont explicitement présentés comme des estimations, faute de source
ouverte fiable.

### À venir

| Source | Apport prévu |
| --- | --- |
| DVF (Cerema / data.gouv.fr) | Prix de vente réels au m² par quartier |
| INSEE IRIS | Population, revenus, CSP — pouvoir d'achat de la zone de chalandise |
| BPE (INSEE) | Base permanente des équipements, en complément d'OSM |
| GTFS IDFM | Temps de trajet réels et fréquences de desserte |
| Bruitparif | Niveaux de bruit mesurés, en remplacement du proxy routier |
| Airparif | Historique fin de la qualité de l'air en Île-de-France |
| IGN Admin Express / cadastre | Contours de quartiers, parcelles et bâti |
| Sirene complet (clé INSEE) | Créations et fermetures d'établissements, dynamique commerciale |

### Périmètre

Île-de-France, Paris intra-muros en priorité, pour limiter le volume des
requêtes Overpass et la latence.

## Structure du projet

```text
src/
  components/        Carte, liste, cartes de locaux, panneau sources, sidebar
  hooks/             useOpenData (React Query), useMapLayers
  providers/         FiltersProvider (filtres + bbox partagés), AuthProvider
  services/opendata/ Couche d'accès aux API publiques et scoring
  pages/             Index, SignIn, SignUp, Profile
```

## Attribution

Les données OpenStreetMap sont sous licence ODbL : toute réutilisation doit
mentionner « © les contributeurs OpenStreetMap ». Les jeux Etalab requièrent la
mention de la source et de la date de mise à jour.
