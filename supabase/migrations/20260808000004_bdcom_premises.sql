-- BDCom premises: staging, location identity, and per-vintage observations.

-- ---------------------------------------------------------------------------
-- Staging
-- ---------------------------------------------------------------------------
-- Two staging tables because the three vintages publish two different column
-- vocabularies:
--
--   2017 + 2020  ORDRE, LIBELLE_VOIE, SITUATION/SURFACE as free text,
--                LIBELLE_ACTIVITE inline, 8-post grouping only, no seq, no sign
--   2023         c_ord, lib_voie, sit/surf as codes, no activity label,
--                niv47/18/8/2, seq, ens (sign name)
--
-- Source column names are kept verbatim. Renaming at ingestion loses the trace
-- of which field of which service produced which value, and that trace is the
-- whole point of the provenance rule.
--
-- Deliberately NOT ingested: the xbis / ybis columns. The APUR stacks premises
-- sharing an address on one coordinate and offsets xbis/ybis so they are legible
-- on a map — median offset under a metre, 12 m at p99, 340 m at the maximum.
-- It is a rendering artefact, not a position. Storing it under any name means
-- someone eventually computes a distance with it, so it is not stored at all.

create table public.stg_bdcom_od (
  vintage_id                      smallint not null references public.bdcom_vintage(id),
  objectid                        integer,
  ordre                           integer,
  arrondissement                  integer,
  quartier                        integer,
  iris                            text,
  x                               double precision,
  y                               double precision,
  num                             integer,
  let                             text,
  type_voie                       text,
  libelle_voie                    text,
  situation                       text,
  code_activite                   text,
  libelle_activite                text,
  regroupement_8_postes           integer,
  libelle_regroupement_8_postes   text,
  bio                             text,
  surface                         text,
  cc_id                           text,
  cc_nom                          text,
  cc_niv                          text,
  primary key (vintage_id, ordre)
);

comment on table public.stg_bdcom_od is
  'Verbatim landing table for the OPENDATA/BDCOM_OD service (2017 = layer 0, '
  '2020 = layer 1). Column names match the source exactly. X/Y are Lambert 93 '
  '(EPSG:2154) as published; conversion to WGS 84 happens on promotion.';


create table public.stg_bdcom_2023 (
  objectid  integer,
  c_ord     integer primary key,
  arro      integer,
  qua       integer,
  x         double precision,
  y         double precision,
  num       integer,
  "let"     text,
  typ_voie  text,
  lib_voie  text,
  seq       integer,
  sit       text,
  type      text,
  codact    text,
  ens       text,
  bio       text,
  surf      integer,
  cc_id     integer,
  cc_niv    text,
  niv47     integer,
  niv18     integer,
  niv8      integer,
  niv2      integer
);

comment on table public.stg_bdcom_2023 is
  'Verbatim landing table for BDCOM/bdcom2023. `let` is quoted because LET is a '
  'reserved word. niv2 is 1 on every published row — the layer is retail only.';


