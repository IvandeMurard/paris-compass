-- Survival by trade and quartier — w1-survie (#14), PLAN.md §5.2 and §6.2.
--
-- ---------------------------------------------------------------------------
-- Two survivals, side by side, never merged — and the reason is a measurement
-- ---------------------------------------------------------------------------
-- Measured 25 August 2026, "Café et Restaurant" in Paris, six years:
--
--   BDCom   86.5 %  of PREMISES that were a café or restaurant in 2017 still were in 2023
--   SIRENE  52.5 %  of BUSINESSES opened 2017–2020 were still trading six years later
--                   (5 613 of 10 686)
--
-- The premise persists; the operator turns over roughly twice as often. Neither
-- source can say this alone, and collapsing them into one number would destroy
-- the only interesting thing here. PLAN.md §3.4 already required it — "Un
-- Measured<T> par source, jamais un chiffre fusionné qui masquerait laquelle des
-- deux l'a produit" — so this function returns them as two ROWS, not two columns
-- of one row. The shape of the answer enforces the doctrine.
--
-- It is also what defeats the forbidden reading. "72 % des cafés tiennent six ans"
-- is an observation; "votre café a 72 % de chances" is a forecast, and w1-survie
-- forbids it. A reader shown one rate can mistake it for a probability about the
-- shop in front of them. A reader shown 86.5 % of premises against 52.5 % of
-- operators cannot: the two answer different questions, and the difference is
-- visible before any warning is read.
--
-- ---------------------------------------------------------------------------
-- The two cohorts are NOT comparable term for term, and the function says so
-- ---------------------------------------------------------------------------
-- BDCom's cohort is a STOCK: every premise trading in the start vintage,
-- including shops installed for thirty years. SIRENE's is a FLOW: businesses
-- created inside the window, so young ones by construction — and a young business
-- fails far more often than an old one. Part of the 86.5 / 52.5 gap is that
-- difference in composition, not only the premise-versus-operator distinction.
-- Said in `evidence` on every SIRENE row rather than left for a reader to notice.
--
-- ---------------------------------------------------------------------------
-- Censoring, which a naive query gets wrong silently
-- ---------------------------------------------------------------------------
-- A business created in 2022 cannot have survived six years by August 2026. Left
-- in the denominator it counts as a failure, and the survival rate collapses for
-- reasons that have nothing to do with the trade. So the cohort window closes at
-- (source date − N years), never at the requested end vintage, and the window
-- actually used is returned rather than the one asked for.
--
-- Businesses closed with no closure date are dropped from the cohort, not counted
-- as survivors: 2.1 % of Paris closures nationally, and 0 in the measured café
-- cohort. Unknown is not success.
--
-- ---------------------------------------------------------------------------
-- Licence: the two halves answer differently, and that is the whole design
-- ---------------------------------------------------------------------------
-- Every BDCom cohort starts in 2017 or 2020, both `publicly_redistributable =
-- false`. This project already withholds AGGREGATES derived from them —
-- compass_scoring_context_within returns 3 855 premises to a privileged caller
-- and 0 + withheld to anon (20260816000001). A survival rate must state n and its
-- vintages to be honest at all, and stating n = 310 for 2017 publishes a count of
-- a vintage whose licence has not been read. So the BDCom row is withheld.
--
-- SIRENE is Licence Ouverte v2. Its row is served to everyone. An anonymous
-- caller therefore gets a real survival figure today — the first in this corpus —
-- and a marked, explained hole where BDCom would be.
--
-- SECURITY DEFINER, per invariant I18: a function that withholds must see
-- everything in order to decide what to disclose. A SECURITY INVOKER function
-- would have RLS remove the 2017 rows underneath it and return a *smaller number*
-- with no marker — which is exactly the defect measured on compass_street_rotation
-- while writing this migration (DIAGNOSTIC.md §19: 78 activity changes for a
-- privileged caller, 0 and no marker for anon).


-- ---------------------------------------------------------------------------
-- The BDCom trade <-> NAF bridge, which nobody publishes
-- ---------------------------------------------------------------------------
-- BDCom classifies premises on its own 224-post nomenclature; INSEE classifies
-- businesses on NAF. No published table joins them, so this one is Compass's own
-- reading — an inference, not a transcription, and it is data rather than a CASE
-- buried in the function so that it can be audited and corrected as data.
--
-- Deliberately partial. A trade absent here gets no SIRENE row at all, which reads
-- as "not bridged" rather than as a rate of zero. Filling it in with approximate
-- matches would manufacture comparisons nobody checked.
--
-- Hotels are absent on purpose although the trade exists in BDCom (niv18 116,
-- 92.6 % six-year premise survival): NAF 55 is not a street-level division and
-- scripts/ingest/sirene-stock.ts does not load it.

create table public.activity_naf_bridge (
  niv18       smallint not null,
  naf         text     not null,
  primary key (niv18, naf)
);

comment on table public.activity_naf_bridge is
  'Compass''s own reading of which NAF codes correspond to a BDCom level-18 trade. '
  'No public table joins the two nomenclatures, so this is an inference and every '
  'figure derived from it says so in its evidence. Partial by design: an absent '
  'trade yields no SIRENE row rather than a zero.';

insert into public.activity_naf_bridge (niv18, naf) values
  -- 111 Café et Restaurant
  (111, '56.10A'),  -- restauration traditionnelle
  (111, '56.10C'),  -- restauration de type rapide
  (111, '56.30Z'),  -- débits de boissons
  -- 101 Alimentaire (retail food)
  (101, '47.11B'), (101, '47.11C'), (101, '47.11D'), (101, '47.11F'),
  (101, '47.21Z'), (101, '47.22Z'), (101, '47.23Z'), (101, '47.24Z'),
  (101, '47.25Z'), (101, '47.29Z'),
  -- 114 Santé-Beauté (personal care services only; pharmacies are health, not this)
  (114, '96.02A'),  -- coiffure
  (114, '96.02B');  -- soins de beauté

alter table public.activity_naf_bridge enable row level security;
create policy "activity_naf_bridge is publicly readable"
  on public.activity_naf_bridge for select to anon, authenticated using (true);


-- ---------------------------------------------------------------------------
-- The publication threshold
-- ---------------------------------------------------------------------------
-- 30, and it is a column of the answer rather than a convention in a query.
--
-- Measured 25 August 2026: all 80 quartiers reach n >= 30 for "Café et Restaurant",
-- 78 reach n >= 50. The street segment does NOT — of 6 338 segments holding a café
-- or restaurant in 2017, exactly ONE reaches 30 and 95 reach 10. w1-survie asks for
-- "taux par métier × tronçon"; that is out of reach at any publishable cohort size,
-- and the quartier is the finest grain this data supports. Recorded in
-- docs/tickets/w1-survie.md rather than silently substituted.

create function public.compass_survival_min_cohort()
returns integer language sql immutable parallel safe
as $$ select 30 $$;

comment on function public.compass_survival_min_cohort is
  'Smallest cohort whose rate is published. Below it the rate is null and '
  'insufficient_n is true — never a percentage computed on a handful of premises.';


create function public.compass_survival_by_trade(
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
$$;

comment on function public.compass_survival_by_trade is
  'Two survivals for one quartier and one trade, as two rows: the premise (BDCom, '
  'withheld while the APUR licence is unread) and the operator (SIRENE, Licence '
  'Ouverte v2, served). Never merged — they answer different questions and the gap '
  'between them is the finding. Every row carries its cohort size and its period; a '
  'cohort under compass_survival_min_cohort() yields insufficient_n and no rate. An '
  'observation about a past cohort, never a forecast about a particular business.';

grant execute on function
  public.compass_survival_min_cohort(),
  public.compass_survival_by_trade(double precision, double precision, smallint, smallint, smallint)
to anon, authenticated;
