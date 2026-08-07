# Compass — find a commercial space through its environment

Compass is a commercial real estate search application for Paris that does not
merely list offers: it **puts every space back into its real environment**
(walkability, retail, transport, schools, healthcare, parks, noise, air quality,
risks) using open public data.

Made by Ivan de Murard.

## Ambition

Most real estate platforms describe a property (surface, rent, photos) and leave
the user to guess the rest. Compass takes the opposite view: **context is the
product**.

1. **Contextualise the results** — each space comes with scores computed from its
   real neighbourhood within a 400 to 800 m radius, not from declarative
   descriptions.
2. **Place offers in their environment** — the map overlays amenity and
   walkability layers on top of the listings, and an environmental panel shows
   live air quality index, PM2.5 and recorded risks around the observed point.
3. **Search by need, not by reference** — you describe what you want
   ("50 m² in the 10th arrondissement near a park") and the filters apply to
   usage criteria: walkability, retail density, transport accessibility,
   proximity to schools and healthcare, estimated footfall, vacant spaces only.
4. **Transparency** — every dataset is listed in the "Sources" panel with its
   producer and licence. Missing data is displayed as unavailable, never
   invented.

## Stack

- React 18 + TypeScript + Vite 5
- Tailwind CSS + shadcn/ui (Radix)
- Leaflet / react-leaflet for mapping
- TanStack Query for caching open data requests
- Supabase (Lovable Cloud) for authentication, preferences and saved searches

Public APIs are called directly from the browser, with a short-lived
`sessionStorage` cache and automatic failover between Overpass mirrors when one
is saturated.

## Using Compass

**Live app: [paris-compass.lovable.app](https://paris-compass.lovable.app)**

Open the map, pan to the area you have in mind, and Compass instantly reads the
neighbourhood around every space it finds — walkability, retail density,
transport, schools, healthcare, air quality, risks — so you can compare
locations the way your future customers will experience them. Describe your need
in plain language ("50 m² in the 10th near a park"), refine with the filters on
the left, and click any space to see the full environmental profile with the
source and licence behind each number. No account is needed to explore; sign in
only to save searches and get alerts.

## Running it locally

Requirements: Node.js 18+ and npm (or bun).

```sh
git clone <REPO_URL>
cd compass
npm install
npm run dev
```

The application is served at http://localhost:8080.


## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Vite development server with HMR (port 8080) |
| `npm run build` | Production build into `dist/` |
| `npm run build:dev` | Development-mode build (source maps, unminified) |
| `npm run preview` | Serves the production build locally |
| `npm run lint` | ESLint analysis of the project |

## Environment variables

The project runs without configuration: the public Supabase credentials live in
`src/integrations/supabase/client.ts`, and every open data source used is freely
accessible without a key.

If you deploy against your own backend, create a `.env` file at the root:

```sh
VITE_SUPABASE_URL="https://<your-project>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<your-public-anon-key>"
```

Then read them via `import.meta.env` in `src/integrations/supabase/client.ts`.

Rules:

- Only variables prefixed with `VITE_` are exposed to the browser.
- Never put a private key there (service role, paid API keys): it would be
  published in the bundle. Server secrets belong in the edge functions'
  environment variables.
- An INSEE Sirene key is only required if you move from the public
  `recherche-entreprises` API to the official Sirene API
  (`VITE_` is forbidden in that case: go through an edge function).

## Data sources

### Connected today

| Source | Producer | Use in Compass | Licence |
| --- | --- | --- | --- |
| OpenStreetMap (Overpass API) | OSM contributors | Vacant and occupied commercial spaces, retail, schools, healthcare, parks, transit stops, road network | ODbL |
| Base Adresse Nationale | Etalab / IGN | Geocoding of searches and addresses | Licence Ouverte 2.0 |
| Recherche d'entreprises (Sirene) | INSEE / DINUM | Active establishments around the space, commercial dynamism | Licence Ouverte 2.0 |
| Rent control dataset | City of Paris | Reference rent €/m² per neighbourhood | ODbL |
| CAMS Europe (Open-Meteo) | Copernicus | European AQI, PM2.5, NO₂ in real time | CC BY 4.0 |
| Géorisques | BRGM / MTE | Natural and technological risks within a 1 km radius | Licence Ouverte 2.0 |

Derived scores computed client-side: walkability, transport accessibility,
density per amenity category, estimated noise (proximity and class of major
roads), estimated footfall (density of active businesses + transit coverage).
The last two are explicitly presented as estimates, for lack of a reliable open
source.

### Coming next

| Source | Planned contribution |
| --- | --- |
| DVF (Cerema / data.gouv.fr) | Real sale prices per m² by neighbourhood |
| INSEE IRIS | Population, income, socio-professional categories — purchasing power of the catchment area |
| BPE (INSEE) | Permanent database of facilities, complementing OSM |
| GTFS IDFM | Real travel times and service frequencies |
| Bruitparif | Measured noise levels, replacing the road proxy |
| Airparif | Fine-grained air quality history for Île-de-France |
| IGN Admin Express / cadastre | Neighbourhood boundaries, parcels and buildings |
| Full Sirene (INSEE key) | Business openings and closures, commercial dynamics |

### Scope

Île-de-France, with Paris intra-muros as the priority, to limit Overpass query
volume and latency.

## Project structure

```text
src/
  components/        Map, list, space cards, sources panel, sidebar
  hooks/             useOpenData (React Query), useMapLayers
  providers/         FiltersProvider (shared filters + bbox), AuthProvider
  services/opendata/ Public API access layer and scoring
  pages/             Index, SignIn, SignUp, Profile
```

## Attribution

OpenStreetMap data is licensed under ODbL: any reuse must credit
"© OpenStreetMap contributors". Etalab datasets require mentioning the source and
its update date.
