-- Un `case` en plpgsql ne se cast pas tout seul vers un enum — w1-observabilite (#72).
--
-- 20260905000001 appelait le journal ainsi, aux deux points de sortie ou la reponse est rendue :
--
--   perform public.compass_record_question(
--     'rpc', 'compass_premises_within',
--     case when v_rows = 0 then 'vide' else 'repondu' end, ...);
--
-- Les litteraux nus (`'rpc'`, `'retenue_licence'`) restent de type `unknown` et Postgres les
-- resout vers l'enum sans rien dire. Un `case` n'est pas un litteral : ses branches sont
-- resolues entre elles d'abord, il sort en `text`, et `text -> public.question_outcome` n'est
-- pas une conversion implicite. La resolution de fonction echoue alors sur une signature qui
-- ressemble a la bonne :
--
--   ERREUR — function public.compass_record_question(unknown, unknown, text, double precision,
--            double precision, double precision, smallint, unknown) does not exist
--
-- Trouve le 5 septembre 2026 par `npm.cmd run eval`, cinq minutes apres le debut du bras A,
-- par les invariants qui appellent ces deux fonctions — pas par une lecture. Les deux branches
-- de retenue, elles, marchaient : elles passent un litteral. C'est le chemin NOMINAL qui etait
-- casse, ce qui est le pire des deux — un point hors corpus et un millesime retenu repondaient,
-- une recherche ordinaire levait.
--
-- Le correctif est le cast explicite. Rien d'autre ne change : memes corps, memes budgets,
-- meme volatilite. Detail dans docs/REPRISE-PIEGES.md.

CREATE OR REPLACE FUNCTION public.compass_premises_within(p_lat double precision, p_lng double precision, p_radius_m double precision DEFAULT 800, p_vintage_year smallint DEFAULT 2023, p_limit integer DEFAULT 500)
 RETURNS TABLE(location_id bigint, ordre integer, lat double precision, lng double precision, distance_m double precision, address text, arrondissement smallint, quartier_name text, street_segment_id bigint, activity_code text, activity_label text, activity_niv18 smallint, activity_group text, is_vacant boolean, size_band smallint, size_label text, situation_label text, sign_name text, plu_protected boolean, plu_commerce_artisanat boolean, plu_commerce_proximite boolean, plu_commerce_culturel boolean, chantier_exposed boolean, chantier_distance_m double precision, chantier_objet text, chantier_description text, chantier_date_debut date, chantier_date_fin date, chantier_statut_label text, terrasse_status text, terrasse_permanente boolean, terrasse_estivale boolean, terrasse_etalage boolean, total_matched bigint, withheld boolean)
 LANGUAGE plpgsql
 STABLE PARALLEL SAFE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
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
      p_lat, p_lng, p_radius_m, p_vintage_year, 'premises');
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

  -- Cette fonction n'a jamais porte de marqueur out_of_corpus : seule
  -- compass_scoring_context_within en a recu un (20260825000003). Un point hors des 80
  -- quartiers y rend donc zero ligne, indistinguable d'un rayon vide. Le journal, lui, les
  -- distingue : compass_record_question resout deja le quartier du point, donc il sait. La
  -- correction cote APPELANT reste ouverte — DIAGNOSTIC.md §36.
  get diagnostics v_rows = row_count;
  perform public.compass_record_question(
    'rpc', 'compass_premises_within',
    (case when v_rows = 0 then 'vide' else 'repondu' end)::public.question_outcome,
    p_lat, p_lng, p_radius_m, p_vintage_year, 'premises');
end;
$function$
;

CREATE OR REPLACE FUNCTION public.compass_scoring_context_within(p_lat double precision, p_lng double precision, p_radius_m double precision DEFAULT 800, p_vintage_year smallint DEFAULT 2023)
 RETURNS TABLE(lat double precision, lng double precision, is_vacant boolean, total_matched bigint, withheld boolean, out_of_corpus boolean)
 LANGUAGE plpgsql
 STABLE PARALLEL SAFE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_rows       bigint;
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
         -- One expression, in public.compass_caller_is_privileged() — w0-appelant (#58).
         not (public.compass_caller_is_privileged() or v.publicly_redistributable)
    into v_vintage, v_withheld
  from public.bdcom_vintage v
  where v.year = p_vintage_year;

  if v_vintage is null then
    raise exception 'unknown vintage year %', p_vintage_year using errcode = '22023';
  end if;

  -- One row, and it says so. Not zero rows, which would read as "no premises".
  if v_withheld then
    perform public.compass_record_question(
      'rpc', 'compass_scoring_context_within', 'retenue_licence',
      p_lat, p_lng, p_radius_m, p_vintage_year, 'premises');
    return query select null::double precision, null::double precision,
                        null::boolean, null::bigint, true, false;
    return;
  end if;

  -- The licence check comes first, and the order carries meaning. Withholding applies
  -- everywhere, outside the corpus included, and answering "out of area" on a withheld vintage
  -- would disclose that the area itself would have answered.
  select exists (
    select 1
    from public.quartier q
    where ST_Contains(q.geom::geometry, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326))
  ) into v_in_corpus;

  if not v_in_corpus then
    perform public.compass_record_question(
      'rpc', 'compass_scoring_context_within', 'hors_corpus',
      p_lat, p_lng, p_radius_m, p_vintage_year, 'premises');
    return query select null::double precision, null::double precision,
                        null::boolean, null::bigint, false, true;
    return;
  end if;

  v_point := ST_MakePoint(p_lng, p_lat)::geography;

  return query
  -- Same fence as compass_street_rotation above, same reason: probed by primary key
  -- 17 173 times for 34 346 pages, on a table of 222 rows that is eleven pages long.
  with act as materialized (
    select a.code, a.is_vacant
    from public.bdcom_activity a
  ),
  hit as (
    select ST_Y(l.geom::geometry) as lat,
           ST_X(l.geom::geometry) as lng,
           coalesce(a.is_vacant, false) as is_vacant
    from public.premise_location l
    join public.premise_observation o
      on o.location_id = l.id and o.vintage_id = v_vintage
    left join act a on a.code = o.activity_code
    where ST_DWithin(l.geom, v_point, p_radius_m)
  )
  select h.lat, h.lng, h.is_vacant, (select count(*) from hit), false, false from hit h;

  -- Apres RETURN QUERY, et non avant : ROW_COUNT distingue ici le vrai vide — le Bois de
  -- Vincennes, 20260825000003 — d'une reponse. Les deux sont des reponses honnetes, et elles
  -- ne menent pas a la meme action : un rayon vide ne reclame aucune source, un n/a si.
  get diagnostics v_rows = row_count;
  perform public.compass_record_question(
    'rpc', 'compass_scoring_context_within',
    (case when v_rows = 0 then 'vide' else 'repondu' end)::public.question_outcome,
    p_lat, p_lng, p_radius_m, p_vintage_year, 'premises');
end;
$function$
;
