-- The fourth function carrying the licence rule, and the only one that answered
-- with a fabricated fact rather than a silence.
--
-- 20260809000011 fixed compass_address_timeline, 20260816000001
-- compass_scoring_context_within, 20260817000001 compass_premises_within. All
-- three failed the same way: a withheld vintage came back as zero rows, which is
-- byte for byte what a genuinely empty answer looks like. Ambiguous, and bad
-- enough. compass_premise_history was never looked at, and it is worse: it
-- returns one row per vintage whether or not an observation was found, so RLS
-- removing the row does not remove the row from the ANSWER. It fills the gap
-- with defaults.
--
-- Measured on the remote 2026-08-24, premise 54652, `60 QU ORFEVRES`, vintage
-- 2017 — privileged connection against a real anonymous PostgREST call:
--
--   privileged   observed = true    is_vacant = true    'Locaux Vacants'
--   anonymous    observed = false   is_vacant = false   null
--
-- That premise WAS vacant in 2017. A visitor without a key is told it was not
-- surveyed that year, AND that it was not vacant. Two statements manufactured out
-- of a licence nobody has read, on the one column the product is about.
--
-- Zero rows is a silence: a caller may decline to conclude from it. `false` is an
-- answer, indistinguishable from a real survey, and no caller can be suspicious of
-- it. Hence DIAGNOSTIC.md §10 calling this the hardest form of §9.
--
-- WHAT CHANGES
--
-- 1. A `withheld` column, next to `observed` as in compass_address_timeline —
--    the closest sibling, since both return one row per vintage for one premise.
-- 2. `observed` is null, never false, when the vintage is withheld. Not "we did
--    not see it": "we cannot tell you". Same wording as 20260809000011.
-- 3. Every content column is nulled explicitly on a withheld row, rather than
--    left to come back empty from the join. RLS is what ENFORCES the rule and
--    that does not change — but arm A of the eval gate impersonates `anon` by
--    setting request.jwt.claims on a PRIVILEGED connection, where RLS does not
--    apply. Without the explicit nulling that arm would read real 2017 content
--    sitting on a row marked withheld, and I16 would catch the function lying in
--    the other direction.
-- 4. `is_vacant` is null whenever the premise was not observed, withheld or not.
--    `coalesce(a.is_vacant, false)` asserted "was not vacant" about every vintage
--    where the premise does not appear — 24 573 premises are absent from the 2023
--    retail-only vintage alone (measured 2026-08-24), and every one of them was
--    told it was not vacant that year. Same fabrication as the licence one, on the
--    same column, and reachable by the privileged path too. Fixing one and not the
--    other would have written the inconsistency into the schema. DIAGNOSTIC.md §11.
-- 5. `changed_from_previous` guards against a null `observed` instead of a false
--    one. `not null` is null, the CASE arm would not fire, and the fallthrough
--    compared two nulls with IS DISTINCT FROM — which is false, not null. A
--    withheld row would have claimed "nothing changed here".
--
-- SECURITY INVOKER is kept deliberately. compass_address_timeline had to become
-- DEFINER because it joins BODACC rows a visitor may read to survey rows they may
-- not; this function reads premise_observation and nothing else, so RLS alone is
-- a complete enforcement and the function only has to ANNOUNCE. Same division as
-- 20260817000001: RLS enforces, the return type reports.
--
-- Return-type change, so drop first: `create or replace` cannot add a column.

drop function if exists public.compass_premise_history(bigint);

create function public.compass_premise_history(p_location_id bigint)
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
language sql stable parallel safe security invoker
set search_path = public, extensions
as $$
  with caller as (
    -- Same caller test as 20260809000011, 20260816000001 and 20260817000001,
    -- copied rather than adapted so the four functions cannot drift apart. A
    -- direct database connection carries no PostgREST claim and is privileged by
    -- definition: it already holds the credentials.
    select coalesce(
             nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role',
             nullif(current_setting('request.jwt.claim.role', true), ''),
             'service_role'
           ) <> 'anon' as privileged
  ),
  vintage as (
    select v.id, v.year, v.scope, v.as_of,
           not (c.privileged or v.publicly_redistributable) as withheld
    from public.bdcom_vintage v
    cross join caller c
  ),
  timeline as (
    select
      vi.year     as vintage_year,
      vi.scope    as vintage_scope,
      vi.as_of    as as_of,
      vi.withheld as withheld,
      -- Null, not false, when withheld: we are not saying it was unobserved, we
      -- are saying we cannot tell you. `observed = false` still means unsurveyed.
      case when vi.withheld then null else o.id is not null end as observed,
      case when vi.withheld then null else o.activity_code end  as activity_code,
      case when vi.withheld then null else a.label end          as activity_label,
      case when vi.withheld then null else a.label_18 end       as activity_group,
      -- Absence is not a measurement of vacancy, and a licence is not one either.
      case when vi.withheld or o.id is null then null
           else coalesce(a.is_vacant, false) end                as is_vacant,
      case when vi.withheld then null else sb.label end         as size_label,
      case when vi.withheld then null else o.sign_name end      as sign_name,
      case when vi.withheld then null else o.match_method end   as match_method,
      lag(case when vi.withheld then null else o.activity_code end)
        over (order by vi.year)                                 as previous_code,
      lag(case when vi.withheld then null else o.id is not null end)
        over (order by vi.year)                                 as previously_observed
    from vintage vi
    left join public.premise_observation o
      on o.vintage_id = vi.id and o.location_id = p_location_id
    left join public.bdcom_activity  a  on a.code = o.activity_code
    left join public.bdcom_size_band sb on sb.code = o.size_band
  )
  select t.vintage_year, t.vintage_scope, t.as_of, t.observed, t.withheld,
         t.activity_code, t.activity_label, t.activity_group, t.is_vacant,
         t.size_label, t.sign_name, t.match_method,
         -- Null whenever either side is unobserved OR withheld, never `true` and
         -- never `false`. A premise missing from 2023 may have changed, or may
         -- simply have fallen outside a retail-only publication; the data cannot
         -- tell those apart, so the disappearance is reported through `observed`
         -- + `vintage_scope` and the reading is left to the core. `coalesce` on
         -- both sides is what keeps a withheld neighbour from falling through to
         -- `null is distinct from null` — which is false, an assertion of
         -- stability drawn from a licence.
         case
           when not coalesce(t.previously_observed, false) then null
           when not coalesce(t.observed, false) then null
           else t.activity_code is distinct from t.previous_code
         end
  from timeline t
  order by t.vintage_year;
$$;

comment on function public.compass_premise_history is
  'What a premise was at each survey. Three points three years apart: anything '
  'that happened between two surveys is invisible, so a premise that turned over '
  'three times can read as stable. The interface must say so. A vintage the '
  'caller may not receive keeps its row — one row per vintage is the point — with '
  'withheld = true and no content: observed = false means unsurveyed, observed = '
  'null means withheld, and is_vacant is null unless the premise was actually '
  'observed. Never read a null on this row as a fact about the premise.';

grant execute on function public.compass_premise_history(bigint) to anon, authenticated;
