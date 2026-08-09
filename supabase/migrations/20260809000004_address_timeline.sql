-- The chronology of one premise, assembled once so nobody retypes it.
--
-- Both errors that prompted this function were made in prose, not in the
-- database: an unobserved census year rendered as "no longer a shop", and an
-- example price from another premise read as this one's. The columns were right
-- each time; the sentence was not.
--
-- So the sentence is generated. Every row carries the fact, the piece of
-- evidence behind it, and a confidence level derived from columns that already
-- exist — never typed, never estimated. A caller that renders this table cannot
-- assert what the data does not say, because it never sees a bare value.
--
-- One definition, three consumers: the interface, the exportable dossier
-- (PLAN §2.6) and the MCP server's answer to an agent (PLAN §4.1).

create type public.compass_confidence as enum ('etabli', 'probable', 'indetermine');

comment on type public.compass_confidence is
  'etabli — the source names this premise directly and the evidence is attached. '
  'probable — the fact is documented but its link to THIS premise is inferred. '
  'indetermine — the source is silent, and the row says so rather than guessing. '
  'Three levels, not a score: a percentage of confidence would be exactly the '
  'kind of unverifiable number this product refuses.';


create or replace function public.compass_address_timeline(p_location_id bigint)
returns table (
  occurred_on       date,
  granularity       text,   -- `precision` is reserved in Postgres
  source            text,
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
    select l.id, l.street_key, l.num, l.street_match,
           (select count(*) from public.premise_location p
             where p.street_key = l.street_key and p.num = l.num) as at_address
    from public.premise_location l
    where l.id = p_location_id
  ),

  -- BDCom: one row per census, including the ones where the premise was not
  -- recorded. The absence is the finding, so it is a row and not a gap.
  survey as (
    select
      make_date(v.year, 1, 1)                as occurred_on,
      'year'::text                           as granularity,
      'APUR BDCom ' || v.year                as source,
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

  -- BODACC: notices published at the same address. BODACC identifies an address,
  -- BDCom a premise, and up to 120 premises share one — so a notice is only
  -- `etabli` when this premise is alone at its number.
  notice as (
    select
      an.published_on                        as occurred_on,
      'day'::text                            as granularity,
      'BODACC ' || case an.family when 'vente' then 'cession' else 'procédure collective' end as source,
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
        when e.address_source = 'siege_social' then 'probable'::public.compass_confidence
        when p.at_address > 1                 then 'probable'
        when an.family = 'vente' and e.price_eur is null then 'indetermine'
        else 'etabli'
      end                                    as confidence,
      case
        when e.address_source = 'siege_social'
          then 'adresse de siège social, non de l''établissement'
        when p.at_address > 1
          then p.at_address || ' locaux partagent cette adresse : lequel est concerné n''est pas publié'
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
  'Everything known about one premise, in order, each row carrying its evidence '
  'and a derived confidence level. Render this table; never rewrite it. A null '
  'label with observed = false means the premise was not surveyed that year — '
  'not that it was vacant, and not that it stopped being a shop.';

grant execute on function public.compass_address_timeline(bigint) to anon, authenticated;
