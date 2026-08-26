CREATE OR REPLACE FUNCTION public.compass_street_rotation(p_lat double precision, p_lng double precision, p_radius_m double precision DEFAULT 800, p_retail_scope_only boolean DEFAULT true)
 RETURNS TABLE(street_segment_id bigint, street_name text, vintage_year smallint, vintage_scope bdcom_scope, premises bigint, vacant bigint, changed_since_previous bigint, withheld boolean)
 LANGUAGE plpgsql
 STABLE PARALLEL SAFE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_point      geography;
  v_privileged boolean;
begin
  if p_radius_m is null or p_radius_m <= 0 or p_radius_m > public.compass_max_radius_m() then
    raise exception 'p_radius_m must be between 1 and % (got %)',
      public.compass_max_radius_m(), p_radius_m using errcode = '22023';
  end if;

  -- Copied verbatim from 20260809000011, 20260816000001, 20260817000001 and
  -- 20260824000002 so the functions cannot drift apart. Inside SECURITY DEFINER
  -- `current_user` is the owner rather than the caller — testing it always
  -- answers "privileged", the defect 20260809000010 had to correct. A direct
  -- database connection carries no claim and is privileged by definition: it
  -- already holds the credentials.
  select coalesce(
           nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role',
           nullif(current_setting('request.jwt.claim.role', true), ''),
           'service_role'
         ) <> 'anon' into v_privileged;

  v_point := ST_MakePoint(p_lng, p_lat)::geography;

  return query
  with vintage as (
    select
      v.id,
      v.year,
      v.scope,
      (v_privileged or v.publicly_redistributable) as disclosed,
      lag(v.year) over (order by v.year)           as previous_year,
      lag(v_privileged or v.publicly_redistributable)
        over (order by v.year)                     as previous_disclosed
    from public.bdcom_vintage v
  ),
  nearby as (
    select l.id, l.street_segment_id
    from public.premise_location l
    where l.street_segment_id is not null
      and ST_DWithin(l.geom, v_point, p_radius_m)
  ),
  observed as (
    select
      n.street_segment_id,
      vi.year  as vintage_year,
      vi.scope as vintage_scope,
      coalesce(a.is_vacant, false) as is_vacant,
      o.activity_code,
      lag(o.activity_code) over (partition by o.location_id order by vi.year) as previous_code
    from nearby n
    join public.premise_observation o on o.location_id = n.id
    join vintage vi                   on vi.id = o.vintage_id
    left join public.bdcom_activity a on a.code = o.activity_code
    where not p_retail_scope_only or coalesce(a.in_retail_scope, false)
  ),
  counted as (
    select
      ob.street_segment_id,
      s.name as street_name,
      ob.vintage_year,
      ob.vintage_scope,
      count(*)                             as premises,
      count(*) filter (where ob.is_vacant) as vacant,
      count(*) filter (
        where ob.previous_code is not null
          and ob.activity_code is distinct from ob.previous_code
      )                                    as changed
    from observed ob
    left join public.street_segment s on s.id = ob.street_segment_id
    group by ob.street_segment_id, s.name, ob.vintage_year, ob.vintage_scope
  )
  -- The disclosed vintages, with their counts.
  select
    c.street_segment_id,
    c.street_name,
    c.vintage_year,
    c.vintage_scope,
    c.premises,
    c.vacant,
    -- Null, never zero, when there is nothing to compare against. The first
    -- vintage has no predecessor; a withheld predecessor is one this caller may
    -- not learn about — and "the activity changed between 2020 and 2023" is a
    -- fact about 2020. Under SECURITY DEFINER the window above really does see
    -- the withheld neighbour's codes, so the test is stated here rather than
    -- inherited from what the join happened to return. Same reasoning, and the
    -- same wording, as changed_from_previous in 20260824000002.
    case
      when vi.previous_year is null                   then null::bigint
      when not coalesce(vi.previous_disclosed, false) then null::bigint
      else c.changed
    end,
    false
  from counted c
  join vintage vi on vi.year = c.vintage_year
  where vi.disclosed

  union all

  -- One marker row per withheld vintage — not one per segment, which would
  -- disclose where the withheld vintage has premises.
  select
    null::bigint,
    null::text,
    vi.year,
    vi.scope,
    null::bigint,
    null::bigint,
    null::bigint,
    true
  from vintage vi
  where not vi.disclosed

  order by 3, 1;
end;
$function$
