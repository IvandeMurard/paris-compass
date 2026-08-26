CREATE OR REPLACE FUNCTION public.compass_scoring_context_within(p_lat double precision, p_lng double precision, p_radius_m double precision DEFAULT 800, p_vintage_year smallint DEFAULT 2023)
 RETURNS TABLE(lat double precision, lng double precision, is_vacant boolean, total_matched bigint, withheld boolean, out_of_corpus boolean)
 LANGUAGE plpgsql
 STABLE PARALLEL SAFE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_vintage    smallint;
  v_withheld   boolean;
  v_point      geography;
  v_in_corpus  boolean;
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
                        null::boolean, null::bigint, true, false;
    return;
  end if;

  -- La retenue de licence passe avant : elle vaut partout, y compris hors corpus, et une
  -- réponse qui dirait « hors zone » sur un millésime retenu divulguerait que la zone, elle,
  -- aurait répondu. L'ordre des deux tests est donc porteur de sens, pas arbitraire.
  select exists (
    select 1
    from public.quartier q
    where ST_Contains(q.geom::geometry, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326))
  ) into v_in_corpus;

  if not v_in_corpus then
    return query select null::double precision, null::double precision,
                        null::boolean, null::bigint, false, true;
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
  select h.lat, h.lng, h.is_vacant, (select count(*) from hit), false, false from hit h;
end;
$function$
