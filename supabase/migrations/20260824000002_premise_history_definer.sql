-- Correction to 20260824000001, six hours old: SECURITY INVOKER was the wrong
-- call, and 20260809000008 had written the reason down in advance.
--
-- 20260824000001 fixed the anonymous path and argued, in its own header, that
-- INVOKER was enough because "RLS alone is a complete enforcement and the
-- function only has to ANNOUNCE". That is true for an `anon` caller and false
-- for an `authenticated` one, because the two do not line up:
--
--   the RLS policy of 20260809000008   restricts `to anon, authenticated`
--   the caller test of 20260809000010  treats anything <> 'anon' as privileged
--
-- So a logged-in caller is told nothing is being withheld — `withheld = false`,
-- the claim test having judged them privileged — while RLS silently removes the
-- 2017 rows underneath. The join finds nothing and `observed` comes back FALSE.
--
-- Measured on the remote against 20260824000001 as deployed, premise 54652,
-- `60 QU ORFEVRES`, with `set local role authenticated` so RLS actually applies:
--
--   vintage 2017   withheld = false   observed = false   is_vacant = null
--
-- The premise was surveyed in 2017 and it was vacant. `withheld = false` is now
-- an explicit denial that anything is being held back, which is worse than the
-- silence it replaced: 20260824000001 made the anonymous path honest and left
-- the authenticated path asserting, with a marker actively vouching for it.
--
-- 20260809000008 described this exact failure before it happened, about the
-- sister function:
--
--   "compass_address_timeline is SECURITY INVOKER, so it obeys RLS. With the
--   policy above, a 2017 observation simply would not join — and the function
--   would emit `observed = false`, meaning 'this premise was not surveyed that
--   year'. That is false. [...] So the function becomes SECURITY DEFINER: it
--   sees every row and decides what to disclose."
--
-- That paragraph describes compass_premise_history word for word. The rule it
-- states is structural, and I18 in eval/invariants.sql now enforces it: a
-- `compass_*` function carrying an `observed` column MUST be SECURITY DEFINER,
-- because `observed` is the one column RLS can silently turn into a lie. The two
-- `_within` functions may stay INVOKER precisely because they have no such
-- column — what RLS costs them is rows, and their failure mode is silence.
--
-- Found by reading an uncommitted draft left in the worktree of the session that
-- discovered the defect, which had reached SECURITY DEFINER by this same route
-- and never landed. Its reasoning is kept here; its `coalesce(a.is_vacant,
-- false)` is not — that was the separate defect 20260824000001 fixed
-- (DIAGNOSTIC.md §11), and both corrections belong in the same function.
--
-- Return type unchanged. The drop is only because `create or replace` cannot
-- change a function's security mode.

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
language sql stable parallel safe security definer
set search_path = public, extensions
as $$
  with caller as (
    -- Copied verbatim from 20260809000011, 20260816000001 and 20260817000001 so
    -- the four functions cannot drift apart. Inside SECURITY DEFINER,
    -- `current_user` is the function owner rather than the caller — testing it
    -- always answers "privileged" and hides nothing, which is the defect
    -- 20260809000010 had to correct. A direct database connection carries no
    -- claim and is privileged by definition: it already holds the credentials.
    select coalesce(
             nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role',
             nullif(current_setting('request.jwt.claim.role', true), ''),
             'service_role'
           ) <> 'anon' as privileged
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

comment on function public.compass_premise_history is
  'What a premise was at each survey. Three points three years apart: anything '
  'that happened between two surveys is invisible, so a premise that turned over '
  'three times can read as stable. The interface must say so. SECURITY DEFINER '
  'so that a licence restriction is reported as withheld = true — a row saying '
  '"this vintage exists and cannot be shown" — instead of being answered with '
  'observed = false, which is an assertion about the world. RLS could not do this '
  'job: it restricts anon AND authenticated, while the caller test treats '
  'authenticated as privileged, so an invoker version lied to logged-in callers. '
  'observed = false means unsurveyed, observed = null means withheld, and '
  'is_vacant is null unless the premise was actually observed.';

grant execute on function public.compass_premise_history(bigint) to anon, authenticated;
