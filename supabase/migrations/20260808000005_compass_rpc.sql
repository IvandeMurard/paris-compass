-- Compass RPC surface.
--
-- Every function takes a point and a radius. None takes a bounding box.
--
-- That is the structural fix for DIAGNOSTIC.md §2: scores computed inside a
-- viewport snapshot were truncated by the edge of the window, so the same
-- premise scored differently depending on how far the user had zoomed out. A
-- radius query always returns the whole neighbourhood, so the figure describes a
-- place instead of a place plus a UI state.
--
-- These functions return *points and facts*, never scores. The formulas stay in
-- src/core/scoring.ts, which is published on the Methodology page and imported by
-- the future MCP server. Reimplementing `saturating()` in PL/pgSQL would create a
-- second truth to keep in sync with the first.

create or replace function public.compass_max_radius_m()
returns double precision
language sql immutable parallel safe
set search_path = public
as $$ select 2000::double precision $$;

comment on function public.compass_max_radius_m() is
  'Hard cap on any radius query. Beyond ~2 km the question stops being "this '
  'neighbourhood". Enforced server-side because these RPCs are reachable with '
  'the anon key.';


-- ---------------------------------------------------------------------------
-- Provenance
-- ---------------------------------------------------------------------------
create or replace function public.compass_vintages()
returns table (
  vintage_year   smallint,
  vintage_scope  public.bdcom_scope,
  licence        text,
  licence_note   text,
  as_of          text,
  source_url     text,
  record_count   integer,
  ingested_at    timestamptz
)
language sql stable parallel safe security invoker
set search_path = public, extensions
as $$
  select v.year, v.scope, v.licence, v.licence_note, v.as_of,
         v.source_url, v.record_count, v.ingested_at
  from public.bdcom_vintage v
  order by v.year;
$$;

comment on function public.compass_vintages() is
  'Source, licence and date per vintage. Called once and cached; the data RPCs '
  'return only a vintage year, so the adapter reassembles Measured<T> rather '
  'than repeating licence text on three thousand rows.';


-- ---------------------------------------------------------------------------
-- Premises in a radius
-- ---------------------------------------------------------------------------
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
  total_matched     bigint
)
language plpgsql stable parallel safe security invoker
set search_path = public, extensions
as $$
declare
  v_point   geography;
  v_vintage smallint;
begin
  if p_radius_m is null or p_radius_m <= 0 or p_radius_m > public.compass_max_radius_m() then
    raise exception 'p_radius_m must be between 1 and % (got %)',
      public.compass_max_radius_m(), p_radius_m using errcode = '22023';
  end if;

  select v.id into v_vintage from public.bdcom_vintage v where v.year = p_vintage_year;
  if v_vintage is null then
    raise exception 'unknown vintage year % (known: 2017, 2020, 2023)', p_vintage_year
      using errcode = '22023';
  end if;

  v_point := ST_MakePoint(p_lng, p_lat)::geography;

  return query
  with hit as (
    select
      l.id                                              as location_id,
      l.ordre                                           as ordre,
      ST_Y(l.geom::geometry)                            as lat,
      ST_X(l.geom::geometry)                            as lng,
      ST_Distance(l.geom, v_point)                      as distance_m,
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
      o.sign_name                                       as sign_name
    from public.premise_location l
    join public.premise_observation o
      on o.location_id = l.id and o.vintage_id = v_vintage
    left join public.bdcom_activity  a  on a.code = o.activity_code
    left join public.bdcom_size_band sb on sb.code = o.size_band
    left join public.bdcom_situation st on st.code = o.situation_code
    left join public.quartier        q  on q.id = l.quartier_id
    where ST_DWithin(l.geom, v_point, p_radius_m)
  )
  select h.location_id, h.ordre, h.lat, h.lng, h.distance_m, h.address,
         h.arrondissement, h.quartier_name, h.street_segment_id,
         h.activity_code, h.activity_label, h.activity_niv18, h.activity_group,
         h.is_vacant, h.size_band, h.size_label, h.situation_label, h.sign_name,
         (select count(*) from hit)
  from hit h
  order by h.distance_m
  limit greatest(coalesce(p_limit, 500), 1);
end;
$$;

