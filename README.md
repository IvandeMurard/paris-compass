# Compass — what happened at this address before you

You are about to commit to nine years. Bring the address — the one an agent sent
you, the one on a sign you walked past — and Compass tells you what was there
before, how fast the street turns over, and what people actually paid nearby.

**What was here before you.** A florist in 2017, a florist in 2020, gone by 2023.
A door-to-door census of every Paris ground-floor unit with a shop window, three
times over, on a 224-activity nomenclature.

**Whether a kitchen has ever been here.** If a restaurant occupied the unit, the
extraction, the grease trap and the power are probably already in. If not,
creating them runs into tens of thousands and needs the building's agreement.
That is the most expensive question this data answers, and it answers it before
you travel.

**Whether this address is a graveyard or a good street.** Rue d'Argout turned
over half its shops in three years — but it also filled its three empty units, so
it is churning upward, not dying. And turnover only means something against its
own trade: fashion turns over twice as fast as hotels, everywhere, always. Of the
cafés and restaurants trading in 2017, **77% were still trading six years later
around Les Halles, 56% in the quartier du Mail** — same city, same trade, a
different bet.

**What people actually paid.** 25 496 goodwill sales published with their price.
The median Paris fonds changes hands at **126 000 €** — a pharmacy at 950 000 €,
a fast-food unit at 100 000 €.

**What is happening right now.** An insolvency filed at an address is public
months before any listing appears.

Every figure arrives with its source, its licence, its date — and how sure it is.
*Established* means the source names this unit. *Corroborated* means two
independent public sources place it here and neither names the shopfront.
*Undetermined* means the source is silent, and Compass says so instead of
guessing. No listings, no estimated rent, no score out of 100.

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

## Who it is for

Compass is built for the **taker**: the shopkeeper, restaurateur, craftsperson or
franchisee who has to decide *where* to open. They make that decision once or twice
in a working life, it commits them to a 3/6/9 lease, and they make it today on one
visit, a hunch about passing trade, and whatever the landlord says.

It is also built for an **agent**: an LLM instructing the same question through an
MCP server, with no interface. Same scoring core, same traceability requirement,
different output — JSON and a chain of thought instead of a map.

It is **not** built for brokers. A broker qualifies dozens of locations a month for
third parties: they need portfolios, bulk comparison and national coverage. Every one
of those makes the product heavier for someone instructing a single address in depth.
Serving both serves neither. A broker who wants Compass gets the same thing the agent
gets: the API.

One planned feature sits close to that line, so the line is drawn in the structure
rather than left to judgement. You will be able to download the file for **one**
address — every figure with its source, licence, vintage and method beside it, which is
the traceability promise made portable. A 3/6/9 lease is not decided alone; it goes to a
banker, an accountant, a franchise network. What you will not find is a way to export a
list: the download starts from an address, never from search results, and there is no
"export all" button. Stacking three candidates yourself is your business — Compass just
will not do it for you.

## Two founding constraints

> **If a number cannot be re-derived from a cited public source, it is not shown.**

No landlord declarations, no scraped listings, no proprietary estimate, no score
invented to fill a gap. Missing data is displayed as missing.

> **If two units on the same street get the same verdict, Compass has said nothing.**

The useful granularity is the street segment, sometimes the side of the pavement —
not the arrondissement. An indicator that does not vary at that scale describes
general context; it does not settle a decision.

## What it does not do

Every refusal below buys something back. The trade is the point.

| It refuses | What that buys |
| --- | --- |
| **Not a listings portal.** Compass holds no inventory and scrapes no portal. It does not tell you what is on the market — it shows what is *coming free*: businesses that just ceased trading, goodwill sold or wound up in court, premises the last census found empty. | No contractual exposure, no stale stock, and a position upstream of the listing rather than in competition with it. A portal shows you what everyone already sees. |
| **Not a CRM.** No pipeline, no mandates, no team, no reporting. | A screen about a place, not about a process. Nothing to fill in. |
| **No rent estimate.** There is no open dataset of actual commercial rents in France. | Honesty about the one number everybody wants. Paris rent control covers *housing* only and says nothing about commercial premises. |
| **No revenue forecast.** Compass will not tell you a business will work here. | Credibility. No open data supports that prediction, and inventing it would poison every other number on the page. |
| **No single score out of 100.** | Weights depend on the trade: a bakery wants footfall, a yoga studio wants quiet, a wine merchant wants median income. One score averages away things that pull against each other. Compass shows the axes and lets the trade arbitrate. |
| **Not national.** Paris intra-muros first, Île-de-France next. | Depth. The sources that carry the value — the on-the-ground retail census, the commercial zoning layer, transport validations — are local. Widening coverage loses exactly what separates Compass from an aggregator. |
| **No account to explore.** | Nothing to get past before finding out whether the tool is any use. |

