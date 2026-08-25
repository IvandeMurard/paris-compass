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