comment on function public.compass_premises_within is
  'Premises within a radius at one vintage. `total_matched` is the count before '
  'the limit, so the interface can say "340 of 1 200" instead of implying it is '
  'showing everything — the server-side answer to the silent .slice(0, 120).';


-- ---------------------------------------------------------------------------
-- Scoring context
-- ---------------------------------------------------------------------------
create or replace function public.compass_scoring_context_within(
  p_lat          double precision,
  p_lng          double precision,
  p_radius_m     double precision default 800,
  p_vintage_year smallint         default 2023
)
returns table (
  lat           double precision,
  lng           double precision,
  is_vacant     boolean,
  total_matched bigint
)
language plpgsql stable parallel safe security invoker
set search_path = public, extensions
as $$
declare
  v_point   geography;
  v_vintage smallint;
begin
  if p_radius_m is null or p_radius_m <= 0 or p_radius_m > public.compass_max_radius_m() then
    raise exception 'p_radius_m must be between 1 and % (got %)',
      public.compass_max_radius_m(), p_radius_m using errcode = '22023';
  end if;

  select v.id into v_vintage from public.bdcom_vintage v where v.year = p_vintage_year;
  if v_vintage is null then
    raise exception 'unknown vintage year %', p_vintage_year using errcode = '22023';
  end if;

  v_point := ST_MakePoint(p_lng, p_lat)::geography;

  return query
  with hit as (
    select ST_Y(l.geom::geometry) as lat,
           ST_X(l.geom::geometry) as lng,
           coalesce(a.is_vacant, false) as is_vacant
    from public.premise_location l
    join public.premise_observation o
      on o.location_id = l.id and o.vintage_id = v_vintage
    left join public.bdcom_activity a on a.code = o.activity_code
    where ST_DWithin(l.geom, v_point, p_radius_m)
  )
  select h.lat, h.lng, h.is_vacant, (select count(*) from hit) from hit h;
end;
$$;

comment on function public.compass_scoring_context_within is
  'Bare points feeding NeighbourhoodContext.premises in src/core. Returns no '
  'score: Postgres does the spatial selection, the TypeScript core does the '
  'arithmetic.';


-- ---------------------------------------------------------------------------
-- Premise history — the previous lives of one address
-- ---------------------------------------------------------------------------
-- One row per vintage, including vintages where the premise was NOT recorded,
-- because the absence is itself the finding. A premise absent from 2023 stopped
-- being retail; whether it is now empty or became a dental practice cannot be
-- told from this layer, and `vintage_scope` is what lets the caller say so
-- instead of guessing.
create or replace function public.compass_premise_history(p_location_id bigint)
returns table (
  vintage_year          smallint,
  vintage_scope         public.bdcom_scope,
  as_of                 text,
  observed              boolean,
  activity_code         text,
  activity_label        text,
  activity_group        text,
  is_vacant             boolean,
  size_label            text,
  sign_name             text,
  match_method          public.bdcom_match_method,
  changed_from_previous boolean
)
language sql stable parallel safe security invoker
set search_path = public, extensions
as $$
  with timeline as (
    select
      v.year                       as vintage_year,
      v.scope                      as vintage_scope,
      v.as_of                      as as_of,
      (o.id is not null)           as observed,
      o.activity_code              as activity_code,
      a.label                      as activity_label,
      a.label_18                   as activity_group,
      coalesce(a.is_vacant, false) as is_vacant,
      sb.label                     as size_label,
      o.sign_name                  as sign_name,
      o.match_method               as match_method,
      lag(o.activity_code) over (order by v.year) as previous_code,
      lag(o.id is not null) over (order by v.year) as previously_observed
    from public.bdcom_vintage v
    left join public.premise_observation o
      on o.vintage_id = v.id and o.location_id = p_location_id
    left join public.bdcom_activity  a  on a.code = o.activity_code
    left join public.bdcom_size_band sb on sb.code = o.size_band
  )
  select t.vintage_year, t.vintage_scope, t.as_of, t.observed,
         t.activity_code, t.activity_label, t.activity_group, t.is_vacant,
         t.size_label, t.sign_name, t.match_method,
         -- Null whenever either side is unobserved, never `true`. A premise
         -- missing from 2023 may have changed, or may simply have fallen outside
         -- a retail-only publication; the data cannot tell those apart, so the
         -- disappearance is reported through `observed` + `vintage_scope` and the
         -- reading is left to the core. Asserting a change here would smuggle an
         -- interpretation into a column named like a fact.
         case
           when not coalesce(t.previously_observed, false) then null
           when not t.observed then null
           else t.activity_code is distinct from t.previous_code
         end
  from timeline t
  order by t.vintage_year;
