-- The third function carrying the licence rule, and the last one still silent.
--
-- 20260809000011 fixed compass_address_timeline. 20260816000001 fixed
-- compass_scoring_context_within. compass_premises_within has the same defect and
-- kept it: SECURITY INVOKER, the RLS policy of 20260809000008 restricts
-- premise_observation to redistributable vintages, so the join finds nothing and
-- the function returns zero rows — no error, no marker, byte for byte what a
-- genuinely empty radius returns.
--
-- Measured on the remote as a real anonymous caller through PostgREST (stronger
-- than the eval runner, which sets the claim but not the role), Chatelet, 800 m:
--
--   2017            0 rows        2023            3 059 premises
--   2020            0 rows        2023 @ 1 m      0 rows
--
-- The withheld vintage and the empty radius are indistinguishable. Downstream that
-- silence becomes an assertion — "no premises here" asserted from a licence nobody
-- has read — which is the failure mode of DIAGNOSTIC.md §3.e in a third costume.
--
-- Found while writing the MCP `find_premises` tool, which sidesteps it by pinning
-- vintage 2023 and never offering another. That is avoidance, not coverage: the
-- front's premise sheet (PLAN.md §2.7) is the next caller planned, and it will want
-- the vintages.
--
-- What changes is only what the caller is TOLD. RLS stays the thing that enforces.
-- The privileged test is copied verbatim from 20260816000001 so the three functions
-- cannot drift apart.
--
-- Return-type change, so drop first: `create or replace` cannot add a column.

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
  total_matched     bigint,
  withheld          boolean
)
language plpgsql stable parallel safe security invoker
set search_path = public, extensions
as $$
declare
  v_point    geography;
  v_vintage  smallint;
  v_withheld boolean;
begin
  if p_radius_m is null or p_radius_m <= 0 or p_radius_m > public.compass_max_radius_m() then
    raise exception 'p_radius_m must be between 1 and % (got %)',
      public.compass_max_radius_m(), p_radius_m using errcode = '22023';
  end if;

  select v.id,
         not (
           -- Same caller test as 20260816000001 and 20260809000011. A direct
           -- database connection carries no PostgREST claim and is privileged by
           -- definition: it already holds the credentials.
           coalesce(
             nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role',
             nullif(current_setting('request.jwt.claim.role', true), ''),
             'service_role'
           ) <> 'anon'
           or v.publicly_redistributable
         )
    into v_vintage, v_withheld
  from public.bdcom_vintage v
  where v.year = p_vintage_year;

  if v_vintage is null then
    raise exception 'unknown vintage year % (known: 2017, 2020, 2023)', p_vintage_year
      using errcode = '22023';
  end if;

  -- One row, and it says so. Not zero rows, which would read as "no premises".
  -- total_matched is null rather than 0 for the same reason the coordinates are:
  -- a count is content, and this vintage's count is withheld too.
  if v_withheld then
    return query select
      null::bigint, null::integer, null::double precision, null::double precision,
      null::double precision, null::text, null::smallint, null::text, null::bigint,
      null::text, null::text, null::smallint, null::text, null::boolean,
      null::smallint, null::text, null::text, null::text, null::bigint, true;
    return;
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
         (select count(*) from hit), false
  from hit h
  order by h.distance_m
  limit greatest(coalesce(p_limit, 500), 1);
end;
$$;

comment on function public.compass_premises_within is
  'Premises within a radius at one vintage. `total_matched` is the count before '
  'the limit, so the interface can say "340 of 1 200" instead of implying it is '
  'showing everything — the server-side answer to the silent .slice(0, 120). A '
  'vintage the caller may not receive comes back as a single row with '
  'withheld = true and every other column null — zero rows means the radius is '
  'genuinely empty, and the caller must not conflate the two.';

grant execute on function
  public.compass_premises_within(double precision, double precision, double precision, smallint, integer)
to anon, authenticated;
