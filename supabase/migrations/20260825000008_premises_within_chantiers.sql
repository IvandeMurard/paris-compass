-- Exposes chantier exposure on the same RPC that already carries the PLU flags —
-- w1-chantiers (issue #11), same reasoning as 20260825000005: the front-end fait
-- d'exposition ("Ce local est à 40 m d'un chantier déclaré perturbant, prévu de
-- septembre 2026 à mars 2027") is a Lovable change once the RPC carries the facts,
-- not another round trip to the database.
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

  if v_withheld then
    return query select
      null::bigint, null::integer, null::double precision, null::double precision,
      null::double precision, null::text, null::smallint, null::text, null::bigint,
      null::text, null::text, null::smallint, null::text, null::boolean,
      null::smallint, null::text, null::text, null::text,
      null::boolean, null::boolean, null::boolean, null::boolean,
      null::boolean, null::double precision, null::text, null::text, null::date, null::date, null::text,
      null::bigint, true;
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
      c.statut_label                                    as chantier_statut_label
    from public.premise_location l
    join public.premise_observation o
      on o.location_id = l.id and o.vintage_id = v_vintage
    left join public.bdcom_activity      a  on a.code = o.activity_code
    left join public.bdcom_size_band     sb on sb.code = o.size_band
    left join public.bdcom_situation     st on st.code = o.situation_code
    left join public.quartier            q  on q.id = l.quartier_id
    left join public.chantier_perturbant c  on c.id = l.nearest_chantier_id
    where ST_DWithin(l.geom, v_point, p_radius_m)
  )
  select h.location_id, h.ordre, h.lat, h.lng, h.distance_m, h.address,
         h.arrondissement, h.quartier_name, h.street_segment_id,
         h.activity_code, h.activity_label, h.activity_niv18, h.activity_group,
         h.is_vacant, h.size_band, h.size_label, h.situation_label, h.sign_name,
         h.plu_protected, h.plu_commerce_artisanat, h.plu_commerce_proximite, h.plu_commerce_culturel,
         h.chantier_exposed, h.chantier_distance_m, h.chantier_objet, h.chantier_description,
         h.chantier_date_debut, h.chantier_date_fin, h.chantier_statut_label,
         (select count(*) from hit), false
  from hit h
  order by h.distance_m
  limit greatest(coalesce(p_limit, 500), 1);
end;
$$;

comment on function public.compass_premises_within is
  'Premises within a radius at one vintage. `total_matched` is the count before '
  'the limit, so the interface can say "340 of 1 200" instead of implying it is '
  'showing everything. `plu_protected` and its three components are a binary, '
  'mapped constraint (PLAN.md §2.4) — informational only, no regulatory value. '
  '`chantier_exposed` is a fait d''exposition (PLAN.md §5.1): true when a '
  'disruptive worksite sits within 40 m, dated by chantier_date_debut/fin, never a '
  'prediction of impact on turnover. Both are independent of the vintage or its '
  'licence. A vintage the caller may not receive comes back as a single row with '
  'withheld = true and every other column null — zero rows means the radius is '
  'genuinely empty, and the caller must not conflate the two.';

grant execute on function
  public.compass_premises_within(double precision, double precision, double precision, smallint, integer)
to anon, authenticated;
