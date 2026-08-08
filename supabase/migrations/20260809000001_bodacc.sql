-- BODACC: goodwill sales with their price, and insolvency proceedings.
--
-- Two things BDCom structurally cannot say, and this can.
--
-- BDCom is a snapshot every three years, so anything between two surveys is
-- invisible — a premise that went bakery -> vacant -> barber reads as
-- bakery -> barber. BODACC is a journal with dates, so it fills the gap.
--
-- And BDCom sees a change of *activity*, never a change of *owner*: a baker
-- selling to another baker leaves the activity code untouched. Those are
-- different events with different frequencies, and conflating them is how a
-- "seven years before resale" figure gets compared to a turnover rate it has
-- nothing to do with.

create type public.bodacc_family as enum ('vente', 'collective');

create table public.bodacc_announcement (
  id           text primary key,
  family       public.bodacc_family not null,
  -- annonce | rectificatif | annulation. A cancelled notice is kept rather than
  -- deleted: the fact that an announcement was withdrawn is itself information,
  -- and silently dropping it would make a re-run non-reproducible.
  notice_type  text not null,
  published_on date not null,
  siren        text,
  trader_name  text,
  tribunal     text,
  url          text
);

create index bodacc_announcement_published_idx on public.bodacc_announcement (published_on);
create index bodacc_announcement_siren_idx on public.bodacc_announcement (siren);


create table public.bodacc_establishment (
  id              bigint generated always as identity primary key,
  announcement_id text not null references public.bodacc_announcement(id) on delete cascade,

  -- Address as published, structured at source: numeroVoie / typeVoie / nomVoie.
  house_number    text,
  way_type        text,
  way_name        text,
  postcode        text,
  arrondissement  smallint,
  -- Same function as premise_location.street_key, so BODACC's "rue"/"Saint-Maur"
  -- and BDCom's "RUE"/"SAINT MAUR" resolve to one value. Never re-implement it.
  street_key      text generated always as (
                    public.compass_street_key(way_type, way_name)
                  ) stored,

  activity        text,

  -- The price is published inside a French sentence — "Fonds acquis par achat au
  -- prix stipulé de 170000,00 euros." — so it has to be parsed out. The verbatim
  -- sentence is kept beside the number: a figure extracted by a regular
  -- expression is exactly the kind that must remain checkable against its
  -- source, and `price_source` says which pattern produced it.
  origin_raw      text,
  price_eur       numeric(12, 2),
  price_source    text check (price_source is null or price_source in ('origine_fonds')),

  -- Filled at attachment from the BDCom premises sharing this address. Null when
  -- the address is not in BDCom at all — an office, a head office, a premise
  -- above ground floor.
  geom            extensions.geography(Point, 4326)
);

create index bodacc_establishment_announcement_idx on public.bodacc_establishment (announcement_id);
create index bodacc_establishment_address_idx on public.bodacc_establishment (street_key, house_number);
create index bodacc_establishment_geom_idx on public.bodacc_establishment using gist (geom);

comment on column public.bodacc_establishment.geom is
  'Borrowed from the BDCom premises at the same address — BODACC publishes no '
  'coordinates. Present only so a radius query is indexable; it locates the '
  'address, not the shopfront.';


create table public.bodacc_judgment (
  announcement_id text primary key references public.bodacc_announcement(id) on delete cascade,
  family          text,
  nature          text,
  judged_on       date
);

comment on table public.bodacc_judgment is
  'The court decision behind a `collective` notice — "Jugement de conversion en '
  'liquidation judiciaire" and the like. What separates a business that failed '
  'from one that was simply sold.';


-- Join support on the BDCom side.
create index premise_location_street_num_idx on public.premise_location (street_key, num);


alter table public.bodacc_announcement   enable row level security;
alter table public.bodacc_establishment  enable row level security;
alter table public.bodacc_judgment       enable row level security;

create policy "bodacc_announcement is publicly readable"
  on public.bodacc_announcement for select to anon, authenticated using (true);
create policy "bodacc_establishment is publicly readable"
  on public.bodacc_establishment for select to anon, authenticated using (true);
create policy "bodacc_judgment is publicly readable"
  on public.bodacc_judgment for select to anon, authenticated using (true);


-- ---------------------------------------------------------------------------
-- Reading BODACC near a point
-- ---------------------------------------------------------------------------
-- BODACC identifies an address; BDCom identifies a premise, and up to 120 of
-- them share one address. So the link is address-level, and the function says so
-- rather than picking a shopfront: `location_id` is filled only when exactly one
-- BDCom premise sits at that address, and `premises_at_address` lets the
-- interface write "one of the 6 premises at this address" instead of implying
-- it knows which.
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
        and l.num is not distinct from nullif(e.house_number, '')::integer
    ) matched
    where e.geom is not null
      and ST_DWithin(e.geom, v_point, p_radius_m)
      and (p_family is null or a.family = p_family)
      and (p_since is null or a.published_on >= p_since)
  )
  select h.announcement_id, h.family, h.notice_type, h.published_on, h.trader_name,
         h.activity, h.price_eur, h.origin_raw, h.judgment_nature, h.address,
         h.distance_m, h.premises_at_address, h.location_id, h.url,
         (select count(*) from hit)
  from hit h
  order by h.published_on desc, h.distance_m
  limit greatest(coalesce(p_limit, 200), 1);
end;
$$;

comment on function public.compass_bodacc_within is
  'Goodwill sales and insolvency notices around a point. Prices are parsed from '
  'a French sentence kept verbatim in `origin_raw` — show the sentence next to '
  'the number. `location_id` is null when several BDCom premises share the '
  'address, because BODACC does not say which shopfront.';

grant execute on function
  public.compass_bodacc_within(double precision, double precision, double precision,
                               public.bodacc_family, date, integer)
to anon, authenticated;
