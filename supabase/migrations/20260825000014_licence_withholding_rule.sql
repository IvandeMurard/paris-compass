-- w0-retenue (#57) — the licence rule stops being a habit and becomes a check.
--
-- The rule has existed since 9 August: a function that traverses
-- premise_observation must null its own content on a withheld vintage, announce
-- the withholding, and never rely on RLS to have done it. It has been written by
-- hand four times — I9/I10, I12/I13, I14/I15, I16/I17 — once per function, and a
-- fifth function was born wrong and found by accident (DIAGNOSTIC.md §19).
--
-- This migration corrects the fifth AND makes the rule enumerable: I23 in
-- eval/invariants.sql now derives the population from pg_proc instead of from a
-- list somebody remembered to update. Enumerating it convicted two more
-- functions that a previous session had explicitly cleared.
--
-- ---------------------------------------------------------------------------
-- 1. The two `_within` functions were exempted for a reason that does not hold
-- ---------------------------------------------------------------------------
-- 20260824000002 wrote: "Les deux fonctions `_within` restent INVOKER
-- légitimement : elles n'ont pas de colonne `observed`, donc RLS leur coûte des
-- lignes et non la vérité." The exemption was measured to be false on
-- 2026-08-25, Halles (48.86229 / 2.34490), 800 m, vintage 2017, with
-- `set local role authenticated` so RLS actually applies:
--
--   caller                          rows   total_matched   withheld
--   privileged                      4773   4773            false
--   anon          (claim + role)       1   null            TRUE
--   authenticated (claim + role)       0   null            null
--
-- Zero rows and no marker — the exact defect of DIAGNOSTIC.md §9, alive for
-- logged-in callers, on both functions. The two rules still disagree the way
-- 20260824000002 described:
--
--   the RLS policy of 20260809000008   restricts `to anon, authenticated`
--   the caller test of 20260809000010  treats anything <> 'anon' as privileged
--
-- so an INVOKER function tells an `authenticated` caller that nothing is
-- withheld while RLS empties the join underneath. `observed` was never the
-- criterion — it was the shape the defect happened to take in August. The
-- criterion is reading a table whose RLS can silently remove rows.
--
-- SECURITY DEFINER does not widen what an `authenticated` caller may see: the
-- same caller already receives full 2017 content from compass_address_timeline,
-- compass_premise_history and compass_survival_by_trade, all three DEFINER
-- (measured 2026-08-25, premise 54652: `observed = true, is_vacant = true,
-- Locaux Vacants`). Whether `authenticated` should be privileged at all is a
-- doctrine question that predates this migration and is named in DIAGNOSTIC.md
-- §21 rather than settled here.
--
-- ALTER rather than drop-and-create: the bodies are correct, only the security
-- mode is wrong, and re-pasting a 40-column function to change one keyword is
-- how two versions start to drift.

alter function public.compass_scoring_context_within(
  double precision, double precision, double precision, smallint
) security definer;

alter function public.compass_premises_within(
  double precision, double precision, double precision, smallint, integer
) security definer;


-- ---------------------------------------------------------------------------
-- 2. compass_street_rotation — the fifth victim, and a sixth defect underneath
-- ---------------------------------------------------------------------------
-- Measured 2026-08-25 on the remote, Halles quartier centroid (48.86229 /
-- 2.34490), 300 m, retail scope, summed over the 98 segments in radius:
--
--   caller                       2017          2020           2023
--   privileged                   660 / chg 0   631 / chg 76   619 / chg 81
--   anon (claim only)            660 / chg 0   631 / chg 76   619 / chg 81
--   anon (claim + set role)      —             —              619 / chg 0
--
-- Three things in that table, and only the first was known.
--
-- (a) THE DEFECT OF §19. A real anonymous caller loses 2017 and 2020 to RLS, the
--     `lag()` has nothing left to compare against, and the function answers
--     `changed_since_previous = 0` — "this street did not turn over" — where the
--     measured truth is 81. Nothing is null; every column carries a plausible
--     number. Zero is a positive answer, and here it is manufactured by a licence.
--
-- (b) THE SECOND ROW OF THAT TABLE IS WHY THE DEFECT SURVIVED. Arm A impersonates
--     `anon` through `request.jwt.claims` only. This function never read the
--     claim, so arm A saw the privileged answer and nothing looked wrong — the
--     same blind spot that hid compass_premise_history for fifteen days
--     (DIAGNOSTIC.md §10). Reading the claim is therefore not decoration: it is
--     what makes the function testable by the gate at all.
--
-- (c) `chg 0` ON 2017, ON THE PRIVILEGED PATH. 2017 is the first vintage; there
--     is no previous survey to have changed from. `count(*) filter (where
--     previous_code is not null and ...)` counts zero rows and reports 0, which
--     reads as "nothing changed" rather than "there is nothing to compare".
--     Same family as DIAGNOSTIC.md §11's `coalesce(is_vacant, false)`: an
--     absence rendered as a measurement. True since 20260808000005, and visible
--     without any licence involved.
--
-- So `changed_since_previous` is now NULL whenever the comparison cannot be
-- made — no previous vintage, or a previous vintage this caller may not see —
-- and a bigint column that was never null becomes nullable by design.
--
-- The withheld vintages come back as ONE marker row each, carrying only what
-- compass_vintages() already publishes to anon (year, scope). Never one row per
-- segment: saying "this segment had a 2017 survey we cannot show you" discloses
-- which segments the withheld vintage contains, one row at a time — the leak
-- 20260809000011 had to close on the sister function.
--
-- Return type changes, so drop and create. No caller to break: neither src/ nor
-- mcp-server/ nor scripts/ reference this function (re-verified 2026-08-25), and
-- it is `grant execute ... to anon` since 20260808000005, so it answers over
-- PostgREST to any agent today.

drop function if exists public.compass_street_rotation(
  double precision, double precision, double precision, boolean);

create function public.compass_street_rotation(
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
$$;

comment on function public.compass_street_rotation is
  'Per segment and per vintage: premises, vacant, and how many changed activity '
  'since the previous survey. Defaults to the scope common to all three '
  'vintages, where counts are comparable but vacancy is structurally zero; pass '
  'p_retail_scope_only => false for vacancy, and then compare 2017 to 2020 only. '
  'SECURITY DEFINER so that a withheld vintage comes back as one marker row '
  'rather than vanishing and leaving lag() to report changed_since_previous = 0, '
  'which is an assertion — DIAGNOSTIC.md §19. changed_since_previous is null '
  'whenever the comparison cannot be made: no previous vintage, or a previous '
  'vintage this caller may not see. Zero means measured zero.';

grant execute on function
  public.compass_street_rotation(double precision, double precision, double precision, boolean)
to anon, authenticated;
