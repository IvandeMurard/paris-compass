-- Administrative and street geography.
--
-- Two reasons these exist before any premise table:
--
-- 1. `quartier` replaces the nearest-centroid attachment in
--    src/services/opendata/properties.ts. A premise belongs to the quartier whose
--    polygon contains it, not to the one whose centre happens to be closest —
--    those differ near quartier boundaries, which is exactly where the answer
--    matters.
-- 2. `street_segment` is the unit the product claims. A segment ends at an
--    intersection, so "what this stretch became since 2017" is a real question.
--    Grouping by street name instead would put the whole rue de Vaugirard —
--    4 km, five quartiers — into one bucket.
--
-- Both are attached to premises once at ingestion and denormalised onto
-- premise_location, so a radius query never pays for a polygon join.

create table public.quartier (
  id            smallint primary key,
  code          text     not null unique,
  name          text     not null,
  arrondissement smallint not null,
  geom          extensions.geography(MultiPolygon, 4326) not null
);

comment on table public.quartier is
  'The 80 administrative quartiers of Paris. Source: Ville de Paris open data.';

create index quartier_geom_idx on public.quartier using gist (geom);
create index quartier_arrondissement_idx on public.quartier (arrondissement);


create table public.street_segment (
  id             bigint primary key,
  name           text,
  way_type       text,
  arrondissement smallint,
  geom           extensions.geography(LineString, 4326) not null
);

comment on table public.street_segment is
  'Street centreline segments between two intersections (troncon_voie, Ville de '
  'Paris). The granularity every rotation statistic is aggregated to.';

comment on column public.street_segment.id is
  'Source identifier, kept as-is so a reload is idempotent and traceable.';

create index street_segment_geom_idx on public.street_segment using gist (geom);
create index street_segment_name_idx on public.street_segment (arrondissement, name);


alter table public.quartier       enable row level security;
alter table public.street_segment enable row level security;

-- Public reference data: readable by anyone, writable only through the service
-- key used by the ingestion pipeline. There is deliberately no insert/update/
-- delete policy — the browser must never be able to write reference geography.
create policy "quartier is publicly readable"
  on public.quartier for select to anon, authenticated using (true);

create policy "street_segment is publicly readable"
  on public.street_segment for select to anon, authenticated using (true);
