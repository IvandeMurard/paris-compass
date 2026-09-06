-- Invariants. Every query below must return zero rows — with one exception,
-- marked, and stated here so it is not mistaken for a broken check.
--
-- Each block is delimited by a `-- @invariant <id> :: <description>` line, which
-- the runner (scripts/eval/run.ts) parses. Keep the marker format; the runner
-- reports by id.
--
-- Two optional directives on the lines that follow it:
--   `-- @as <role>`      impersonate that role through request.jwt.claims
--   `-- @census <column>` the rows are a POPULATION, not violations. The runner
--                         fails on any value of <column> that no `@as anon`
--                         invariant calls, and on an empty population. One block
--                         uses it, I24 — run by hand, it lists the functions the
--                         licence rule applies to, which is information rather
--                         than a failure.
--   `-- @chunk <schema>.<table>.<column>`
--                         run this block as SEVERAL statements, cut on that
--                         column, so no single statement's cost grows with the
--                         corpus (#69). The block must then carry `$1` and `$2`
--                         as its slice bounds, each dropped when null. THE
--                         POPULATION IS UNCHANGED: the slices cover the whole
--                         ordered domain and every one of them is run. Three
--                         blocks use it — I1, I2, I7.
--
-- Contract and rationale: eval/FAILURE_MODES.md.

-- @invariant I1 :: une chronologie affirme un fait là où observed = false
-- @chunk public.premise_location.id
-- The failure of 2026-08-09: an unsurveyed year rendered as a statement. If a
-- row is not observed it carries no label, no code, no amount, and its
-- confidence is `indetermine`.
--
-- Run in slices rather than in one statement (#69). One call to the timeline
-- function per premise costs 0.965 ms and 94 pages, so this invariant is linear
-- in `premise_location` and reached 118 137 ms cold on 2026-08-31 against a
-- 120 000 ms window. The slices are NOT a sample: they cover the whole ordered
-- domain, the runner walks every one of them, and the population is unchanged.
-- The two bounds are bound by the runner; each is dropped when it is null.
select l.id as location_id, t.occurred_on, t.label, t.confidence
from public.premise_location l
cross join lateral public.compass_address_timeline(l.id) t
where ($1::bigint is null or l.id >= $1::bigint)
  and ($2::bigint is null or l.id < $2::bigint)
  and t.observed = false
  and (t.label is not null or t.activity_code is not null
       or t.amount_eur is not null or t.confidence <> 'indetermine')
limit 20;

-- @invariant I2 :: un fait etabli sans pièce jointe
-- @chunk public.premise_location.id
-- A confidence level has to be justified by something the reader can check.
--
-- Sliced for the same reason as I1, and by the same key. No restriction of the
-- population exists here the way it does for I7: the timeline emits a survey row
-- per vintage for EVERY premise, observed or not, so every premise can carry an
-- `etabli` row. Narrowing this one would be a sample, not a restriction.
select l.id as location_id, t.occurred_on, t.source, t.confidence
from public.premise_location l
cross join lateral public.compass_address_timeline(l.id) t
where ($1::bigint is null or l.id >= $1::bigint)
  and ($2::bigint is null or l.id < $2::bigint)
  and t.confidence = 'etabli'
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
-- @chunk public.premise_location.id
-- The inference error of 2026-08-09, made structurally impossible.
--
-- Sliced like I1 and I2 (#69), on the same key: the restriction below already
-- narrows the population, but only by about a third — 75 027 ms cold on
-- 2026-08-31 against I2's 75 841 — because the join that computes it is itself
-- the expensive part. Restriction and slicing are independent, and both apply.
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
  where ($1::bigint is null or l.id >= $1::bigint)
    and ($2::bigint is null or l.id < $2::bigint)
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

-- @invariant I9 :: un appelant anonyme voit le contenu d'un millésime non redistribuable
-- @as anon
-- 2017 and 2020 carry a licence we have not read, so an anonymous caller gets a
-- row saying the content is withheld — never the content, and never an absence.
-- Exercised as `anon` because the privileged path always works, which is exactly
-- why running it proves nothing about what a visitor sees.
select l.id as location_id, t.occurred_on, t.label, t.observed
from (select id from public.premise_location order by id limit 400) l
cross join lateral public.compass_address_timeline(l.id) t
join public.bdcom_vintage v
  on t.kind = 'survey' and make_date(v.year, 1, 1) = t.occurred_on
where not v.publicly_redistributable
  and (t.label is not null or t.activity_code is not null
       or t.observed is not null or not t.withheld)
limit 20;
-- Note: `observed is not null` is deliberate. A withheld vintage must not even
-- say "not surveyed" — that sentence is still about the restricted dataset.

-- @invariant I10 :: un millésime redistribuable est retenu par erreur
-- @as anon
-- The mirror of I9: over-restricting is a failure too. An ODbL vintage must
-- reach an anonymous caller with its content, or the licence column has been
-- set wrong and the product silently hides what it is allowed to show.
select l.id as location_id, t.occurred_on
from (select id from public.premise_location order by id limit 400) l
cross join lateral public.compass_address_timeline(l.id) t
join public.bdcom_vintage v
  on t.kind = 'survey' and make_date(v.year, 1, 1) = t.occurred_on
where v.publicly_redistributable and t.withheld
limit 20;

-- @invariant I11 :: une fonction compass_* n'est pas exécutable par anon
-- PLAN.md §6.8/§6.9 — le demi backend de « aucun chiffre n'existe que côté
-- privilégié ». `has_function_privilege` lit le droit du rôle nommé, pas celui
-- de l'appelant : pas besoin de `@as anon` ici, la requête vaut quel que soit
-- qui la lance.
--
-- Trouve aujourd'hui ce que 20260815000002 corrige : compass_street_key et
-- compass_bodacc_street_key n'avaient aucun GRANT explicite, et ne marchaient
-- que par le défaut PUBLIC de Postgres — jamais vérifié jusqu'ici. Le même
-- angle mort que l'incident RLS-sans-GRANT de 20260809000009, sous une autre
-- forme : une règle vraie par accident plutôt que par déclaration.
select p.proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname like 'compass\_%'
  and not has_function_privilege('anon', p.oid, 'execute')
limit 20;

-- @invariant I12 :: un appelant anonyme reçoit le contenu ou une absence muette d'un millésime non redistribuable, via compass_scoring_context_within
-- @as anon
-- One function down from I9/I10. compass_address_timeline was fixed for this
-- defect in 20260809000011; compass_scoring_context_within carried the same
-- one until 20260816000001 — a withheld vintage answered with zero rows,
-- indistinguishable from a genuinely empty radius. The two functions can
-- drift apart again, and I9 does not vouch for this one.
--
-- `left join lateral ... on true` turns "the function returned nothing" into
-- a row of nulls this query can see. Silence is exactly the defect being
-- guarded against, and a plain call would let it hide instead of failing.
--
-- The runner only sets `request.jwt.claims`, never `set local role anon`:
-- enough here, since the function reads its own privilege from the claim
-- (20260816000001), not from the database role, the same design as
-- compass_address_timeline. It does not exercise the RLS policy itself.
select v.vintage_year, r.lat, r.lng, r.is_vacant, r.total_matched, r.withheld
from (values (2017::smallint), (2020::smallint)) v(vintage_year)
left join lateral public.compass_scoring_context_within(
  48.8566::double precision, 2.3522::double precision, 800::double precision, v.vintage_year
) r on true
where r.lat is not null or r.lng is not null or r.is_vacant is not null
   or r.total_matched is not null or r.withheld is distinct from true
   or r.withheld is null
limit 20;

-- @invariant I13 :: une absence réelle se lit comme une retenue de licence, via compass_scoring_context_within
-- @as anon
-- The mirror of I12, and the one an over-eager fix could introduce by
-- accident: a genuinely empty radius on a redistributable vintage must stay
-- silent — zero rows, as before 20260816000001 — never the withheld marker.
-- A 1-metre radius makes "empty" reliable regardless of how the data drifts:
-- confirmed empty at this point (Chatelet) on 2026-08-17.
select *
from public.compass_scoring_context_within(
  48.8566::double precision, 2.3522::double precision, 1::double precision, 2023::smallint
)
limit 20;

-- @invariant I14 :: un appelant anonyme reçoit le contenu ou une absence muette d'un millésime non redistribuable, via compass_premises_within
-- @as anon
-- The third function carrying the licence rule, and the last to be covered.
-- I9/I10 vouch for compass_address_timeline, I12/I13 for
-- compass_scoring_context_within; neither says anything about this one, which
-- kept the silent-absence defect until 20260817000001. Measured before the fix,
-- as a real anonymous caller through PostgREST at Chatelet over 800 m: 2017 and
-- 2020 returned zero rows, 2023 returned 3 059 premises, and a 1-metre radius on
-- 2023 returned zero rows — the withheld vintage and the empty radius were
-- indistinguishable.
--
-- Same `left join lateral ... on true` as I12, for the same reason: it turns "the
-- function returned nothing" into a row of nulls this query can see. Silence is
-- the defect being guarded against, so a plain call would let it hide in the zero
-- rows the runner reads as success.
--
-- Same caveat as I12 too: the runner sets `request.jwt.claims` and never
-- `set local role anon`. Enough here — the function reads its privilege from the
-- claim, not from the database role — but it does not exercise the RLS policy.
select v.vintage_year, r.location_id, r.lat, r.lng, r.address, r.total_matched, r.withheld
from (values (2017::smallint), (2020::smallint)) v(vintage_year)
left join lateral public.compass_premises_within(
  48.8566::double precision, 2.3522::double precision, 800::double precision,
  v.vintage_year, 5::integer
) r on true
where r.location_id is not null or r.lat is not null or r.lng is not null
   or r.address is not null or r.total_matched is not null
   or r.withheld is distinct from true or r.withheld is null
limit 20;

-- @invariant I15 :: une absence réelle se lit comme une retenue de licence, via compass_premises_within
-- @as anon
-- The counter-test, and the half that gets skipped. Fixing I14 by stamping the
-- marker too eagerly would replace one defect with its mirror: a genuinely empty
-- radius on a redistributable vintage must stay silent, zero rows, never a
-- withheld row. Same 1-metre radius at Chatelet as I13, confirmed empty on
-- 2026-08-17.
select *
from public.compass_premises_within(
  48.8566::double precision, 2.3522::double precision, 1::double precision,
  2023::smallint, 5::integer
)
limit 20;

-- @invariant I16 :: un appelant anonyme reçoit une affirmation là où un millésime est retenu, via compass_premise_history
-- @as anon
-- The fourth function carrying the licence rule, and the only one whose defect
-- was not a silence. I9/I10 vouch for compass_address_timeline, I12/I13 for
-- compass_scoring_context_within, I14/I15 for compass_premises_within; none of
-- them says anything about this one, which returns one row per vintage whether
-- an observation was found or not. RLS removing the row does not remove the row
-- from the answer — it leaves the defaults behind.
--
-- Measured on the remote before 20260824000001, premise 54652 `60 QU ORFEVRES`,
-- vintage 2017: privileged `observed = true, is_vacant = true, Locaux Vacants`,
-- anonymous `observed = false, is_vacant = false, null`. The premise was vacant.
-- Two fabricated facts, on the column the product is about.
--
-- Unlike I12/I14 there is nothing to turn into a visible row here: the function
-- always answers, so a plain call is enough and `left join lateral ... on true`
-- would add nothing.
--
-- The runner impersonates `anon` by setting request.jwt.claims on a privileged
-- connection and never issues `set local role anon`, so RLS is NOT applied while
-- this runs. That is the point: what it checks is that the function nulls its own
-- content columns rather than relying on RLS to have emptied the join. Arm D
-- (scripts/eval/anon-http.ts) plays the same premise through PostgREST with a
-- publishable key and no database credentials, where RLS does apply.
--
-- 54652 is named explicitly so the sample can never become empty; the sweep
-- behind it covers the premises where the defect actually showed — those with an
-- observation in a vintage we may not redistribute.
with sample as (
  select l.id from public.premise_location l where l.id = 54652
  union
  (select o.location_id
     from public.premise_observation o
     join public.bdcom_vintage v on v.id = o.vintage_id
    where not v.publicly_redistributable
    order by o.location_id
    limit 200)
)
select s.id as location_id, h.vintage_year, h.withheld, h.observed, h.is_vacant,
       h.activity_code, h.activity_label, h.changed_from_previous
from sample s
cross join lateral public.compass_premise_history(s.id) h
join public.bdcom_vintage v on v.year = h.vintage_year
where not v.publicly_redistributable
  and (h.withheld is distinct from true
       or h.observed is not null
       or h.is_vacant is not null
       or h.activity_code is not null
       or h.activity_label is not null
       or h.activity_group is not null
       or h.size_label is not null
       or h.sign_name is not null
       or h.match_method is not null
       or h.changed_from_previous is not null)
limit 20;

-- @invariant I17 :: une absence réelle se lit comme une retenue de licence, via compass_premise_history
-- @as anon
-- The mirror, and the half an over-eager fix breaks. This function exists to
-- report absences — `observed = false` on a redistributable vintage is a finding,
-- not a gap, and 20260808000005 says so in its own header. Stamping the withheld
-- marker or nulling `observed` across the board would trade one fabricated fact
-- for the destruction of the function's purpose.
--
-- Two premises, both measured on the remote 2026-08-24:
--   54652  observed in 2023 — `Antiquités`, so content must come through
--       5  present in 2017 and 2020, absent from the 2023 retail-only vintage,
--          so `observed` must stay false and `is_vacant` must be null — absence
--          is not a measurement of vacancy either. 24 573 premises are in that
--          case; before 20260824000001 every one of them was told it was not
--          vacant in 2023, on the privileged path as well as the anonymous one.
with sample(id, expect_observed) as (
  values (54652::bigint, true), (5::bigint, false)
)
select s.id as location_id, s.expect_observed, h.vintage_year, h.withheld,
       h.observed, h.is_vacant, h.activity_code
from sample s
cross join lateral public.compass_premise_history(s.id) h
where h.vintage_year = 2023
  and (h.withheld is distinct from false
       or h.observed is distinct from s.expect_observed
       or (s.expect_observed and (h.is_vacant is null or h.activity_code is null))
       or (not s.expect_observed and h.is_vacant is not null))
limit 20;

-- @invariant I18 :: une fonction compass_* qui porte une colonne observed obeit a RLS
-- A structural invariant, not a behavioural one, and deliberately so: the runner
-- impersonates a role by setting request.jwt.claims on a privileged connection
-- and never issues `set local role`, so RLS never applies while it runs. The
-- defect this guards against is invisible to every behavioural test the gate can
-- express — it only appears when RLS is really in force AND the caller test
-- disagrees with the RLS policy about who is privileged. Which they do:
--
--   the RLS policy of 20260809000008   restricts `to anon, authenticated`
--   the caller test of 20260809000010  treats anything <> 'anon' as privileged
--
-- So for an `authenticated` caller, an INVOKER function is told by the claim that
-- nothing must be withheld, while RLS removes the rows underneath. A function
-- whose failure mode is missing ROWS degrades to silence — bad, but the caller
-- can decline to conclude. A function carrying an `observed` column degrades to
-- `observed = false`, which is a statement about the world: "this premise was not
-- surveyed that year", said of a premise that was.
--
-- 20260809000008 wrote the rule when it moved compass_address_timeline to
-- SECURITY DEFINER, and it is quoted in 20260824000002. It was a paragraph in a
-- migration nobody had to read, so 20260824000001 broke it six hours after
-- being told about it in the file next door. Now it is a check.
--
-- The two `_within` functions stay INVOKER legitimately: they have no `observed`
-- column, so RLS costs them rows and not truth.
--
-- Measured 2026-08-24: two compass_* functions carry `observed` —
-- compass_address_timeline (definer, correct since 20260809000008) and
-- compass_premise_history (invoker until 20260824000002). This query returned
-- exactly one row before that migration, and returns none after.
select p.proname, p.prosecdef, p.proargnames
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname like 'compass\_%'
  and 'observed' = any(p.proargnames)
  and not p.prosecdef
limit 20;

-- @invariant I19 :: un point hors du corpus est rendu comme un quartier sans commerces, via compass_scoring_context_within
-- @as anon
-- DIAGNOSTIC.md §16, issue #55, corrigé par 20260825000003. Le défaut du point 9 dans sa
-- variante géographique : les points 9 à 12 venaient d'une couche retenue par licence,
-- celui-ci d'une couche absente parce que le corpus s'arrête aux limites de Paris. La
-- requête réussissait avec zéro ligne, donc la couche comptait comme chargée, donc le flux
-- piéton était calculé — 22 à Massy, sur zéro local, et cité « APUR BDCom 2023 ».
--
-- Boulogne-Billancourt (48,835 · 2,240) plutôt que Massy : c'est le cas dur. Il tombe dans
-- le rectangle le plus serré autour de Paris — 48,8156–48,9022 / 2,2241–2,4698, mesuré sur
-- les 80 quartiers — donc aucune borne de coordonnées ne l'écarte. Seule l'appartenance à
-- un quartier le distingue, et c'est le sujet de cet invariant.
--
-- Même `left join lateral ... on true` que I12 : il transforme « la fonction n'a rien rendu »
-- en une ligne de nulls que cette requête peut voir. Le silence est exactement le défaut
-- contrôlé ; un appel nu le laisserait se cacher au lieu d'échouer.
select r.lat, r.lng, r.is_vacant, r.total_matched, r.withheld, r.out_of_corpus
from (values (1)) t(x)
left join lateral public.compass_scoring_context_within(
  48.835::double precision, 2.24::double precision, 800::double precision, 2023::smallint
) r on true
where r.out_of_corpus is distinct from true
   or r.out_of_corpus is null
   or r.lat is not null or r.lng is not null or r.is_vacant is not null
   or r.total_matched is not null or r.withheld is distinct from false
limit 20;

-- @invariant I20 :: un rayon réellement vide dans Paris se lit comme un point hors corpus
-- @as anon
-- Le contre-test, et la moitié qui se saute. Corriger I19 en traitant tout résultat vide
-- comme « hors corpus » aurait été plus simple, et faux : le Bois de Vincennes
-- (48,828 · 2,440) est dans le quartier Picpus et ne porte **aucun** local BDCom dans 400 m
-- — mesuré le 25 août sur le distant. C'est un vrai zéro : il n'y a réellement pas de
-- commerce, et le rendre « inconnu » détruirait la seule réponse que la donnée sait donner
-- avec certitude.
--
-- Zéro ligne est donc la réponse attendue ici, exactement comme avant 20260825000003. Toute
-- ligne rendue est une violation — que ce soit un marqueur `out_of_corpus` posé à tort ou un
-- local qui serait apparu, auquel cas c'est le point de mesure qu'il faut revoir, pas la
-- fonction.
select *
from public.compass_scoring_context_within(
  48.828::double precision, 2.44::double precision, 400::double precision, 2023::smallint
)
limit 20;

-- @invariant I21 :: une evidence de survie glisse de l'observation vers le previsionnel
-- w1-survie (#14) pose un interdit doctrinal : « 72 % des cafés tiennent six ans » est une
-- observation, « votre café a 72 % de chances » est un prévisionnel. Le garde TypeScript
-- (src/core/observational.ts) tient le chemin navigateur et le serveur MCP — il ne peut rien
-- contre une phrase écrite en SQL, et `evidence` est écrite en SQL. Cet invariant est la
-- seconde moitié : la règle appliquée là où le texte est réellement produit.
--
-- Les 80 quartiers × les deux volets, soit 160 phrases examinées, mesuré à 0 infraction le
-- 25 août 2026. La liste des formes est celle de FORBIDDEN_FORMS, tenue à l'identique des
-- deux côtés — deuxième personne, vocabulaire de probabilité, futur. Le conditionnel est
-- délibérément absent : « les publier reviendrait à redistribuer » décrit une conséquence
-- logique, pas une prédiction sur un commerce.
select q.name as quartier, s.source, left(s.evidence, 160) as evidence
from public.quartier q
cross join lateral public.compass_survival_by_trade(
  ST_Y(ST_Centroid(q.geom::geometry)),
  ST_X(ST_Centroid(q.geom::geometry)),
  111::smallint
) s
where s.evidence ~* '\y(votre|vos|vous|chances?|risques?|probabilit\w*|pr[ée]vision\w*)\y'
   or s.evidence ~* '\y(tiendra|tiendront|durera|dureront|survivra|survivront|fermera|fermeront|restera|resteront|sera|seront|aura|auront)\y'
limit 20;

-- @invariant I22 :: le pont NAF invente un poste d'activité qui n'existe pas dans la nomenclature
-- The rule the 25 August fix did not leave behind. `activity_naf_bridge` is Compass's own
-- reading of which NAF codes match a BDCom level-18 trade; nothing in the schema says a
-- niv18 must be real. Two invented codes were written on the same day — 101 read as
-- Alimentaire when it is Grand magasin, and 114 which does not exist at all — and the
-- correction (20260825000013) edited the rows without leaving anything that would catch
-- the third one.
--
-- A foreign key is not available: niv18 is not unique in bdcom_activity, one row per
-- 224-post code, so there is nothing to point at. Hence an invariant.
--
-- What it does NOT catch, and the limit is worth stating: a niv18 that exists but names
-- the wrong trade. 101 was real and wrong. Only a measurement against the label catches
-- that, and no rule replaces having looked — see the comment of 20260825000013.
--
-- Measured 25 August 2026: twelve posts, 101 to 112, and zero orphan in the bridge.
select distinct b.niv18
from public.activity_naf_bridge b
where not exists (
  select 1 from public.bdcom_activity a where a.niv18 = b.niv18)
limit 20;

-- ===========================================================================
-- w0-retenue (#57) — la règle de retenue, recensée depuis le catalogue
-- ===========================================================================
-- I9/I10, I12/I13, I14/I15, I16/I17 : quatre paires, une par fonction, la même
-- règle réécrite quatre fois à la main. Une cinquième fonction est née fausse et
-- n'a été trouvée que par accident, en écrivant w1-survie (DIAGNOSTIC.md §19).
-- I23 et I24 remplacent la liste tenue de mémoire par une énumération.
--
-- POURQUOI pg_proc.prosrc ET NON pg_depend. Mesuré le 25 août 2026 sur le
-- distant : pg_depend ne porte, pour ces fonctions, que le schéma, le langage et
-- les types — jamais les tables lues. Postgres n'enregistre les dépendances du
-- corps d'une fonction que pour la syntaxe SQL standard `BEGIN ATOMIC` (PG14+) ;
-- pour un corps en chaîne, plpgsql comme sql, le corps est opaque au catalogue.
-- Le ticket demandait « pg_proc / pg_depend » : pg_depend ne pouvait pas répondre.

-- @invariant I23 :: une fonction compass_* lisant une table restreinte par RLS ne sait pas annoncer sa retenue
-- La généralisation de I18, et la règle que ce dépôt appliquait sans l'écrire.
--
-- I18 vérifie qu'une fonction portant une colonne `observed` est SECURITY DEFINER.
-- Il attrapait la *forme* du défaut d'août, pas sa cause : compass_street_rotation
-- n'expose que des dénombrements, donc I18 ne la regardait pas, et elle rendait
-- `changed_since_previous = 0` là où la vérité mesurée est 81 (DIAGNOSTIC.md §19).
-- Le critère n'est pas `observed` : c'est **lire une table dont RLS peut retirer
-- des lignes en silence**. Une fonction qui agrège ces lignes ment tout autant
-- qu'une fonction qui les rend une par une.
--
-- Deux exigences, et il faut les deux :
--   SECURITY DEFINER — sinon RLS vide la jointure sous une fonction qui a déjà
--     conclu « rien n'est retenu », le désaccord de 20260809000008 (RLS restreint
--     anon ET authenticated) avec 20260809000010 (tout ce qui n'est pas anon est
--     privilégié). Mesuré le 25 août : compass_scoring_context_within rendait
--     zéro ligne et aucun marqueur à un appelant `authenticated` sur 2017.
--   une colonne `withheld` — parce qu'une fonction qui voit tout doit *dire* ce
--     qu'elle ne montre pas, sinon la retenue redevient un silence.
--
-- La population est restreinte aux tables dont une politique SELECT porte un
-- prédicat autre que `true` : mesuré le 25 août, `premise_observation` est la
-- seule table de contenu dans ce cas ; les quatre autres (saved_properties,
-- saved_searches, user_preferences, notification_settings) sont les tables par
-- utilisateur de Lovable, qu'aucune fonction compass_* ne lit. La règle est écrite
-- sur le catalogue plutôt que sur le nom `premise_observation` pour que la table
-- restreinte *suivante* soit couverte sans que personne y pense.
--
-- CE QUE I23 NE RATTRAPE PAS, et la limite compte : `prosrc ~ '\ytable\y'` lit du
-- texte. Une fonction qui atteindrait la table par une vue, par du SQL dynamique
-- ou par une autre fonction n'est pas vue ; une fonction qui la cite seulement en
-- commentaire est signalée à tort. Le faux positif coûte une lecture, le faux
-- négatif coûte un défaut — d'où ce sens-là. Et I23 est structurel : il dit que la
-- fonction *peut* annoncer sa retenue, jamais qu'elle l'annonce juste. C'est le
-- travail de I24 et des paires de comportement.
with restricted as (
  select c.relname
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
    -- Deux facons d'etre restreinte, et la seconde manquait — w1-observabilite (#72).
    and (
      -- (a) une politique SELECT existe et retire des lignes.
      exists (
        select 1 from pg_policy p
         where p.polrelid = c.oid
           and p.polcmd in ('r', '*')
           and coalesce(pg_get_expr(p.polqual, p.polrelid), '') <> 'true')
      -- (b) RLS est active et AUCUNE politique SELECT n'existe : la table est vide pour tout
      -- role non privilegie. C'est le cas le plus dur de retrait silencieux, et la population
      -- d'origine ne le voyait pas — elle exigeait une politique. DIAGNOSTIC.md §37.
      or not exists (
        select 1 from pg_policy p
         where p.polrelid = c.oid and p.polcmd in ('r', '*'))
    )
)
select p.proname, p.prosecdef as security_definer, r.relname as restricted_table
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join restricted r on p.prosrc ~ ('\y' || r.relname || '\y')
where n.nspname = 'public'
  and p.proname like 'compass\_%'
  -- ET QUI RENDENT QUELQUE CHOSE. Une fonction qui rend `void` n'a pas d'appelant a qui
  -- annoncer une retenue : elle ne rend aucune ligne, donc elle n'en retient aucune. Ajoute le
  -- 5 septembre 2026 avec `compass_record_question` (#72), qui ECRIT dans une table restreinte
  -- et ne lit rien vers l'exterieur — la population est « ce qui est RENDU », pas « ce qui est
  -- touche ». Ce que ca ne rattrape pas : un ecrivain qui divulguerait par son message
  -- d'erreur. Aucune regle ici ne lit un message d'erreur.
  and p.prorettype <> 'void'::regtype
  and (not p.prosecdef or not ('withheld' = any(p.proargnames)))
limit 20;

-- @invariant I24 :: une fonction compass_* lisant une table restreinte n'a aucun test de retenue anonyme
-- @census proname
-- Le recensement, et le livrable de w0-retenue. Il n'a PAS la forme des autres :
-- ses lignes sont la population, pas des violations. Le lanceur ne les compte pas
-- comme des échecs — il vérifie, pour chaque nom rendu, qu'au moins un invariant
-- marqué `-- @as anon` **appelle** cette fonction, commentaires retirés. Une
-- mention en commentaire ne vaut donc pas couverture, et c'est délibéré : I16 cite
-- ses trois voisines dans son en-tête sans rien vérifier à leur sujet.
--
-- C'est le seul contrôle de cette porte qui croise le catalogue avec le fichier
-- lui-même. Aucune requête ne peut le faire : eval/invariants.sql est sur la
-- machine du développeur, pas sur le serveur. D'où la moitié TypeScript, dans
-- scripts/eval/run.ts.
--
-- Ce qu'il rend impossible : la sixième fonction née sans test. Ce qu'il ne rend
-- PAS impossible, et c'est la limite à énoncer — un invariant `@as anon` qui
-- appelle la fonction sans rien vérifier d'utile. La couverture est mécanique, la
-- pertinence reste une lecture. Comme I22 : la règle interdit le code inventé, pas
-- le code mal lu.
--
-- Mesuré le 25 août 2026 : six fonctions dans la population — compass_address_timeline,
-- compass_premise_history, compass_premises_within, compass_scoring_context_within,
-- compass_street_rotation, compass_survival_by_trade. Les deux dernières n'avaient
-- aucun test anonyme avant ce ticket.
with restricted as (
  select c.relname
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
    -- Deux facons d'etre restreinte, et la seconde manquait — w1-observabilite (#72).
    and (
      -- (a) une politique SELECT existe et retire des lignes.
      exists (
        select 1 from pg_policy p
         where p.polrelid = c.oid
           and p.polcmd in ('r', '*')
           and coalesce(pg_get_expr(p.polqual, p.polrelid), '') <> 'true')
      -- (b) RLS est active et AUCUNE politique SELECT n'existe : la table est vide pour tout
      -- role non privilegie. C'est le cas le plus dur de retrait silencieux, et la population
      -- d'origine ne le voyait pas — elle exigeait une politique. DIAGNOSTIC.md §37.
      or not exists (
        select 1 from pg_policy p
         where p.polrelid = c.oid and p.polcmd in ('r', '*'))
    )
)
select distinct p.proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join restricted r on p.prosrc ~ ('\y' || r.relname || '\y')
where n.nspname = 'public'
  and p.proname like 'compass\_%'
  -- ET QUI RENDENT QUELQUE CHOSE. Une fonction qui rend `void` n'a pas d'appelant a qui
  -- annoncer une retenue : elle ne rend aucune ligne, donc elle n'en retient aucune. Ajoute le
  -- 5 septembre 2026 avec `compass_record_question` (#72), qui ECRIT dans une table restreinte
  -- et ne lit rien vers l'exterieur — la population est « ce qui est RENDU », pas « ce qui est
  -- touche ». Ce que ca ne rattrape pas : un ecrivain qui divulguerait par son message
  -- d'erreur. Aucune regle ici ne lit un message d'erreur.
  and p.prorettype <> 'void'::regtype
order by 1;

-- @invariant I25 :: un appelant anonyme reçoit un dénombrement là où un millésime est retenu, via compass_street_rotation
-- @as anon
-- La cinquième fonction de la famille, et la variante la plus difficile à voir :
-- rien n'est nul, chaque colonne porte un nombre plausible. Mesuré le 25 août 2026
-- sur le distant, centroïde du quartier Halles (48,86229 / 2,34490), rayon 300 m,
-- périmètre commerce, sommé sur les 98 tronçons :
--
--   appelant                     2017          2020           2023
--   privilégié                   660 / chg 0   631 / chg 76   619 / chg 81
--   anonyme (claim + set role)   —             —              619 / chg 0
--
-- `chg 0` sur 2023 est une affirmation : « cette rue n'a pas tourné », produite par
-- la disparition des millésimes antérieurs sous RLS. La vérité mesurée est 81.
--
-- DIAGNOSTIC.md §19 donnait 78 pour ce chiffre sans nommer son point de mesure ;
-- 78 n'est reproductible sous aucune variante essayée le 25 août (300 m, périmètre
-- commerce ou non, centroïde du quartier). Le chiffre écrit ici porte ses
-- coordonnées, ce que §19 ne faisait pas — la clause « un chiffre mesuré porte sa
-- date » de CLAUDE.md vaut aussi pour son lieu.
--
-- Deux exigences, et la seconde est celle qui manquait :
--   un millésime retenu sort comme UNE ligne marquée, sans tronçon ni dénombrement ;
--   un millésime rendu dont le PRÉCÉDENT est retenu porte `changed_since_previous`
--     NUL — « ce qui a changé depuis 2020 » est un fait sur 2020. Sous SECURITY
--     DEFINER la fenêtre voit vraiment les codes du millésime retenu, donc le test
--     est posé plutôt qu'hérité de ce que la jointure a bien voulu rendre.
with vintage as (
  select v.year,
         v.publicly_redistributable                             as odbl,
         lag(v.year) over (order by v.year)                     as previous_year,
         lag(v.publicly_redistributable) over (order by v.year) as previous_odbl
  from public.bdcom_vintage v
)
select r.vintage_year, r.withheld, r.street_segment_id, r.premises, r.vacant,
       r.changed_since_previous
from public.compass_street_rotation(48.86229, 2.34490, 300) r
join vintage vi on vi.year = r.vintage_year
where case
  when not vi.odbl then
    r.withheld is distinct from true
    or r.street_segment_id is not null or r.street_name is not null
    or r.premises is not null or r.vacant is not null
    or r.changed_since_previous is not null
  else
    r.changed_since_previous is not null
    and (vi.previous_year is null or not coalesce(vi.previous_odbl, false))
end
limit 20;
-- Note: cet invariant ne dit RIEN sur le millésime ODbL lui-même — ni qu'il sort, ni qu'il porte
-- ses dénombrements. C'est le travail de I26, et la séparation est délibérée : une version qui
-- retiendrait tout satisfait I25 et fait échouer I26, une version qui fuite fait l'inverse.
-- Éprouvé dans les deux sens, cf. DIAGNOSTIC.md §19.

-- @invariant I26 :: une retenue excessive ou un vide réel rendu comme un fait, via compass_street_rotation
-- @as anon
-- Le miroir, et la moitié qui se saute. Retenir trop est une faute aussi : le
-- millésime ODbL doit sortir avec ses tronçons et ses dénombrements, et un rayon
-- réellement vide ne doit produire aucune ligne de contenu.
--
-- Une différence de forme avec I13/I15/I20, et il faut la dire : le marqueur de
-- retenue de cette fonction ne dépend pas du rayon. compass_street_rotation rend
-- les trois millésimes d'un coup, là où les fonctions `_within` en prennent un en
-- paramètre. À 1 m sur Châtelet, un appelant anonyme reçoit donc les deux lignes
-- marquées 2017 et 2020 — qui n'affirment rien sur le lieu — et **zéro** ligne de
-- contenu ; un appelant privilégié reçoit zéro ligne tout court. Mesuré le 25 août.
-- Le contre-test ne regarde donc que les lignes rendues, jamais le compte total.
select * from (
  select 'millésime ODbL retenu ou vidé'::text as probleme, v.year::text as detail
  from public.bdcom_vintage v
  where v.publicly_redistributable
    and not exists (
      select 1 from public.compass_street_rotation(48.86229, 2.34490, 300) r
      where r.vintage_year = v.year
        and r.withheld is false
        and r.street_segment_id is not null
        and r.premises > 0)
  union all
  select 'un rayon réellement vide rend du contenu'::text, count(*)::text
  from public.compass_street_rotation(48.8566, 2.3522, 1) r
  where r.withheld is false
  having count(*) > 0
) x
limit 20;

-- @invariant I27 :: un appelant anonyme reçoit un effectif ou un taux issu d'un millésime retenu, via compass_survival_by_trade
-- @as anon
-- La sixième fonction de la population, et la seule que le recensement a sortie
-- sans qu'un défaut l'ait signalée. Elle est juste depuis son premier jet — écrite
-- SECURITY DEFINER *à cause* du défaut de compass_street_rotation — mais aucun
-- invariant ne la jouait en anonyme : I21 l'appelle en privilégié, pour la doctrine
-- observationnelle, pas pour la licence. Une fonction juste sans test est une
-- fonction qui redeviendra fausse sans qu'on le sache : c'est le point 20.
--
-- Le volet BDCom est retenu parce qu'énoncer « n = 310 en 2017 » publie un
-- dénombrement d'un millésime dont la licence n'a pas été lue — w1-survie (#14).
-- Ce qu'une ligne retenue garde : le quartier, le métier, la période et la licence,
-- métadonnées que compass_vintages() publie déjà à anon. Ce qu'elle ne garde pas :
-- l'effectif, le nombre de survivants, le taux.
--
-- Mesuré le 25 août 2026, Halles (48,86229 / 2,34490), niv18 111 « Café et
-- Restaurant » : privilégié 310 / 268 / 86,5 % ; anonyme retenu, tout nul.
--
-- Le `left join lateral ... on true` est celui de I12 et I14, pour la même raison : il transforme
-- « le volet n'est pas sorti du tout » en une ligne de nulls que cette requête peut voir. Une
-- retenue muette est exactement le défaut contrôlé ; un appel nu la laisserait se cacher dans les
-- zéro lignes que le lanceur lit comme un succès.
select coalesce(s.source, '(volet BDCom absent)') as source, s.withheld,
       s.cohort_n, s.survived_n, s.survival_rate
from (values (1)) t(x)
left join lateral (
  select b.* from public.compass_survival_by_trade(48.86229, 2.34490, 111::smallint) b
  where b.source = 'APUR BDCom'
) s on true
where s.source is null
   or s.withheld is distinct from true
   or s.cohort_n is not null
   or s.survived_n is not null
   or s.survival_rate is not null
limit 20;

-- @invariant I28 :: le volet Licence Ouverte est retenu par erreur, via compass_survival_by_trade
-- @as anon
-- Le miroir de I27, et il porte quelque chose que ce corpus n'avait jamais eu : le
-- premier vrai taux rendu à un appelant sans clé. SIRENE est en Licence Ouverte v2,
-- donc la ligne INSEE doit sortir complète — taux, effectif, survivants, période, et
-- l'`evidence` qui dit que les deux cohortes ne se comparent pas terme à terme. La
-- retenir « par prudence » détruirait la seule réponse publiable de la fonction.
--
-- Mesuré le 25 août 2026, Halles, niv18 111, appelant anonyme : 185 / 102 / 55,1 %,
-- `insufficient_n = false`, seuil de publication à 30 (compass_survival_min_cohort).
--
-- Même `left join lateral ... on true` que I27, et ici il porte le cas le plus probable de
-- retenue excessive : le pont NAF est partiel par conception (20260825000012), donc retirer le
-- métier du pont fait disparaître la ligne SIRENE au lieu de la vider. Un appel nu passerait.
select coalesce(s.source, '(volet SIRENE absent)') as source, s.withheld, s.insufficient_n,
       s.out_of_corpus, s.cohort_n, s.survived_n, s.survival_rate
from (values (1)) t(x)
left join lateral (
  select i.* from public.compass_survival_by_trade(48.86229, 2.34490, 111::smallint) i
  where i.source = 'INSEE SIRENE'
) s on true
where s.source is null
   or s.withheld is distinct from false
   or s.insufficient_n is distinct from false
   or s.out_of_corpus is distinct from false
   or s.cohort_n is null
   or s.survived_n is null
   or s.survival_rate is null
   or s.period_start is null
   or s.period_end is null
   or s.evidence is null or btrim(s.evidence) = ''
limit 20;

-- ===========================================================================
-- w0-conclusion (#54) — une conclusion ne se pose pas par-dessus une retenue
-- ===========================================================================
-- I23 et I24 passaient au vert pendant que le défaut vivait, et ce n'est pas un
-- oubli : I23 vérifie qu'une fonction PEUT annoncer sa retenue, I24 qu'un test
-- anonyme EXISTE. Ni l'un ni l'autre ne lit une phrase. Mesuré le 26 août 2026 :
-- I23 rendait 0 ligne et I24 recensait 6 fonctions toutes couvertes, alors que
-- compass_address_timeline justifiait encore une absence 2023 par « une absence
-- signifie « plus un commerce », pas « vacant » ». DIAGNOSTIC.md §15.
--
-- La règle que ces trois blocs écrivent tient en une phrase : UNE LIGNE EST UN
-- MILLÉSIME, ET UN MILLÉSIME N'ATTESTE AUCUN CHANGEMENT. Une phrase attachée à
-- une ligne ne peut donc affirmer un état antérieur — ni pour l'appelant anonyme,
-- à qui les millésimes antérieurs sont retenus, ni pour l'appelant privilégié, à
-- qui ils sont visibles et le contredisent. Le changement se compare ailleurs :
-- compass_premise_history.changed_from_previous, qui s'annule quand la
-- comparaison est impossible (points 10 et 19).
--
-- RESTRICTION DE POPULATION, saine et non un échantillon : kind = 'survey'. Les
-- lignes sale/proceeding relaient bodacc_establishment.origin_raw — la phrase de
-- la source, que src/i18n/timelineText.ts interdit de réécrire parce qu'elle est
-- la pièce. Même raisonnement que la restriction de I7.
--
-- LES FORMES INTERDITES, et l'absence de certaines est délibérée. Sont visées les
-- marques d'antériorité et de transition, pas le passé : la phrase de retenue dit
-- « sa licence n'a pas été lue », et une liste qui attraperait le passé composé
-- serait une liste qu'on désarmerait le jour où elle mord. « avant » seul est
-- écarté pour la même raison — « avant tout » est innocent. Même arbitrage que
-- I21, qui écarte le conditionnel et dit pourquoi.

-- @invariant I29 :: une evidence divulguée affirme un état antérieur que la même réponse retient
-- @as anon
-- Le défaut du ticket. Pour cet appelant, 2017 et 2020 reviennent withheld =
-- true / observed = null : aucune antériorité n'est recoupable, PAR CONSTRUCTION.
-- Toute phrase qui en affirme une conclut donc à partir de ce que la même réponse
-- vient de refuser de dire.
--
-- La population est tirée des locaux absents du millésime 2023, pas de 400 locaux
-- au hasard : c'est la branche à exercer, et un tirage aveugle la manquerait la
-- plupart du temps. 24 573 locaux sur 85 418 sont dans ce cas, mesuré le 26 août.
with absent_2023 as (
  select l.id
  from public.premise_location l
  where not exists (
    select 1 from public.premise_observation o
     where o.location_id = l.id and o.vintage_id = 2023)
  order by l.id
  limit 400
)
select a.id as location_id, t.occurred_on, left(t.evidence, 160) as evidence
from absent_2023 a
cross join lateral public.compass_address_timeline(a.id) t
where t.kind = 'survey'
  and not t.withheld
  and (t.evidence ~* '\y(plus une?|n''est plus|ne sont plus|redevenue?s?|devenue?s?|auparavant|autrefois|anciennement|jusqu''alors|désormais)\y'
       or t.confidence_reason ~* '\y(plus une?|n''est plus|ne sont plus|redevenue?s?|devenue?s?|auparavant|autrefois|anciennement|jusqu''alors|désormais)\y')
limit 20;

-- @invariant I30 :: la même affirmation, sur le chemin privilégié qui voit tout
-- Pas un doublon de I29, et la mesure le prouve. Le 26 août 2026, sur les 24 573
-- locaux absents du millésime 2023, répartis par leur dernier relevé connu :
--
--   Autre local        niv8 7   hors périmètre commerce   12 367
--   Local vacant       niv8 6   hors périmètre commerce    6 280
--   les six postes de commerce restants                    5 926
--
-- 18 647 sur 24 573, soit 75,9 %, n'étaient pas un commerce à leur dernier relevé.
-- Un local relevé vacant en 2020 n'a jamais été un commerce : il ne peut pas avoir
-- cessé de l'être. « Plus un commerce » était donc faux pour trois lignes sur
-- quatre même quand les trois millésimes sont visibles — ce qui a écarté la
-- correction dépendante du privilège et imposé la réduction uniforme.
--
-- Ce bloc tient aussi la ligne si quelqu'un rendait un jour cette prose dépendante
-- de l'appelant : I29 seul passerait alors au vert sur une base fausse.
with absent_2023 as (
  select l.id
  from public.premise_location l
  where not exists (
    select 1 from public.premise_observation o
     where o.location_id = l.id and o.vintage_id = 2023)
  order by l.id
  limit 400
)
select a.id as location_id, t.occurred_on, left(t.evidence, 160) as evidence
from absent_2023 a
cross join lateral public.compass_address_timeline(a.id) t
where t.kind = 'survey'
  and not t.withheld
  and (t.evidence ~* '\y(plus une?|n''est plus|ne sont plus|redevenue?s?|devenue?s?|auparavant|autrefois|anciennement|jusqu''alors|désormais)\y'
       or t.confidence_reason ~* '\y(plus une?|n''est plus|ne sont plus|redevenue?s?|devenue?s?|auparavant|autrefois|anciennement|jusqu''alors|désormais)\y')
limit 20;

-- @invariant I31 :: une absence de millésime restreint cesse de dire pourquoi elle n'apprend rien
-- @as anon
-- Le miroir, sur le patron de I10, I13, I15, I17 et I26 : la sur-correction est
-- une faute au même titre que l'affirmation. Retirer la phrase, ou la remplacer
-- par la formule générique du millésime au périmètre complet, satisferait I29 et
-- I30 en faisant perdre au lecteur le seul fait qui rend l'absence inexploitable —
-- que cette couche NE PUBLIE PAS les locaux vacants (7 853 en 2017, 8 764 en 2020,
-- bdcom_vintage.licence_note du millésime 2023).
--
-- D'où l'ancrage sur « vacant » : la phrase doit nommer ce que la couche ne publie
-- pas. Ce n'est pas en contradiction avec I29/I30, qui interdisent l'antériorité
-- et non le mot.
with absent_2023 as (
  select l.id
  from public.premise_location l
  where not exists (
    select 1 from public.premise_observation o
     where o.location_id = l.id and o.vintage_id = 2023)
  order by l.id
  limit 400
)
select a.id as location_id, t.occurred_on, t.evidence
from absent_2023 a
cross join lateral public.compass_address_timeline(a.id) t
join public.bdcom_vintage v
  on t.kind = 'survey' and make_date(v.year, 1, 1) = t.occurred_on
where v.scope = 'retail_only'
  and t.observed = false
  and not t.withheld
  and (t.evidence is null or btrim(t.evidence) = ''
       or t.evidence !~* '\yvacants?\y')
limit 20;

-- ===========================================================================
-- w0-appelant (#58) — le test d'appelant, une seule expression et une décision
-- ===========================================================================
-- I23 et I24 recensent les fonctions qui *doivent* retenir. Ils ne disent rien
-- de *comment* chacune décide qui est privilégié — et la réponse était recopiée
-- à l'identique dans les six, sous un commentaire disant « copié verbatim pour
-- qu'elles ne divergent pas ». Une intention, là où I23 avait mis une garantie.
--
-- I32 fait de l'unicité une règle. I33 et I34 jouent la décision du 26 août
-- 2026 dans les deux sens : un compte créé sur le site n'est pas privilégié, et
-- le rôle de service ne cesse pas de l'être.

-- @invariant I32 :: le test d'appelant est recopié dans une fonction au lieu d'être appelé
-- Deux exigences, et il faut les deux — même forme que I23.
--
--   AUCUNE COPIE. Une fonction compass_* autre que compass_caller_is_privileged
--     qui lit `request.jwt.claims` dans son corps a réécrit la décision au lieu
--     de l'appeler. C'est ce qui a rendu DIAGNOSTIC.md §12 puis §21 possibles :
--     la même règle en six exemplaires, dont deux appliquées à une fonction
--     `SECURITY INVOKER` où elle ne pouvait pas tenir. La septième fonction
--     naîtra par copier-coller de la sixième — compass_street_rotation est née
--     comme ça (§19) — et c'est ce chemin-là qui est fermé ici.
--
--   ET L'APPEL. Interdire la copie ne force pas l'appel : une septième fonction
--     pourrait ne tester personne du tout et rendre `withheld = false` en dur.
--     Le second volet exige donc que toute fonction de la population de I23 —
--     celles qui lisent une table dont RLS peut retirer des lignes — appelle
--     compass_caller_is_privileged(). La population est dérivée du catalogue,
--     comme celle de I23, et non d'une liste que quelqu'un doit penser à tenir.
--
-- CE QUE I32 NE RATTRAPE PAS, et la limite compte autant que la règle :
--   — `prosrc` est du texte. Une fonction qui rejouerait la décision autrement
--     — `current_user`, `session_user`, un GUC applicatif, une table de rôles —
--     n'est pas vue. La règle interdit la copie, pas la réinvention.
--   — Elle ne juge pas l'usage. `not (privilégié or redistribuable)` inversé
--     appelle bien la fonction et retient exactement à l'envers. Ce sont les
--     paires de comportement (I9/I10 … I27/I28) et I33 qui l'attrapent.
--   — Elle ne dit rien du contenu de la décision. Un jour où le privilège
--     changerait de définition, I32 resterait vert : c'est I33 et I34 qui
--     portent la décision elle-même.
--   — Elle ne couvre que le schéma `public` et le préfixe `compass_`. Une
--     fonction posée ailleurs, ou nommée autrement, sort de la population — même
--     angle mort que I23 et I24, et pour la même raison : la population est le
--     périmètre exposé à PostgREST.
--
-- Mesuré le 26 août 2026 sur le distant, après 20260826000002 : zéro ligne, six
-- fonctions dans la population du second volet, toutes appelantes. Éprouvé par
-- sabotage — `npm.cmd run eval:sabotage` crée une septième fonction qui recopie
-- le test, dans une transaction annulée, et cet invariant passe au rouge quand
-- I23, lui, reste vert : c'est précisément ce que I23 ne pouvait pas voir.
with restricted as (
  select c.relname
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
    -- Deux facons d'etre restreinte, et la seconde manquait — w1-observabilite (#72).
    and (
      -- (a) une politique SELECT existe et retire des lignes.
      exists (
        select 1 from pg_policy p
         where p.polrelid = c.oid
           and p.polcmd in ('r', '*')
           and coalesce(pg_get_expr(p.polqual, p.polrelid), '') <> 'true')
      -- (b) RLS est active et AUCUNE politique SELECT n'existe : la table est vide pour tout
      -- role non privilegie. C'est le cas le plus dur de retrait silencieux, et la population
      -- d'origine ne le voyait pas — elle exigeait une politique. DIAGNOSTIC.md §37.
      or not exists (
        select 1 from pg_policy p
         where p.polrelid = c.oid and p.polcmd in ('r', '*'))
    )
)
select p.proname, 'recopie le test : lit request.jwt.claims dans son corps' as raison
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname like 'compass\_%'
  and p.proname <> 'compass_caller_is_privileged'
  and p.prosrc ~ 'request\.jwt\.claim'
union all
select distinct p.proname,
       'lit ' || r.relname || ' sans appeler compass_caller_is_privileged()' as raison
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join restricted r on p.prosrc ~ ('\y' || r.relname || '\y')
where n.nspname = 'public'
  and p.proname like 'compass\_%'
  -- Meme restriction de population que I23 et I24, meme raison : un ecrivain qui rend `void`
  -- ne decide rien pour un appelant, donc il n'a pas de decision d'appelant a appeler. #72.
  and p.prorettype <> 'void'::regtype
  and p.prosrc !~ 'compass_caller_is_privileged'
limit 20;

-- @invariant I33 :: un compte créé sur le site est traité comme un appelant privilégié
-- @as authenticated
-- La décision du 26 août 2026, jouée : `authenticated` n'est PAS privilégié.
-- Créer un compte n'est pas une lecture de licence — 2017 et 2020 portent
-- `publicly_redistributable = false` parce que la licence APUR n'a pas été lue,
-- et elle ne l'a pas été davantage pour un inscrit. Révisable sur un seul
-- événement, une réponse de l'APUR (#49). Voir docs/CONTEXTE.md.
--
-- Deux volets, et le second est ce qui empêche la décision de rester une
-- déclaration : le premier lit le verdict, le second lit ce que l'appelant
-- reçoit réellement. Un `not (privilégié or redistribuable)` inversé passerait
-- le premier et pas le second.
--
-- Halles (48,86229 / 2,34490), 800 m, millésime 2017 : une ligne, marquée. Avant
-- 20260826000002 le même appelant en recevait **4 773**, mesuré le 26 août 2026
-- sur le distant — et zéro avant 20260825000014, qui est le défaut §21.
--
-- Le lanceur pose le claim et n'émet pas `set local role` : c'est donc bien le
-- test de claim qui est éprouvé, jamais RLS en dessous. Les six fonctions sont
-- `SECURITY DEFINER`, RLS ne les protège plus, et ce test est la seule porte.
select 'compass_caller_is_privileged' as ou,
       'privilège accordé à un compte créé sur le site' as defaut
where public.compass_caller_is_privileged()
union all
select 'compass_premises_within',
       'millésime retenu : ' || t.lignes || ' ligne(s), ' || t.marquees || ' marquée(s), attendu 1 et 1'
from (
  select count(*) as lignes, count(*) filter (where withheld) as marquees
  from public.compass_premises_within(
    48.86229::double precision, 2.34490::double precision,
    800::double precision, 2017::smallint, 500::integer)
) t
where t.lignes <> 1 or t.marquees <> 1
limit 20;

-- @invariant I34 :: le rôle de service perd le privilège
-- @as service_role
-- Le contre-test, et la moitié qui se saute. Corriger l'appelant `authenticated`
-- en retirant aussi le privilège à ceux qui *exploitent* Compass serait pire que
-- le défaut : les chargeurs, la porte elle-même et le serveur MCP lisent tous
-- les trois millésimes, et un `withheld` posé là passerait pour une base vide.
--
-- Même famille que I10, I13, I15, I17, I26 et I31 : la sur-correction est une
-- faute au même titre que l'affirmation.
--
-- Ce test couvre le claim `service_role`, celui que PostgREST pose avec la clé
-- de service. La connexion directe, elle, ne porte aucun claim et retombe sur le
-- `coalesce` — chemin exercé par tous les autres invariants, qui échoueraient en
-- masse s'il basculait.
select 'compass_caller_is_privileged' as ou,
       'privilège retiré au rôle de service' as defaut
where not public.compass_caller_is_privileged()
limit 20;

-- ===========================================================================
-- w1-licence-derivee (#59) — la licence d'un chiffre dérivé de deux millésimes
-- ===========================================================================
-- I23 et I24 ont rendu la RETENUE mécanique : la règle est énumérée depuis le
-- catalogue au lieu d'être réécrite par fonction. Ces trois blocs font la même
-- chose pour l'ÉTIQUETTE — la question voisine, et restée une habitude : quand un
-- chiffre dérive de N sources de licences différentes, laquelle porte-t-il ?
--
-- La réponse est la plus restrictive, et elle ne demande aucun ordre entre
-- licences : le schéma porte déjà `publicly_redistributable`. Si l'un des
-- millésimes dont le chiffre dérive n'est pas redistribuable, c'est lui qui
-- gouverne. Voir 20260827000001.
--
-- CE QUE « DÉRIVE DE » VEUT DIRE ICI, et la précision compte. Le taux BDCom lit
-- exactement DEUX millésimes : la cohorte et celui où la survie est constatée.
-- Une période 2017 -> 2023 *enjambe* 2020 sans le lire — 2020 n'entre dans aucun
-- dénombrement, et sa licence n'a donc pas à être citée. Les blocs se règlent sur
-- les deux bornes, pas sur l'intervalle : citer 2020 serait une sur-correction du
-- même genre que celles que I10, I13 et I31 interdisent ailleurs.

-- @invariant I35 :: un taux dérivé de deux millésimes cite la licence du plus permissif
-- Le défaut du ticket, et il vivait sur le chemin privilégié — donc ce bloc n'est
-- PAS `@as anon`. Pour l'appelant anonyme la ligne est retenue, et la branche de
-- retenue citait déjà la bonne licence ; c'est la branche divulguée qui se
-- trompait. Mesuré le 27 août 2026 sur `dbefhvmyfmmhjeetdddu`, Halles, niv18 111,
-- appelant privilégié : 310 · 268 · 86,5 % étiqueté `ODbL-1.0`, alors que la
-- cohorte 2017 porte `custom` et `publicly_redistributable = false`.
--
-- La règle est RECALCULÉE ICI depuis `bdcom_vintage`, jamais en appelant
-- `compass_derived_licence` : un invariant qui interroge la fonction qu'il
-- surveille passe au vert avec elle quand elle se trompe. Même raison que I23,
-- qui lit le catalogue plutôt que la liste que la fonction tient d'elle-même.
--
-- Balayage des 80 quartiers × les trois métiers du pont NAF : 240 appels. Pas un
-- échantillon — la population entière des lignes BDCom que cette fonction sait
-- produire aujourd'hui. Coût mesuré le 27 août 2026 : 9,2 s à froid, 1,9 s dans
-- la porte, cache chaud. C'est le second chiffre qui décrit son coût réel.
with lignes as (
  select q.id as quartier_id, t.niv18, s.period_start, s.period_end, s.licence, s.withheld
  from public.quartier q
  cross join (values (111::smallint), (102::smallint), (104::smallint)) as t(niv18)
  cross join lateral public.compass_survival_by_trade(
    ST_Y(ST_PointOnSurface(q.geom::geometry))::double precision,
    ST_X(ST_PointOnSurface(q.geom::geometry))::double precision,
    t.niv18) s
  where s.source = 'APUR BDCom'
),
gouvernante as (
  select l.*,
         (select string_agg(distinct v.licence, ' + ' order by v.licence)
            from public.bdcom_vintage v
           where v.year in (extract(year from l.period_start)::smallint,
                            extract(year from l.period_end)::smallint)
             and not v.publicly_redistributable) as retenue
  from lignes l
)
select quartier_id, niv18, period_start, period_end, licence, retenue
from gouvernante
where retenue is not null and licence is distinct from retenue
limit 20;

-- @invariant I36 :: la règle de licence dérivée étiquette tout au plus restrictif
-- Le miroir, sur le patron de I10, I13, I15, I17, I26, I31 et I34 : la
-- sur-correction est une faute au même titre que le défaut. Une correction qui
-- renverrait `custom` sans regarder — ou qui citerait la cohorte par principe —
-- satisferait I35 en étiquetant « non redistribuable » des chiffres qui ne le sont
-- pas, et fermerait la porte à la seule couche ouverte du corpus.
--
-- POURQUOI CE BLOC NE PASSE PAS PAR LA FONCTION DE SURVIE. Le contre-test que le
-- ticket demande — « une ligne dont les deux millésimes sont redistribuables cite
-- toujours la bonne licence » — est INEXPRIMABLE sur les données réelles : un seul
-- millésime sur trois est redistribuable (2023), et un taux exige deux bornes
-- distinctes. Il n'existe donc aucune paire redistribuable à interroger. Le
-- contre-test se pose ici sur le millésime seul, qui est réel, et la paire est
-- éprouvée par sabotage : le 27 août 2026, 2020 passé à
-- `publicly_redistributable = true, licence = 'ODbL-1.0'` dans une transaction
-- annulée, la cohorte 2020 -> 2023 rend 323 · 91,6 % étiqueté **`ODbL-1.0`** et
-- non `custom`. Dire ce que la règle ne rattrape pas vaut mieux qu'un bloc vert
-- sur une population vide.
select v.year, v.licence as sienne,
       public.compass_derived_licence(array[v.id]) as derivee
from public.bdcom_vintage v
where v.publicly_redistributable
  and public.compass_derived_licence(array[v.id]) is distinct from v.licence
limit 20;

-- @invariant I37 :: une fonction qui compose deux millésimes choisit sa licence à la main
-- La moitié structurelle, sur le patron de I32 : I35 et I36 vérifient la fonction
-- qui existe, celui-ci vise la SUIVANTE. Une fonction née demain qui composerait
-- deux millésimes et rechercherait sa licence par un `select v.licence` à elle
-- repartirait du même défaut, et I35 ne la regarderait pas — il ne connaît que
-- `compass_survival_by_trade`.
--
-- LA POPULATION EST TIRÉE DES ARGUMENTS, pas du corps : une fonction qui prend
-- **deux** paramètres de millésime compose deux millésimes, c'est ce que la
-- signature veut dire. `compass_vintages` en prend zéro et rend une ligne PAR
-- millésime — chaque licence y est la sienne, aucune dérivation, exempte à juste
-- titre. `compass_address_timeline` rend `source_licence` par ligne et par
-- millésime, même raison, et c'est pourquoi la colonne cherchée ici est reconnue
-- au suffixe `licence` plutôt qu'au nom exact.
--
-- CE QUE I37 NE RATTRAPE PAS : il lit `prosrc`, comme I23 et I32. Une fonction qui
-- composerait deux millésimes reçus autrement que par deux paramètres nommés — un
-- tableau, une plage de dates — n'est pas vue. Le faux négatif coûte un défaut, le
-- faux positif une lecture : le critère est volontairement large côté colonne
-- (tout nom finissant par `licence`) et étroit côté signature, faute de pouvoir
-- lire une dérivation dans du texte.
with fonction as (
  select p.proname,
         p.prosrc,
         -- pg_proc.proargnames PORTE LES DEUX : les `pronargs` premiers noms sont
         -- les paramètres, le reste sont les colonnes de sortie d'un `returns
         -- table`. Mesuré le 27 août 2026 — sans la coupe, `compass_vintages`
         -- était convoquée à tort par ses colonnes `vintage_year` et
         -- `vintage_scope`, alors qu'elle ne prend aucun paramètre. Un piège de
         -- catalogue, et le genre de faux positif qu'on désarme au lieu de lire.
         coalesce(p.proargnames[1:p.pronargs], '{}') as entrees,
         coalesce(p.proargnames[p.pronargs + 1:], '{}') as sorties
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname like 'compass\_%'
)
select f.proname,
       (select count(*) from unnest(f.entrees) a where a like '%vintage%') as args_millesime
from fonction f
where exists (select 1 from unnest(f.sorties) a where a like '%licence')
  and (select count(*) from unnest(f.entrees) a where a like '%vintage%') >= 2
  and f.prosrc !~ 'compass_derived_licence'
limit 20;

-- ===========================================================================
-- w1-catalogue (#73) — TESTER : ce qu'on reçoit veut-il encore dire ce qu'on
-- en a mappé
-- ===========================================================================
-- VÉRIFIER et TESTER ne sont pas la même chose, et l'ordre compte. Vérifier,
-- c'est demander à la source si elle répond encore et déclare encore la licence
-- qu'on a consignée — c'est `npm.cmd run catalogue`, et cela ne touche pas la
-- base. Tester, c'est demander si ce qu'on en reçoit veut encore dire ce qu'on
-- en a mappé, et cela ne peut se demander qu'ici.
--
-- Les 24 baselines couvrent le VOLUME : un effondrement se voit. Elles ne voient
-- pas un code qui change de sens à volume constant, et c'est exactement ce qui
-- est arrivé le 25 août 2026 avec le pont NAF (DIAGNOSTIC.md §20) : `101` lu
-- comme Alimentaire quand la nomenclature dit Grand magasin, et `114` qui
-- n'existe pas. Volume inchangé, sens faux. I22 est né de là, sur une seule
-- nomenclature ; celui-ci est le même geste sur une autre.

-- @invariant I38 :: la nomenclature de codes des chantiers sort du domaine que la source documente
-- La généralisation de I22 à une seconde nomenclature, et le premier test de ce
-- type portant sur une source RECHARGÉE périodiquement plutôt que sur une table
-- écrite une fois par migration.
--
-- Trois colonnes de `chantier_perturbant` portent des codes que la Ville de Paris
-- documente elle-même dans la « Description des codes » du jeu
-- chantiers-perturbants, lue le 25 août 2026 et recopiée dans
-- scripts/ingest/chantiers.ts et dans la migration 20260825000007 :
--
--   statut               1 à venir · 2 en cours · 3 suspendu · 4 prolongé · 5 terminé
--   typologie            1 Ville · 2 Concessionnaire · 3 Privé
--   niveau_perturbation  1 très perturbant · 2 perturbant
--
-- `statut_label` est résolu UNE FOIS au chargement, à partir de cette table, et
-- stocké. C'est ce qui rend la dérive silencieuse possible : le jour où la Ville
-- réattribue un code, le chargeur écrit l'ancien libellé sur la nouvelle
-- signification et rien, ni le volume ni un `not null`, ne bronche.
--
-- POURQUOI ICI ET PAS SEULEMENT DANS LE CHARGEUR. `chantiers.ts` lève déjà sur un
-- `statut` inconnu — mais une garde sur le chemin du chargeur ne protège que le
-- chargeur. Elle ne dit rien de l'état DÉJÀ stocké, elle ne voit pas une écriture
-- faite depuis psql ou la console Supabase, et elle ne protège pas l'appelant qui
-- lit la table par PostgREST en direct. La règle vit là où la valeur est produite
-- et conservée, pas seulement là où elle entre.
--
-- CE QUE I38 NE RATTRAPE PAS, et c'est la même limite que I22 : un code qui
-- EXISTE mais nomme autre chose. Si la Ville garde le code 3 en changeant sa
-- définition de « suspendu » à « annulé », les cinq codes sont toujours là, le
-- libellé stocké est toujours celui du chargeur, et rien ici ne s'en aperçoit.
-- Seule une lecture de la fiche du jeu l'attrape, et aucune règle ne remplace
-- d'avoir lu. `impact_circulation` est délibérément absent : ses quatre valeurs
-- (RESTREINTE, BARRAGE_TOTAL, SENS_UNIQUE, IMPASSE) sont un vocabulaire OBSERVÉ
-- le 25 août 2026, pas une table de codes que la source publie — en faire un
-- domaine reviendrait à traiter notre propre relevé comme une nomenclature, ce
-- que ce ticket refuse ailleurs.
--
-- Mesuré le 5 septembre 2026 sur le distant : 120 chantiers, statuts 1, 2 et 4
-- présents avec les libellés attendus, typologies 1 à 3, niveaux 1 et 2 — zéro
-- ligne hors domaine.
with statut(code, libelle) as (
  values (1, 'à venir'), (2, 'en cours'), (3, 'suspendu'), (4, 'prolongé'), (5, 'terminé')
), typologie(code) as (
  values (1), (2), (3)
), niveau(code) as (
  values (1), (2)
)
select 'statut' as colonne, c.statut::text as valeur, c.statut_label as libelle_stocke,
       count(*)::bigint as lignes
  from public.chantier_perturbant c
  left join statut s on s.code = c.statut
 where s.code is null or s.libelle is distinct from c.statut_label
 group by 1, 2, 3
union all
select 'typologie', c.typologie::text, null, count(*)::bigint
  from public.chantier_perturbant c
 where c.typologie is not null
   and not exists (select 1 from typologie t where t.code = c.typologie)
 group by 1, 2, 3
union all
select 'niveau_perturbation', c.niveau_perturbation::text, null, count(*)::bigint
  from public.chantier_perturbant c
 where c.niveau_perturbation is not null
   and not exists (select 1 from niveau n where n.code = c.niveau_perturbation)
 group by 1, 2, 3
limit 20;

-- @invariant I39 :: le journal d'usage garde une ligne au-delà de sa rétention
-- w1-observabilite (#72). Un journal sans date de purge devient un stock, et la
-- rétention est écrite : 180 jours, la raison en tête de 20260905000001.
--
-- POURQUOI UN INVARIANT ET PAS SEULEMENT LA PURGE. `compass_record_question`
-- purge en ouvrant un seau d'un jour neuf, ce qui est la bonne place — la règle
-- vit là où la valeur est produite, et une sauvegarde ancienne restaurée dans la
-- table ne survit pas à l'écriture suivante. Mais cette purge est MUE PAR L'USAGE :
-- un journal qui cesse d'être écrit cesse d'être purgé et garde ce qu'il avait.
-- C'est l'état d'aujourd'hui, où le trafic est nul. Cet invariant, lui, tourne
-- dans la porte quotidienne et ne dépend de personne.
--
-- Il lit `question_tally_retention_days()`, jamais le nombre : deux endroits qui
-- portent 180 sont deux rétentions, et c'est la faute que §31 a coûtée sur les
-- seuils de cadence.
--
-- CE QU'IL NE RATTRAPE PAS : il voit une ligne trop vieille, jamais une ligne qui
-- n'aurait pas dû être écrite. Un seau écrit aujourd'hui avec un contenu fautif
-- est dans sa fenêtre et passe — c'est le travail de I40.
select t.jour,
       current_date - t.jour            as age_jours,
       public.question_tally_retention_days() as retention_jours,
       t.appelee, t.issue, t.appels
from public.question_tally t
where t.jour < current_date - public.question_tally_retention_days()
limit 20;

-- @invariant I40 :: le journal d'usage porte une colonne hors de son énumération
-- Le livrable doctrinal de w1-observabilite (#72), et la réponse à « est-ce que ça
-- survit à un rechargement ». Corriger une donnée n'est pas corriger un défaut :
-- vider une colonne `ip` ne sert à rien si la colonne existe encore, parce que la
-- prochaine migration, le prochain import ou la prochaine console la remplira.
--
-- La règle porte donc sur la FORME et non sur le contenu. `question_tally` classe
-- des requêtes, jamais des gens : les colonnes qu'elle a le droit de porter sont
-- énumérées ici une fois, et toute colonne hors de cette liste est un rouge — que
-- son nom soit `ip`, `session_id`, `user_id`, `lat`, `troncon_id` ou `heure`.
--
-- POURQUOI UNE LISTE BLANCHE ET NON UNE LISTE NOIRE. C'est la mécanique de
-- `compass_caller_is_privileged()` (§26) : un laissez-passer nominatif refuse par
-- défaut ce que personne n'a prévu, une liste noire laisse passer le nom auquel
-- personne n'a pensé. `ip_hash`, `client_key`, `trace_id` ne sont sur aucune liste
-- noire écrite d'avance et sont exactement ce qui arriverait.
--
-- Le second volet vise la granularité : `quartier_code` est une clé étrangère vers
-- `public.quartier(code)`, dont la population est de 80 lignes. Retirer la
-- contrainte rendrait la colonne capable de porter un tronçon — 25 094 valeurs,
-- soit une adresse à quelques portes près. La contrainte EST la granularité, et
-- une granularité qui ne tient qu'à la discipline de l'écrivain n'en est pas une.
--
-- CE QU'IL NE RATTRAPE PAS, et c'est entier : il lit des NOMS et un type. Une
-- colonne nommée `axe` qui se mettrait à porter un identifiant de session le
-- ferait sans que rien ici ne bronche — même limite que I22 et I38, celle de toute
-- règle qui ne remplace pas d'avoir lu. Et il ne couvre que cette table : un
-- journal parallèle créé ailleurs sort de la population.
with permises(nom) as (
  values ('jour'), ('surface'), ('appelee'), ('axe'), ('rayon_max_m'), ('millesime'),
         ('quartier_code'), ('issue'), ('appels'), ('latence_ms_total'), ('latence_ms_max')
)
select a.attname as colonne, format_type(a.atttypid, a.atttypmod) as type,
       'colonne hors de l''énumération de question_tally' as motif
from pg_attribute a
join pg_class c on c.oid = a.attrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'question_tally'
  and a.attnum > 0 and not a.attisdropped
  and not exists (select 1 from permises p where p.nom = a.attname)
union all
select 'quartier_code', 'clé étrangère absente',
       'question_tally.quartier_code ne référence plus public.quartier : la granularité '
       'n''est plus une contrainte'
where not exists (
  select 1
  from pg_constraint k
  join pg_class c  on c.oid = k.conrelid
  join pg_class cf on cf.oid = k.confrelid
  where k.contype = 'f' and c.relname = 'question_tally' and cf.relname = 'quartier'
)
limit 20;

-- @invariant I41 :: le résumé d'usage rend un quartier sur un effectif d'une seule question
-- @as anon
-- La moitié de comportement, en face des deux moitiés structurelles ci-dessus, et
-- la couverture que I24 exige : `compass_question_summary` lit `question_tally`,
-- qui porte RLS sans aucune politique de lecture, donc elle entre d'office dans la
-- population de I23 depuis que celle-ci voit ce cas-là.
--
-- La règle : devant un appelant public, un quartier dont l'effectif est UN ne sort
-- pas. Un seau de quartier à un seul appel est ce que cette table a de plus proche
-- d'une question unique, et le ticket interdit d'en rendre une. Le reste de la
-- ligne sort entier et `withheld` le dit — une retenue muette redevient un
-- silence, ce que §9 a coûté.
--
-- 2 n'est pas un seuil réglé : c'est le plus petit effectif qui ne soit pas un
-- singleton, et il ne bougera pas avec le trafic. Un seuil qui se déplace serait
-- l'analyse que ce ticket diffère tant qu'il n'y a rien à nourrir.
--
-- CE QU'IL NE RATTRAPE PAS : un quartier qui atteint 2 peut rester une personne
-- qui a demandé deux fois. La règle écarte la ligne unique, elle ne fabrique pas
-- de l'anonymat par le nombre — à trafic nul, aucune règle ne le peut. Et sur une
-- table vide il passe sans rien éprouver : la démonstration se fait au sabotage,
-- en transaction annulée, comme pour I38.
select s.appelee, s.issue, s.quartier_code, s.appels, s.withheld
from public.compass_question_summary() s
where s.quartier_code is not null and s.appels < 2
limit 20;

-- @invariant I42 :: une colonne géographique porte une coordonnée non finie, ou rien ne le lui interdit
-- Le livrable doctrinal de #68, et la raison pour laquelle ce ticket n'est pas
-- « quinze lignes à corriger ». Les quinze POINT(NaN NaN) de `premise_location`
-- étaient inoffensifs, et ils l'étaient par accident : tout chemin de rayon du
-- produit passe par `ST_DWithin`, qui rend `false` sur une géométrie non finie.
-- Ça, c'est une propriété de la FORME DU PRÉDICAT, pas une garantie du schéma.
-- `geom` était `not null`, ce qui était satisfait ; aucune contrainte ne demandait
-- que la coordonnée soit finie ; rien ne regardait.
--
-- QU'IL N'Y AIT PAS DE GARANTIE N'ÉTAIT PAS THÉORIQUE. Dix des quinze portaient
-- un `street_segment_id` posé par `scripts/ingest/geography.ts` avec
-- `order by l.geom <-> s.geom`, une distance qui valait NaN — sept d'entre eux le
-- même tronçon, sur les six de la rue des Cheminots. Le second prédicat du dépôt
-- n'était pas `ST_DWithin`, et il a produit une réponse fausse le jour où il a
-- tourné. `#65` en avait mesuré un troisième, `&& _ST_Expand`, qui aurait ajouté
-- quinze locaux fantômes à chaque requête de rayon.
--
-- DEUX MOITIÉS, comme I40. Le CONTENU dit qu'aucune colonne ne porte de
-- coordonnée non finie aujourd'hui ; la FORME dit que chaque colonne porte une
-- contrainte qui l'interdit. La seconde est celle qui empêche la seizième ligne
-- et la table suivante ; la première est celle qui ne croit pas la seconde sur
-- parole.
--
-- POURQUOI LE CONTENU EST QUAND MÊME BALAYÉ alors que les contraintes existent :
-- une contrainte prouve ce qu'elle dit, pas ce qu'on croit qu'elle dit. Un
-- `check` posé `not valid`, ou une expression subtilement fausse, laisserait la
-- moitié structurelle verte sur une table sale. Le balayage coûte ~12 s sur les
-- 312 000 lignes géographiques du corpus, mesuré le 5 septembre 2026 — un tiers
-- de l'alerte du bras A.
--
-- POPULATION ÉNUMÉRÉE DEPUIS `pg_attribute`, jamais tenue à la main — même
-- mécanique que I23 et I24. Une table géographique ajoutée demain entre dans la
-- règle sans que personne ait à s'en souvenir, et elle y entre EN ROUGE tant
-- qu'elle n'a pas sa contrainte : la règle arrive avant les données.
--
-- LE PIÈGE, et il a eu la première version du recensement de #68 : en Postgres
-- `NaN = NaN` est VRAI. Le test IEEE qu'on écrit d'instinct — `not (ST_X(g) =
-- ST_X(g))` — rend ZÉRO ligne sur une table qui en porte quinze. D'où le test sur
-- le WKT, qui a par ailleurs le mérite de valoir pour une ligne ou un polygone,
-- où le non-fini peut être sur n'importe quel sommet, et d'attraper `Infinity`
-- autant que `NaN`. Aucun nom de type WKT ne contient « nan » ni « inf ».
--
-- CE QU'IL NE RATTRAPE PAS, et c'est trois choses.
--
-- 1. UNE COORDONNÉE FINIE ET FAUSSE. POINT(0 0), un point resté en Lambert 93,
--    l'adresse du voisin : tout cela est fini, et rien ici ne bronche. La règle
--    rend impossible l'absence déguisée en mesure, pas la mesure fausse — même
--    limite que I22 sur un code NAF réel mais mal lu.
-- 2. LA MOITIÉ STRUCTURELLE LIT UNE EXPRESSION, PAS SON SENS. Elle exige un
--    `check` validé, portant sur la colonne, dont la définition mentionne « nan ».
--    Une contrainte qui mentionnerait NaN sans rien interdire passerait. C'est le
--    contenu qui la rattrape, et c'est pour ça qu'il y a deux moitiés.
-- 3. LES SCHÉMAS QUE L'ÉNUMÉRATION ÉCARTE. `extensions`, `tiger`, `topology` sont
--    ceux de PostGIS lui-même ; une colonne géographique posée là sortirait de la
--    population. Personne n'a de raison d'en poser une, et c'est écrit ici plutôt
--    que supposé.
--
-- Démontré rouge sur une seizième ligne fabriquée, en transaction annulée, dans
-- l'acte 6 de `npm.cmd run eval:sabotage` — avec le contrôle positif que la
-- contrainte, elle, refuse cette ligne tant qu'on ne l'a pas retirée.
with colonnes as (
  select n.nspname as sch, c.relname as tbl, a.attname as col,
         c.oid as reloid, a.attnum as attnum
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_type t on t.oid = a.atttypid
  where t.typname in ('geography', 'geometry')
    and c.relkind in ('r', 'p', 'm')
    and n.nspname not in ('pg_catalog', 'information_schema', 'extensions',
                          'tiger', 'tiger_data', 'topology')
    and a.attnum > 0 and not a.attisdropped
),
contenu as (
  select k.*,
         (xpath('/row/n/text()', query_to_xml(format(
            $q$select count(*) n from %I.%I
                where %I is not null
                  and extensions.ST_AsText(%I::extensions.geometry) ~* '(nan|inf)'$q$,
            k.sch, k.tbl, k.col, k.col), false, true, '')))[1]::text::bigint as non_finies
  from colonnes k
)
select c.sch || '.' || c.tbl || '.' || c.col as colonne,
       c.non_finies::text                    as detail,
       'coordonnée non finie en base'        as motif
from contenu c
where c.non_finies > 0
union all
select k.sch || '.' || k.tbl || '.' || k.col, 'aucune',
       'aucune contrainte CHECK validée n''interdit le non-fini sur cette colonne'
from colonnes k
where not exists (
  select 1
  from pg_constraint x
  where x.conrelid = k.reloid
    and x.contype = 'c'
    and x.convalidated
    and k.attnum = any (x.conkey)
    and pg_get_constraintdef(x.oid) ~* 'nan'
)
limit 20;

-- ===========================================================================
-- w6-analyse (#50) — les quatre analyses que le schéma permettait déjà
-- ===========================================================================
-- Quatre fonctions naissent d'un coup, et toutes les quatre lisent
-- `premise_observation` — la SEULE table restreinte parmi celles qu'elles
-- touchent, mesuré le 6 septembre 2026 : toutes les autres politiques `select`
-- ont pour qual `true`. Elles entrent donc d'office dans la population de I23 et
-- de I24, et ces quatre invariants sont ce que I24 exige : un test `@as anon`
-- qui APPELLE chacune. Une mention en commentaire ne vaut pas couverture.
--
-- La forme suit I25/I26 plutôt que de s'inventer : un invariant qui vérifie
-- qu'on ne divulgue pas, un qui vérifie qu'on ne retient pas trop. Une version
-- qui retiendrait tout satisfait le premier et fait échouer le second.

-- @invariant I43 :: un appelant anonyme reçoit une matrice de transition dérivée d'un millésime retenu
-- @as anon
-- §6.1. La variante la plus simple à écrire et la plus facile à rater, parce que
-- la bonne réponse ici est « rien, et voici pourquoi » plutôt qu'un nombre.
--
-- UNE TRANSITION DÉRIVE DE DEUX MILLÉSIMES, et un seul des trois est
-- redistribuable. Les trois couples possibles — 2017→2020, 2017→2023, 2020→2023 —
-- contiennent donc tous un millésime retenu, et il n'existe AUCUN couple servable
-- à un appelant anonyme aujourd'hui. Ce n'est pas un défaut de la fonction, c'est
-- l'état de la licence APUR ; le jour où elle répond, ce même invariant devient
-- la garde qui empêche 2017 de sortir si seule 2020 a été autorisée.
--
-- Mesuré le 6 septembre 2026, 41 rue Berger (48,86197 / 2,34306), 150 m,
-- 2020→2023 : appelant privilégié 14 couples de métiers dont 9 changements ;
-- appelant anonyme UNE ligne, `withheld = true`, aucune colonne de contenu.
select t.from_niv18, t.to_niv18, t.premises, t.withheld
from public.compass_activity_transitions(48.8619711, 2.3430585, 150, 2020::smallint, 2023::smallint) t
where t.withheld is distinct from true
   or t.from_niv18 is not null or t.to_niv18 is not null
   or t.from_label is not null or t.to_label is not null
   or t.premises is not null
limit 20;

-- @invariant I44 :: un appelant anonyme reçoit un dénombrement de voie issu d'un millésime retenu
-- @as anon
-- §6.3, et c'est I25 transposé d'un tronçon à une voie — délibérément, parce que
-- les deux fonctions répondent à la même question à deux grains et qu'un appelant
-- ne doit pas avoir deux conventions à apprendre.
--
-- Deux exigences, la seconde étant celle qui se saute :
--   un millésime retenu sort comme UNE ligne marquée, sans voie ni dénombrement ;
--   un millésime rendu dont le PRÉCÉDENT est retenu porte `changed_since_previous`
--     NUL — « ce qui a changé depuis 2020 » est un fait sur 2020, et répondre 0
--     là est le zéro fabriqué de DIAGNOSTIC.md §19.
--
-- Mesuré le 6 septembre 2026, 41 rue Berger, 150 m : appelant privilégié, les
-- trois millésimes sur 8 voies ; appelant anonyme, deux lignes marquées (2017,
-- 2020) et 2023 servi avec `changed_since_previous` nul.
with vintage as (
  select v.year,
         v.publicly_redistributable                             as odbl,
         lag(v.year) over (order by v.year)                     as previous_year,
         lag(v.publicly_redistributable) over (order by v.year) as previous_odbl
  from public.bdcom_vintage v
)
select r.vintage_year, r.withheld, r.voie_id, r.premises, r.changed_since_previous
from public.compass_voie_rotation(48.8619711, 2.3430585, 150) r
join vintage vi on vi.year = r.vintage_year
where case
  when not vi.odbl then
    r.withheld is distinct from true
    or r.voie_id is not null or r.voie_name is not null or r.segments is not null
    or r.premises is not null or r.vacant is not null
    or r.changed_since_previous is not null
  else
    r.changed_since_previous is not null
    and (vi.previous_year is null or not coalesce(vi.previous_odbl, false))
end
limit 20;

-- @invariant I45 :: une retenue excessive sur la voie, ou un vide réel rendu comme un fait
-- @as anon
-- Le miroir de I44, et la moitié qui manquerait si on ne l'écrivait pas : retenir
-- trop est une faute aussi. Le millésime ODbL doit sortir avec ses voies et ses
-- dénombrements, et un rayon réellement vide ne doit produire aucune ligne de
-- contenu — jamais une ligne à zéro, qui affirmerait une rue sans commerce.
--
-- Comme I26, le marqueur de retenue ne dépend pas du rayon : à 1 m sur Châtelet
-- un appelant anonyme reçoit quand même les deux lignes marquées 2017 et 2020,
-- qui n'affirment rien sur le lieu, et zéro ligne de contenu.
select * from (
  select 'millésime ODbL retenu ou vidé'::text as probleme, v.year::text as detail
  from public.bdcom_vintage v
  where v.publicly_redistributable
    and not exists (
      select 1 from public.compass_voie_rotation(48.8619711, 2.3430585, 150) r
      where r.vintage_year = v.year
        and r.withheld is not true
        and r.voie_id is not null
        and r.premises > 0)
  union all
  select 'contenu rendu sur un rayon réellement vide', r.vintage_year::text
  from public.compass_voie_rotation(48.8566, 2.3522, 1) r
  where r.withheld is not true
) x
limit 20;

-- @invariant I46 :: un prix ou une part par métier sort d'un millésime retenu, ou publie un effectif sous le seuil
-- @as anon
-- §6.4 et §6.5 dans un seul invariant, parce que c'est une seule règle : le PRIX
-- et les AVIS viennent de BODACC et sont ouverts, le MÉTIER vient de BDCom et
-- peut être retenu. Servir un prix sans son métier répondrait à une autre
-- question ; c'est donc le millésime du métier qui gouverne la ligne entière.
--
-- Sur le millésime 2023, ODbL, les deux fonctions servent un appelant anonyme —
-- et c'est voulu : ce sont les premières analyses de cette famille qu'un visiteur
-- reçoit vraiment. La garde porte alors sur le SEUIL : une médiane ou une part
-- calculée sous `compass_survival_min_cohort()` décrirait le hasard autant que le
-- métier, et le seuil est une colonne de la réponse plutôt qu'une convention.
--
-- Demandé sur 2017, les deux doivent rendre une ligne marquée et rien d'autre.
-- Mesuré le 6 septembre 2026, 41 rue Berger : sur 2023, 6 métiers dont 3 servis
-- et 3 sous le seuil à 800 m ; quartier des Halles, 6 métiers servis, part de
-- ventes de 11,2 % à 32,2 %. Sur 2017, une ligne `withheld` de chaque côté.
select * from (
  select 'prix servi sur un millésime retenu'::text as probleme,
         p.activity_label as detail
  from public.compass_price_by_activity(48.8619711, 2.3430585, 800, 2017::smallint) p
  where p.withheld is distinct from true
     or p.activity_niv18 is not null or p.sales_n is not null
     or p.median_price_eur is not null
  union all
  select 'part servie sur un millésime retenu', s.activity_label
  from public.compass_sales_vs_collective(48.8619711, 2.3430585, 2017::smallint) s
  where s.withheld is distinct from true
     or s.activity_niv18 is not null or s.sales_n is not null
     or s.sales_share is not null
  union all
  select 'médiane publiée sous le seuil', p.activity_label
  from public.compass_price_by_activity(48.8619711, 2.3430585, 800) p
  where p.median_price_eur is not null and p.sales_n < public.compass_survival_min_cohort()
  union all
  select 'part publiée sous le seuil', s.activity_label
  from public.compass_sales_vs_collective(48.8619711, 2.3430585) s
  where s.sales_share is not null and s.notices_n < public.compass_survival_min_cohort()
  union all
  -- Le contre-test : retenir tout satisferait les quatre clauses ci-dessus.
  select 'millésime ODbL entièrement retenu', '2023'
  where not exists (
    select 1 from public.compass_price_by_activity(48.8619711, 2.3430585, 800) p
    where p.withheld is not true and p.sales_n > 0)
     or not exists (
    select 1 from public.compass_sales_vs_collective(48.8619711, 2.3430585) s
    where s.withheld is not true and s.notices_n > 0)
) x
limit 20;
