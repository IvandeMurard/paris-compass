-- w1-licence-derivee (#59) — a figure derived from two vintages stops citing the
-- licence of the more permissive one.
--
-- ---------------------------------------------------------------------------
-- 1. The defect, measured rather than argued
-- ---------------------------------------------------------------------------
-- compass_survival_by_trade computes its BDCom half from TWO vintages: the
-- cohort, and the vintage it checks survival in. The withheld branch cites the
-- cohort's licence, which is right. The disclosed branch cited the END vintage's:
--
--   (select v.licence from public.bdcom_vintage v where v.id = v_end_id)
--
-- Measured 27 August 2026 on `dbefhvmyfmmhjeetdddu`, Halles (48.86229 /
-- 2.34490), niv18 111 "Café et Restaurant", privileged caller — the same
-- measurement the ticket recorded on 25 August, re-run before being copied:
--
--   cohort_n / survived_n / survival_rate   310 · 268 · 86.5 %
--   period_start -> period_end              2017 -> 2023
--   licence                                 ODbL-1.0
--
-- And, measured in the same breath, public.bdcom_vintage:
--
--   2017   custom     publicly_redistributable = false
--   2020   custom     publicly_redistributable = false
--   2023   ODbL-1.0   publicly_redistributable = true
--
-- Half of that 86.5 % is a count of 2017 — the vintage whose licence has not
-- been read, and whose unreadness is the entire reason the neighbouring branch
-- withholds. A consumer republishing "86.5 %, ODbL-1.0" attaches an open licence
-- to a figure that half derives from a source nobody has been allowed to
-- redistribute. DIAGNOSTIC.md §13's family — "a licence asserted over data it
-- does not cover" — in its DERIVATION variant.
--
-- ---------------------------------------------------------------------------
-- 2. Scope, and w0-appelant (#58) changed it
-- ---------------------------------------------------------------------------
-- An anonymous caller never sees this label: its row is withheld, and the
-- withheld branch cites the right licence. Before #58 the defect was served to
-- `authenticated` too — a website registrant, precisely the third party who
-- might republish. #58 decided that creating an account is not a reading of a
-- licence, so `authenticated` is no longer privileged, and the wrong label is now
-- seen ONLY by the service role and direct database connections: whoever operates
-- Compass, who already knows what 2017 carries.
--
-- That changes the urgency, not the verdict. No shipped consumer reads the column
-- either — src/i18n/survivalText.ts declares `licence: string | null` and renders
-- the prose, never the label (verified 27 August 2026). It is corrected because a
-- false licence is worse than an absent one: it authorises a redistribution
-- nobody granted, and the next caller of this function is not bound to be one of
-- the two that exist today.
--
-- ---------------------------------------------------------------------------
-- 3. The rule, mechanical rather than rewritten per function
-- ---------------------------------------------------------------------------
-- The general question behind the defect: when a value derives from N sources
-- under different licences, which one does it carry? The most restrictive. Left
-- as a habit, that answer has to be re-derived by hand in every function that
-- ever composes two vintages — which is exactly how this repository wrote the
-- withholding rule four times before I23/I24 made it enumerable, and how the
-- caller test was copied six times before #58 made it one expression.
--
-- So it becomes a function: public.compass_derived_licence(vintage ids). One
-- expression, called by both branches, and the branches can no longer disagree
-- with each other — which is what the old code did.
--
-- NO ORDER BETWEEN LICENCES IS INVENTED, and the ticket rules that out
-- explicitly. The rule needs no ranking because it keys on a boolean the schema
-- already carries: if any vintage the figure derives from is not
-- `publicly_redistributable`, that vintage governs. Only if every source may be
-- redistributed does the answer come from the sources themselves.
--
-- WHY THE ANSWER IS A SET AND NOT A PICK. Where several vintages govern and
-- carry different licences, the function returns all of them, distinct and
-- alphabetically joined. Alphabetical is for determinism, not for rank: a
-- derived figure is bound by EVERY licence it derives from, so listing them is
-- the truthful answer and picking one would be the invented order the ticket
-- forbids. Today the branch is unreachable — 2017 and 2020 both carry `custom`,
-- and only one vintage is redistributable at all — so it is proved by sabotage
-- in a rolled-back transaction rather than by the data (I36's header records it).

create function public.compass_derived_licence(p_vintage_ids smallint[])
returns text
language sql stable parallel safe
set search_path = public
as $$
  with used as (
    select v.licence, v.publicly_redistributable
    from public.bdcom_vintage v
    where v.id = any(p_vintage_ids)
  ),
  -- The governing sources: those that may not be redistributed if there are any,
  -- otherwise all of them. One expression, so the two cases cannot drift.
  governing as (
    select u.licence
    from used u
    where not u.publicly_redistributable
       or not exists (select 1 from used w where not w.publicly_redistributable)
  )
  select string_agg(distinct g.licence, ' + ' order by g.licence) from governing g
$$;

comment on function public.compass_derived_licence is
  'The licence a figure carries when it derives from several BDCom vintages: the '
  'most restrictive of them. A vintage that is not publicly_redistributable '
  'governs the whole derivation — its licence has not been read, and reading it '
  'for one half of a figure does not read it for the other. Where several '
  'sources govern under different licences, all of them are returned joined by '
  '" + ": a derived figure is bound by every licence it derives from, and picking '
  'one would invent a ranking between licences that this schema deliberately does '
  'not hold. Null when no vintage matches, which no caller should produce. '
  'w1-licence-derivee (#59).';

grant execute on function public.compass_derived_licence(smallint[]) to anon, authenticated;


-- ---------------------------------------------------------------------------
-- 4. compass_survival_by_trade, with the rule applied to BOTH branches
-- ---------------------------------------------------------------------------
-- The withheld branch was already right, and it is rewritten anyway. Leaving it
-- to name v_cohort_id by hand would keep two hand-made answers to one question,
-- one branch apart — the shape the defect had in the first place. Both branches
-- now make the identical call, so "they agree" stops being an intention.
--
-- Body otherwise copied verbatim from 20260826000002, which is where it currently
-- lives: `create or replace`, no signature and no return type change, so no
-- caller breaks and no grant is lost.

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
      -- The governing licence of the two vintages this figure derives from —
      -- w1-licence-derivee (#59). Identical call in the other branch, on purpose.
      public.compass_derived_licence(array[v_cohort_id, v_end_id]),
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
      -- The governing licence of the two vintages this figure derives from —
      -- w1-licence-derivee (#59). Identical call in the other branch, on purpose.
      public.compass_derived_licence(array[v_cohort_id, v_end_id]),
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
  'observation about a past cohort, never a forecast about a particular business. '
  'The BDCom licence is the GOVERNING licence of the two vintages the rate derives '
  'from, via compass_derived_licence — not the end vintage''s, which is the more '
  'permissive of the two and was cited until w1-licence-derivee (#59).';


-- ---------------------------------------------------------------------------
-- 5. A documentation defect found at the same place, corrected with it
-- ---------------------------------------------------------------------------
-- 20260825000012 says of the NAF bridge, in the table comment it installed:
-- "Partial by design: an absent trade yields no SIRENE row rather than a zero."
--
-- The behaviour is better than that, and the comment is what is false. Measured
-- 27 August 2026 on `dbefhvmyfmmhjeetdddu`, Halles, niv18 101 "Grand magasin" —
-- a trade genuinely absent from the bridge, which after 20260825000013 holds 102,
-- 104 and 111 only. No sabotage was needed to reach the branch:
--
--   source         cohort_n   survival_rate   withheld   evidence
--   INSEE SIRENE   null       null            false      "Aucune correspondance NAF n'est
--                                                         posée pour « Grand magasin » […]"
--
-- The row DOES come out. It carries null counts and says in words why, which is
-- strictly more useful than silence: an absent row is indistinguishable from a
-- function that failed to consider the trade, whereas this one names the gap and
-- says Compass fills it with no approximation. Same doctrine as out_of_corpus and
-- insufficient_n elsewhere in this function — an absence that explains itself is
-- not the same as a zero, and neither is the same as nothing at all.
--
-- A posted migration is not rewritten, so the correction lives here. The comment
-- is a live database object; this replaces it.

comment on table public.activity_naf_bridge is
  'Compass''s own reading of which NAF codes correspond to a BDCom level-18 trade. '
  'No public table joins the two nomenclatures, so this is an inference and every '
  'figure derived from it says so in its evidence. Partial by design: a trade '
  'absent here yields a SIRENE row with null counts whose evidence names the '
  'missing bridge — never a rate of zero, and never silence. 20260825000012 said '
  '"no SIRENE row at all"; measured 27 August 2026 on niv18 101, the row comes out '
  'and explains itself. Corrected by w1-licence-derivee (#59).';
