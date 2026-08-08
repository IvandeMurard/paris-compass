-- House numbers are not integers, and one query assumed they were.
--
-- BODACC publishes ranges and suffixes: "116-118", "12-16", "12 bis". The
-- loader guarded against that with a numeric test before casting, but
-- compass_bodacc_within did not — it cast the raw string and raised
-- `invalid input syntax for type integer: "116-118"` as soon as such a row fell
-- inside the radius. A guard applied in one place and forgotten in another is
-- the argument for computing the value once, in the table.
--
-- The leading number is taken: "116-118" is a premise spanning both numbers and
-- BDCom lists it under one of them, so 116 is the useful key rather than a
-- discarded row. Four digits at most — Paris house numbers stop well below that,
-- and an unbounded match would let malformed data overflow the cast.

alter table public.bodacc_establishment
  add column house_number_int integer generated always as (
    nullif(substring(house_number from '^[0-9]{1,4}'), '')::integer
  ) stored;

comment on column public.bodacc_establishment.house_number_int is
  'Leading number of house_number, for joining to premise_location.num. Null '
  'when the field starts with no digit. A range keeps its first number; the '
  'verbatim string stays in house_number.';

drop index if exists public.bodacc_establishment_address_idx;
create index bodacc_establishment_address_idx
  on public.bodacc_establishment (street_key, house_number_int);


-- Same function as 20260809000001, with the unguarded cast replaced by the
-- generated column, plus `address_source` on the output so a caller can tell an
-- establishment address from a registered office.
--
-- Dropped rather than replaced: `create or replace` cannot change a function's
-- output columns, and adding one to the RETURNS TABLE is exactly that.
drop function if exists public.compass_bodacc_within(
  double precision, double precision, double precision,
  public.bodacc_family, date, integer);

create function public.compass_bodacc_within(
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
begin
  if p_radius_m is null or p_radius_m <= 0 or p_radius_m > public.compass_max_radius_m() then
    raise exception 'p_radius_m must be between 1 and % (got %)',
      public.compass_max_radius_m(), p_radius_m using errcode = '22023';
  end if;

  v_point := ST_MakePoint(p_lng, p_lat)::geography;

  return query
  with hit as (
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
      ST_Distance(e.geom, v_point)                     as distance_m,
      matched.n::integer                               as premises_at_address,
      case when matched.n = 1 then matched.only_id end as location_id,
      a.url                                            as url
    from public.bodacc_establishment e
    join public.bodacc_announcement a on a.id = e.announcement_id
    left join public.bodacc_judgment j on j.announcement_id = a.id
    cross join lateral (
      select count(*) as n, min(l.id) as only_id
      from public.premise_location l
      where l.street_key = e.street_key
        and l.num = e.house_number_int
    ) matched
    where e.geom is not null
      and ST_DWithin(e.geom, v_point, p_radius_m)
      and (p_family is null or a.family = p_family)
      and (p_since is null or a.published_on >= p_since)
  )
  select h.announcement_id, h.family, h.notice_type, h.published_on, h.trader_name,
         h.activity, h.price_eur, h.origin_raw, h.judgment_nature, h.address,
         h.address_source, h.distance_m, h.premises_at_address, h.location_id, h.url,
         (select count(*) from hit)
  from hit h
  order by h.published_on desc, h.distance_m
  limit greatest(coalesce(p_limit, 200), 1);
end;
$$;

comment on function public.compass_bodacc_within is
  'Goodwill sales and insolvency notices around a point. Prices are parsed from '
  'a French sentence kept verbatim in `origin_raw` — show the sentence next to '
  'the number. `address_source` says whether the address is the establishment '
  'sold or merely the company''s registered office. `location_id` is null when '
  'several BDCom premises share the address, because BODACC does not say which '
  'shopfront.';

grant execute on function
  public.compass_bodacc_within(double precision, double precision, double precision,
                               public.bodacc_family, date, integer)
to anon, authenticated;
