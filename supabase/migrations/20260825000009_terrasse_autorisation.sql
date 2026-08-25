-- Terrasses et étalages autorisés (w1-terrasses, issue #15).
--
-- PLAN-ACTION-VACANCE.md §5.4 / w1-terrasses: "pour un café, c'est binaire : une terrasse
-- est-elle déjà autorisée sur cette façade ?" Fait administratif, measured — jamais un CA
-- terrasse déduit d'une autorisation (une autorisation n'est pas une terrasse installée
-- aujourd'hui).
--
-- Source: opendata.paris.fr, dataset terrasses-autorisations, Direction de l'Urbanisme —
-- "terrasses permanentes et estivales ainsi que les étalages, autorisés à Paris". ODbL.
-- Measured 25 August 2026: 24 204 rows, 10 with no `typologie` at all (skipped by
-- scripts/ingest/terrasses.ts, nothing to classify) and none missing a geo point.
--
-- Unlike chantiers-perturbants, this source publishes no code table for `typologie` — a
-- free-text field with 30+ raw values (TERRASSE OUVERTE, ÉTALAGE, CONTRE TERRASSE ESTIVALE
-- SUR TROTTOIR…). Reading the linked paris.fr regulatory page (measured 25 August):
-- "Les terrasses estivales sont autorisées pour 7 mois chaque année, du 1er avril au
-- 31 octobre" against "terrasse annuelle" for the year-round kind — the ticket's own
-- "permanente" is the source's "annuelle". `categorie` is derived from that vocabulary — any
-- value containing ESTIVALE is estivale, any containing (É)TALAGE is étalage, everything
-- else is permanente (annuelle) — never invented, always read off the source's own words.
--
-- The dataset states no update cadence anywhere in its catalogue description (unlike
-- chantiers-perturbants' explicit "Mise à jour hebdomadaire") — 'rare' here is the honest
-- gap, not a measured rhythm; see the cadence_note below and docs/tickets/w1-terrasses.md.

create table public.terrasse_autorisation (
  id                 bigint generated always as identity primary key,
  typologie          text,               -- source's own free-text label, kept verbatim
  categorie          text not null check (categorie in ('permanente', 'estivale', 'etalage')),
  adresse            text,               -- source's own free-text address, kept verbatim
  arrondissement     smallint,
  nom_enseigne       text,
  nom_societe        text,
  siret              text,
  longueur           double precision,
  largeur            double precision,
  lien_affichette    text,
  -- Parsed once at ingestion from `adresse` (scripts/ingest/terrasses.ts), because the
  -- source gives one free-text string rather than BODACC's already-split numeroVoie /
  -- typeVoie / nomVoie. house_number/way_type/way_name feed the same
  -- compass_bodacc_street_key() the BODACC attachment already uses (20260809000002) — reused
  -- rather than reinvented, since both sources write the same spelled-out, accented voie
  -- vocabulary ("AVENUE DE CHOISY", not BDCom's "AV CHOISY").
  house_number       integer,
  way_type           text,
  way_name           text,
  street_key         text generated always as (
                       public.compass_bodacc_street_key(way_type, way_name)
                     ) stored,
  geom               extensions.geography(Point, 4326)
);

comment on table public.terrasse_autorisation is
  'Authorised terraces and étalages. opendata.paris.fr, dataset terrasses-autorisations, '
  'Direction de l''Urbanisme. An authorisation on file, never proof of a terrace installed '
  'today (PLAN-ACTION-VACANCE.md, catalogue des sources — w1-terrasses).';

comment on column public.terrasse_autorisation.categorie is
  'Derived from `typologie` against the source''s own vocabulary — see the paris.fr '
  'regulatory page cited in this migration''s header. Never invented: ESTIVALE and '
  '(É)TALAGE are substrings the source writes itself, and everything else is the source''s '
  '"annuelle" (this project''s "permanente").';

create index terrasse_autorisation_street_idx on public.terrasse_autorisation (street_key, house_number);
create index terrasse_autorisation_geom_idx on public.terrasse_autorisation using gist (geom);

alter table public.terrasse_autorisation enable row level security;

create policy "terrasse_autorisation is publicly readable"
  on public.terrasse_autorisation for select to anon, authenticated using (true);


-- ---------------------------------------------------------------------------
-- Denormalised onto premise_location — but not by nearest-point, unlike PLU and chantiers.
--
-- Measured 25 August 2026, before writing a single line of the attachment query: for a
-- 2 000-point random sample of terraces, the nearest BDCom premise sat at a median of 4.4 m
-- (p90 10.7 m, p99 22 m) — tight enough that nearest-match looked safe at first. A spot check
-- of 12 named terraces said otherwise: "LE MANDARIN DE CHOISY"'s nearest premise, 9 m away,
-- carries the sign PICARD (a frozen-food shop); "LEON DE BRUXELLES" at 9.5 m matches a
-- premise signed MAN COCO. A third of the spot-checked sample pointed at the wrong shop —
-- exactly premiseHistory.ts's documented trap (src/services/compass/premiseHistory.ts):
-- nearest is not the same shopfront when several premises share a coordinate or a doorway.
--
-- So the attachment is by address instead, reusing the BODACC join
-- (20260809000002_bodacc_address_matching.sql) rather than distance: street_key + house
-- number. Measured on the full 24 145 addresses that parsed: 4 295 distinct addresses match
-- exactly one premise, 7 500 match more than one (69 % of BDCom premises share a street
-- number — PLAN.md §3.3 — and this dataset is no exception), 2 625 match none. A shared
-- address cannot say *which* co-located premise the authorisation belongs to, so it is not
-- guessed at — `terrasse_status` says 'inconnu' rather than picking one, on the same
-- principle premiseHistory.ts already applies to OSM↔BDCom matching.
-- ---------------------------------------------------------------------------

alter table public.premise_location
  add column terrasse_status text not null default 'non'
    check (terrasse_status in ('oui', 'non', 'inconnu')),
  add column terrasse_permanente boolean not null default false,
  add column terrasse_estivale   boolean not null default false,
  add column terrasse_etalage    boolean not null default false;

comment on column public.premise_location.terrasse_status is
  '''oui'' — exactly one premise sits at this street+number, and a terrasse/étalage is '
  'authorised there. ''inconnu'' — an authorisation exists at this street+number, but '
  'several premises share it and which one it belongs to is not published. ''non'' — no '
  'authorisation on file at this address. Computed at ingestion by '
  'scripts/ingest/terrasses.ts. A fait administratif (PLAN-ACTION-VACANCE.md — '
  'w1-terrasses), never a turnover estimate: an authorisation is not a terrace installed '
  'today.';

create index premise_location_terrasse_status_idx on public.premise_location (terrasse_status)
  where terrasse_status <> 'non';


-- ---------------------------------------------------------------------------
-- Registered as a seventh ingestion source. 'rare' is the honest gap, not a measured
-- rhythm: the catalogue states no update cadence for this dataset, unlike
-- chantiers-perturbants' explicit "Mise à jour hebdomadaire". Most of what this source
-- tracks — the "annuelle"/permanente authorisations — genuinely is long-lived once
-- granted; the "estivale" third recurs on the same calendar window every year rather than
-- churning week to week. 'rare' is the closest existing bucket to that, declared as a gap
-- rather than a measurement, and open to correction the day the source states its own.
-- ---------------------------------------------------------------------------

insert into public.ingestion_run (source, label, cadence, cadence_note) values
  ('terrasses', 'Terrasses et étalages autorisés (Ville de Paris)', 'rare',
   'Aucune cadence de mise à jour publiée par le jeu lui-même (contrairement à '
   'chantiers-perturbants) — ''rare'' est un manque déclaré, pas une mesure. Les '
   'autorisations "annuelles" (permanentes) sont durables une fois accordées ; les '
   '"estivales" reviennent chaque année sur la même fenêtre réglementaire (1er avril au '
   '31 octobre) plutôt que de changer semaine après semaine.');
