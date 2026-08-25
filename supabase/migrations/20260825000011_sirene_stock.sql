-- SIRENE stock: the dates the geolocated slice does not carry (w1-survie, issue #14).
--
-- ---------------------------------------------------------------------------
-- Why this is a NEW source, against what the ticket says
-- ---------------------------------------------------------------------------
-- w1-survie states "Aucune source nouvelle ... les deux sont déjà ingérées"
-- (PLAN.md §5.2). Measured 25 August 2026 against this database, that is false:
-- `sirene_establishment` holds four columns — siret, siren, geom,
-- geocoding_quality — and no date, no administrative state. 20260809000006 said so
-- in its own header when it loaded that slice: "this file carries no dates and no
-- administrative state ... Establishment cessation dates — PLAN §3.4 — are a
-- different file and a different chantier."
--
-- This is that different file. The claim was never cross-checked against the base
-- after it was written — the same failure mode as the "chantiers quotidien" of
-- session 8 and the "ledger at 24" of session 1. PLAN.md §5.2 and the ticket are
-- corrected rather than left to contradict this table.
--
-- ---------------------------------------------------------------------------
-- What it is, measured before loading
-- ---------------------------------------------------------------------------
-- data.gouv.fr, "Base Sirene des entreprises et de leurs établissements", file
-- StockEtablissement, parquet, 2.20 GB, vintage 2026-08-01. Licence Ouverte v2 —
-- **redistributable**, unlike BDCom 2017 and 2020 whose APUR licence has not been
-- read. That asymmetry is the reason this table exists at all: it is the only
-- source in the corpus that can publish a survival figure to an anonymous caller.
--
-- Measured on the parquet, 25 August 2026, Paris (codeCommune 751xx):
--
--   3 759 919  establishments of all states
--   1 335 566  active
--   2 424 353  closed, of which 2 374 300 (97.9 %) carry a closure date
--   3 501 702  (93.1 %) carry a creation date
--     448 506  (11.9 %) non-diffusible — address masked, so unattachable
--     371 511  after the filter this table applies (see below)
--
-- ---------------------------------------------------------------------------
-- The trap: `dateDebut` is the closure date, and nothing in the name says so
-- ---------------------------------------------------------------------------
-- INSEE models an establishment as a series of periods. The stock file carries
-- only the *current* period, so `dateDebut` is when the current state began. When
-- `etatAdministratifEtablissement = 'F'`, the current state is "closed" and
-- `dateDebut` is therefore **the date it closed**. Reading it as "start date" —
-- which is what the column name invites — would date every closure to the wrong
-- end of the establishment's life and silently invert the survival curve.
--
-- Kept under the source's own name rather than renamed to `closed_on`: renaming at
-- ingestion loses the trace of which field produced which value, which is the
-- provenance rule this codebase applies everywhere else (20260808000004). The
-- meaning is carried by a comment and by a generated column that does the reading
-- once, in SQL, instead of in every query.

create table public.sirene_etablissement_stock (
  siret              text primary key,
  siren              text not null,

  -- Source column names kept verbatim, as in stg_bdcom_od.
  date_creation      date,
  etat_administratif text not null check (etat_administratif in ('A', 'F')),
  date_debut         date,

  -- The reading of the trap above, done once. Null for an active establishment: an
  -- establishment that has not closed has no closure date, and a null here is
  -- "still open", never "closed on an unknown date" — those two are different
  -- answers and the survival query has to be able to tell them apart.
  date_fermeture     date generated always as (
                       case when etat_administratif = 'F' then date_debut end
                     ) stored,

  activite_naf       text,
  enseigne           text,
  denomination       text,

  -- Address, split as INSEE publishes it, feeding the same
  -- compass_bodacc_street_key() the BODACC and terrasse attachments already use
  -- (20260809000002, 20260825000009). Reused rather than reinvented: INSEE writes
  -- the same spelled-out voie vocabulary as BODACC ("AVENUE DE CHOISY"), not
  -- BDCom's abbreviated form ("AV CHOISY").
  house_number       integer,
  way_type           text,
  way_name           text,
  code_postal        text,
  street_key         text generated always as (
                       public.compass_bodacc_street_key(way_type, way_name)
                     ) stored,

  -- Attached at ingestion. See the attachment section below for why it stops here
  -- and never reaches a premise.
  quartier_id        smallint references public.quartier(id)
);

comment on table public.sirene_etablissement_stock is
  'INSEE SIRENE stock, Paris, street-level trades only. Carries the creation and '
  'closure dates that sirene_establishment (20260809000006) deliberately does not. '
  'Licence Ouverte v2 — redistributable, unlike BDCom 2017/2020. One row per SIRET, '
  'current period only: see date_debut comment for the trap that hides in it.';

comment on column public.sirene_etablissement_stock.date_debut is
  'Start of the establishment CURRENT period, as INSEE publishes it. When '
  'etat_administratif = ''F'' this is the date it CLOSED, not the date it opened — '
  'the column name says the opposite of what the value means for a closed row. Use '
  'date_fermeture, which does that reading once.';

comment on column public.sirene_etablissement_stock.date_fermeture is
  'Closure date, or null while the establishment is active. Null is "still open", '
  'never "closed on an unknown date".';

comment on column public.sirene_etablissement_stock.quartier_id is
  'The quartier of the ADDRESS, never of a premise. An address determines its '
  'quartier without ambiguity even when it holds twenty premises, which is exactly '
  'why the attachment stops here.';

create index sirene_stock_street_idx on public.sirene_etablissement_stock (street_key, house_number);
create index sirene_stock_naf_idx on public.sirene_etablissement_stock (activite_naf);
create index sirene_stock_quartier_idx on public.sirene_etablissement_stock (quartier_id, activite_naf);
create index sirene_stock_creation_idx on public.sirene_etablissement_stock (date_creation);

alter table public.sirene_etablissement_stock enable row level security;

-- Publicly readable, and that is a licence statement rather than an oversight:
-- Licence Ouverte v2 permits redistribution. premise_observation carries the
-- opposite policy for the same reason in reverse.
create policy "sirene_etablissement_stock is publicly readable"
  on public.sirene_etablissement_stock for select to anon, authenticated using (true);


-- ---------------------------------------------------------------------------
-- Why the attachment stops at the quartier
-- ---------------------------------------------------------------------------
-- A SIRET is not a premise. docs/SESSIONS.md calls joining SIRENE to BDCom "the
-- hardest inference in the backlog", and the measurement agrees: 69 % of BDCom
-- premises share their street number (PLAN.md §3.3), so an address never names
-- which shopfront an establishment occupies — and an establishment may be an office
-- upstairs, which 20260809000006 already had to say about the geolocated slice.
--
-- So the attachment resolves what the address *can* determine and stops. An address
-- belongs to exactly one quartier however many premises stand at it, so quartier_id
-- is a fact; a location_id would be a guess. This is the same line w1-terrasses drew
-- the day before — oui when an address holds one premise, inconnu when it holds
-- several — pushed one step further, because a survival rate has no use for a single
-- premise in the first place.
--
-- The consequence, and it is a real restriction: only establishments at an address
-- BDCom also surveyed get a quartier. That is deliberate. It keeps the SIRENE
-- denominator on commercial addresses, comparable with the BDCom one, instead of
-- mixing in the office floors and residential addresses that make up most of the
-- 3.76 M Paris rows.


insert into public.ingestion_run (source, label, cadence, cadence_note) values
  ('sirene_stock', 'SIRENE stock établissements (INSEE)', 'monthly',
   'L''INSEE republie le stock chaque mois, le 1er. Le millésime est résolu depuis '
   'l''API data.gouv.fr et écrit dans source_as_of — jamais épinglé : la ressource est '
   'remplacée et non archivée, ce qui a rendu 404 l''URL épinglée du fichier géolocalisé '
   'le 25 août 2026 (#56).');
