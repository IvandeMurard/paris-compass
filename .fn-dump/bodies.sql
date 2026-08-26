create or replace function public.compass_address_timeline(p_location_id bigint)
returns table (
  occurred_on       date,
  granularity       text,
  source            text,
  source_ref        text,
  source_url        text,
  source_licence    text,
  kind              text,
  observed          boolean,
  withheld          boolean,
  activity_code     text,
  label             text,
  detail            text,
  amount_eur        numeric,
  evidence          text,
  confidence        public.compass_confidence,
  confidence_rule   public.compass_confidence_rule,
  confidence_reason text
)
language sql stable parallel safe security definer
set search_path = public, extensions
as $$
  with caller as (
    -- One expression, in public.compass_caller_is_privileged() — w0-appelant (#58).
    select public.compass_caller_is_privileged() as privileged
  ),
  premise as (
    select l.id, l.street_key, l.num,
           (select count(*) from public.premise_location p
             where p.street_key = l.street_key and p.num = l.num) as at_address
    from public.premise_location l
    where l.id = p_location_id
  ),

  survey as (
    select
      make_date(v.year, 1, 1)                as occurred_on,
      'year'::text                           as granularity,
      'APUR BDCom ' || v.year                as source,
      case when o.id is not null and (c.privileged or v.publicly_redistributable)
           then 'bdcom:' || v.year || ':' || o.source_ordre end as source_ref,
      v.source_url                           as source_url,
      v.licence                              as source_licence,
      'survey'::text                         as kind,
      -- Null, not false, when the row is withheld: we are not saying it was
      -- unobserved, we are saying we cannot tell you.
      -- Null whenever the vintage is withheld — including when no observation
      -- exists. Saying "not surveyed here" about a dataset we may not
      -- redistribute still discloses that dataset, and would let a reader infer
      -- which premises it contains by watching where the answer changes.
      case when not (c.privileged or v.publicly_redistributable) then null
           when o.id is null then false
           else true end                     as observed,
      not (c.privileged or v.publicly_redistributable) as withheld,
      case when c.privileged or v.publicly_redistributable then o.activity_code end as activity_code,
      case when c.privileged or v.publicly_redistributable then a.label end as label,
      case when c.privileged or v.publicly_redistributable then o.sign_name end as detail,
      null::numeric                          as amount_eur,
      case
        when not (c.privileged or v.publicly_redistributable)
          then 'Millésime non redistribuable publiquement : sa licence n''a pas été lue. Rien n''est dit de ce relevé, ni son contenu ni son existence. Question envoyée à l''APUR.'
        when o.id is null and v.scope = 'retail_only'
          then 'Millésime restreint aux commerces : le local n''y figure pas. Cette couche ne publie que les commerces — ni locaux vacants, ni locaux non commerciaux — donc l''absence ne permet aucune conclusion sur l''état du local.'
        when o.id is null
          then 'Millésime au périmètre complet : le local n''y figure pas comme rez-de-chaussée avec vitrine.'
        else 'Relevé de terrain, identifiant ' || o.source_ordre || ', rattachement ' || o.match_method
      end                                    as evidence,
      case
        when not (c.privileged or v.publicly_redistributable) then 'indetermine'::public.compass_confidence
        when o.id is null then 'indetermine'
        when o.match_method = 'ordre_address_conflict' then 'probable'
        else 'etabli'
      end                                    as confidence,
      case
        when not (c.privileged or v.publicly_redistributable) then 'vintage_licence_withheld'
        when o.id is null then 'not_observed'
        when o.match_method = 'ordre_address_conflict' then 'ordre_reattributed'
        else 'observed_matched'
      end::public.compass_confidence_rule     as confidence_rule,
      case
        when not (c.privileged or v.publicly_redistributable)
          then 'millésime retenu pour raison de licence : ni contenu ni existence'
        when o.id is null then 'observed = false'
        when o.match_method = 'ordre_address_conflict'
          then 'identifiant réattribué à un autre local entre deux millésimes'
        else 'observed = true, match_method = ' || o.match_method
      end                                    as confidence_reason
    from public.bdcom_vintage v
    cross join caller c
    left join public.premise_observation o
      on o.vintage_id = v.id and o.location_id = p_location_id
    left join public.bdcom_activity a on a.code = o.activity_code
  ),

  notice as (
    select
      an.published_on                        as occurred_on,
      'day'::text                            as granularity,
      'BODACC ' || case an.family when 'vente' then 'cession' else 'procédure collective' end as source,
      an.id                                  as source_ref,
      an.url                                 as source_url,
      'Licence Ouverte'::text                as source_licence,
      case an.family when 'vente' then 'sale' else 'proceeding' end as kind,
      true                                   as observed,
      false                                  as withheld,
      null::text                             as activity_code,
      coalesce(j.nature, e.activity, an.trader_name) as label,
      an.trader_name                         as detail,
      e.price_eur                            as amount_eur,
      coalesce(
        e.origin_raw,
        case when e.address_source = 'siege_social'
             then 'Adresse du siège social de l''entreprise, pas de l''établissement.'
             else 'Adresse de l''établissement cédé.' end
      )                                      as evidence,
      case
        when p.at_address > 1 then 'probable'::public.compass_confidence
        when e.address_source = 'siege_social' and e.operator_confirmed then 'corrobore'
        when e.address_source = 'siege_social' then 'probable'
        when an.family = 'vente' and e.price_eur is null then 'indetermine'
        else 'etabli'
      end                                    as confidence,
      case
        when p.at_address > 1 then 'shared_address'
        when e.address_source = 'siege_social' and e.operator_confirmed then 'siege_confirmed'
        when e.address_source = 'siege_social' and e.operator_confirmed = false then 'siege_infirmed'
        when e.address_source = 'siege_social' then 'siege_unverified'
        when an.family = 'vente' and e.price_eur is null then 'price_unreadable'
        else 'establishment_single_address'
      end::public.compass_confidence_rule     as confidence_rule,
      case
        when p.at_address > 1
          then p.at_address || ' locaux partagent cette adresse : lequel est concerné n''est pas publié'
        when e.address_source = 'siege_social' and e.operator_confirmed
          then 'siège social, et SIRENE place un établissement de cette entreprise à moins de 50 m'
        when e.address_source = 'siege_social' and e.operator_confirmed = false
          then 'siège social, et SIRENE ne place aucun établissement de cette entreprise ici'
        when e.address_source = 'siege_social'
          then 'adresse de siège social, non de l''établissement, non vérifiée dans SIRENE'
        when an.family = 'vente' and e.price_eur is null
          then 'prix non lisible dans la phrase publiée'
        else 'adresse d''établissement, local seul à son adresse'
      end                                    as confidence_reason
    from premise p
    join public.bodacc_establishment e
      on e.street_key = p.street_key and e.house_number_int = p.num
    join public.bodacc_announcement an on an.id = e.announcement_id
    left join public.bodacc_judgment j on j.announcement_id = an.id
  )

  select * from survey
  union all
  select * from notice
  order by occurred_on, source;
$$;


create or replace function public.compass_premise_history(p_location_id bigint)
returns table (
  vintage_year          smallint,
  vintage_scope         public.bdcom_scope,
  as_of                 text,
  observed              boolean,
  withheld              boolean,
  activity_code         text,
  activity_label        text,
  activity_group        text,
  is_vacant             boolean,
  size_label            text,
  sign_name             text,
  match_method          public.bdcom_match_method,
  changed_from_previous boolean
)
language sql stable parallel safe security definer
set search_path = public, extensions
as $$
  with caller as (
    -- One expression, in public.compass_caller_is_privileged() — w0-appelant (#58).
    select public.compass_caller_is_privileged() as privileged
  ),
  timeline as (
    select
      v.year                                       as vintage_year,
      v.scope                                      as vintage_scope,
      v.as_of                                      as as_of,
      -- Now that the function sees every row, disclosure is a decision it makes
      -- rather than a side effect of what the join happened to return.
      (c.privileged or v.publicly_redistributable) as disclosed,
      (o.id is not null)                           as present,
      o.activity_code                              as activity_code,
      a.label                                      as activity_label,
      a.label_18                                   as activity_group,
      coalesce(a.is_vacant, false)                 as is_vacant,
      sb.label                                     as size_label,
      o.sign_name                                  as sign_name,
      o.match_method                               as match_method,
      lag(o.activity_code)  over (order by v.year) as previous_code,
      lag(o.id is not null) over (order by v.year) as previously_present,
      lag(c.privileged or v.publicly_redistributable)
                            over (order by v.year) as previously_disclosed
    from public.bdcom_vintage v
    cross join caller c
    left join public.premise_observation o
      on o.vintage_id = v.id and o.location_id = p_location_id
    left join public.bdcom_activity  a  on a.code = o.activity_code
    left join public.bdcom_size_band sb on sb.code = o.size_band
  )
  select
    t.vintage_year,
    t.vintage_scope,
    t.as_of,
    -- Null, not false, when the vintage is withheld — including when no
    -- observation exists. Saying "not surveyed here" about a dataset we may not
    -- redistribute still discloses that dataset, and would let a reader infer
    -- which premises it contains by watching where the answer changes. That is
    -- the correction 20260809000011 had to make on the sister function.
    case when t.disclosed then t.present end        as observed,
    not t.disclosed                                 as withheld,
    case when t.disclosed then t.activity_code end  as activity_code,
    case when t.disclosed then t.activity_label end as activity_label,
    case when t.disclosed then t.activity_group end as activity_group,
    -- Absence is not a measurement of vacancy, and a licence is not one either.
    -- Kept from 20260824000001: `coalesce(a.is_vacant, false)` asserted "was not
    -- vacant" about every vintage where the premise does not appear — 24 573
    -- premises for the 2023 retail-only vintage alone. DIAGNOSTIC.md §11.
    case when t.disclosed and t.present then t.is_vacant end as is_vacant,
    case when t.disclosed then t.size_label end     as size_label,
    case when t.disclosed then t.sign_name end      as sign_name,
    case when t.disclosed then t.match_method end   as match_method,
    -- Null whenever either side is unobserved or undisclosed, never `true` and
    -- never `false`. A premise missing from 2023 may have changed, or may simply
    -- have fallen outside a retail-only publication; the data cannot tell those
    -- apart, so the disappearance is reported through `observed` +
    -- `vintage_scope` and the reading is left to the core.
    --
    -- The two `disclosed` tests are the licence half, and they are stated rather
    -- than inherited: under SECURITY DEFINER the window functions above see the
    -- withheld neighbour's real content, so a comparison against it would leak
    -- that content one bit at a time — "the activity changed between 2017 and
    -- 2020" is a fact about 2017.
    case
      when not t.disclosed then null
      when not coalesce(t.previously_disclosed, false) then null
      when not coalesce(t.previously_present, false) then null
      when not t.present then null
      else t.activity_code is distinct from t.previous_code
    end                                             as changed_from_previous
  from timeline t
  order by t.vintage_year;
$$;


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
      c.statut_label                                    as chantier_statut_label,
      l.terrasse_status                                 as terrasse_status,
      l.terrasse_permanente                             as terrasse_permanente,
      l.terrasse_estivale                               as terrasse_estivale,
      l.terrasse_etalage                                as terrasse_etalage
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
         h.terrasse_status, h.terrasse_permanente, h.terrasse_estivale, h.terrasse_etalage,
         (select count(*) from hit), false
  from hit h
  order by h.distance_m
  limit greatest(coalesce(p_limit, 500), 1);
end;
$$;


create or replace function public.compass_scoring_context_within(
  p_lat          double precision,
  p_lng          double precision,
  p_radius_m     double precision default 800,
  p_vintage_year smallint         default 2023
)
returns table (
  lat            double precision,
  lng            double precision,
  is_vacant      boolean,
  total_matched  bigint,
  withheld       boolean,
  out_of_corpus  boolean
)
language plpgsql stable parallel safe security definer
set search_path = public, extensions
as $$
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
$$;


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
  changed_since_previous bigint,
  withheld               boolean
)
language plpgsql stable parallel safe security definer
set search_path = public, extensions
as $$
declare
  v_point      geography;
  v_privileged boolean;
begin
  if p_radius_m is null or p_radius_m <= 0 or p_radius_m > public.compass_max_radius_m() then
    raise exception 'p_radius_m must be between 1 and % (got %)',
      public.compass_max_radius_m(), p_radius_m using errcode = '22023';
  end if;

  -- One expression, in public.compass_caller_is_privileged() — w0-appelant (#58).
  v_privileged := public.compass_caller_is_privileged();

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
$$;


create or replace function public.compass_survival_by_trade(
  p_lat            double precision,
  p_lng            double precision,
  p_activity_niv18 smallint,
  p_cohort_vintage smallint default 2017,
  p_end_vintage    smallint default 2023
)
returns table (
  quartier_id     smallint,
  quartier_name   text,
  -- Which of the two survivals this row is. The caller can never receive one
  -- without knowing which question it answers.
  source          text,
  subject         text,
  activity_niv18  smallint,
  activity_label  text,
  -- The period, always. A rate without its period is not publishable.
  period_start    date,
  period_end      date,
  years           integer,
  -- The cohort, always. A rate without its n is not publishable either.
  cohort_n        bigint,
  survived_n      bigint,
  survival_rate   numeric,
  -- Why a figure is absent, when it is. Three different reasons, never collapsed.
  withheld        boolean,
  insufficient_n  boolean,
  out_of_corpus   boolean,
  licence         text,
  evidence        text
)
language plpgsql stable parallel safe security definer
set search_path = public, extensions
as $$
declare
  v_point        geography;
  v_quartier     smallint;
  v_quartier_nm  text;
  v_label        text;
  v_privileged   boolean;
  v_cohort_id    smallint;
  v_end_id       smallint;
  v_bdcom_held   boolean;
  v_years        integer;
  v_sirene_as_of date;
  v_win_start    date;
  v_win_end      date;
  v_min          integer := public.compass_survival_min_cohort();
begin
  -- One expression, in public.compass_caller_is_privileged() — w0-appelant (#58).
  v_privileged := public.compass_caller_is_privileged();

  select v.id into v_cohort_id from public.bdcom_vintage v where v.year = p_cohort_vintage;
  select v.id into v_end_id    from public.bdcom_vintage v where v.year = p_end_vintage;
  if v_cohort_id is null or v_end_id is null then
    raise exception 'unknown vintage year (% or %)', p_cohort_vintage, p_end_vintage
      using errcode = '22023';
  end if;
  if p_end_vintage <= p_cohort_vintage then
    raise exception 'p_end_vintage (%) must be after p_cohort_vintage (%)',
      p_end_vintage, p_cohort_vintage using errcode = '22023';
  end if;

  v_years := p_end_vintage - p_cohort_vintage;
  v_point := ST_MakePoint(p_lng, p_lat)::geography;

  select q.id, q.name into v_quartier, v_quartier_nm
  from public.quartier q
  where ST_Contains(q.geom::geometry, v_point::geometry)
  limit 1;

  -- Outside the 80 quartiers there is no cohort to speak of, and saying so is not
  -- the same as saying the rate is zero. Same distinction as 20260825000003.
  if v_quartier is null then
    return query select null::smallint, null::text, null::text, null::text,
                        p_activity_niv18, null::text,
                        null::date, null::date, null::integer,
                        null::bigint, null::bigint, null::numeric,
                        false, false, true, null::text,
                        'Hors des 80 quartiers parisiens : aucune cohorte n''existe ici. '
                        'Ce n''est pas un taux nul.';
    return;
  end if;

  select a.label_18 into v_label
  from public.bdcom_activity a where a.niv18 = p_activity_niv18 limit 1;
  if v_label is null then
    raise exception 'unknown activity niv18 %', p_activity_niv18 using errcode = '22023';
  end if;

  -- ---------------------------------------------------------------------
  -- Row 1 — the premise, from BDCom
  -- ---------------------------------------------------------------------
  select not (v_privileged or bool_and(v.publicly_redistributable))
    into v_bdcom_held
  from public.bdcom_vintage v
  where v.id in (v_cohort_id, v_end_id);

  if v_bdcom_held then
    return query select
      v_quartier, v_quartier_nm,
      'APUR BDCom'::text, 'local'::text,
      p_activity_niv18, v_label,
      make_date(p_cohort_vintage, 1, 1), make_date(p_end_vintage, 1, 1), v_years,
      null::bigint, null::bigint, null::numeric,
      true, false, false,
      (select v.licence from public.bdcom_vintage v where v.id = v_cohort_id),
      format(
        'Millésime %s non redistribuable : la licence APUR n''a pas été lue. '
        'L''effectif et le taux existent en base et ne peuvent pas être servis — '
        'les publier reviendrait à redistribuer un dénombrement de ce millésime. '
        'Question envoyée à l''APUR.', p_cohort_vintage);
  else
    return query
    with cohorte as (
      select l.id
      from public.premise_observation o
      join public.premise_location l on l.id = o.location_id
      join public.bdcom_activity a   on a.code = o.activity_code
      where o.vintage_id = v_cohort_id
        and l.quartier_id = v_quartier
        and a.niv18 = p_activity_niv18
    ),
    apres as (
      select c.id,
             max(case when a2.niv18 = p_activity_niv18 then 1 else 0 end) as vit
      from cohorte c
      left join public.premise_observation o
        on o.location_id = c.id and o.vintage_id = v_end_id
      left join public.bdcom_activity a2 on a2.code = o.activity_code
      group by c.id
    ),
    agg as (select count(*) as n, coalesce(sum(vit), 0) as vit from apres)
    select
      v_quartier, v_quartier_nm,
      'APUR BDCom'::text, 'local'::text,
      p_activity_niv18, v_label,
      make_date(p_cohort_vintage, 1, 1), make_date(p_end_vintage, 1, 1), v_years,
      agg.n, agg.vit,
      case when agg.n >= v_min then round(100.0 * agg.vit / agg.n, 1) end,
      false, agg.n < v_min, false,
      (select v.licence from public.bdcom_vintage v where v.id = v_end_id),
      case when agg.n < v_min
        then format('Cohorte de %s locaux, sous le seuil de publication de %s. '
                    'Le taux existe mais n''est pas servi : sur un effectif pareil il '
                    'décrirait le hasard autant que le quartier.', agg.n, v_min)
        else format('Sur les %s locaux recensés « %s » dans ce quartier en %s, %s en '
                    'étaient encore un en %s. Relevé de terrain APUR, deux millésimes. '
                    'Un local qui a changé de métier ou quitté le périmètre commerce '
                    'compte comme non survivant.',
                    agg.n, v_label, p_cohort_vintage, agg.vit, p_end_vintage)
      end
    from agg;
  end if;

  -- ---------------------------------------------------------------------
  -- Row 2 — the operator, from SIRENE. Licence Ouverte v2: never withheld.
  -- ---------------------------------------------------------------------
  select nullif(r.source_as_of, '')::date into v_sirene_as_of
  from public.ingestion_run r where r.source = 'sirene_stock';

  if v_sirene_as_of is null
     or not exists (select 1 from public.activity_naf_bridge b where b.niv18 = p_activity_niv18)
  then
    return query select
      v_quartier, v_quartier_nm,
      'INSEE SIRENE'::text, 'exploitant'::text,
      p_activity_niv18, v_label,
      null::date, null::date, v_years,
      null::bigint, null::bigint, null::numeric,
      false, false, false, 'Licence Ouverte v2'::text,
      case when v_sirene_as_of is null
        then 'Le stock SIRENE n''a jamais été chargé dans cette base. Aucun millésime, '
             'donc aucune fenêtre de cohorte — et pas un taux nul.'
        else format('Aucune correspondance NAF n''est posée pour « %s » : les deux '
                    'nomenclatures ne sont reliées par aucune table publique, et Compass '
                    'ne comble ce métier-là par aucune approximation.', v_label)
      end;
    return;
  end if;

  -- The window closes at the later of the two constraints, never at the requested
  -- end alone: a business created after (source date − N years) has not had the
  -- time to survive N years, and counting it as a failure is the silent error this
  -- clamp exists to prevent.
  v_win_start := make_date(p_cohort_vintage, 1, 1);
  v_win_end   := least(make_date(p_end_vintage, 1, 1),
                       (v_sirene_as_of - make_interval(years => v_years))::date);

  if v_win_end <= v_win_start then
    return query select
      v_quartier, v_quartier_nm,
      'INSEE SIRENE'::text, 'exploitant'::text,
      p_activity_niv18, v_label,
      v_win_start, v_win_end, v_years,
      null::bigint, null::bigint, null::numeric,
      false, true, false, 'Licence Ouverte v2'::text,
      format('Le stock est daté du %s : aucune entreprise créée à partir de %s n''a pu '
             'atteindre %s ans. La fenêtre est vide, ce qui est une limite de la donnée '
             'et non un taux.', v_sirene_as_of, v_win_start, v_years);
    return;
  end if;

  return query
  with coh as (
    select s.etat_administratif, s.date_creation, s.date_fermeture
    from public.sirene_etablissement_stock s
    join public.activity_naf_bridge b on b.naf = s.activite_naf
    where s.quartier_id = v_quartier
      and b.niv18 = p_activity_niv18
      and s.date_creation is not null
      and s.date_creation >= v_win_start
      and s.date_creation <  v_win_end
      -- Closed with no closure date: dropped, never counted as a survivor.
      -- Unknown is not success.
      and not (s.etat_administratif = 'F' and s.date_fermeture is null)
  ),
  agg as (
    select count(*) as n,
           count(*) filter (
             where etat_administratif = 'A'
                or date_fermeture >= (date_creation + make_interval(years => v_years))::date
           ) as vit
    from coh
  )
  select
    v_quartier, v_quartier_nm,
    'INSEE SIRENE'::text, 'exploitant'::text,
    p_activity_niv18, v_label,
    v_win_start, v_win_end, v_years,
    agg.n, agg.vit,
    case when agg.n >= v_min then round(100.0 * agg.vit / agg.n, 1) end,
    false, agg.n < v_min, false,
    'Licence Ouverte v2'::text,
    case when agg.n < v_min
      then format('Cohorte de %s entreprises créées entre %s et %s, sous le seuil de '
                  'publication de %s.', agg.n, v_win_start, v_win_end, v_min)
      else format('Sur les %s entreprises « %s » immatriculées à ce quartier entre %s et '
                  '%s, %s exerçaient encore %s ans après leur création. Stock SIRENE du '
                  '%s. Cohorte d''OUVERTURES, là où celle de la BDCom est un STOCK qui '
                  'compte aussi des commerces installés de longue date : les deux taux ne '
                  'se comparent pas terme à terme. La correspondance entre le métier BDCom '
                  'et les codes NAF est une lecture de Compass, qu''aucune table publique '
                  'ne publie.',
                  agg.n, v_label, v_win_start, v_win_end, agg.vit, v_years, v_sirene_as_of)
    end
  from agg;
end;
$$;