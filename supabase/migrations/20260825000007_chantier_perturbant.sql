-- Chantiers perturbants — disruptive worksites (w1-chantiers, issue #11).
--
-- PLAN.md §5.1: "Dix-huit mois de travaux devant une vitrine décident d'un commerce,
-- et personne ne le dit au preneur avant la signature." A fait d'exposition, never a
-- prediction of impact on turnover — the phrase is dated and sourced, an
-- administrative fact, exactly like the PLU protection this migration mirrors in
-- shape (20260825000004): a reference table plus a denormalised attachment on
-- premise_location, recomputed at ingestion.
--
-- Source: opendata.paris.fr, dataset chantiers-perturbants — "les chantiers
-- principaux ayant un impact sur la circulation": perturb car or bike traffic, last
-- more than a week, sit on a main road (outside the périphérique), polygons drawn by
-- hand by the city. Measured 25 August 2026: 121 rows, 120 carrying geometry (one
-- entirely empty row, CP003069, skipped by scripts/ingest/chantiers.ts) — 109
-- Polygon, 11 MultiPolygon. ODbL, like every other Paris Open Data layer already
-- ingested.

create table public.chantier_perturbant (
  id                         text primary key,  -- identifiant, the source's own row id (e.g. CP002371)
  arrondissement             smallint,
  typologie                  smallint,           -- 1 Ville, 2 Concessionnaire, 3 Privé
  objet                      text,               -- source's own enum, e.g. REHABILITATION_IMMEUBLE — not
                                                  -- documented by the dataset, so kept verbatim rather than
                                                  -- guessed at (unlike statut_label below, which the source does document)
  description                text,
  voie                       text,
  precision_localisation     text,
  date_debut                 date not null,
  date_fin                   date not null,
  impact_circulation         text,               -- RESTREINTE, BARRAGE_TOTAL, SENS_UNIQUE, IMPASSE
  impact_circulation_detail  text,
  niveau_perturbation        smallint,            -- 1 très perturbant, 2 perturbant
  statut                     smallint not null,   -- 1 à venir, 2 en cours, 3 suspendu, 4 prolongé, 5 terminé
  statut_label               text not null,       -- resolved once at ingestion, not left to every reader
  maitre_ouvrage             text,
  geom                       extensions.geography(MultiPolygon, 4326) not null
);

comment on table public.chantier_perturbant is
  'Disruptive worksites, "chantiers principaux ayant un impact sur la circulation". '
  'opendata.paris.fr, dataset chantiers-perturbants, weekly update (measured — the '
  'ticket said daily and was wrong). Informational fact, dated and sourced, never a '
  'prediction of impact on turnover (PLAN.md §5.1).';

comment on column public.chantier_perturbant.statut_label is
  'French label for `statut`, resolved once at ingestion from the dataset''s own '
  'code table (Description des codes) rather than left to every reader to decode.';

create index chantier_perturbant_geom_idx on public.chantier_perturbant using gist (geom);

alter table public.chantier_perturbant enable row level security;

create policy "chantier_perturbant is publicly readable"
  on public.chantier_perturbant for select to anon, authenticated using (true);


-- ---------------------------------------------------------------------------
-- Denormalised onto premise_location, the same discipline as quartier_id,
-- street_segment_id and the PLU flags: a radius query never pays for a spatial
-- join, and the attachment is recomputed at ingestion. Unlike PLU, worksites are
-- ephemeral — the source rewrites this table weekly, and a finished chantier drops
-- off the feed — so the link is `on delete set null` rather than a hard reference:
-- a premise whose nearest worksite disappears on reload must lose the pointer, not
-- block the delete.
-- ---------------------------------------------------------------------------

alter table public.premise_location
  add column nearest_chantier_id text references public.chantier_perturbant(id) on delete set null,
  add column chantier_distance_m double precision,
  add column chantier_exposed boolean generated always as (nearest_chantier_id is not null) stored;

comment on column public.premise_location.chantier_exposed is
  'True when a disruptive worksite sits within 40 m of the premise (the distance '
  'named by w1-chantiers'' "Fait quand"). Computed at ingestion by '
  'scripts/ingest/chantiers.ts, nearest-match only per premise — the lesson w0-plu '
  'learned the hard way applies here too: matching every worksite within tolerance '
  'rather than each premise''s single nearest one would over-count near a cluster of '
  'sites. A fait d''exposition (PLAN.md §5.1), never a prediction of impact.';

create index premise_location_chantier_exposed_idx on public.premise_location (chantier_exposed)
  where chantier_exposed;


-- ---------------------------------------------------------------------------
-- Registered as a sixth ingestion source. 'weekly' — added in the migration just
-- before this one — is the rhythm the dataset's own description states, corrected
-- from the "quotidien" the ticket's "Comment" carried without a repository read.
-- ---------------------------------------------------------------------------

insert into public.ingestion_run (source, label, cadence, cadence_note) values
  ('chantiers', 'Chantiers perturbants (Ville de Paris)', 'weekly',
   'Mise à jour hebdomadaire, déclarée par le jeu lui-même — pas quotidienne, '
   'contrairement à ce que docs/tickets/w1-chantiers.md indiquait avant relecture. '
   'Les emprises ne sont pas exhaustives : seuls les chantiers principaux, hors '
   'périphérique, de plus d''une semaine et dessinés à la main par la ville.');
