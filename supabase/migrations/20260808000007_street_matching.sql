-- Attaching a premise to its street segment.
--
-- The naive approach is nearest-segment, and it is wrong at corners: a premise
-- at 1 rue de Rivoli is often physically closer to the perpendicular street it
-- faces than to the centreline of its own. So the match is by street name first,
-- and geometry only decides *which segment of that street*.
--
-- Both sides carry the same key, computed by the same function, so they cannot
-- drift the way two hand-written expressions would.

-- Normalisation is deliberately minimal. Both sources publish upper-case,
-- unaccented labels (`SAINT-HONORE`, never `Saint-Honoré`), so only the
-- separators differ: the street register writes `SAINT-GERMAIN` where BDCom
-- writes `SAINT GERMAIN`. Folding accents as well would be dead code pretending
-- to handle a case that does not occur.
create or replace function public.compass_street_key(p_way_type text, p_name text)
returns text
language sql immutable parallel safe
as $$
  select nullif(
    trim(regexp_replace(
      upper(
        coalesce(p_way_type, '') || ' ' ||
        translate(coalesce(p_name, ''), '-''’', '   ')
      ),
      '\s+', ' ', 'g')),
    '')
$$;

comment on function public.compass_street_key is
  'Join key between BDCom street labels and the city street register. Used by '
  'both sides — never re-implement it inline.';


alter table public.street_segment
  add column voie_id    bigint,
  add column street_key text;

comment on column public.street_segment.voie_id is
  'Street this segment belongs to (n_sq_vo in the city register). A street has '
  'many segments; a segment ends at an intersection.';

create index street_segment_key_idx on public.street_segment (street_key);


alter table public.premise_location
  add column street_key text generated always as (
    public.compass_street_key(typ_voie, lib_voie)
  ) stored,
  add column street_match text
    check (street_match is null or street_match in ('name', 'spatial'));

create index premise_location_street_key_idx on public.premise_location (street_key);

comment on column public.premise_location.street_match is
  '`name` — the premise''s street label resolved against the register, and '
  'geometry only chose which segment of that street. `spatial` — no name match, '
  'so the nearest segment was taken; weaker, and mostly streets Paris has '
  'renamed since the census (Rue de Rochechouart is now Rue Marguerite de '
  'Rochechouart, Rue Rodier is now Rue Claude Rodier). Null — unattached, which '
  'is what a premise gets rather than a guess.';