## What it cannot answer, and why

Stated plainly, because the gaps shape the product more than the features do.

- **What rent will I pay?** No open observatory of commercial rents exists in France.
  The local rent observatories cover private *housing*; INSEE's ILC is a revision index,
  not a level. Street-level commercial rental values are sold by private vendors — which
  is the proof they are not open. Goodwill sale prices, published in the BODACC, carry an
  indirect signal and nothing more.
- **How many people walk past this door, continuously?** Paris has no permanent pedestrian
  sensor: the city's permanent multimodal counters cover bikes, scooters, motorcycles, cars,
  lorries and buses — not pedestrians. Telco and trajectory data are proprietary, costly and
  heavy under GDPR. Compass measures *presence and rhythm* instead — hourly population
  actually present, counted transit validations, station-level activity cycles.
- **What do people in this neighbourhood spend, and on what?** Card transaction data:
  proprietary. No workaround.
- **Which units are on the market today?** Commercial listings live on private portals whose
  terms forbid reuse. There is no clean way around the current stock — which is why Compass
  works upstream of it instead.

## Stack

- React 18 + TypeScript + Vite 5
- Tailwind CSS + shadcn/ui (Radix)
- Leaflet for mapping (used directly, no React wrapper)
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
| Rent control dataset (housing) | City of Paris / OLAP | Residential rent level per neighbourhood, used as a **catchment-area signal only** — it covers housing and explicitly excludes commercial premises, so it is never presented as a commercial rent reference, never multiplied by a floor area, and never filters results | ODbL |
| CAMS Europe (Open-Meteo) | Copernicus | European AQI, PM2.5, NO₂ in real time | CC BY 4.0 |
| Géorisques | BRGM / MTE | Natural and technological risks within a 1 km radius | Licence Ouverte 2.0 |

Derived scores computed client-side: walkability, transport accessibility,
density per amenity category, estimated noise (proximity and class of major
roads), estimated footfall (density of active businesses + transit coverage).
The last two are explicitly presented as estimates, for lack of a reliable open
source.

### Coming next

In priority order. Everything here is open, free and needs no key.

| Source | Producer | Planned contribution |
| --- | --- | --- |
| **BDCom** (2017, 2020, 2023) | APUR | A door-to-door field census of every Paris ground-floor unit with a shop window, activity coded on a 224-item nomenclature, with floor-area bands. The unit identifier is stable across vintages, so three censuses give **a unit's turnover rate measured against its own street**, with its previous lives as the evidence underneath. Two limits are part of the claim: vacancy is measurable on 2017 and 2020 only — the published 2023 layer carries retail alone, so a unit missing from it is "no longer a shop", not "empty" — and the licence differs by vintage (ODbL for 2023, a custom licence for 2017 and 2020), so BDCom cannot be announced as ODbL across the board. |
| **Mobiliscope** | CNRS | Population *actually present* in each sector, hour by hour across an average weekday, broken down by age and socio-professional category. Distinguishes an office district that triples at noon from a residential one — two locations that resident population describes identically. |
| **BODACC** | DILA | Goodwill sales *with their price*, and insolvency proceedings. The closest public figure to what a taker will actually pay, and a public signal that a unit is about to come free, often months before any listing. |
| **PLU — commercial and craft protections** | City of Paris | A binary, mapped constraint: on a protected commercial frontage, a ground-floor unit cannot change use. The first thing that can kill a project. Informational only, no regulatory value. |
| **Transit validations** | Île-de-France Mobilités | Counted entries per station per day, with hourly profiles since 2015 — replaces the current footfall proxy with a measured number. |
| DVF | DGFiP | Sale prices of the walls per m². Excludes goodwill and share deals. |
| INSEE IRIS / FiLoSoFi | INSEE | Population, income, socio-professional categories of the catchment area. |
| GTFS IDFM | Île-de-France Mobilités | Real travel times and service frequencies. |
| Bruitparif | Bruitparif | Modelled and measured noise, replacing the road proxy. |
| Sitadel | SDES | Planning permissions since 2013, including new non-residential premises — future residents and future competitors, two years ahead. |

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
