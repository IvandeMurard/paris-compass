-- The map query stops materialising the whole radius to answer with five hundred rows —
-- issue #62. Same answer, same `total_matched`, half the work.
--
-- WHAT WAS WRONG. `compass_premises_within` built one CTE, `hit`, carrying the thirty-three
-- output columns for every premise in the radius — five outer joins of labels per row — and
-- then took `(select count(*) from hit)` for `total_matched` before `order by distance_m
-- limit N`. Because `hit` is referenced twice it is materialised, so the limit never limited
-- anything: at 2 000 m over Chatelet the function touched 195 456 buffers to return 500 rows,
-- and 53 % of those buffers were label lookups on rows the caller never sees. Measured
-- 2026-08-27 on dbefhvmyfmmhjeetdddu, `explain (analyze, buffers)`, second run kept.
--
-- WHAT CHANGES. `hit` now carries three columns — the two row identities and the distance —
-- and that is the set `total_matched` counts. The five label joins are applied to `top`, the
-- rows the limit actually keeps.
--
-- WHY THE COUNT CANNOT MOVE. `total_matched` is a displayed figure, so it must not change
-- value by changing path. It does not, and the reason is structural rather than measured:
-- the five joins dropped from the counted set are LEFT joins on `bdcom_activity.code`,
-- `bdcom_size_band.code`, `bdcom_situation.code`, `quartier.id` and
-- `chantier_perturbant.id` — every one of them a primary key. A left join on a unique key
-- can neither add nor remove a row. What is counted is `premise_location` joined to
-- `premise_observation` under `ST_DWithin`, which is exactly the old CTE's cardinality.
-- Checked against the old body on four points and four radii, plus the counter-test at
-- 1 m — see DIAGNOSTIC.md §27.
--
-- WHY THE OBSERVATION id IS CARRIED rather than re-joining `top` on (location_id,
-- vintage_id). Nothing in the schema forbids two observations of the same vintage landing on
-- one premise: the unique key is (vintage_id, source_ordre), and BDCom reassigns `ordre` to
-- another premise in under 0.1 % of cases (docs/BDCOM.md §5). None exist today — measured,
-- three vintages, zero — but a re-join would silently return more than `p_limit` rows the
-- day one appeared. The row's own id keeps the answer identical without depending on that
-- measurement staying true.
--
-- WHY THE ORDER GAINS A TIEBREAKER, which is a change of answer and has to be declared as
-- one. `order by distance_m` alone does not determine which rows come back when the limit
-- falls inside a tie, and BDCom ties constantly: the APUR stacks every premise of one address
-- on a single coordinate (docs/BDCOM.md §4), so dozens of rows sit at exactly the same
-- distance. The old body picked among them arbitrarily, the new one would pick differently,
-- and 1 comparison out of 490 did exactly that — same `total_matched`, same row count, other
-- rows. Rather than leave the difference to chance, the sort is made total on `location_id`.
-- What that buys: the same call answers the same rows twice, which it never promised before.
-- What it costs: nothing measurable — the key is already carried by `top`.

-- The index becomes covering so the counted set is read without touching the table at all:
-- `hit` needs (location_id, vintage_id, id) and nothing else, which makes it an Index Only
-- Scan with Heap Fetches: 0. This is the half of the fix that survives a cold cache — the
-- restructuring above spares repeat accesses to pages already in shared_buffers, this spares
-- the pages themselves. Replaced rather than added: same leading columns, so nothing that
-- used the old index loses its access path, and there is no second index to keep in step.
-- It also comes out smaller than the one it replaces — 1 132 pages against 1 972, the
-- difference being bloat the rebuild drops.
drop index if exists public.premise_observation_location_idx;
create index premise_observation_location_idx
  on public.premise_observation (location_id, vintage_id) include (id);

create or replace function public.compass_premises_within(
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
  total_matched     bigint,
  withheld          boolean
)
language plpgsql stable parallel safe security definer
set search_path = public, extensions
as $$
declare
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
    return query select
      null::bigint, null::integer, null::double precision, null::double precision,
      null::double precision, null::text, null::smallint, null::text, null::bigint,
      null::text, null::text, null::smallint, null::text, null::boolean,
      null::smallint, null::text, null::text, null::text,
      null::boolean, null::boolean, null::boolean, null::boolean,
      null::boolean, null::double precision, null::text, null::text, null::date, null::date, null::text,
      null::text, null::boolean, null::boolean, null::boolean,
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
  order by t.distance_m, t.location_id;
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
  'proof a terrace is installed today. All three facts are independent of the '
  'vintage or its licence. A vintage the caller may not receive comes back as a '
  'single row with withheld = true and every other column null — zero rows means '
  'the radius is genuinely empty, and the caller must not conflate the two.';