$$;

comment on function public.compass_premise_history is
  'What a premise was at each survey. Three points three years apart: anything '
  'that happened between two surveys is invisible, so a premise that turned over '
  'three times can read as stable. The interface must say so.';


-- ---------------------------------------------------------------------------
-- Rotation by street segment
-- ---------------------------------------------------------------------------
-- `p_retail_scope_only` defaults to true, and that default is the point.
--
-- Restricted to the common scope the three vintages share, the series is
-- comparable: 62 705 (2017) -> 61 541 (2020) -> 60 845 (2023). Unrestricted, the
-- same query reads 84 031 -> 83 399 -> 60 845 and appears to show retail
-- collapsing, which is a publication artefact.
--
-- The trade-off is real and cuts both ways: in retail scope `vacant` is
-- structurally zero, because vacant premises are precisely one of the categories
-- 2023 omits. Pass false to measure vacancy, and then only compare 2017 against
-- 2020. Making the caller opt out of the honest default is the whole design.
create or replace function public.compass_street_rotation(
  p_lat               double precision,
  p_lng               double precision,
  p_radius_m          double precision default 800,
  p_retail_scope_only boolean          default true
)
returns table (
  street_segment_id      bigint,
  street_name            text,
  vintage_year           smallint,
  vintage_scope          public.bdcom_scope,
  premises               bigint,
  vacant                 bigint,
  changed_since_previous bigint
)
language plpgsql stable parallel safe security invoker
set search_path = public, extensions
as $$
declare
  v_point geography;
begin
  if p_radius_m is null or p_radius_m <= 0 or p_radius_m > public.compass_max_radius_m() then
    raise exception 'p_radius_m must be between 1 and % (got %)',
      public.compass_max_radius_m(), p_radius_m using errcode = '22023';
  end if;

  v_point := ST_MakePoint(p_lng, p_lat)::geography;

  return query
  with nearby as (
    select l.id, l.street_segment_id
    from public.premise_location l
    where l.street_segment_id is not null
      and ST_DWithin(l.geom, v_point, p_radius_m)
  ),
  observed as (
    select
      n.street_segment_id,
      v.year  as vintage_year,
      v.scope as vintage_scope,
      coalesce(a.is_vacant, false) as is_vacant,
      o.activity_code,
      lag(o.activity_code) over (partition by o.location_id order by v.year) as previous_code
    from nearby n
    join public.premise_observation o on o.location_id = n.id
    join public.bdcom_vintage v       on v.id = o.vintage_id
    left join public.bdcom_activity a on a.code = o.activity_code
    where not p_retail_scope_only or coalesce(a.in_retail_scope, false)
  )
  select
    ob.street_segment_id,
    s.name,
    ob.vintage_year,
    ob.vintage_scope,
    count(*),
    count(*) filter (where ob.is_vacant),
    count(*) filter (
      where ob.previous_code is not null
        and ob.activity_code is distinct from ob.previous_code
    )
  from observed ob
  left join public.street_segment s on s.id = ob.street_segment_id
  group by ob.street_segment_id, s.name, ob.vintage_year, ob.vintage_scope
  order by ob.street_segment_id, ob.vintage_year;
end;
$$;

comment on function public.compass_street_rotation is
  'Per segment and per vintage: premises, vacant, and how many changed activity '
  'since the previous survey. Defaults to the scope common to all three '
  'vintages, where counts are comparable but vacancy is structurally zero; pass '
  'p_retail_scope_only => false for vacancy, and then compare 2017 to 2020 only.';


grant execute on function
  public.compass_max_radius_m(),
  public.compass_vintages(),
  public.compass_premises_within(double precision, double precision, double precision, smallint, integer),
  public.compass_scoring_context_within(double precision, double precision, double precision, smallint),
  public.compass_premise_history(bigint),
  public.compass_street_rotation(double precision, double precision, double precision, boolean)
to anon, authenticated;
