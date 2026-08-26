-- w0-conclusion (#54) — une conclusion tirée par-dessus une retenue.
--
-- DIAGNOSTIC.md §15. On a `retail_only` vintage — 2023 — an unobserved premise
-- carried this justification, written on 9 August in 20260809000004 and copied
-- unchanged through six migrations since:
--
--   « Millésime restreint aux commerces : une absence signifie « plus un
--     commerce », pas « vacant ». »
--
-- « Plus un commerce » asserts a TRANSITION, so a prior state. Two things are
-- wrong with that, and the second one is why this is not a caller-dependent fix.
--
-- 1. For an anonymous caller the prior state is withheld IN THE SAME ANSWER:
--    2017 and 2020 come back `withheld = true`, `observed = null`, « ni son
--    contenu ni son existence ». The row concludes from vintages the function
--    has just refused to speak about. Family of points 9 to 12, new variant: not
--    a withholding rendered as a fact, but a conclusion drawn over a withholding.
--
-- 2. The sentence is false for the PRIVILEGED caller too. Measured 26 August 2026
--    on dbefhvmyfmmhjeetdddu: of the 24 573 premises absent from the 2023 vintage
--    (out of 85 418), 18 647 — 75,9 % — were already outside the retail perimeter
--    at their last observation: 12 367 « Autre local » (niv8 7) and 6 280 « Local
--    vacant » (niv8 6). A premise recorded vacant in 2020 never was a shop, so it
--    cannot have stopped being one. The claim is wrong for three rows in four even
--    when all three vintages are visible.
--
--    bdcom_vintage.licence_note said so in 20260808000003 — « Vacant premises
--    (7 853 in 2017, 8 764 in 2020) and non-commercial ground-floor premises are
--    absent » — and nothing ever cross-checked the sentence against it.
--
-- So the fix is the UNIFORM reduction, the rule 20260809000011 already chose for
-- this function, rather than a sentence that depends on the caller: the second
-- would have left a measurably false claim on the privileged path.
--
-- The new sentence states the scope and refuses every conclusion. It never names
-- « vacant » or « plus un commerce » — deliberately, and not only for elegance:
-- I29/I30 forbid anteriority forms in this column, and a corrective sentence that
-- quoted the conclusion it forbids would trip its own rule, or force the rule to
-- be written loosely enough to be useless.
--
-- `create or replace` rather than drop+create: neither the signature nor the
-- returned columns move, and replacing in place keeps the grants. Only the one
-- CASE branch differs from 20260815000001 — everything else is that function,
-- unchanged. confidence, confidence_rule (`not_observed`) and confidence_reason
-- (`observed = false`) are untouched: the mechanism was right, the prose was not.

create or replace function public.compass_address_timeline(p_location_id bigint)
returns table (
  occurred_on       date,
  granularity       text,
  source            text,
  source_ref        text,
  source_url        text,
  source_licence    text,
  kind              text,
  observed          boolean,
  withheld          boolean,
  activity_code     text,
  label             text,
  detail            text,
  amount_eur        numeric,
  evidence          text,
  confidence        public.compass_confidence,
  confidence_rule   public.compass_confidence_rule,
  confidence_reason text
)
language sql stable parallel safe security definer
set search_path = public, extensions
as $$
  with caller as (
    -- Inside SECURITY DEFINER, `current_user` is the function owner, not the
    -- caller — testing it always answers "privileged" and hides nothing. The
    -- caller's identity is the role PostgREST puts in a per-request setting.
    -- A direct database connection carries none, and is privileged by
    -- definition: it already holds the credentials.
    select coalesce(
             nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role',
             nullif(current_setting('request.jwt.claim.role', true), ''),
             'service_role'
           ) <> 'anon' as privileged
  ),
  premise as (
    select l.id, l.street_key, l.num,
           (select count(*) from public.premise_location p
             where p.street_key = l.street_key and p.num = l.num) as at_address
    from public.premise_location l
    where l.id = p_location_id
  ),

  survey as (
    select
      make_date(v.year, 1, 1)                as occurred_on,
      'year'::text                           as granularity,
      'APUR BDCom ' || v.year                as source,
      case when o.id is not null and (c.privileged or v.publicly_redistributable)
           then 'bdcom:' || v.year || ':' || o.source_ordre end as source_ref,
      v.source_url                           as source_url,
      v.licence                              as source_licence,
      'survey'::text                         as kind,
      -- Null, not false, when the row is withheld: we are not saying it was
      -- unobserved, we are saying we cannot tell you.
      -- Null whenever the vintage is withheld — including when no observation
      -- exists. Saying "not surveyed here" about a dataset we may not
      -- redistribute still discloses that dataset, and would let a reader infer
      -- which premises it contains by watching where the answer changes.
      case when not (c.privileged or v.publicly_redistributable) then null
           when o.id is null then false
           else true end                     as observed,
      not (c.privileged or v.publicly_redistributable) as withheld,
      case when c.privileged or v.publicly_redistributable then o.activity_code end as activity_code,
      case when c.privileged or v.publicly_redistributable then a.label end as label,
      case when c.privileged or v.publicly_redistributable then o.sign_name end as detail,
      null::numeric                          as amount_eur,
      case
        when not (c.privileged or v.publicly_redistributable)
          then 'Millésime non redistribuable publiquement : sa licence n''a pas été lue. Rien n''est dit de ce relevé, ni son contenu ni son existence. Question envoyée à l''APUR.'
        when o.id is null and v.scope = 'retail_only'
          then 'Millésime restreint aux commerces : le local n''y figure pas. Cette couche ne publie que les commerces — ni locaux vacants, ni locaux non commerciaux — donc l''absence ne permet aucune conclusion sur l''état du local.'
        when o.id is null
          then 'Millésime au périmètre complet : le local n''y figure pas comme rez-de-chaussée avec vitrine.'
        else 'Relevé de terrain, identifiant ' || o.source_ordre || ', rattachement ' || o.match_method
      end                                    as evidence,
      case
        when not (c.privileged or v.publicly_redistributable) then 'indetermine'::public.compass_confidence
        when o.id is null then 'indetermine'
        when o.match_method = 'ordre_address_conflict' then 'probable'
        else 'etabli'
      end                                    as confidence,
      case
        when not (c.privileged or v.publicly_redistributable) then 'vintage_licence_withheld'
        when o.id is null then 'not_observed'
        when o.match_method = 'ordre_address_conflict' then 'ordre_reattributed'
        else 'observed_matched'
      end::public.compass_confidence_rule     as confidence_rule,
      case
        when not (c.privileged or v.publicly_redistributable)
          then 'millésime retenu pour raison de licence : ni contenu ni existence'
        when o.id is null then 'observed = false'
        when o.match_method = 'ordre_address_conflict'
          then 'identifiant réattribué à un autre local entre deux millésimes'
        else 'observed = true, match_method = ' || o.match_method
      end                                    as confidence_reason
    from public.bdcom_vintage v
    cross join caller c
    left join public.premise_observation o
      on o.vintage_id = v.id and o.location_id = p_location_id
    left join public.bdcom_activity a on a.code = o.activity_code
  ),

  notice as (
    select
      an.published_on                        as occurred_on,
      'day'::text                            as granularity,
      'BODACC ' || case an.family when 'vente' then 'cession' else 'procédure collective' end as source,
      an.id                                  as source_ref,
      an.url                                 as source_url,
      'Licence Ouverte'::text                as source_licence,
      case an.family when 'vente' then 'sale' else 'proceeding' end as kind,
      true                                   as observed,
      false                                  as withheld,
      null::text                             as activity_code,
      coalesce(j.nature, e.activity, an.trader_name) as label,
      an.trader_name                         as detail,
      e.price_eur                            as amount_eur,
      coalesce(
        e.origin_raw,
        case when e.address_source = 'siege_social'
             then 'Adresse du siège social de l''entreprise, pas de l''établissement.'
             else 'Adresse de l''établissement cédé.' end
      )                                      as evidence,
      case
        when p.at_address > 1 then 'probable'::public.compass_confidence
        when e.address_source = 'siege_social' and e.operator_confirmed then 'corrobore'
        when e.address_source = 'siege_social' then 'probable'
        when an.family = 'vente' and e.price_eur is null then 'indetermine'
        else 'etabli'
      end                                    as confidence,
      case
        when p.at_address > 1 then 'shared_address'
        when e.address_source = 'siege_social' and e.operator_confirmed then 'siege_confirmed'
        when e.address_source = 'siege_social' and e.operator_confirmed = false then 'siege_infirmed'
        when e.address_source = 'siege_social' then 'siege_unverified'
        when an.family = 'vente' and e.price_eur is null then 'price_unreadable'
        else 'establishment_single_address'
      end::public.compass_confidence_rule     as confidence_rule,
      case
        when p.at_address > 1
          then p.at_address || ' locaux partagent cette adresse : lequel est concerné n''est pas publié'
        when e.address_source = 'siege_social' and e.operator_confirmed
          then 'siège social, et SIRENE place un établissement de cette entreprise à moins de 50 m'
        when e.address_source = 'siege_social' and e.operator_confirmed = false
          then 'siège social, et SIRENE ne place aucun établissement de cette entreprise ici'
        when e.address_source = 'siege_social'
          then 'adresse de siège social, non de l''établissement, non vérifiée dans SIRENE'
        when an.family = 'vente' and e.price_eur is null
          then 'prix non lisible dans la phrase publiée'
        else 'adresse d''établissement, local seul à son adresse'
      end                                    as confidence_reason
    from premise p
    join public.bodacc_establishment e
      on e.street_key = p.street_key and e.house_number_int = p.num
    join public.bodacc_announcement an on an.id = e.announcement_id
    left join public.bodacc_judgment j on j.announcement_id = an.id
  )

  select * from survey
  union all
  select * from notice
  order by occurred_on, source;
$$;

comment on function public.compass_address_timeline is
  'Everything known about one premise, in order, each row carrying the record it '
  'came from, its evidence, and a derived confidence level. SECURITY DEFINER so '
  'that a licence restriction is reported as `withheld = true` — a row saying '
  '"this exists and cannot be shown" — instead of silently becoming an absence. '
  'observed = false means unsurveyed; observed = null means withheld. '
  'confidence_rule is the machine-checkable twin of confidence_reason: same '
  'branches, a stable code instead of a sentence. No evidence sentence asserts a '
  'prior state: one row is one vintage, and one vintage evidences no change '
  '(w0-conclusion #54, invariants I29 to I31).';

-- Re-stated rather than assumed: I11 reads this grant, and 20260809000009 is the
-- precedent for a rule that was true by accident rather than by declaration.
grant execute on function public.compass_address_timeline(bigint) to anon, authenticated;
