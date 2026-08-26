CREATE OR REPLACE FUNCTION public.compass_survival_by_trade(p_lat double precision, p_lng double precision, p_activity_niv18 smallint, p_cohort_vintage smallint DEFAULT 2017, p_end_vintage smallint DEFAULT 2023)
 RETURNS TABLE(quartier_id smallint, quartier_name text, source text, subject text, activity_niv18 smallint, activity_label text, period_start date, period_end date, years integer, cohort_n bigint, survived_n bigint, survival_rate numeric, withheld boolean, insufficient_n boolean, out_of_corpus boolean, licence text, evidence text)
 LANGUAGE plpgsql
 STABLE PARALLEL SAFE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
  -- Same caller test as 20260809000011, copied verbatim so the five functions that
  -- withhold cannot drift apart. A direct database connection carries no PostgREST
  -- claim and is privileged by definition: it already holds the credentials.
  v_privileged := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role',
    nullif(current_setting('request.jwt.claim.role', true), ''),
    'service_role'
  ) <> 'anon';

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
$function$