-- ---------------------------------------------------------------------------
-- Premise identity — the only table carrying a premise geometry
-- ---------------------------------------------------------------------------
-- One row per physical premise across all vintages, ~84 000 rows and one GiST
-- index, rather than ~230 000 points and three. The gain that matters is not
-- disk: it is that a premise's history becomes a GROUP BY on observations
-- instead of a spatial self-join, so "what was here before" is a lookup.
--
-- ORDRE / c_ord is stable across vintages. Verified on a 300-row sample of 2023
-- resolved against 2020: 297 found, 296 of those at the same address (99.7%),
-- 251 with the same activity (84.5% — the gap is real churn, not noise).
--
-- 74 identifiers out of 85 344 are reused for a different premise (ordre
-- 91046 is 10 rue de l'Ours in 2020 and 80 rue du Maine in 2023). Hence the key
-- is (ordre, address_key), not ordre alone: a reused identifier produces two
-- locations instead of silently teleporting one, and the observation records
-- which happened.

create table public.premise_location (
  id                bigint generated always as identity primary key,
  ordre             integer  not null,
  geom              extensions.geography(Point, 4326) not null,
  geom_vintage_id   smallint not null references public.bdcom_vintage(id),
  arrondissement    smallint,
  num               integer,
  let               text,
  typ_voie          text,
  lib_voie          text,
  address_key       text generated always as (
                      coalesce(arrondissement::text, '') || '|' ||
                      coalesce(num::text, '')            || '|' ||
                      coalesce(let, '')                  || '|' ||
                      coalesce(typ_voie, '')             || '|' ||
                      coalesce(lib_voie, '')
                    ) stored,
  quartier_id       smallint references public.quartier(id),
  street_segment_id bigint   references public.street_segment(id),
  cc_id             integer,
  first_seen_vintage_id smallint not null references public.bdcom_vintage(id),
  last_seen_vintage_id  smallint not null references public.bdcom_vintage(id),
  unique (ordre, address_key)
);

comment on column public.premise_location.geom_vintage_id is
  'Which vintage supplied this point. The canonical geometry comes from 2020, '
  'not the most recent vintage: 2023 covers retail only, so building identity on '
  'it would drop ~22 000 premises that exist in the earlier full-scope surveys.';

comment on column public.premise_location.quartier_id is
  'Denormalised at ingestion via ST_Contains so a radius query never pays for a '
  'polygon join. Replaces the nearest-centroid attachment the front end used.';

create index premise_location_geom_idx on public.premise_location using gist (geom);
create index premise_location_ordre_idx on public.premise_location (ordre);
create index premise_location_segment_idx on public.premise_location (street_segment_id);
create index premise_location_quartier_idx on public.premise_location (quartier_id);


-- ---------------------------------------------------------------------------
-- Observations — one row per (premise, vintage). No geometry.
-- ---------------------------------------------------------------------------

create type public.bdcom_match_method as enum (
  'ordre',                  -- identifier matched an earlier vintage, address agrees
  'ordre_address_conflict', -- identifier reused for a different address; separate location
  'new'                     -- first appearance of this identifier
);

create table public.premise_observation (
  id             bigint generated always as identity primary key,
  location_id    bigint   not null references public.premise_location(id) on delete cascade,
  vintage_id     smallint not null references public.bdcom_vintage(id),
  source_ordre   integer  not null,
  activity_code  text     references public.bdcom_activity(code),
  size_band      smallint references public.bdcom_size_band(code),
  situation_code text     references public.bdcom_situation(code),
  -- Sign name exists only in 2023: the published 2017/2020 layers carry no name
  -- field at all. A premise history can therefore say "it was a florist", never
  -- "it was Au Nom de la Rose", for anything before 2023.
  sign_name      text,
  is_bio         boolean,
  cc_id          integer,
  cc_level       text,
  match_method   public.bdcom_match_method not null,
  unique (vintage_id, source_ordre)
);

comment on table public.premise_observation is
  'What was recorded at a premise in one survey. The unique key makes a reload '
  'idempotent: ordre is unique within a vintage (verified, 60 845 distinct on '
  '60 845 rows for 2023).';

comment on column public.premise_observation.match_method is
  'How this observation was tied to its premise. A history assembled through an '
  'address conflict is weaker evidence than one matched on a clean identifier, '
  'and the interface has to be able to say so.';

create index premise_observation_location_idx on public.premise_observation (location_id, vintage_id);
create index premise_observation_vintage_idx on public.premise_observation (vintage_id);
create index premise_observation_activity_idx on public.premise_observation (activity_code);


alter table public.stg_bdcom_od        enable row level security;
alter table public.stg_bdcom_2023      enable row level security;
alter table public.premise_location    enable row level security;
alter table public.premise_observation enable row level security;

-- Staging carries no read policy: it is pipeline scratch space, reachable only
-- with the service key. Only the modelled tables are exposed.
create policy "premise_location is publicly readable"
  on public.premise_location for select to anon, authenticated using (true);
create policy "premise_observation is publicly readable"
  on public.premise_observation for select to anon, authenticated using (true);
