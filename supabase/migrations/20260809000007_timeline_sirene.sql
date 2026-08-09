-- The chronology uses SIRENE corroboration.
--
-- Loaded on 2026-08-09: of the 84 026 insolvency notices published at a
-- registered office we could locate, SIRENE places an establishment of the same
-- company within 50 m for 82 144 of them, and explicitly does not for 1 882 —
-- companies that file here and operate elsewhere. That second number is a
-- finding, not a gap, and it is why the check is worth running rather than
-- assumed.
--
-- Corroboration does not make a notice `etabli`. SIRENE says the company has an
-- establishment at the address; it does not say the company is the ground-floor
-- shop rather than an office upstairs. `corrobore` names exactly that: two
-- independent public sources place it here, and neither names the premise.
--
-- `at_address > 1` is now tested first and wins over everything. When several
-- premises share a number, no notice can name one of them — corroborating the
-- company's presence at the address changes nothing about which shopfront.

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
  activity_code     text,
  label             text,
  detail            text,
  amount_eur        numeric,
  evidence          text,
  confidence        public.compass_confidence,
  confidence_reason text
)
language sql stable parallel safe security invoker
set search_path = public, extensions
as $$
  with premise as (
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
      case when o.id is not null
           then 'bdcom:' || v.year || ':' || o.source_ordre end as source_ref,
      v.source_url                           as source_url,
      v.licence                              as source_licence,
      'survey'::text                         as kind,
      (o.id is not null)                     as observed,
      o.activity_code                        as activity_code,
      a.label                                as label,
      o.sign_name                            as detail,
      null::numeric                          as amount_eur,
      case
        when o.id is null and v.scope = 'retail_only'
          then 'Millésime restreint aux commerces : une absence signifie « plus un commerce », pas « vacant ».'
        when o.id is null
          then 'Millésime au périmètre complet : le local n''y figure pas comme rez-de-chaussée avec vitrine.'
        else 'Relevé de terrain, identifiant ' || o.source_ordre || ', rattachement ' || o.match_method
      end                                    as evidence,
      case
        when o.id is null then 'indetermine'::public.compass_confidence
        when o.match_method = 'ordre_address_conflict' then 'probable'
        else 'etabli'
      end                                    as confidence,
      case
        when o.id is null then 'observed = false'
        when o.match_method = 'ordre_address_conflict'
          then 'identifiant réattribué à un autre local entre deux millésimes'
        else 'observed = true, match_method = ' || o.match_method
      end                                    as confidence_reason
    from public.bdcom_vintage v
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
        -- Several premises share the number: no notice can name one of them,
        -- whatever else corroborates it.
        when p.at_address > 1 then 'probable'::public.compass_confidence
        when e.address_source = 'siege_social' and e.operator_confirmed
          then 'corrobore'
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
  'came from (`source_ref`, `source_url`), its evidence, and a derived confidence '
  'level. Render this table; never rewrite it. A null label with observed = false '
  'means the premise was not surveyed that year — not that it was vacant, and not '
  'that it stopped being a shop.';

grant execute on function public.compass_address_timeline(bigint) to anon, authenticated;
