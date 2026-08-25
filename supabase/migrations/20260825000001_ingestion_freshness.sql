-- Freshness per dataset: when the pipeline last succeeded, and how current the data itself is.
--
-- Two different facts, and conflating them is the whole risk this table exists to avoid.
-- Reloading BODACC today makes *our copy* current; it does not make the notices recent. A
-- BDCom vintage loaded this morning is still a 2023 survey. `bdcom_vintage` already keeps the
-- pair apart — `as_of` for the survey, `ingested_at` for the load — and this table generalises
-- that discipline to the other three sources, which had neither.
--
-- PLAN.md §2.2ter asked for "une table générique (source, dernière exécution réussie, nombre de
-- lignes)". It gets three columns more than that, each for a reason:
--
--   source_as_of  what the data says about its own recency. Never derived from the clock.
--   cadence       the rhythm the source actually publishes on. Declared, because the four
--                 differ by three orders of magnitude and one number for all four would be
--                 false for at least three of them (§2.2bis).
--   run_by        'manual' or 'github-actions'. This is what makes the doctrine auditable
--                 rather than aspirational: §2.2ter says displaying a date is only honest if
--                 the refresh is "soit réel, soit déclaré". A reader can now tell which,
--                 because a run records who caused it. Without this column the table would
--                 look identical whether the cron worked or someone ran it by hand in
--                 August — which is precisely the fabricated-rent failure in a new costume.

create type public.ingestion_cadence as enum (
  'continuous',  -- BODACC: published every working day
  'monthly',     -- SIRENE: INSEE republishes the geolocated file monthly
  'triennial',   -- BDCom: APUR surveys roughly every three years, no fixed calendar
  'rare'         -- reference geography: quartiers and street network barely move
);

create table public.ingestion_run (
  source           text primary key,
  label            text not null,
  cadence          public.ingestion_cadence not null,
  -- Why that cadence, in one sentence a caller can relay. Not a comment: it reaches the API.
  cadence_note     text not null,

  -- Measured. Null until the loader has actually completed once against this database.
  last_success_at  timestamptz,
  row_count        integer,
  duration_ms      integer,

  -- What the source says about its own recency, written by the loader from the source, never
  -- from now(). Free text because the four disagree on granularity: '2023-06' for a survey
  -- year, '2026-07-21' for a dated INSEE file, a date for the newest BODACC notice held.
  source_as_of     text,

  -- Provenance of the run itself. A freshness date whose refresh is manual is a freshness date
  -- that stops the day someone stops running it, and nothing else on this row would say so.
  run_by           text,
  -- The workflow run, when there was one. Lets a reader verify the claim instead of trusting it.
  run_ref          text,

  constraint ingestion_run_run_by_known
    check (run_by is null or run_by in ('manual', 'github-actions'))
);

comment on table public.ingestion_run is
  'One row per dataset the pipeline loads. Separates when we last loaded (last_success_at) '
  'from how current the data is (source_as_of) — the two are not the same fact and must never '
  'be rendered as one. Written only by the ingestion scripts, which connect with a privileged '
  'role; readable by anon. See PLAN.md §2.2bis and §2.2ter.';

comment on column public.ingestion_run.last_success_at is
  'End of the last run that completed without throwing. A failed run leaves this untouched: a '
  'half-loaded dataset must not advance a freshness date.';

comment on column public.ingestion_run.source_as_of is
  'The recency of the data, from the source. Never now(). Reloading a pinned file does not '
  'move this, which is the point — the reload is real, the data is not newer.';

comment on column public.ingestion_run.run_by is
  'manual | github-actions. Makes "réel ou déclaré" checkable rather than asserted.';

-- The four rows exist from the start, with their cadence declared and their measurements null.
-- A source absent from this table would be indistinguishable from a source never loaded, and
-- the product's whole discipline is that absence and zero are different answers.
insert into public.ingestion_run (source, label, cadence, cadence_note) values
  ('bdcom', 'APUR BDCom — recensement des locaux', 'triennial',
   'Recensement de terrain porte-à-porte, publié tous les trois ans environ et sans calendrier '
   'annoncé. Un rechargement ne rajeunit pas le millésime : il vérifie que la couche servie est '
   'toujours celle que la source publie.'),
  ('geography', 'Quartiers et réseau viaire (Paris Open Data)', 'rare',
   'Les 80 quartiers administratifs et le réseau de voies ne bougent qu''à la marge. Rechargé '
   'rarement, et jamais en même temps qu''autre chose : le rattachement des locaux se recalcule.'),
  ('bodacc', 'BODACC (DILA) — cessions et procédures collectives', 'continuous',
   'Publié chaque jour ouvré. C''est la seule des quatre sources dont la fraîcheur se dégrade '
   'en jours plutôt qu''en années.'),
  ('sirene', 'SIRENE géolocalisé (INSEE)', 'monthly',
   'L''INSEE republie le fichier géolocalisé chaque mois. L''URL du parquet est épinglée dans '
   'scripts/ingest/sirene.ts : tant qu''elle ne change pas, un rechargement mensuel relit le '
   'même millésime et source_as_of ne bouge pas — c''est voulu, et c''est ce qui rend le '
   'décalage visible au lieu de le masquer.');

alter table public.ingestion_run enable row level security;

-- Read-only for the browser roles, like every other reference table. No insert, update or
-- delete policy: only the ingestion scripts write here, and they connect with a role that
-- bypasses RLS — never the anon key (scripts/ingest/lib/db.ts).
create policy "ingestion_run is publicly readable"
  on public.ingestion_run for select to anon, authenticated using (true);

grant select on public.ingestion_run to anon, authenticated;


-- ---------------------------------------------------------------------------
-- The RPC. Named for what it answers, not for the table behind it.
-- ---------------------------------------------------------------------------
create or replace function public.compass_source_freshness()
returns table (
  source          text,
  label           text,
  cadence         public.ingestion_cadence,
  cadence_note    text,
  source_as_of    text,
  ingested_at     timestamptz,
  row_count       integer,
  run_by          text,
  run_ref         text,
  -- Derived so that no caller has to reimplement the subtraction — and so that "never loaded"
  -- comes back as null rather than as a very large number, which would read as very stale
  -- instead of as unknown.
  age_days        integer
)
language sql stable parallel safe security invoker
set search_path = public, extensions
as $$
  select r.source, r.label, r.cadence, r.cadence_note, r.source_as_of,
         r.last_success_at, r.row_count, r.run_by, r.run_ref,
         case when r.last_success_at is null then null
              else extract(day from (now() - r.last_success_at))::integer
         end
  from public.ingestion_run r
  order by r.source;
$$;

comment on function public.compass_source_freshness() is
  'Freshness per dataset. `ingested_at` is when we last loaded, `source_as_of` is how current '
  'the data is, and they are different questions — a caller that renders only the first will '
  'tell someone that a 2023 survey is from this morning. `cadence` says how often the source '
  'itself publishes, `run_by` says whether the refresh is really automated. Readable by anon: '
  'a load date discloses nothing about a withheld vintage''s contents.';

grant execute on function public.compass_source_freshness() to anon, authenticated;
