CREATE OR REPLACE FUNCTION public.compass_premise_history(p_location_id bigint)
 RETURNS TABLE(vintage_year smallint, vintage_scope bdcom_scope, as_of text, observed boolean, withheld boolean, activity_code text, activity_label text, activity_group text, is_vacant boolean, size_label text, sign_name text, match_method bdcom_match_method, changed_from_previous boolean)
 LANGUAGE sql
 STABLE PARALLEL SAFE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
$function$
