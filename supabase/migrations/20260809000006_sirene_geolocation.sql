-- SIRENE establishment geolocation, and a fourth confidence level.
--
-- Why this source, and only this slice of it. Measured on 10 000 premises, the
-- confidence mix of a chronology is 51.6% etabli, 42.4% probable, 6.0%
-- indetermine — and **every single `probable` row comes from BODACC**, 16 535 of
-- them for one reason: an insolvency notice publishes the company's registered
-- office, never the establishment. That single ambiguity is the largest quality
-- lever available.
--
-- INSEE publishes a geolocated establishment file (SIRET + WGS 84 coordinates,
-- 3 282 613 rows for Paris, 98% located to the exact street number). If the
-- company filing at that address also has a SIRENE establishment there, two
-- independent public sources place it at the address.
--
-- Deliberately only the geolocation slice: this file carries no dates and no
-- administrative state, so it answers "is the company here" and nothing else.
-- Establishment cessation dates — PLAN §3.4 — are a different file and a
-- different chantier.

create table public.sirene_establishment (
  siret             text primary key,
  siren             text not null,
  geom              extensions.geography(Point, 4326) not null,
  geocoding_quality text
);

comment on table public.sirene_establishment is
  'SIRET and position only, for the Paris SIREN that appear in BODACC notices. '
  'Answers "does this company have an establishment at this address"; carries '
  'nothing about when it opened or whether it is still active.';

comment on column public.sirene_establishment.geocoding_quality is
  'INSEE code. 11 = located to the exact street number (98% of Paris rows); '
  'anything else is coarser and must not be used to confirm an address.';

create index sirene_establishment_siren_idx on public.sirene_establishment (siren);
create index sirene_establishment_geom_idx on public.sirene_establishment using gist (geom);

alter table public.sirene_establishment enable row level security;
create policy "sirene_establishment is publicly readable"
  on public.sirene_establishment for select to anon, authenticated using (true);


alter table public.bodacc_establishment
  add column operator_confirmed boolean;

comment on column public.bodacc_establishment.operator_confirmed is
  'True when the notice''s SIREN has a SIRENE establishment within 50 m of this '
  'address, geocoded to the exact number. Null means unchecked or unknown — the '
  'company may simply be absent from the slice we loaded, which is not evidence '
  'of anything.';


-- ---------------------------------------------------------------------------
-- A fourth level, and why it is not a promotion to `etabli`
-- ---------------------------------------------------------------------------
-- SIRENE says "this company has an establishment at this address". It does not
-- say "this company is the ground-floor shop" — the establishment could be an
-- office upstairs. So corroboration by a second source is genuinely stronger
-- than one source alone, and genuinely weaker than a notice naming the
-- establishment itself. Collapsing it into either neighbour would overstate or
-- waste it, so it gets its own name.
--
-- Added in its own migration: Postgres forbids using a new enum value in the
-- same transaction that adds it.
alter type public.compass_confidence add value if not exists 'corrobore' after 'etabli';
