-- A point outside the corpus returned an emptiness, and emptiness read as "no shops here".
-- DIAGNOSTIC.md §16, issue #55.
--
-- This is the defect of point 9 in its **geographic** variant. Points 9 to 12 came from a layer
-- withheld by licence; this one from a layer absent because the corpus stops at the city limits.
-- The shape is the same — a void read as a zero — and the fix is the same gesture as
-- 20260816000001: emit the cause as a row, not as an absence.
--
-- Measured 24 August through the MCP server, anonymous caller, point (48.7 · 2.2) — Massy,
-- 18 km from the 1er arrondissement: find_premises honestly returned zero premises, and
-- score_location still returned `footfall: 22`, stamped "APUR BDCom 2023", on zero BDCom
-- premises read. The formula in src/core/scoring.ts is
-- `saturating(occupiedNearby, 90) * 0.65 + transit * 0.35`: with `occupiedNearby = 0` the
-- figure was entirely derived from OpenStreetMap while naming APUR as a co-source.
--
-- Why context.ts did not catch it: the query *succeeded* with zero rows, so the layer counted
-- as loaded, so scoreLocation computed. A withheld licence throws, an unreachable database
-- fails; a void outside the corpus was indistinguishable from a real one.
--
--   withheld vintage   -> `withheld` marker row      -> layer withdrawn -> footfall unknown
--   point out of corpus -> `out_of_corpus` marker row -> layer withdrawn -> footfall unknown
--   in corpus, empty    -> zero rows                  -> layer loaded    -> footfall computed
--
-- **Why PostGIS and not a rectangle.** The tightest rectangle around Paris is
-- 48.8156-48.9022 / 2.2241-2.4698 — measured on the 80 quartier polygons on 25 August — and it
-- still contains Boulogne-Billancourt, Levallois, Saint-Mandé and Montreuil, where the corpus
-- holds nothing. A rectangle does not describe a commune. Quartier membership is the only
-- non-arbitrary definition of "inside the corpus", and the 80 polygons are already in the
-- database.
--
-- **Why not "zero rows = layer absent".** It would be simpler and it is wrong: measured
-- 25 August, the Bois de Vincennes (48.828 · 2.440) sits inside the Picpus quartier and holds
-- **zero BDCom premises within 400 m**. That is a true zero — there really are no shops — and
-- rendering it "unknown" would destroy the one answer the data gives with certainty. It is the
-- counter-test the MCP server's README calls "a genuinely empty radius still reads as empty",
-- and I20 holds it.
--
-- The test is on the **queried point**, not on the disc. A point inside Paris near the ring road
-- still has a disc partly outside coverage: that is the caveat coverageNote (src/core/scoring.ts)
-- already places on every figure, and not this defect.
--
-- Return-type change, so drop first: `create or replace` cannot add a column. Only
-- mcp-server/src/context.ts calls this function — src/ calls compass_premises_within and
-- compass_address_timeline, both left untouched.

drop function if exists public.compass_scoring_context_within(
  double precision, double precision, double precision, smallint
);

create function public.compass_scoring_context_within(
  p_lat          double precision,
  p_lng          double precision,
  p_radius_m     double precision default 800,
  p_vintage_year smallint         default 2023
)
returns table (
  lat            double precision,
  lng            double precision,
  is_vacant      boolean,
  total_matched  bigint,
  withheld       boolean,
  out_of_corpus  boolean
)
language plpgsql stable parallel safe security invoker
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
         not (
           -- Same caller test as 20260809000011. A direct database connection
           -- carries no PostgREST claim and is privileged by definition: it
           -- already holds the credentials.
           coalesce(
             nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role',
             nullif(current_setting('request.jwt.claim.role', true), ''),
             'service_role'
           ) <> 'anon'
           or v.publicly_redistributable
         )
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
  with hit as (
    select ST_Y(l.geom::geometry) as lat,
           ST_X(l.geom::geometry) as lng,
           coalesce(a.is_vacant, false) as is_vacant
    from public.premise_location l
    join public.premise_observation o
      on o.location_id = l.id and o.vintage_id = v_vintage
    left join public.bdcom_activity a on a.code = o.activity_code
    where ST_DWithin(l.geom, v_point, p_radius_m)
  )
  select h.lat, h.lng, h.is_vacant, (select count(*) from hit), false, false from hit h;
end;
$$;

comment on function public.compass_scoring_context_within is
  'Bare points feeding NeighbourhoodContext.premises in src/core. Returns no '
  'score: Postgres does the spatial selection, the TypeScript core does the '
  'arithmetic. Three answers a caller must never conflate: one row with '
  'withheld = true (vintage not redistributable), one row with out_of_corpus = true '
  '(the point is in none of the 80 quartiers, so the survey does not cover this '
  'place), and zero rows — meaning the radius is genuinely empty, which does happen '
  'inside Paris: the Bois de Vincennes holds no premise within 400 m.';

grant execute on function
  public.compass_scoring_context_within(double precision, double precision, double precision, smallint)
to anon, authenticated;
