-- The two remaining radius functions stop paying a per-row price for two tiny lookup
-- tables, and stop going to the heap for one column — issue #64. Same answers, same
-- counts, a third of the work.
--
-- WHAT WAS WRONG, AND IT IS NOT WHAT #62 FIXED. Neither function materialises a CTE it
-- then throws away; `compass_scoring_context_within` really does return one row per
-- premise, and `compass_street_rotation` really does need three vintages to compute
-- `changed_since_previous`. What they were paying for is narrower, and it was invisible
-- until the plan was read the way production sees it.
--
-- READING THE PLAN THE WAY PRODUCTION SEES IT. `eval/baselines/anon-budget.json` said
-- both functions "bascule entre deux plans d'un passage à l'autre" — 103 278 or 137 576
-- pages here, 152 012 or 286 744 there — and treated the swing as luck. It is not luck.
-- These are plpgsql functions, so their statements go through the plan cache, and the
-- two values are the CUSTOM plan and the GENERIC plan. Measured 2026-08-28 on
-- dbefhvmyfmmhjeetdddu with `plan_cache_mode` forced each way, six runs each, the split
-- is exact and repeatable:
--
--     compass_street_rotation           custom 151 778 pages   generic 286 710
--     compass_scoring_context_within    custom 103 241 pages   generic 137 576
--
-- and `auto` — production — takes the GENERIC plan on every run. So the cheap number in
-- the baseline was never the one a visitor pays, and a body measured as a bare SQL
-- statement (which is planned custom) understates its own function by a factor of two.
-- Every figure below is the generic plan.
--
-- WHAT THE GENERIC PLAN WAS DOING. Because `p_radius_m` is unknown at plan time,
-- ST_DWithin is estimated at 5 rows against 23 909 actual, and the planner puts a
-- nested loop everywhere. Two of those loops probe tables small enough to be read once:
--
--     Index Scan bdcom_activity_pkey    64 147 loops   128 294 pages  -- a 222-row table
--     Index Scan street_segment_pkey     2 689 loops     8 067 pages  -- 25 094 rows
--
-- 136 361 pages, 48 % of `compass_street_rotation`'s total, spent looking up a table of
-- two hundred and twenty-two rows one row at a time. `bdcom_activity` is eleven pages.
-- The same probe costs `compass_scoring_context_within` 34 346 pages over 17 173 loops.
--
-- WHAT CHANGES, AND WHY IT IS NOT A PLANNER LEVER. The two lookup tables move into
-- `materialized` CTEs. That is a fence, not a hint: it fixes when the table is read, and
-- the join downstream reads a tuplestore instead of descending a btree once per row. No
-- `plan_cache_mode`, no `enable_*`, nothing that depends on the planner agreeing.
--
-- WHY THE COUNTS CANNOT MOVE, and they are displayed figures — `premises`, `vacant`,
-- `changed_since_previous`, `total_matched` — so this had to be argued before it was
-- measured. Structurally: `bdcom_activity.code` and `street_segment.id` are PRIMARY
-- KEYS, confirmed in pg_constraint. Both joins are LEFT joins on those keys, and a left
-- join on a unique key can neither add nor remove a row. A `materialized` CTE changes
-- when a table is read, never which rows it holds: `select code, is_vacant,
-- in_retail_scope from bdcom_activity` is the whole table. So the join's cardinality and
-- its matched values are identical by construction. Measured as well, old body beside
-- new — see DIAGNOSTIC.md §28.
--
-- WHY THE INDEX GAINS activity_code. `20260828000001` made this index covering for
-- `compass_premises_within`, which needs (location_id, vintage_id, id). Both functions
-- here need `activity_code` from the same rows, which the include did not carry — so
-- their per-location probe went to the heap on every one of 23 909 loops and stayed a
-- plain Index Scan. Widening the include makes it an Index Only Scan with
-- Heap Fetches: 0, worth 64 120 pages to `compass_street_rotation` and 17 172 to
-- `compass_scoring_context_within`. The cost was measured rather than assumed, because
-- #64 asked for exactly that: the index goes from 1 132 to 1 385 pages, +253 pages and
-- +2.0 MB on 228 275 rows. Same leading columns, so no access path is lost and there is
-- no second index to keep in step.
--
-- WHAT THIS BUYS, generic plan, Chatelet, 2 000 m, anon claim, parallelism off:
--
--     compass_street_rotation           286 710 -> 87 624 pages   -69 %
--     compass_scoring_context_within    137 521 -> 86 014 pages   -37 %
--
-- `compass_street_rotation` was the most expensive of the four radius functions by three
-- times; it is now the cheapest. What is NOT fixed: both still descend the observation
-- index once per location — 71 952 and 71 728 pages — because the ST_DWithin estimate is
-- wrong by a factor of 4 800 and pushes a nested loop. A hash join would bound that side
-- to the 4 515 pages `premise_observation` makes in full. DIAGNOSTIC.md §27 already named
-- it, it still needs a planner lever nobody has, and it is still not done here.

-- Carries activity_code so the per-location probe of BOTH functions below is an Index
-- Only Scan. Replaced rather than added: same leading columns as 20260828000001.
drop index if exists public.premise_observation_location_idx;
create index premise_observation_location_idx
  on public.premise_observation (location_id, vintage_id) include (id, activity_code);

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
  vintage_scope          bdcom_scope,
  premises               bigint,
  vacant                 bigint,
  changed_since_previous bigint,
  withheld               boolean
)
language plpgsql
stable
parallel safe
security definer
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
  -- Read once, not once per row. Under the generic plan these two were probed by primary
  -- key 64 147 and 2 689 times, for 136 361 pages — 48 % of this function. `materialized`
  -- is a fence rather than a hint: it fixes when the table is read, and the whole table is
  -- read either way, so no row can appear or disappear.
  with act as materialized (
    select a.code, a.is_vacant, a.in_retail_scope
    from public.bdcom_activity a
  ),
  seg as materialized (
    select s.id, s.name
    from public.street_segment s
  ),
  vintage as (
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
    left join act a                   on a.code = o.activity_code
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
    left join seg s on s.id = ob.street_segment_id
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

create or replace function public.compass_scoring_context_within(
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
  withheld      boolean,
  out_of_corpus boolean
)
language plpgsql
stable
parallel safe
security definer
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
end;
$$;
