-- w6-analyse (#50) — the four analyses PLAN.md phase 6 says the schema already
-- permits, and which nothing asked.
--
-- ---------------------------------------------------------------------------
-- What the ticket asked, and the one claim of it that was false
-- ---------------------------------------------------------------------------
-- §6.1 transition matrices, §6.3 aggregation by whole street, §6.4 median price
-- by activity, §6.5 sales against collective proceedings. No new source, so no
-- new licence — which is the reason all four could be written at once.
--
-- The ticket also said compass_street_rotation "n'est appelée par personne — pas
-- même par la porte". Measured 2026-09-06, that is false and has been since
-- 25 August: eval/invariants.sql calls it in I25 and I26, and
-- scripts/eval/anon-http.ts calls it over PostgREST in arm D. PLAN.md §6.3 had
-- already struck that sentence out; the ticket restated the pre-25-August text.
-- Recorded here because a migration is where a measurement lands.
--
-- ---------------------------------------------------------------------------
-- Why all four withhold, and why §6.1 withholds ENTIRELY from anon today
-- ---------------------------------------------------------------------------
-- All four read premise_observation, which is the only restricted table among
-- the ones they touch (measured 2026-09-06: every other policy qual is `true`).
-- So all four are SECURITY DEFINER and carry a `withheld` column — invariant I23
-- derives that population from pg_proc, so a function born without it turns the
-- gate red rather than waiting to be noticed by someone.
--
-- §6.1 has a consequence nobody had written down, and it is not a defect: a
-- transition needs TWO vintages, and only 2023 is publicly redistributable.
-- Every possible pair — 2017→2020, 2017→2023, 2020→2023 — therefore contains a
-- withheld vintage, so an anonymous caller receives a marked, explained row and
-- never a matrix. There is no pair this function can serve to anon until the
-- APUR answers. Said in `evidence` rather than left for a reader to deduce from
-- an empty result, which is the defect of DIAGNOSTIC.md §9 in another costume.
--
-- The licence each row carries comes from compass_derived_licence(), never from
-- a `select v.licence` of its own — invariant I37 (#59), which exists to watch
-- for exactly the next function that would compose two vintages by hand.
--
-- ---------------------------------------------------------------------------
-- The publication threshold, shared rather than redefined
-- ---------------------------------------------------------------------------
-- compass_survival_min_cohort() is already 30 and already means "smallest cohort
-- whose rate is published". A second threshold with the same job is two numbers
-- to keep equal, which is how they diverge.


-- ===========================================================================
-- §6.1 — what a bakery becomes
-- ===========================================================================
create function public.compass_activity_transitions(
  p_lat            double precision,
  p_lng            double precision,
  p_radius_m       double precision default 800,
  p_from_vintage   smallint         default 2020,
  p_to_vintage     smallint         default 2023
)
returns table (
  from_niv18     smallint,
  from_label     text,
  to_niv18       smallint,
  to_label       text,
  premises       bigint,
  is_same_trade  boolean,
  withheld       boolean,
  licence        text,
  evidence       text
)
language plpgsql stable parallel safe security definer
set search_path = public, extensions
as $$
declare
  v_point     geography;
  v_from_id   smallint;
  v_to_id     smallint;
  v_licence   text;
  v_withheld  boolean;
begin
  if p_radius_m is null or p_radius_m <= 0 or p_radius_m > public.compass_max_radius_m() then
    raise exception 'p_radius_m must be between 1 and % (got %)',
      public.compass_max_radius_m(), p_radius_m using errcode = '22023';
  end if;

  select v.id into v_from_id from public.bdcom_vintage v where v.year = p_from_vintage;
  select v.id into v_to_id   from public.bdcom_vintage v where v.year = p_to_vintage;
  if v_from_id is null or v_to_id is null then
    raise exception 'unknown vintage year (% or %)', p_from_vintage, p_to_vintage
      using errcode = '22023';
  end if;
  if p_to_vintage <= p_from_vintage then
    raise exception 'p_to_vintage (%) must be after p_from_vintage (%)',
      p_to_vintage, p_from_vintage using errcode = '22023';
  end if;

  v_licence := public.compass_derived_licence(array[v_from_id, v_to_id]);

  -- A transition derives from both vintages, so ONE withheld vintage withholds
  -- the whole answer. Not a per-row test: no row of this answer derives from a
  -- single vintage.
  select not (public.compass_caller_is_privileged() or bool_and(v.publicly_redistributable))
    into v_withheld
  from public.bdcom_vintage v
  where v.id in (v_from_id, v_to_id);

  if v_withheld then
    return query select
      null::smallint, null::text, null::smallint, null::text,
      null::bigint, null::boolean,
      true, v_licence,
      format(
        'Une transition dérive de deux millésimes, et %s n''est pas '
        'redistribuable : la licence APUR n''a pas été lue. La matrice existe en '
        'base et ne peut pas être servie. Aucun couple n''est servable '
        'aujourd''hui — seul 2023 est redistribuable, et une transition en '
        'demande deux. Question envoyée à l''APUR.',
        (select string_agg(v.year::text, ' et ' order by v.year)
           from public.bdcom_vintage v
          where v.id in (v_from_id, v_to_id) and not v.publicly_redistributable));
    return;
  end if;

  v_point := ST_MakePoint(p_lng, p_lat)::geography;

  return query
  with nearby as materialized (
    select l.id
    from public.premise_location l
    where l.geom is not null and ST_DWithin(l.geom, v_point, p_radius_m)
  ),
  paire as materialized (
    select a1.niv18 as from18, a1.label_18 as from_lbl,
           a2.niv18 as to18,   a2.label_18 as to_lbl
    from nearby n
    join public.premise_observation o1 on o1.location_id = n.id and o1.vintage_id = v_from_id
    join public.premise_observation o2 on o2.location_id = n.id and o2.vintage_id = v_to_id
    join public.bdcom_activity a1 on a1.code = o1.activity_code
    join public.bdcom_activity a2 on a2.code = o2.activity_code
  )
  select p.from18, p.from_lbl, p.to18, p.to_lbl,
         count(*)::bigint,
         p.from18 is not distinct from p.to18,
         false, v_licence,
         format('Relevé de terrain APUR, millésimes %s et %s, locaux dans %s m. '
                'Un local absent de l''un des deux millésimes ne produit aucune '
                'ligne : une disparition n''est pas une transition.',
                p_from_vintage, p_to_vintage, round(p_radius_m))
  from paire p
  group by p.from18, p.from_lbl, p.to18, p.to_lbl
  order by count(*) desc, p.from18, p.to18;
end;
$$;

comment on function public.compass_activity_transitions is
  'Per pair of BDCom level-18 trades: how many premises within the radius went '
  'from one to the other between two vintages. The answer PLAN.md §6.1 asks for '
  '— "que devient une boulangerie ?" — where the schema previously held only a '
  'boolean saying that something had changed. A premise absent from either '
  'vintage yields no row: a disappearance is not a transition, and counting it '
  'as one would publish a change of trade nobody observed. Withheld entirely '
  'from an anonymous caller, and structurally rather than incidentally: a '
  'transition derives from two vintages and only 2023 is redistributable, so no '
  'pair is servable until the APUR answers. w6-analyse (#50).';

grant execute on function public.compass_activity_transitions(
  double precision, double precision, double precision, smallint, smallint
) to anon, authenticated;


-- ===========================================================================
-- §6.3 — the whole street, not the segment
-- ===========================================================================
-- street_segment.voie_id groups the segments of one street and nothing read it.
-- Measured 2026-09-06 at Halles (48.86229 / 2.34490), 300 m: the premises in
-- radius sit on 102 segments belonging to 43 voies. Corpus-wide, 25 094 segments
-- for 6 653 voies, and not one segment lacks a voie_id — so the aggregate is
-- total, never partial.
--
-- Same withholding shape as compass_street_rotation, deliberately: this function
-- answers the same question one grain coarser, and a caller must not have to
-- learn two conventions. One row per (voie, vintage); a withheld vintage yields
-- ONE marked row carrying no voie, no name and no count — the shape I25 checks
-- on its neighbour.
create function public.compass_voie_rotation(
  p_lat               double precision,
  p_lng               double precision,
  p_radius_m          double precision default 800,
  p_retail_scope_only boolean          default true
)
returns table (
  voie_id                bigint,
  voie_name              text,
  segments               bigint,
  vintage_year           smallint,
  vintage_scope          public.bdcom_scope,
  premises               bigint,
  vacant                 bigint,
  changed_since_previous bigint,
  withheld               boolean,
  licence                text,
  evidence               text
)
language plpgsql stable parallel safe security definer
set search_path = public, extensions
as $$
declare
  v_point      geography;
  v_privileged boolean := public.compass_caller_is_privileged();
begin
  if p_radius_m is null or p_radius_m <= 0 or p_radius_m > public.compass_max_radius_m() then
    raise exception 'p_radius_m must be between 1 and % (got %)',
      public.compass_max_radius_m(), p_radius_m using errcode = '22023';
  end if;

  v_point := ST_MakePoint(p_lng, p_lat)::geography;

  return query
  -- street_segment is joined ONCE PER SEGMENT, at the aggregate, never per
  -- premise. Measured 2026-09-06 at 2 000 m on Chatelet, twelve passes, anon
  -- claim, parallelism off: joining it inside `nearby` costs 289 548 pages,
  -- joining it after the per-segment aggregate costs 225 633. The same shape of
  -- cost 20260828000003 removed from three functions (#64), and it would have
  -- been reintroduced here by the join that reads most naturally.
  --
  -- 225 633 IS STILL 2,6 FOIS compass_street_rotation, remeasured at 87 639 in
  -- the same session and the same transaction — so the gap is this function, not
  -- a corpus that has grown. Forcing or removing `materialized` changes nothing
  -- (225 638 against 225 633), and `explain` on a plpgsql function only yields a
  -- Function Scan, which is the trap docs/REPRISE-PIEGES.md records. The
  -- decomposition is therefore NOT known, and the budget is declared at what was
  -- measured rather than at what it ought to be — #87. It stays far under the
  -- ceiling (379 ms against 1 020), so it is a cost to reduce, not a promise
  -- broken.
  with nearby as materialized (
    select l.id, l.street_segment_id
    from public.premise_location l
    where l.geom is not null
      and l.street_segment_id is not null
      and ST_DWithin(l.geom, v_point, p_radius_m)
  ),
  observed as materialized (
    select
      n.street_segment_id,
      v.year  as vintage_year,
      v.scope as vintage_scope,
      v.publicly_redistributable as odbl,
      coalesce(a.is_vacant, false) as is_vacant,
      o.activity_code,
      lag(o.activity_code) over (partition by o.location_id order by v.year) as previous_code,
      lag(v.publicly_redistributable) over (partition by o.location_id order by v.year)
        as previous_odbl
    from nearby n
    join public.premise_observation o on o.location_id = n.id
    join public.bdcom_vintage v       on v.id = o.vintage_id
    left join public.bdcom_activity a on a.code = o.activity_code
    where not p_retail_scope_only or coalesce(a.in_retail_scope, false)
  ),
  par_segment as materialized (
    select
      ob.street_segment_id,
      ob.vintage_year,
      ob.vintage_scope,
      ob.odbl,
      count(*)::bigint                             as premises,
      count(*) filter (where ob.is_vacant)::bigint as vacant,
      count(*) filter (
        where ob.previous_code is not null
          and ob.activity_code is distinct from ob.previous_code)::bigint as changed,
      bool_and(coalesce(ob.previous_odbl, true))   as previous_visible
    from observed ob
    group by ob.street_segment_id, ob.vintage_year, ob.vintage_scope, ob.odbl
  ),
  -- The withheld vintages, as ONE marked row each. Deliberately carrying no
  -- voie: naming the street would already publish that the vintage covers it.
  retenu as (
    select v.id, v.year, v.scope
    from public.bdcom_vintage v
    where not v_privileged and not v.publicly_redistributable
  )
  select null::bigint, null::text, null::bigint, r.year, r.scope,
         null::bigint, null::bigint, null::bigint,
         true,
         public.compass_derived_licence(array[r.id]),
         format('Millésime %s non redistribuable : la licence APUR n''a pas été '
                'lue. Les dénombrements existent en base et ne peuvent pas être '
                'servis.', r.year)
  from retenu r
  union all
  select s.voie_id, s.name,
         count(*)::bigint,
         ps.vintage_year, ps.vintage_scope,
         sum(ps.premises)::bigint,
         sum(ps.vacant)::bigint,
         -- Null, never zero, when the PREVIOUS vintage is withheld from this
         -- caller: "what changed since 2020" is a fact about 2020, and answering
         -- 0 there is the manufactured zero of DIAGNOSTIC.md §19.
         case when v_privileged or bool_and(ps.previous_visible)
              then sum(ps.changed)::bigint
         end,
         false,
         public.compass_derived_licence(
           array[(select v.id from public.bdcom_vintage v where v.year = ps.vintage_year)]),
         format('Relevé de terrain APUR, millésime %s, agrégé sur la voie entière '
                '— %s tronçon(s) portant un local dans %s m.',
                ps.vintage_year, count(*), round(p_radius_m))
  from par_segment ps
  join public.street_segment s on s.id = ps.street_segment_id
  where v_privileged or ps.odbl
  group by s.voie_id, s.name, ps.vintage_year, ps.vintage_scope
  order by 1 nulls first, 4;
end;
$$;

comment on function public.compass_voie_rotation is
  'compass_street_rotation one grain coarser: per WHOLE street '
  '(street_segment.voie_id) and per vintage — premises, vacant, and how many '
  'changed activity since the previous survey, with the number of segments the '
  'figure covers. PLAN.md §6.3: voie_id grouped the segments of one street and '
  'nothing read it, so a caller asking about "rue Montorgueil" was answered '
  'about one of its segments. changed_since_previous is null, never zero, when '
  'the previous vintage is withheld from the caller — a count of changes since a '
  'vintage one may not see is unknown, not zero. w6-analyse (#50).';

grant execute on function public.compass_voie_rotation(
  double precision, double precision, double precision, boolean
) to anon, authenticated;


-- ===========================================================================
-- §6.4 — the price by trade, which only existed as prose
-- ===========================================================================
-- The median price per trade was published in README.md and computed nowhere:
-- the two frozen baselines cover the ALL-TRADES median (160 868 €) and its
-- population, never the per-trade figures. Measured 2026-09-06 on the remote,
-- BDCom activity from vintage 2023, retail scope, n >= 30:
--
--   Hôtel et Auberge de jeunesse    85   1 000 000 €
--   Santé-Beauté                   187     440 000 €
--   Alimentaire                    826     230 000 €
--   Café et Restaurant           2 591     210 000 €
--   Equipement de la personne      199     120 000 €
--   Service aux particuliers       757      50 000 €
--
-- README.md publishes 250 000 / 220 000 / 86 000 / 50 000 for four of those, and
-- two of the four do not reproduce under any method tried (DIAGNOSTIC.md §41).
-- This function does not correct the README — a published product figure is a
-- decision, not a side effect of a migration. It makes the number reproducible,
-- which is the precondition for correcting it.
--
-- The grouping is the BDCom activity code, NEVER bodacc_establishment.activity:
-- that column is free text where "Restauration rapide" and "Restauration
-- rapide." are two categories, and it carries 210 double-encoded rows
-- (DIAGNOSTIC.md §40). The rule is older than this migration — REPRISE.md "Ce
-- qu'il ne faut pas faire", and note_prix — and it is the reason this function
-- needs premise_observation at all, hence its withholding.
create function public.compass_price_by_activity(
  p_lat              double precision,
  p_lng              double precision,
  p_radius_m         double precision default 800,
  p_activity_vintage smallint         default 2023
)
returns table (
  activity_niv18   smallint,
  activity_label   text,
  sales_n          bigint,
  median_price_eur bigint,
  insufficient_n   boolean,
  withheld         boolean,
  licence          text,
  evidence         text
)
language plpgsql stable parallel safe security definer
set search_path = public, extensions
as $$
declare
  v_point     geography;
  v_vintage   smallint;
  v_withheld  boolean;
  v_licence   text;
  v_min       integer := public.compass_survival_min_cohort();
begin
  if p_radius_m is null or p_radius_m <= 0 or p_radius_m > public.compass_max_radius_m() then
    raise exception 'p_radius_m must be between 1 and % (got %)',
      public.compass_max_radius_m(), p_radius_m using errcode = '22023';
  end if;

  select v.id into v_vintage from public.bdcom_vintage v where v.year = p_activity_vintage;
  if v_vintage is null then
    raise exception 'unknown vintage year %', p_activity_vintage using errcode = '22023';
  end if;

  v_licence := public.compass_derived_licence(array[v_vintage]);

  select not (public.compass_caller_is_privileged() or v.publicly_redistributable)
    into v_withheld
  from public.bdcom_vintage v where v.id = v_vintage;

  -- The price is BODACC and open; the TRADE is BDCom and may be withheld. The
  -- figure derives from both, so the withheld vintage governs the whole row —
  -- serving the price without its trade would answer a different question.
  if v_withheld then
    return query select
      null::smallint, null::text, null::bigint, null::bigint,
      false, true, v_licence,
      format('Millésime %s non redistribuable : la licence APUR n''a pas été lue. '
             'Le prix vient de BODACC et serait servable ; le MÉTIER vient de ce '
             'millésime-là, et un prix sans son métier ne répond pas à la '
             'question posée. Millésime 2023 servable en le demandant.',
             p_activity_vintage);
    return;
  end if;

  v_point := ST_MakePoint(p_lng, p_lat)::geography;

  return query
  -- The premises are restricted BEFORE BODACC is touched, and the "alone at its
  -- number" test is evaluated once per premise in radius rather than once per
  -- notice. Measured 2026-09-06 at 2 000 m on Chatelet, twelve passes, anon
  -- claim, parallelism off: 305 181 pages the other way round, 140 835 this way.
  -- Same lesson as #62 — the join order is the cost.
  with nearby as materialized (
    select l.id, l.street_key, l.num
    from public.premise_location l
    where l.geom is not null and ST_DWithin(l.geom, v_point, p_radius_m)
  ),
  seul as materialized (
    -- Only where the premise is alone at its number. Elsewhere nobody knows
    -- which shopfront was sold, so nobody knows which trade to attach the price
    -- to. Same restriction as the frozen baseline, and it exists for the reason
    -- note_prix gives, not for a taste for small numbers.
    --
    -- The count is taken over the WHOLE corpus, never over the radius: a premise
    -- at the edge would otherwise look alone because its neighbours fall outside,
    -- and the answer would depend on the radius asked for.
    select n.id, n.street_key, n.num
    from nearby n
    where (select count(*) from public.premise_location q
            where q.street_key = n.street_key and q.num = n.num) = 1
  ),
  vente as materialized (
    select e.price_eur, s.id as location_id
    from seul s
    join public.bodacc_establishment e
      on e.street_key = s.street_key and e.house_number_int = s.num
    join public.bodacc_announcement a on a.id = e.announcement_id
    where e.price_eur is not null
      and e.geom is not null
      and a.family = 'vente'
  ),
  par_metier as (
    select act.niv18, act.label_18,
           count(*)::bigint as n,
           round(percentile_cont(0.5) within group (order by v.price_eur))::bigint as med
    from vente v
    join public.premise_observation o
      on o.location_id = v.location_id and o.vintage_id = v_vintage
    join public.bdcom_activity act on act.code = o.activity_code
    group by act.niv18, act.label_18
  )
  select m.niv18, m.label_18, m.n,
         case when m.n >= v_min then m.med end,
         m.n < v_min, false, v_licence,
         case when m.n < v_min
           then format('%s cession(s) sous le seuil de publication de %s. La '
                       'médiane existe et n''est pas servie : sur cet effectif '
                       'elle décrirait le hasard autant que le métier.', m.n, v_min)
           else format('Médiane de %s cession(s) BODACC dont le local est seul à '
                       'son numéro, métier lu sur le millésime BDCom %s. Un prix '
                       'de fonds, jamais un loyer ni un prix au mètre carré.',
                       m.n, p_activity_vintage)
         end
  from par_metier m
  order by m.n desc, m.niv18;
end;
$$;

comment on function public.compass_price_by_activity is
  'Median goodwill price per BDCom level-18 trade, within a radius, with the '
  'number of sales it rests on. PLAN.md §6.4: the figure existed as four numbers '
  'in README.md and as no query at all. Grouped on the BDCom activity code and '
  'never on bodacc_establishment.activity, which is free text where '
  '"Restauration rapide" and "Restauration rapide." are two categories. '
  'Restricted to sales whose premise is alone at its street number: elsewhere '
  'the corpus cannot say which shopfront was sold, so it cannot say which trade '
  'the price belongs to. Below the publication threshold the median is null and '
  'insufficient_n is true — never a median of a handful. w6-analyse (#50).';

grant execute on function public.compass_price_by_activity(
  double precision, double precision, double precision, smallint
) to anon, authenticated;


-- ===========================================================================
-- §6.5 — renewal against death, by quartier and by trade
-- ===========================================================================
-- The axis is bodacc_announcement.family, an ENUM the schema already carries:
-- 'vente' (43 293 notices) against 'collective' (120 742), measured 2026-09-06.
--
-- IT IS NOT NAMED "liquidations", and the ticket's word is deliberately not
-- kept. 'collective' covers every collective proceeding — safeguard,
-- receivership, plan modifications — not only liquidation. Narrowing it would
-- mean reading bodacc_judgment.nature, free text carrying 79 distinct values of
-- which 19 are double-encoded duplicates (231 rows, DIAGNOSTIC.md §40), and one
-- of which — "Liste des créances nées après le jugement d'ouverture d'une
-- procédure de liquidation judiciaire" — contains the word without being a
-- liquidation. Classifying on that text is the gesture #61 refused for upstream
-- failures. The honest axis is the enum, and the column is named for what it
-- holds.
--
-- Quartier-scoped, so it takes NO radius: "son quartier" is the question, and a
-- radius answer to a quartier question is a different figure wearing its name.
-- It is therefore absent from arm E, whose population is p_radius_m — the same
-- reason compass_survival_by_trade is absent from it.
create function public.compass_sales_vs_collective(
  p_lat              double precision,
  p_lng              double precision,
  p_activity_vintage smallint default 2023
)
returns table (
  quartier_id     smallint,
  quartier_name   text,
  activity_niv18  smallint,
  activity_label  text,
  sales_n         bigint,
  collective_n    bigint,
  notices_n       bigint,
  sales_share     numeric,
  insufficient_n  boolean,
  out_of_corpus   boolean,
  withheld        boolean,
  licence         text,
  evidence        text
)
language plpgsql stable parallel safe security definer
set search_path = public, extensions
as $$
declare
  v_point       geography;
  v_quartier    smallint;
  v_quartier_nm text;
  v_vintage     smallint;
  v_withheld    boolean;
  v_licence     text;
  v_min         integer := public.compass_survival_min_cohort();
begin
  select v.id into v_vintage from public.bdcom_vintage v where v.year = p_activity_vintage;
  if v_vintage is null then
    raise exception 'unknown vintage year %', p_activity_vintage using errcode = '22023';
  end if;

  v_licence := public.compass_derived_licence(array[v_vintage]);
  v_point   := ST_MakePoint(p_lng, p_lat)::geography;

  select q.id, q.name into v_quartier, v_quartier_nm
  from public.quartier q
  where ST_Contains(q.geom::geometry, v_point::geometry)
  limit 1;

  -- Outside the 80 quartiers there is no share to speak of, and saying so is not
  -- the same as saying the share is zero. Same distinction as 20260825000003.
  if v_quartier is null then
    return query select
      null::smallint, null::text, null::smallint, null::text,
      null::bigint, null::bigint, null::bigint, null::numeric,
      false, true, false, v_licence,
      'Hors des 80 quartiers parisiens : aucun corpus d''avis ici. '
      'Ce n''est pas une part nulle.'::text;
    return;
  end if;

  select not (public.compass_caller_is_privileged() or v.publicly_redistributable)
    into v_withheld
  from public.bdcom_vintage v where v.id = v_vintage;

  if v_withheld then
    return query select
      v_quartier, v_quartier_nm, null::smallint, null::text,
      null::bigint, null::bigint, null::bigint, null::numeric,
      false, false, true, v_licence,
      format('Millésime %s non redistribuable : la licence APUR n''a pas été lue. '
             'Les avis viennent de BODACC et seraient servables ; leur '
             'rattachement à un MÉTIER vient de ce millésime-là. '
             'Millésime 2023 servable en le demandant.', p_activity_vintage);
    return;
  end if;

  return query
  with avis as materialized (
    select a.family, l.id as location_id
    from public.bodacc_establishment e
    join public.bodacc_announcement a on a.id = e.announcement_id
    join public.premise_location l
      on l.street_key = e.street_key and l.num = e.house_number_int
    where e.geom is not null and l.quartier_id = v_quartier
  ),
  par_metier as (
    select act.niv18, act.label_18,
           count(*) filter (where av.family = 'vente')::bigint      as ventes,
           count(*) filter (where av.family = 'collective')::bigint as collectives,
           count(*)::bigint                                         as total
    from avis av
    join public.premise_observation o
      on o.location_id = av.location_id and o.vintage_id = v_vintage
    join public.bdcom_activity act on act.code = o.activity_code
    group by act.niv18, act.label_18
  )
  select v_quartier, v_quartier_nm, m.niv18, m.label_18,
         m.ventes, m.collectives, m.total,
         case when m.total >= v_min then round(100.0 * m.ventes / m.total, 1) end,
         m.total < v_min, false, false, v_licence,
         case when m.total < v_min
           then format('%s avis, sous le seuil de publication de %s. Les '
                       'dénombrements sont servis, la part ne l''est pas : sur '
                       'cet effectif elle décrirait le hasard autant que le '
                       'quartier.', m.total, v_min)
           else format('Sur %s avis BODACC rattachés à un local « %s » de ce '
                       'quartier, %s sont des ventes de fonds et %s des '
                       'procédures collectives. « Collective » couvre TOUTE '
                       'procédure collective, pas seulement une liquidation : la '
                       'nature du jugement est du texte libre et n''est pas lue '
                       'ici. Un avis n''est pas un local — un même local peut en '
                       'porter plusieurs.',
                       m.total, m.label_18, m.ventes, m.collectives)
         end
  from par_metier m
  order by m.total desc, m.niv18;
end;
$$;

comment on function public.compass_sales_vs_collective is
  'Per quartier and per BDCom level-18 trade: goodwill sales against collective '
  'proceedings, with both counts and the share of sales. PLAN.md §6.5 — "la '
  'lecture qui distingue une rue qui se renouvelle d''une rue qui meurt". The '
  'axis is the bodacc_announcement.family enum, never the free-text judgment '
  'nature: "collective" therefore covers every collective proceeding and not '
  'only liquidation, which the evidence says on every row rather than letting a '
  'reader assume the narrower word. Counts notices, not premises: one premise '
  'may carry several. w6-analyse (#50).';

grant execute on function public.compass_sales_vs_collective(
  double precision, double precision, smallint
) to anon, authenticated;
