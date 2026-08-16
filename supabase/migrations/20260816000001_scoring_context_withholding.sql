-- compass_scoring_context_within told an anonymous caller nothing when a vintage
-- was withheld — and "nothing" is the same shape as "no premises here".
--
-- The RLS policy of 20260809000008 restricts premise_observation to redistributable
-- vintages, and this function is SECURITY INVOKER, so the restriction did apply:
-- no 2017 or 2020 row ever leaked. That half was right. The other half was not.
-- The function returned zero rows, no error and no marker, which is byte for byte
-- what it returns for a genuinely empty radius. Measured on the local aggregate at
-- Chatelet, 800 m: 3855 premises as a privileged caller for 2017, 0 as anon.
--
-- Downstream that silence became an assertion. NeighbourhoodContext.loaded (src/core)
-- distinguishes "nothing here" from "we do not know", and only the caller can tell
-- them apart — src/core/scoring.ts:57 says so. An empty-but-successful result made
-- the MCP server declare the premises layer loaded, so the footfall proxy was
-- computed as a measured zero. An agent would have reported "no commercial premises
-- nearby" on the strength of an unread licence.
--
-- Same failure as the Overpass timeout of DIAGNOSTIC.md §3.e — a quiet street
-- asserted from a breakdown — and the same fix as 20260809000011 applied to
-- compass_address_timeline: emit the withholding as a row rather than as an absence.
--
-- What changes here is only what the caller is TOLD. RLS stays the thing that
-- enforces; this function stops pretending the result is empty. The privileged test
-- is copied verbatim from 20260809000011 so the two functions cannot drift apart.
--
-- Return-type change, so drop first: `create or replace` cannot add a column.

drop function if exists public.compass_scoring_context_within(
  double precision, double precision, double precision, smallint
);

create function public.compass_scoring_context_within(
  p_lat          double precision,
  p_lng          double precision,
  p_radius_m     double precision default 800,
  p_vintage_year smallint         default 2023
)
returns table (
  lat           double precision,
  lng           double precision,
  is_vacant     boolean,
  total_matched bigint,
  withheld      boolean
)
language plpgsql stable parallel safe security invoker
set search_path = public, extensions
as $$
declare
  v_vintage    smallint;
  v_withheld   boolean;
  v_point      geography;
begin
  if p_radius_m is null or p_radius_m <= 0 or p_radius_m > public.compass_max_radius_m() then
    raise exception 'p_radius_m must be between 1 and % (got %)',
      public.compass_max_radius_m(), p_radius_m using errcode = '22023';
  end if;

  select v.id,
         not (
           -- Same caller test as 20260809000011. A direct database connection
           -- carries no PostgREST claim and is privileged by definition: it
           -- already holds the credentials.
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
    raise exception 'unknown vintage year %', p_vintage_year using errcode = '22023';
  end if;

  -- One row, and it says so. Not zero rows, which would read as "no premises".
  if v_withheld then
    return query select null::double precision, null::double precision,
                        null::boolean, null::bigint, true;
    return;
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
  select h.lat, h.lng, h.is_vacant, (select count(*) from hit), false from hit h;
end;
$$;

comment on function public.compass_scoring_context_within is
  'Bare points feeding NeighbourhoodContext.premises in src/core. Returns no '
  'score: Postgres does the spatial selection, the TypeScript core does the '
  'arithmetic. A vintage the caller may not receive comes back as a single row '
  'with withheld = true and no coordinates — zero rows means the radius is '
  'genuinely empty, and the caller must not conflate the two.';

grant execute on function
  public.compass_scoring_context_within(double precision, double precision, double precision, smallint)
to anon, authenticated;
