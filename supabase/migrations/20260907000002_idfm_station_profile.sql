-- Validations IDFM horaires — w2-idfm (issue #19). First source branché depuis le
-- 23 août 2026: PLAN-ACTION-VACANCE.md's "Validations transport IDFM" moves from
-- planifiée to ingérée.
--
-- WHY THE IDFM PORTAL, NOT data.gouv.fr — the endpoint choice the ticket asked for first.
-- Measured 7 September 2026: data.gouv.fr only carries RATP's "Trafic annuel entrant par
-- station" — one number per station per YEAR, no hour-of-day breakdown, so it cannot show
-- "profil midi vs soir" at all. data.iledefrance-mobilites.fr (the same Opendatasoft product
-- as opendata.paris.fr, at a different host) publishes the family this ticket actually needs:
-- "Validations sur le réseau ferré : Profils horaires par jour type" — the share of each
-- station's day falling in every hour bucket, by day-type code. That is the doctrine's
-- "mesuré à la station, pas à la porte" made concrete: a shape, not a count.
--
-- WHAT IS NOT INGESTED, AND WHY — two réserves the ticket's "Comment" already names
-- ("millésime, réserve").
--
--   1. "Historique depuis 2015" (the ticket's "Pourquoi") is the validation SYSTEM's age, not
--      a promise to backfill ten years of hourly profiles. IDFM's historical layer
--      (histo-validations-reseau-ferre, 2015-2024) is a FILE archive — one zip per year, no
--      stable column layout across years, confirmed by its own schema (`annee text,
--      reseau_ferre file`, no tabular fields) — and reconstructing it is its own project, out
--      of scope here. What is loaded is the CURRENT quarter's profile, one snapshot, dated by
--      the portal's own `metas.default.modified` in `ingestion_run.source_as_of`.
--   2. A zdc (zone d'arrêt, the station-level id both datasets share) sometimes carries TWO
--      or more `code_stif_arret` — different lines serving the same physical station, each
--      publishing its own profile normalised to 100 %. This dataset carries no absolute
--      validation count, so there is no way to WEIGHT the two lines by how much each is
--      actually used; scripts/ingest/idfm.ts therefore AVERAGES them per hour bucket, which
--      keeps the combined profile at 100 % but silently treats a rarely-used line's shape as
--      equally important to a heavily-used one's. Written here because it is a property of
--      the number, not a bug scripts/ingest/idfm.ts could fix by reading harder.
--
-- THE DATASET ID IS NEVER PINNED. IDFM republishes this family every quarter under an id that
-- does not settle into one name — measured 7 September 2026, three of the four current
-- editions spell it `validations-reseau-ferre-profils-horaires-par-jour-type-Neme-trimestre`
-- and the fourth carries an extra `-sur-le-` and a trailing year. Pinning today's id would
-- repeat #56 (a resource silently replaced under a URL this project had written down);
-- scripts/ingest/lib/idfmOpendata.ts resolves it by catalogue search instead, every run.
-- docs/REPRISE-PIEGES.md records the trap.

create table public.idfm_station (
  id_zdc          bigint primary key,  -- IDFM's own "zone d'arrêt" identifier
  libelle         text not null,
  arrondissement  smallint,            -- derived from zdapostalregion (751NN → NN), Paris only
  geom            extensions.geography(Point, 4326) not null
);

comment on table public.idfm_station is
  'One row per zone d''arrêt (zdc) of Île-de-France Mobilités'' référentiel des arrêts, '
  'restricted at ingestion to Paris (zdapostalregion like ''751%%'') and to a zdc that carries '
  'at least one row of validation profile — a station with nothing to show would attach '
  'premises to a silence. Coordinates are the average, in Lambert-93 as published and '
  'transformed once here, of every zdaid (individual stop) sharing the zdc — the reference '
  'layer sometimes lists several for one physical station (rail platform, adjoining bus '
  'stop). Licence Ouverte 2.0 (Etalab), read on the zones-d-arrets dataset 7 September 2026 — '
  'a DIFFERENT licence from the profile it is joined to below (ODbL); both are fully open, so '
  'neither restricts an anonymous reader the way a BDCom vintage can.';

create index idfm_station_geom_idx on public.idfm_station using gist (geom);

alter table public.idfm_station enable row level security;

create policy "idfm_station is publicly readable"
  on public.idfm_station for select to anon, authenticated using (true);


create table public.idfm_validation_profile (
  id_zdc           bigint not null references public.idfm_station(id_zdc) on delete cascade,
  cat_jour         text not null,   -- source's own day-type code: JOHV, JOVS, SAHV, SAVS, DIJFP
  hour_bucket      text not null,   -- source's own label, e.g. '8H-9H', kept verbatim
  pct_validations  double precision not null,
  primary key (id_zdc, cat_jour, hour_bucket)
);

comment on table public.idfm_validation_profile is
  'Share of one day''s validations falling in each hourly bucket, at one station, for one '
  'day-type code — a PERCENTAGE OF THAT STATION''S OWN DAY, never an absolute count: this '
  'dataset carries no volume, so two stations cannot be compared on how busy they are, only '
  'on the SHAPE of their day. ODbL, "Licence ODbL Version Française", read on '
  'data.iledefrance-mobilites.fr 7 September 2026. Current quarter only — see this '
  'migration''s header for why 2015-2024 is not backfilled, and why a station with two '
  'serving lines is AVERAGED rather than summed.';

comment on column public.idfm_validation_profile.cat_jour is
  'JOHV (jour ouvré hors vacances scolaires — a typical term-time weekday) is what '
  'distinguishes an office rhythm (a lunchtime peak) from a residential one (an evening '
  'peak) — w2-idfm''s "Fait quand" is read on this code. The other four (JOVS, SAHV, SAVS, '
  'DIJFP) are kept because loading them costs nothing extra at ingestion, not because '
  'anything reads them yet.';


-- ---------------------------------------------------------------------------
-- Denormalised onto premise_location, the same discipline as chantier_perturbant and
-- terrasse_autorisation: a radius query never pays for a spatial join to idfm_station, and
-- the attachment is recomputed at ingestion — nearest match only per premise, the lesson
-- w0-plu and w1-chantiers both learned the hard way (matching everything within tolerance
-- over-counts near a cluster of stations, exactly like it did near a cluster of worksites).
-- `on delete set null` rather than a hard reference: idfm_station is rebuilt wholesale each
-- load (delete + reinsert, scripts/ingest/idfm.ts), so a premise whose nearest station drops
-- out must lose the pointer, not block the delete.
-- ---------------------------------------------------------------------------

alter table public.premise_location
  add column nearest_idfm_station_id bigint references public.idfm_station(id_zdc) on delete set null,
  add column idfm_station_distance_m double precision;

create index premise_location_idfm_station_idx on public.premise_location (nearest_idfm_station_id)
  where nearest_idfm_station_id is not null;


-- ---------------------------------------------------------------------------
-- compass_premises_within gains two columns: the label and distance a caller sees inline,
-- nothing more — the full hourly profile is a separate call, compass_station_profile below.
-- jsonb has no precedent anywhere in this schema (measured 7 September 2026: no `create ...
-- jsonb` in supabase/migrations/ before this one), and threading an array of up to 46 rows
-- through the map's main radius query would set that precedent for a fact only a
-- station-focused view needs — a dedicated function costs one more round trip, never a new
-- column shape on the query every screen already pays for.
--
-- Return-type change, so drop first: `create or replace` cannot add a column (the lesson
-- 20260825000005, 20260825000008 and 20260825000010 already carry).
--
-- The body below also keeps the question_tally logging 20260905000005 added — this project's
-- one journal of usage, not a second one invented here.
-- ---------------------------------------------------------------------------

drop function if exists public.compass_premises_within(
  double precision, double precision, double precision, smallint, integer
);

create function public.compass_premises_within(
  p_lat          double precision,
  p_lng          double precision,
  p_radius_m     double precision default 800,
  p_vintage_year smallint         default 2023,
  p_limit        integer          default 500
)
returns table (
  location_id       bigint,
  ordre             integer,
  lat               double precision,
  lng               double precision,
  distance_m        double precision,
  address           text,
  arrondissement    smallint,
  quartier_name     text,
  street_segment_id bigint,
  activity_code     text,
  activity_label    text,
  activity_niv18    smallint,
  activity_group    text,
  is_vacant         boolean,
  size_band         smallint,
  size_label        text,
  situation_label   text,
  sign_name         text,
  plu_protected            boolean,
  plu_commerce_artisanat   boolean,
  plu_commerce_proximite   boolean,
  plu_commerce_culturel    boolean,
  chantier_exposed         boolean,
  chantier_distance_m      double precision,
  chantier_objet           text,
  chantier_description     text,
  chantier_date_debut      date,
  chantier_date_fin        date,
  chantier_statut_label    text,
  terrasse_status          text,
  terrasse_permanente      boolean,
  terrasse_estivale        boolean,
  terrasse_etalage         boolean,
  idfm_station_name        text,
  idfm_station_distance_m  double precision,
  total_matched     bigint,
  withheld          boolean
)
language plpgsql volatile parallel unsafe security definer
set search_path = public, extensions
as $$
declare
  v_debut    timestamptz := clock_timestamp();
  v_rows     bigint;
  v_point    geography;
  v_vintage  smallint;
  v_withheld boolean;
  v_limit    integer;
begin
  if p_radius_m is null or p_radius_m <= 0 or p_radius_m > public.compass_max_radius_m() then
    raise exception 'p_radius_m must be between 1 and % (got %)',
      public.compass_max_radius_m(), p_radius_m using errcode = '22023';
  end if;

  select v.id,
         -- One expression, in public.compass_caller_is_privileged() — w0-appelant (#58).
         not (public.compass_caller_is_privileged() or v.publicly_redistributable)
    into v_vintage, v_withheld
  from public.bdcom_vintage v
  where v.year = p_vintage_year;

  if v_vintage is null then
    raise exception 'unknown vintage year % (known: 2017, 2020, 2023)', p_vintage_year
      using errcode = '22023';
  end if;

  if v_withheld then
    perform public.compass_record_question(
      'rpc', 'compass_premises_within', 'retenue_licence',
      p_lat, p_lng, p_radius_m, p_vintage_year, 'premises',
      (extract(epoch from (clock_timestamp() - v_debut)) * 1000)::integer);
    return query select
      null::bigint, null::integer, null::double precision, null::double precision,
      null::double precision, null::text, null::smallint, null::text, null::bigint,
      null::text, null::text, null::smallint, null::text, null::boolean,
      null::smallint, null::text, null::text, null::text,
      null::boolean, null::boolean, null::boolean, null::boolean,
      null::boolean, null::double precision, null::text, null::text, null::date, null::date, null::text,
      null::text, null::boolean, null::boolean, null::boolean,
      null::text, null::double precision,
      null::bigint, true;
    return;
  end if;

  v_point := ST_MakePoint(p_lng, p_lat)::geography;
  v_limit := greatest(coalesce(p_limit, 500), 1);

  return query
  -- The counted set. Two identities and a distance: no label is fetched here, because
  -- `total_matched` does not depend on one and the caller never sees the rows beyond `top`.
  with hit as (
    select l.id  as location_id,
           o.id  as observation_id,
           ST_Distance(l.geom, v_point) as distance_m
    from public.premise_location l
    join public.premise_observation o
      on o.location_id = l.id and o.vintage_id = v_vintage
    where ST_DWithin(l.geom, v_point, p_radius_m)
  ),
  top as (
    select h.location_id, h.observation_id, h.distance_m
    from hit h
    -- Total order: distance ties are the rule here, not the exception. See the header.
    order by h.distance_m, h.location_id
    limit v_limit
  )
  select
    l.id                                              as location_id,
    l.ordre                                           as ordre,
    ST_Y(l.geom::geometry)                            as lat,
    ST_X(l.geom::geometry)                            as lng,
    t.distance_m                                      as distance_m,
    trim(concat_ws(' ', l.num::text, nullif(l.let, ''), l.typ_voie, l.lib_voie)) as address,
    l.arrondissement                                  as arrondissement,
    q.name                                            as quartier_name,
    l.street_segment_id                               as street_segment_id,
    o.activity_code                                   as activity_code,
    a.label                                           as activity_label,
    a.niv18                                           as activity_niv18,
    a.label_18                                        as activity_group,
    coalesce(a.is_vacant, false)                      as is_vacant,
    o.size_band                                       as size_band,
    sb.label                                          as size_label,
    st.label                                          as situation_label,
    o.sign_name                                       as sign_name,
    l.plu_protected                                   as plu_protected,
    l.plu_commerce_artisanat                          as plu_commerce_artisanat,
    l.plu_commerce_proximite                          as plu_commerce_proximite,
    l.plu_commerce_culturel                           as plu_commerce_culturel,
    l.chantier_exposed                                as chantier_exposed,
    l.chantier_distance_m                             as chantier_distance_m,
    c.objet                                           as chantier_objet,
    c.description                                     as chantier_description,
    c.date_debut                                      as chantier_date_debut,
    c.date_fin                                        as chantier_date_fin,
    c.statut_label                                    as chantier_statut_label,
    l.terrasse_status                                 as terrasse_status,
    l.terrasse_permanente                             as terrasse_permanente,
    l.terrasse_estivale                               as terrasse_estivale,
    l.terrasse_etalage                                as terrasse_etalage,
    ist.libelle                                       as idfm_station_name,
    l.idfm_station_distance_m                         as idfm_station_distance_m,
    (select count(*) from hit)                        as total_matched,
    false                                             as withheld
  from top t
  join public.premise_location    l  on l.id = t.location_id
  join public.premise_observation o  on o.id = t.observation_id
  left join public.bdcom_activity      a  on a.code = o.activity_code
  left join public.bdcom_size_band     sb on sb.code = o.size_band
  left join public.bdcom_situation     st on st.code = o.situation_code
  left join public.quartier            q  on q.id = l.quartier_id
  left join public.chantier_perturbant c  on c.id = l.nearest_chantier_id
  left join public.idfm_station        ist on ist.id_zdc = l.nearest_idfm_station_id
  order by t.distance_m, t.location_id;

  -- Cette fonction n'a jamais porte de marqueur out_of_corpus : seule
  -- compass_scoring_context_within en a recu un (20260825000003). Un point hors des 80
  -- quartiers y rend donc zero ligne, indistinguable d'un rayon vide. Le journal, lui, les
  -- distingue : compass_record_question resout deja le quartier du point, donc il sait. La
  -- correction cote APPELANT reste ouverte — DIAGNOSTIC.md §36.
  get diagnostics v_rows = row_count;
  perform public.compass_record_question(
    'rpc', 'compass_premises_within',
    (case when v_rows = 0 then 'vide' else 'repondu' end)::public.question_outcome,
    p_lat, p_lng, p_radius_m, p_vintage_year, 'premises',
      (extract(epoch from (clock_timestamp() - v_debut)) * 1000)::integer);
end;
$$;

comment on function public.compass_premises_within is
  'Premises within a radius at one vintage. `total_matched` is the count before '
  'the limit, so the interface can say "340 of 1 200" instead of implying it is '
  'showing everything — and it is counted over the joined set alone, never over '
  'the labels, which are fetched only for the rows the limit keeps (issue #62). '
  '`plu_protected` and its three components are a binary, '
  'mapped constraint (PLAN.md §2.4) — informational only, no regulatory value. '
  '`chantier_exposed` is a fait d''exposition (PLAN.md §5.1): true when a '
  'disruptive worksite sits within 40 m, dated by chantier_date_debut/fin, never a '
  'prediction of impact on turnover. `terrasse_status` is ''oui'' only when exactly '
  'one premise sits at the matched street+number — a shared address with several '
  'premises comes back ''inconnu'' rather than guessing which one holds the '
  'authorisation (PLAN-ACTION-VACANCE.md — w1-terrasses); an authorisation is never '
  'proof a terrace is installed today. `idfm_station_name` and `idfm_station_distance_m` '
  'name the nearest IDFM station regardless of distance (w2-idfm) — null only when no '
  'Paris station carries a validation profile at all, which does not happen today. The '
  'full hourly profile is a separate call, compass_station_profile: threading its ~46 rows '
  'through here would cost every caller of this function for a fact only a station-focused '
  'view needs. All three facts (PLU, chantier, terrasse, idfm) are independent of the '
  'vintage or its licence. A vintage the caller may not receive comes back as a '
  'single row with withheld = true and every other column null — zero rows means '
  'the radius is genuinely empty, and the caller must not conflate the two.';


-- ---------------------------------------------------------------------------
-- compass_station_profile — the hourly shape of the nearest station's day, in full.
--
-- Deliberately its own function rather than a jsonb column on compass_premises_within (see
-- header above). No withholding: nothing here reads premise_observation or any BDCom vintage,
-- so there is no licence a vintage could restrict — both source datasets are already fully
-- open (ODbL and Licence Ouverte 2.0), which is why this function carries no `withheld`
-- column at all, unlike every function that touches BDCom.
-- ---------------------------------------------------------------------------

create function public.compass_station_profile(
  p_lat      double precision,
  p_lng      double precision,
  p_radius_m double precision default 800
)
returns table (
  station_id       bigint,
  station_name     text,
  distance_m       double precision,
  cat_jour         text,
  hour_bucket      text,
  pct_validations  double precision
)
language plpgsql volatile parallel unsafe security definer
set search_path = public, extensions
as $$
declare
  v_debut      timestamptz := clock_timestamp();
  v_rows       bigint;
  v_point      geography;
  v_station_id bigint;
begin
  if p_radius_m is null or p_radius_m <= 0 or p_radius_m > public.compass_max_radius_m() then
    raise exception 'p_radius_m must be between 1 and % (got %)',
      public.compass_max_radius_m(), p_radius_m using errcode = '22023';
  end if;

  v_point := ST_MakePoint(p_lng, p_lat)::geography;

  -- Nearest station within the radius, never every station within it — the same discipline
  -- as chantiers.ts and w2-idfm's own attachment: a caller asking "what is the rhythm here"
  -- wants one answer, not a list weighted by nothing.
  select s.id_zdc into v_station_id
  from public.idfm_station s
  where ST_DWithin(s.geom, v_point, p_radius_m)
  order by s.geom <-> v_point
  limit 1;

  if v_station_id is null then
    perform public.compass_record_question(
      'rpc', 'compass_station_profile', 'vide',
      p_lat, p_lng, p_radius_m, null, 'idfm',
      (extract(epoch from (clock_timestamp() - v_debut)) * 1000)::integer);
    return;
  end if;

  return query
  select
    s.id_zdc                    as station_id,
    s.libelle                   as station_name,
    ST_Distance(s.geom, v_point) as distance_m,
    p.cat_jour                  as cat_jour,
    p.hour_bucket                as hour_bucket,
    p.pct_validations             as pct_validations
  from public.idfm_validation_profile p
  join public.idfm_station s on s.id_zdc = p.id_zdc
  where p.id_zdc = v_station_id
  order by p.cat_jour, (regexp_match(p.hour_bucket, '^(\d+)H'))[1]::int;

  get diagnostics v_rows = row_count;
  perform public.compass_record_question(
    'rpc', 'compass_station_profile',
    (case when v_rows = 0 then 'vide' else 'repondu' end)::public.question_outcome,
    p_lat, p_lng, p_radius_m, null, 'idfm',
    (extract(epoch from (clock_timestamp() - v_debut)) * 1000)::integer);
end;
$$;

comment on function public.compass_station_profile is
  'The nearest IDFM station''s full hourly validation profile — one row per (day-type code, '
  'hour bucket), each a PERCENTAGE of that station''s own day, never an absolute count '
  '(w2-idfm, issue #19). Nearest station within the radius, never every station within it. '
  'cat_jour = ''JOHV'' (a typical term-time weekday) is what separates an office rhythm — a '
  'lunchtime peak — from a residential one — an evening peak; the other four day-type codes '
  '(JOVS, SAHV, SAVS, DIJFP) are carried for completeness. Current quarter only, dated by '
  'ingestion_run.source_as_of for source ''idfm'' — not the 2015-2024 history the ticket''s '
  '"Pourquoi" cites as the validation system''s age, which this function does not backfill '
  '(see the migration header). Zero rows means no Paris station with a profile sits within '
  'the radius, which does not happen today but is not the same statement as "empty corpus".';

grant execute on function public.compass_station_profile(
  double precision, double precision, double precision
) to anon, authenticated;


-- ---------------------------------------------------------------------------
-- Registered as a ninth ingestion source (#70's rule: a source insertion into
-- ingestion_run must carry a cadence, checked by scripts/porte/cadence.json and the
-- `sources` a cron in .github/workflows/ingestion.yml declares).
-- ---------------------------------------------------------------------------

insert into public.ingestion_run (source, label, cadence, cadence_note) values
  ('idfm', 'Validations IDFM horaires (Île-de-France Mobilités)', 'semiannual',
   'Bandeau du jeu lui-même, lu le 7 septembre 2026 : "Les données de validations sont '
   'mises à jour fin février et fin août." Chargé une fois dans la foulée de cette '
   'migration — poser une cadence ne recharge rien (REPRISE-PIEGES.md, incident #70 du '
   '5 septembre) — puis rechargé à ce rythme par le cron ci-dessous.');
