-- Correction to 20260809000008: the privilege test never fired.
--
-- The function is SECURITY DEFINER, and inside one `current_user` is the
-- function's owner rather than whoever called it. So the test always concluded
-- "privileged" and the licence restriction applied to nobody — while the RLS
-- policy on the table worked perfectly, which is what made it look right.
--
-- Found by querying as an anonymous role instead of as the owner. The privileged
-- path is the one that always works, which is exactly why exercising it proves
-- nothing about what a visitor sees. Both paths now have a golden case.

drop function if exists public.compass_address_timeline(bigint);

create function public.compass_address_timeline(p_location_id bigint)
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
      case when o.id is null then false
           when c.privileged or v.publicly_redistributable then true end as observed,
      (o.id is not null and not (c.privileged or v.publicly_redistributable)) as withheld,
      case when c.privileged or v.publicly_redistributable then o.activity_code end as activity_code,
      case when c.privileged or v.publicly_redistributable then a.label end as label,
      case when c.privileged or v.publicly_redistributable then o.sign_name end as detail,
      null::numeric                          as amount_eur,
      case
        when o.id is not null and not (c.privileged or v.publicly_redistributable)
          then 'Relevé existant mais non redistribuable : la licence de ce millésime n''a pas été lue. Question envoyée à l''APUR.'
        when o.id is null and v.scope = 'retail_only'
          then 'Millésime restreint aux commerces : une absence signifie « plus un commerce », pas « vacant ».'
        when o.id is null
          then 'Millésime au périmètre complet : le local n''y figure pas comme rez-de-chaussée avec vitrine.'
        else 'Relevé de terrain, identifiant ' || o.source_ordre || ', rattachement ' || o.match_method
      end                                    as evidence,
      case
        when o.id is null then 'indetermine'::public.compass_confidence
        when not (c.privileged or v.publicly_redistributable) then 'indetermine'
        when o.match_method = 'ordre_address_conflict' then 'probable'
        else 'etabli'
      end                                    as confidence,
      case
        when o.id is null then 'observed = false'
        when not (c.privileged or v.publicly_redistributable)
          then 'contenu retenu pour raison de licence, pas absent'
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
  'observed = false means unsurveyed; observed = null means withheld.';

grant execute on function public.compass_address_timeline(bigint) to anon, authenticated;
