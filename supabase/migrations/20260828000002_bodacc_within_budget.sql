-- The same defect as 20260828000001, in the function that wears it worse — found by measuring
-- issue #62 rather than by reading, and fixed here rather than opened as a ticket because the
-- budget arm that ships with #62 would otherwise ship red, and a gate that is red on arrival
-- is not a gate.
--
-- WHAT WAS MEASURED. At 2 000 m over Chatelet — the maximum radius `compass_max_radius_m()`
-- promises — `compass_bodacc_within` touched 361 965 buffers and took 1 108 ms warm, 9 331 ms
-- on the first call of a session. That is 1.9x the map query this ticket is named after, and
-- three times the whole anon window. `anon` may execute it. Measured 2026-08-27 on
-- dbefhvmyfmmhjeetdddu, `explain (analyze, buffers)`.
--
-- WHY. Identical shape: one `hit` CTE carrying every output column for every notice in the
-- radius, `(select count(*) from hit)` for `total_matched`, then `limit`. The limit limited
-- nothing. Worse here than in the map query, because `hit` also ran a correlated
-- `count(*) over premise_location` per notice — the `premises_at_address` lateral — for
-- notices no caller would ever see.
--
-- WHY THE COUNT CANNOT MOVE. `total_matched` is displayed, so it must keep its value across
-- the change. The counted set stays `bodacc_establishment` joined to `bodacc_announcement`
-- under the same predicates. What leaves it is the lateral, which returns exactly one row by
-- construction, and the left join to `bodacc_judgment` — whose `announcement_id` is its
-- PRIMARY KEY (`bodacc_judgment_pkey`), so it can neither add nor remove a row. Verified in
-- the catalogue, not assumed: 120 623 judgments for 120 623 distinct announcements.
--
-- THE ORDER GAINS A TIEBREAKER, for the reason set out in 20260828000001 and applied here for
-- the same reason: `published_on desc, distance_m` does not determine which notices come back
-- when the limit falls inside a tie, and notices published the same day at the same distance
-- are common. The old body picked arbitrarily; restructuring would have made it pick
-- differently, which is a change of answer arriving as a side effect. Sorting on
-- `establishment_id` last makes the order total, so the same call answers the same notices
-- twice — which it never promised before.

create or replace function public.compass_bodacc_within(
  p_lat      double precision,
  p_lng      double precision,
  p_radius_m double precision default 400,
  p_family   public.bodacc_family default null,
  p_since    date default null,
  p_limit    integer default 200
)
returns table (
  announcement_id     text,
  family              public.bodacc_family,
  notice_type         text,
  published_on        date,
  trader_name         text,
  activity            text,
  price_eur           numeric,
  origin_raw          text,
  judgment_nature     text,
  address             text,
  address_source      text,
  distance_m          double precision,
  premises_at_address integer,
  location_id         bigint,
  url                 text,
  total_matched       bigint
)
language plpgsql stable parallel safe security invoker
set search_path = public, extensions
as $$
declare
  v_point geography;
  v_limit integer;
begin
  if p_radius_m is null or p_radius_m <= 0 or p_radius_m > public.compass_max_radius_m() then
    raise exception 'p_radius_m must be between 1 and % (got %)',
      public.compass_max_radius_m(), p_radius_m using errcode = '22023';
  end if;

  v_point := ST_MakePoint(p_lng, p_lat)::geography;
  v_limit := greatest(coalesce(p_limit, 200), 1);

  return query
  -- The counted set: one identity and the two sort keys. Every predicate that decides
  -- whether a notice belongs in the radius stays here; nothing that only decides how it is
  -- displayed does.
  with hit as (
    select e.id           as establishment_id,
           a.published_on as published_on,
           ST_Distance(e.geom, v_point) as distance_m
    from public.bodacc_establishment e
    join public.bodacc_announcement a on a.id = e.announcement_id
    where e.geom is not null
      and ST_DWithin(e.geom, v_point, p_radius_m)
      and (p_family is null or a.family = p_family)
      and (p_since is null or a.published_on >= p_since)
  ),
  top as (
    select h.establishment_id, h.published_on, h.distance_m
    from hit h
    -- Total order — see the header.
    order by h.published_on desc, h.distance_m, h.establishment_id
    limit v_limit
  )
  select
    a.id                                             as announcement_id,
    a.family                                         as family,
    a.notice_type                                    as notice_type,
    a.published_on                                   as published_on,
    a.trader_name                                    as trader_name,
    e.activity                                       as activity,
    e.price_eur                                      as price_eur,
    e.origin_raw                                     as origin_raw,
    j.nature                                         as judgment_nature,
    trim(concat_ws(' ', e.house_number, e.way_type, e.way_name)) as address,
    e.address_source                                 as address_source,
    t.distance_m                                     as distance_m,
    matched.n::integer                               as premises_at_address,
    case when matched.n = 1 then matched.only_id end as location_id,
    a.url                                            as url,
    (select count(*) from hit)                       as total_matched
  from top t
  join public.bodacc_establishment e on e.id = t.establishment_id
  join public.bodacc_announcement  a on a.id = e.announcement_id
  left join public.bodacc_judgment j on j.announcement_id = a.id
  cross join lateral (
    select count(*) as n, min(l.id) as only_id
    from public.premise_location l
    where l.street_key = e.street_key
      and l.num = e.house_number_int
  ) matched
  order by t.published_on desc, t.distance_m, t.establishment_id;
end;
$$;

comment on function public.compass_bodacc_within is
  'Goodwill sales and insolvency notices around a point. Prices are parsed from '
  'a French sentence kept verbatim in `origin_raw` — show the sentence next to '
  'the number. `address_source` says whether the address is the establishment '
  'sold or merely the company''s registered office. `location_id` is null when '
  'several BDCom premises share the address, because BODACC does not say which '
  'shopfront. `total_matched` is counted over the notices in the radius alone; '
  'the labels, the judgment and the count of premises at the address are fetched '
  'only for the rows the limit keeps (issue #62).';
