-- PLU bioclimatique — protection du commerce et de l'artisanat (w0-plu, issue #9).
--
-- PLAN.md §2.4: on a protected linear, a ground-floor premise cannot change use —
-- "la première chose qui peut faire capoter un projet". Fourni pour information,
-- sans valeur réglementaire (Portail des Règles d'Urbanisme is the authority);
-- this is a binary, mapped constraint, never a score (PERIMETRE.md, "Sur la
-- légalité").
--
-- Source: opendata.paris.fr, dataset plub_protcom, version voted by the Conseil
-- de Paris on 20 November 2024 (the dataset's own description). ODbL. 5 107
-- linear features, each carrying three independent flags — général, proximité,
-- culturel — because a stretch of street can hold more than one protection at
-- once (measured on the full export: 4 607 pca, 468 ppa, 110 pcc, and every row
-- carries at least one of the three).

create table public.plu_linear_protection (
  id                  integer  primary key,  -- n_sq_pca, the source's own row identifier
  arrondissement_min  smallint not null,
  arrondissement_max  smallint not null,
  -- Three independent flags, kept apart rather than collapsed into one boolean:
  -- the source publishes three distinct protections and a caller may need to
  -- say which one applies, not just that one does.
  commerce_artisanat  boolean  not null,  -- pca = 'O' — protection générale
  commerce_proximite  boolean  not null,  -- ppa = 'O' — commerce artisanal de proximité
  commerce_culturel   boolean  not null,  -- pcc = 'O' — commerce culturel
  length_m            double precision not null,
  geom                extensions.geography(LineString, 4326) not null
);

comment on table public.plu_linear_protection is
  'Linear stretches of street carrying a PLU protection of commerce or craft. '
  'plub_protcom, opendata.paris.fr, version voted 2024-11-20. Informational, no '
  'regulatory value — PLAN.md §2.4.';

create index plu_linear_protection_geom_idx on public.plu_linear_protection using gist (geom);

alter table public.plu_linear_protection enable row level security;

create policy "plu_linear_protection is publicly readable"
  on public.plu_linear_protection for select to anon, authenticated using (true);


-- ---------------------------------------------------------------------------
-- Denormalised onto premise_location, the same discipline as quartier_id and
-- street_segment_id (20260808000002): a radius query never pays for a spatial
-- join, and the attachment is recomputed at ingestion, not read live.
-- ---------------------------------------------------------------------------

alter table public.premise_location
  add column plu_commerce_artisanat boolean not null default false,
  add column plu_commerce_proximite boolean not null default false,
  add column plu_commerce_culturel  boolean not null default false,
  add column plu_protected boolean generated always as (
    plu_commerce_artisanat or plu_commerce_proximite or plu_commerce_culturel
  ) stored;

comment on column public.premise_location.plu_protected is
  'True when the premise sits on a linear carrying at least one of the three PLU '
  'protections. Computed at ingestion by scripts/ingest/plu.ts against '
  'plu_linear_protection — see that file for the distance threshold and its '
  'measurement. A binary constraint, not a score (PLAN.md §2.4).';

create index premise_location_plu_protected_idx on public.premise_location (plu_protected)
  where plu_protected;


-- ---------------------------------------------------------------------------
-- Registered as a fifth ingestion source (20260825000001_ingestion_freshness),
-- alongside bdcom/geography/bodacc/sirene. 'rare' fits the same way it fits
-- geography: a PLU revision is a Conseil de Paris vote, not a calendar event,
-- and this one barely moves between votes.
-- ---------------------------------------------------------------------------

insert into public.ingestion_run (source, label, cadence, cadence_note) values
  ('plu', 'PLU bioclimatique — protection du commerce et de l''artisanat', 'rare',
   'Voté par le Conseil de Paris, sans calendrier annoncé — la version courante '
   'date du 20 novembre 2024. Un rechargement ne rajeunit pas le vote : il '
   'vérifie que la couche servie est toujours celle publiée.');
