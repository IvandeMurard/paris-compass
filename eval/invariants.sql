-- Invariants. Every query below must return zero rows.
--
-- Each block is delimited by a `-- @invariant <id> :: <description>` line, which
-- the runner (scripts/eval/run.ts) parses. Keep the marker format; the runner
-- reports by id.
--
-- Contract and rationale: eval/FAILURE_MODES.md.

-- @invariant I1 :: une chronologie affirme un fait là où observed = false
-- The failure of 2026-08-09: an unsurveyed year rendered as a statement. If a
-- row is not observed it carries no label, no code, no amount, and its
-- confidence is `indetermine`.
select l.id as location_id, t.occurred_on, t.label, t.confidence
from public.premise_location l
cross join lateral public.compass_address_timeline(l.id) t
where t.observed = false
  and (t.label is not null or t.activity_code is not null
       or t.amount_eur is not null or t.confidence <> 'indetermine')
limit 20;

-- @invariant I2 :: un fait etabli sans pièce jointe
-- A confidence level has to be justified by something the reader can check.
select l.id as location_id, t.occurred_on, t.source, t.confidence
from public.premise_location l
cross join lateral public.compass_address_timeline(l.id) t
where t.confidence = 'etabli'
  and (t.evidence is null or btrim(t.evidence) = ''
       or t.confidence_reason is null or btrim(t.confidence_reason) = '')
limit 20;

-- @invariant I3 :: un prix sans la phrase source qui le porte
-- A number produced by a regular expression never travels alone.
select e.id, e.announcement_id, e.price_eur
from public.bodacc_establishment e
where e.price_eur is not null
  and (e.origin_raw is null or btrim(e.origin_raw) = '' or e.price_source is null)
limit 20;

-- @invariant I4 :: un relevé dont le millésime n'a ni licence ni date
-- Measured<T> requires a source, a licence and a date, or the figure cannot ship.
select o.id, o.vintage_id
from public.premise_observation o
join public.bdcom_vintage v on v.id = o.vintage_id
where v.licence is null or btrim(v.licence) = ''
   or v.as_of is null or btrim(v.as_of) = ''
   or v.source_url is null or btrim(v.source_url) = ''
limit 20;

-- @invariant I5 :: un code d'activité affiché qui n'est pas dans la nomenclature
-- An invented label is worse than a missing one.
select o.id, o.activity_code
from public.premise_observation o
where o.activity_code is not null
  and not exists (select 1 from public.bdcom_activity a where a.code = o.activity_code)
limit 20;

-- @invariant I6 :: un rattachement à une rue sans méthode enregistrée
-- Matched by name or by proximity: the difference has to stay readable.
select l.id, l.street_segment_id, l.street_match
from public.premise_location l
where (l.street_segment_id is not null) <> (l.street_match is not null)
limit 20;

-- @invariant I7 :: un avis BODACC etabli alors que l'adresse est un siège ou partagée
-- The inference error of 2026-08-09, made structurally impossible.
--
-- Restricted to premises that actually carry a BODACC notice. That is a sound
-- restriction, not a sample: a premise with no notice cannot violate this.
--
-- Matched through `source_ref` — the announcement the row actually came from.
-- A first version looked at any notice at the address instead, and flagged a
-- correct row because a *different* notice there was a registered office. That
-- false positive is what added source_ref to the function (migration
-- 20260809000005): a check that cannot name its record cannot be exact.
select l.id as location_id, t.occurred_on, t.source_ref, t.confidence
from (
  select distinct l.id, l.street_key, l.num
  from public.premise_location l
  join public.bodacc_establishment e
    on e.street_key = l.street_key and e.house_number_int = l.num
) l
cross join lateral public.compass_address_timeline(l.id) t
where t.kind in ('sale', 'proceeding')
  and t.confidence = 'etabli'
  and (
    -- the notice behind this row is a registered office, not an establishment
    not exists (
      select 1 from public.bodacc_establishment e
      where e.announcement_id = t.source_ref
        and e.street_key = l.street_key and e.house_number_int = l.num
        and e.address_source = 'etablissement')
    -- or several premises share the address, so no notice can name one
    or (select count(*) from public.premise_location p
         where p.street_key = l.street_key and p.num = l.num) > 1
  )
limit 20;

-- @invariant I8 :: un relevé promu sans ligne de staging correspondante
-- A half-loaded census is indistinguishable from an incomplete one.
select o.id, o.vintage_id, o.source_ordre
from public.premise_observation o
where o.vintage_id in (2017, 2020)
  and not exists (
    select 1 from public.stg_bdcom_od s
    where s.vintage_id = o.vintage_id and s.ordre = o.source_ordre)
union all
select o.id, o.vintage_id, o.source_ordre
from public.premise_observation o
where o.vintage_id = 2023
  and not exists (
    select 1 from public.stg_bdcom_2023 s where s.c_ord = o.source_ordre)
limit 20;
