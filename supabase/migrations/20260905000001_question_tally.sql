-- Le journal des questions — w1-observabilite (#72).
--
-- Compass ne sait pas quelles questions il ne sait pas repondre. Chaque axe qui revient `n/a`
-- est une demande a laquelle le corpus n'a pas repondu, et rien n'en gardait trace : la liste
-- des sources a brancher etait donc classee par un jugement ecrit d'avance, jamais par ce que
-- l'usage reclame.
--
-- CE QUI EST ENREGISTRE : la surface appelee, le nom de la fonction ou de l'outil, l'axe quand
-- il y en a un, la tranche de rayon, le millesime, le quartier, l'issue, la latence.
-- CE QUI NE L'EST PAS : aucune identite, aucun compte, aucune adresse IP, aucun identifiant de
-- session, aucun horodatage plus fin que le jour, aucun ordre d'arrivee, aucune coordonnee.
--
-- ----------------------------------------------------------------------------------------
-- POURQUOI DES COMPTEURS ET NON DES LIGNES, et c'est la decision qui porte tout le reste.
-- ----------------------------------------------------------------------------------------
-- Une table a une ligne par appel se recoud. Deux lignes de la meme heure, dans le meme
-- quartier, avec des identifiants consecutifs, sont un parcours — sans qu'aucune colonne ne
-- nomme personne. La cle primaire elle-meme aurait suffi : un `bigserial` publie l'ordre
-- d'arrivee, et l'ordre d'arrivee est la moitie d'un parcours.
--
-- Cette table ne porte donc pas d'appels, elle porte des DENOMBREMENTS. `appels` s'incremente
-- sur un seau (jour, surface, appelee, axe, rayon, millesime, quartier, issue). Il n'existe
-- aucune ligne brute a rendre, aucun ordre a lire, et deux questions du meme jour ne peuvent
-- pas etre reliees : elles sont soit dans le meme seau — donc indiscernables — soit dans deux
-- seaux qu'aucune colonne n'ordonne.
--
-- CE QUE CA NE RATTRAPE PAS, et il faut le nommer : la CO-OCCURRENCE reste visible. Un jour ou
-- deux seaux seulement portent `appels = 1`, un lecteur peut conjecturer qu'il s'agit d'une
-- meme personne. Il ne peut pas l'etablir — rien ne les relie et rien ne les ordonne — et la
-- conjecture s'affaiblit a mesure que le trafic monte. C'est une limite du volume, pas du
-- schema, et elle est a son maximum aujourd'hui, ou le trafic est nul.
--
-- ----------------------------------------------------------------------------------------
-- LA GRANULARITE DE LA COORDONNEE : LE QUARTIER. Tranche ici, avec sa raison.
-- ----------------------------------------------------------------------------------------
-- Le ticket laissait trois choix — le troncon, le quartier, ou la coordonnee brute.
--
--   brute      c'est une adresse. « Quelle adresse a ete demandee » n'est pas une question
--              sur le produit, c'est une question sur quelqu'un.
--   troncon    25 094 troncons pour Paris (20260808000002) : un troncon est un cote de rue
--              entre deux carrefours, soit une poignee d'immeubles. C'est une adresse a
--              quelques portes pres, et la difference ne tient pas devant l'usage reel du
--              journal — personne ne branchera une source parce qu'un troncon est mal servi.
--   quartier   80 polygones. Il repond exactement a la question que le ticket pose :
--              « quels quartiers sont demandes et mal servis ». C'est le choix retenu.
--
-- Et la granularite n'est pas une politesse du chargeur : `quartier_code` est une CLE
-- ETRANGERE vers `public.quartier(code)`, dont la population est de 80 lignes. Une migration,
-- un import ou une console qui tenterait d'y ecrire un troncon ou une coordonnee violerait la
-- contrainte. Il n'existe par ailleurs aucune colonne capable de porter une latitude : ce
-- n'est pas une regle que le code respecte, c'est une forme que la table n'a pas. C'est ce qui
-- fait qu'un rechargement ne peut pas reintroduire l'etat fautif — I40 le recense.
--
-- ----------------------------------------------------------------------------------------
-- LE JOUR ET NON L'HEURE.
-- ----------------------------------------------------------------------------------------
-- L'heure aurait rendu la co-occurrence bien plus parlante — deux seaux de la meme heure dans
-- le meme quartier sont presque un parcours — et elle n'achete qu'une chose : la chronologie
-- fine d'un incident. C'est-a-dire le tableau de bord que ce ticket differe explicitement
-- tant qu'il n'y a rien a nourrir. Le jour repond a tout ce qui est demande ici : quels
-- quartiers, quels axes, quelles raisons, quel outil coute.

-- ----------------------------------------------------------------------------------------
-- LA RETENTION : 180 JOURS, et la raison est ecrite.
-- ----------------------------------------------------------------------------------------
-- Un journal sans date de purge devient un stock. Six mois, pour une raison qui tient au sujet
-- du journal et non a une prudence generale : il existe pour choisir la PROCHAINE SOURCE. Un
-- denombrement ne dit « ce quartier est mal servi » que contre le corpus qui l'a mal servi ;
-- des qu'une source est branchee, les seaux anterieurs decrivent un produit qui n'existe plus.
-- Huit sources sont arrivees entre le 25 aout et le 5 septembre 2026 : a ce rythme, un compte
-- de plus de six mois est un compte sur un autre produit. Six mois est par ailleurs plus long
-- que la plus longue vague, donc une vague peut regarder les precedentes.
--
-- LA PURGE EST JOUEE PAR L'ECRITURE, pas par un cron. `compass_record_question` supprime ce
-- qui a expire quand elle ouvre un seau d'un jour neuf — quelques fois par jour au plus, sur
-- une table minuscule. Un cron de plus serait une cadence a tenir dans cadence.json (#70) pour
-- une suppression que l'ecriture peut faire elle-meme, et une purge qui vit dans le producteur
-- survit a un rechargement : restaurer une sauvegarde ancienne dans cette table ne la garde
-- pas, la premiere ecriture suivante l'emporte.
--
-- CE QUE LA PURGE PAR L'ECRITURE NE RATTRAPE PAS : elle est mue par l'usage. Un journal qui
-- cesse d'etre ecrit cesse d'etre purge, et garde ce qu'il avait. C'est exactement l'etat
-- d'aujourd'hui — trafic nul. D'ou I39, qui echoue dans la porte quotidienne des qu'une ligne
-- survit a sa retention, sans dependre de personne.

create type public.question_surface as enum (
  'rpc',       -- une fonction compass_* appelee par PostgREST : le front, le MCP, ou un agent en direct
  'outil_mcp'  -- un outil du serveur MCP, la seule surface qui connaisse son propre nom
);

comment on type public.question_surface is
  'Ou la question a ete produite. `rpc` couvre les trois appelants a la fois, y compris '
  'l''agent qui appelle PostgREST en direct — c''est pourquoi l''ecriture vit dans la base et '
  'non dans le front : DIAGNOSTIC.md §9 a §12.';

create type public.question_outcome as enum (
  'repondu',            -- la question a recu sa reponse
  'vide',               -- le corpus couvre l'endroit et n'y a rien : une vraie absence, pas un n/a
  'retenue_licence',    -- millesime non redistribuable — DIAGNOSTIC.md §9 a §12, §19
  'hors_corpus',        -- le point n'est dans aucun des 80 quartiers — DIAGNOSTIC.md §16
  'source_injoignable', -- une source tierce n'a pas repondu : Overpass, typiquement
  'erreur'              -- la fonction a leve : un defaut chez nous, jamais une absence de donnee
);

comment on type public.question_outcome is
  'L''issue d''une question. Les trois raisons de n/a que le ticket exige de distinguer sont '
  'retenue_licence, hors_corpus et source_injoignable : elles ne mènent pas a la meme action — '
  'la premiere se leve par un courrier a l''APUR, la deuxieme par une source hors Paris, la '
  'troisieme par un miroir. `vide` n''est pas un n/a : c''est une reponse, et le Bois de '
  'Vincennes la donne (20260825000003).';

create table public.question_tally (
  jour          date not null,
  surface       public.question_surface not null,
  -- Le nom de la fonction ou de l'outil. Texte et non enum : une fonction neuve ne doit pas
  -- exiger une migration pour etre comptee, sans quoi elle ne le sera pas.
  appelee       text not null,
  -- L'axe, quand la ligne enregistre le verdict d'un axe plutot qu'un appel. Null sinon.
  axe           text,
  -- La tranche de rayon, jamais le rayon. Un rayon de 837 m est une empreinte ; « au plus
  -- 1200 » est une question. Les bornes sont celles du produit : 500 est le plafond de
  -- find_premises, 800 le rayon par defaut, 2000 celui de compass_max_radius_m().
  rayon_max_m   smallint,
  millesime     smallint,
  -- La coordonnee, a la seule granularite que cette table sache porter. La cle etrangere est
  -- la garantie : la population est de 80 lignes, un troncon n'y entre pas.
  quartier_code text references public.quartier(code),
  issue         public.question_outcome not null,

  -- L'effectif s'affiche avec la frequence : « trois personnes ont demande le 11e » n'est pas
  -- « le 11e est demande », et un denombrement qui cache son effectif fait passer l'un pour
  -- l'autre.
  appels           bigint  not null default 1,
  latence_ms_total bigint  not null default 0,
  latence_ms_max   integer,

  constraint question_tally_rayon_borne
    check (rayon_max_m is null or rayon_max_m in (250, 500, 800, 1200, 2000)),
  constraint question_tally_appels_positif check (appels > 0)
);

-- NULLS NOT DISTINCT (PG15+, l'instance est en 17.6) : sans lui, deux seaux sans axe et sans
-- quartier seraient distincts l'un de l'autre et la table redeviendrait un journal de lignes.
create unique index question_tally_seau_idx on public.question_tally
  (jour, surface, appelee, axe, rayon_max_m, millesime, quartier_code, issue)
  nulls not distinct;

create index question_tally_jour_idx on public.question_tally (jour);

comment on table public.question_tally is
  'Denombrements de questions posees au produit — jamais des appels, jamais des gens. Une '
  'ligne est un seau (jour, surface, appelee, axe, rayon, millesime, quartier, issue) et son '
  'effectif. Aucune identite, aucune session, aucun ordre d''arrivee, aucune coordonnee : deux '
  'questions ne peuvent pas etre reliees en un parcours. w1-observabilite (#72).';

comment on column public.question_tally.quartier_code is
  'Le quartier, et rien de plus fin. Cle etrangere vers les 80 quartiers : la granularite est '
  'une contrainte du schema, pas une discipline de l''ecrivain. Null quand la question ne '
  'portait pas de point, ou quand le point etait hors corpus.';

comment on column public.question_tally.appels is
  'Effectif du seau. Publie avec chaque frequence, parce qu''une frequence sans effectif '
  'transforme trois demandes en une tendance.';

alter table public.question_tally enable row level security;

-- Aucune politique SELECT, et aucun GRANT sur la table : le contenu ne se lit que par
-- compass_question_summary(), qui agrege. Une table de journal lisible ligne a ligne est un
-- journal de lignes, quoi que dise le schema.

-- La retention vit une seule fois, comme compass_max_radius_m(). Deux endroits qui portent
-- 180 sont deux retentions.
create or replace function public.question_tally_retention_days()
returns integer language sql immutable parallel safe as $$ select 180 $$;

comment on function public.question_tally_retention_days() is
  '180 jours. La raison est en tete de 20260905000001 : le journal sert a choisir la prochaine '
  'source, et un denombrement plus vieux que six mois decrit un corpus qui a change. Une seule '
  'expression : I39 lit celle-ci, la purge aussi.';


-- ----------------------------------------------------------------------------------------
-- L'ECRITURE. Une seule porte, et elle est dans la base.
-- ----------------------------------------------------------------------------------------
-- C'est la lecon de DIAGNOSTIC.md §9 a §12, transposee : une garde sur le chemin de l'ecran ne
-- protege que l'ecran. Le front, le serveur MCP et l'agent qui appelle PostgREST en direct
-- passent tous les trois par les fonctions compass_*, et c'est le seul point ou ils se
-- rejoignent. Une comptabilite tenue dans le front aurait compte le front.
--
-- Elle prend un point et n'en garde qu'un quartier. L'APPELANT NE CHOISIT PAS LA GRANULARITE :
-- il n'y a pas de parametre pour en demander une plus fine, et pas de colonne pour la ranger.
--
-- VOLATILE, et c'est ce qui rend l'ensemble possible. Mesure le 5 septembre 2026 sur le
-- distant : une fonction STABLE ne peut pas ecrire — « INSERT is not allowed in a non-volatile
-- function » — mais elle peut APPELER une fonction VOLATILE qui ecrit ; la volatilite n'est pas
-- transitive. Les fonctions de rayon restent donc STABLE PARALLEL SAFE, avec leurs plans et
-- leurs budgets intacts (DIAGNOSTIC.md §27 a §29), et journalisent quand meme.
create or replace function public.compass_record_question(
  p_surface      public.question_surface,
  p_appelee      text,
  p_issue        public.question_outcome,
  p_lat          double precision default null,
  p_lng          double precision default null,
  p_radius_m     double precision default null,
  p_vintage_year smallint         default null,
  p_axe          text             default null,
  p_latency_ms   integer          default null
)
returns void
language plpgsql volatile security definer
set search_path = public, extensions
as $$
declare
  v_quartier text;
  v_bande    smallint;
  v_neuf     boolean;
begin
  -- Un nom hors forme n'est pas compte. Sans borne, un appelant peut faire grossir la table
  -- d'un nom invente par appel — voir « ce que ca ne rattrape pas », en tete du fichier.
  if p_appelee is null or p_appelee !~ '^[a-z][a-z0-9_]{0,63}$' then
    return;
  end if;
  if p_axe is not null and p_axe !~ '^[a-z][a-z0-9_]{0,31}$' then
    return;
  end if;

  -- La tranche, jamais le rayon. Bornes du produit : 500 plafonne find_premises, 800 est le
  -- rayon par defaut, 2000 est compass_max_radius_m().
  v_bande := case
    when p_radius_m is null then null
    when p_radius_m <=  250 then 250
    when p_radius_m <=  500 then 500
    when p_radius_m <=  800 then 800
    when p_radius_m <= 1200 then 1200
    else 2000
  end;

  -- Le point devient un quartier ici, et disparait. Hors des 80 quartiers : null, ce que
  -- l'issue `hors_corpus` dit deja par ailleurs.
  if p_lat is not null and p_lng is not null then
    select q.code into v_quartier
    from public.quartier q
    where ST_Contains(q.geom::geometry, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326))
    limit 1;
  end if;

  -- LA DISTINCTION EST FAITE ICI, une seule fois, parce que c'est ici qu'on sait. Un appelant
  -- qui rend zero ligne ne peut pas dire si son rayon etait vide ou si son point etait hors
  -- des 80 quartiers : seule compass_scoring_context_within porte un marqueur out_of_corpus
  -- (20260825000003), compass_premises_within n'en a pas. Cette fonction, elle, vient de
  -- resoudre le quartier — donc un 'vide' sur un point qui n'est dans aucun quartier est un
  -- 'hors_corpus', et le journal ne confond pas deux demandes qui appellent deux actions
  -- differentes : une source hors Paris pour l'une, rien du tout pour l'autre.
  if p_issue = 'vide' and p_lat is not null and p_lng is not null and v_quartier is null then
    p_issue := 'hors_corpus';
  end if;

  -- LE JOURNAL NE FAIT JAMAIS ECHOUER LA REPONSE, et la garde vit ici plutot que chez chaque
  -- appelant : un seul endroit, donc une seule regle. Mesure le 5 septembre 2026 sur le
  -- distant : dans une transaction READ ONLY — ce que PostgREST ouvre sur un GET — l'ecriture
  -- est refusee, la garde l'avale, et la reponse sort intacte. Ce qui est perdu est la ligne
  -- de journal, jamais la reponse : c'est le bon sens du compromis.
  begin
  insert into public.question_tally as t
    (jour, surface, appelee, axe, rayon_max_m, millesime, quartier_code, issue,
     appels, latence_ms_total, latence_ms_max)
  values
    (current_date, p_surface, p_appelee, p_axe, v_bande, p_vintage_year, v_quartier, p_issue,
     1, coalesce(p_latency_ms, 0), p_latency_ms)
  on conflict (jour, surface, appelee, axe, rayon_max_m, millesime, quartier_code, issue)
  do update set
    appels           = t.appels + 1,
    latence_ms_total = t.latence_ms_total + excluded.latence_ms_total,
    latence_ms_max   = greatest(t.latence_ms_max, excluded.latence_ms_max)
  returning (t.appels = 1) into v_neuf;

  -- La purge se joue a l'ouverture d'un seau neuf, donc quelques fois par jour au plus.
  -- Elle vit dans le producteur : une sauvegarde ancienne restauree ici ne survit pas a
  -- l'ecriture suivante. Ce qu'elle ne rattrape pas est ecrit en tete, et I39 le couvre.
  if v_neuf then
    delete from public.question_tally
    where jour < current_date - public.question_tally_retention_days();
  end if;
  exception when others then
    -- Rien n'est relance et rien n'est journalise ailleurs : une alerte sur un journal qui
    -- n'a pas pu s'ecrire serait un canal de plus la ou personne ne lit (#77). I39 et I40
    -- surveillent le contenu de la table, pas le succes de chaque ecriture.
    null;
  end;
end;
$$;

comment on function public.compass_record_question is
  'Enregistre une QUESTION : la surface, la fonction ou l''outil, l''axe, la tranche de rayon, '
  'le millesime, le quartier, l''issue, la latence. Prend un point et n''en garde qu''un '
  'quartier — l''appelant ne peut pas demander plus fin, il n''y a ni parametre ni colonne '
  'pour cela. N''ecrit aucune identite, aucune session, aucun ordre d''arrivee. VOLATILE pour '
  'que les fonctions STABLE puissent l''appeler sans cesser de l''etre. w1-observabilite (#72).';

-- Ecrivable par tout le monde, et c'est le prix de la couverture : le front est anonyme, le
-- serveur MCP l'est aussi (w0-appelant, #58), et l'agent qui appelle PostgREST en direct l'est
-- par definition. Restreindre l'ecriture au role de service reviendrait a ne compter que
-- l'ingestion, c'est-a-dire personne.
grant execute on function public.compass_record_question(
  public.question_surface, text, public.question_outcome, double precision, double precision,
  double precision, smallint, text, integer
) to anon, authenticated;


-- ----------------------------------------------------------------------------------------
-- LA LECTURE. Un agregat, jamais une ligne.
-- ----------------------------------------------------------------------------------------
-- SECURITY DEFINER, et pas par confort : `question_tally` porte RLS sans aucune politique
-- SELECT, donc une fonction `security invoker` rendrait zero ligne a tout le monde. Zero ligne
-- se lit « personne n'a rien demande » — le defaut exact de DIAGNOSTIC.md §9, ou une retenue
-- de licence se rendait comme un quartier sans commerces. La fonction voit donc tout, et dit
-- ce qu'elle ne montre pas.
--
-- ELLE NE REND PAS LE JOUR. Les seaux sont sommes sur toute la fenetre de retention, et
-- `depuis` / `jusqu_a` disent laquelle. C'est ce qui empeche de reconstituer une chronologie a
-- partir d'un agregat : sans le jour, deux denombrements ne s'ordonnent pas.
--
-- ELLE RETIENT LE QUARTIER SOUS UN EFFECTIF DE 2, et c'est la seule retenue de cette fonction.
-- Un seau de quartier a un seul appel est ce que cette table a de plus proche d'une question
-- unique, et le ticket interdit d'en rendre une. 2 n'est pas un seuil regle — c'est le plus
-- petit effectif qui ne soit pas un singleton, et il ne se deplacera pas avec le trafic. Le
-- reste de la ligne est rendu entier : la retenue porte sur la coordonnee, la seule dimension
-- proche de quelqu'un, jamais sur ce qui a ete demande ni sur l'issue.
--
-- CE QUE LA RETENUE NE RATTRAPE PAS : un quartier qui atteint 2 peut rester une personne qui a
-- demande deux fois. La regle ecarte la ligne unique, elle ne fabrique pas de l'anonymat par le
-- nombre — a trafic nul, aucune regle ne le peut.
create or replace function public.compass_question_summary()
returns table (
  depuis           date,
  jusqu_a          date,
  surface          public.question_surface,
  appelee          text,
  axe              text,
  rayon_max_m      smallint,
  millesime        smallint,
  quartier_code    text,
  issue            public.question_outcome,
  appels           bigint,
  latence_ms_moyenne integer,
  latence_ms_max     integer,
  withheld         boolean
)
language sql stable parallel safe security definer
set search_path = public, extensions
as $$
  with fenetre as (
    select min(t.jour) as depuis, max(t.jour) as jusqu_a
    from public.question_tally t
  ),
  -- Premiere passe : le jour disparait.
  sans_jour as (
    select t.surface, t.appelee, t.axe, t.rayon_max_m, t.millesime, t.quartier_code, t.issue,
           sum(t.appels)           as appels,
           sum(t.latence_ms_total) as latence_ms_total,
           max(t.latence_ms_max)   as latence_ms_max
    from public.question_tally t
    group by 1, 2, 3, 4, 5, 6, 7
  ),
  -- Seconde passe : un quartier dont l'effectif est 1 sort de la ligne, qui le declare.
  -- Le test d'appelant est APPELE, jamais recopie — une seule expression, w0-appelant (#58),
  -- et I32 le tient. Un role de service et une connexion directe lisent la table entiere de
  -- toute facon : leur retenir le quartier serait du theatre, et c'est le raisonnement du
  -- §26. La retenue vise le lecteur public, le seul devant qui un seau unique se lit.
  retenu as (
    select s.surface, s.appelee, s.axe, s.rayon_max_m, s.millesime, s.issue,
           case when s.appels < 2 and not public.compass_caller_is_privileged()
                then null else s.quartier_code end                    as quartier_code,
           (s.quartier_code is not null and s.appels < 2
              and not public.compass_caller_is_privileged())          as withheld,
           s.appels, s.latence_ms_total, s.latence_ms_max
    from sans_jour s
  )
  select f.depuis, f.jusqu_a,
         r.surface, r.appelee, r.axe, r.rayon_max_m, r.millesime, r.quartier_code, r.issue,
         sum(r.appels)::bigint,
         -- La moyenne est rendue avec l'effectif juste a cote, jamais seule : une latence
         -- moyenne sur trois appels n'est pas une latence.
         case when sum(r.appels) = 0 then null
              else (sum(r.latence_ms_total) / sum(r.appels))::integer end,
         max(r.latence_ms_max)::integer,
         bool_or(r.withheld)
  from retenu r cross join fenetre f
  group by f.depuis, f.jusqu_a, r.surface, r.appelee, r.axe, r.rayon_max_m, r.millesime,
           r.quartier_code, r.issue
  order by sum(r.appels) desc, r.appelee, r.issue;
$$;

comment on function public.compass_question_summary() is
  'Ce que le produit s''est fait demander, et ce qu''il n''a pas su repondre. Un agregat : les '
  'seaux sont sommes sur toute la fenetre de retention et le jour n''est pas rendu, donc deux '
  'denombrements ne s''ordonnent pas. Un quartier dont l''effectif est 1 est retenu et la '
  'ligne porte withheld = true — c''est ce que cette table a de plus proche d''une question '
  'unique. SECURITY DEFINER parce que la table porte RLS sans politique de lecture : une '
  'fonction invoker rendrait zero ligne, et zero ligne se lit « personne n''a rien demande » '
  '(DIAGNOSTIC.md §9). w1-observabilite (#72).';

grant execute on function public.compass_question_summary() to anon, authenticated;


-- ----------------------------------------------------------------------------------------
-- LES DEUX PRODUCTEURS INSTRUMENTES.
-- ----------------------------------------------------------------------------------------
-- Les deux fonctions qui prennent un POINT et un RAYON, c'est-a-dire les deux qui portent une
-- question au sens de ce ticket : compass_premises_within (la carte et find_premises) et
-- compass_scoring_context_within (la couche premises de tous les axes). Les quatre autres de
-- la population de I23 prennent un identifiant de local ou un metier, pas un lieu ; elles
-- n'entrent pas dans « quels quartiers sont demandes et mal servis » et ne sont pas
-- instrumentees — c'est ecrit dans le ticket et dans docs/REPRISE.md, pas laisse au silence.
--
-- Les deux corps ci-dessous sont ceux DEPLOYES sur dbefhvmyfmmhjeetdddu, releves par
-- pg_get_functiondef le 5 septembre 2026 et non recopies depuis les migrations : c'est la base
-- qui fait foi sur ce qui tourne. Seul l'appel au journal est ajoute, aux points de sortie.
-- Leur volatilite ne change pas — STABLE PARALLEL SAFE, budgets de DIAGNOSTIC.md §27 a §29
-- intacts — parce que la volatilite n'est pas transitive.

CREATE OR REPLACE FUNCTION public.compass_premises_within(p_lat double precision, p_lng double precision, p_radius_m double precision DEFAULT 800, p_vintage_year smallint DEFAULT 2023, p_limit integer DEFAULT 500)
 RETURNS TABLE(location_id bigint, ordre integer, lat double precision, lng double precision, distance_m double precision, address text, arrondissement smallint, quartier_name text, street_segment_id bigint, activity_code text, activity_label text, activity_niv18 smallint, activity_group text, is_vacant boolean, size_band smallint, size_label text, situation_label text, sign_name text, plu_protected boolean, plu_commerce_artisanat boolean, plu_commerce_proximite boolean, plu_commerce_culturel boolean, chantier_exposed boolean, chantier_distance_m double precision, chantier_objet text, chantier_description text, chantier_date_debut date, chantier_date_fin date, chantier_statut_label text, terrasse_status text, terrasse_permanente boolean, terrasse_estivale boolean, terrasse_etalage boolean, total_matched bigint, withheld boolean)
 LANGUAGE plpgsql
 STABLE PARALLEL SAFE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_rows     bigint;
  v_point    geography;
  v_vintage  smallint;
  v_withheld boolean;
  v_limit    integer;
begin
  if p_radius_m is null or p_radius_m <= 0 or p_radius_m > public.compass_max_radius_m() then
    raise exception 'p_radius_m must be between 1 and % (got %)',
      public.compass_max_radius_m(), p_radius_m using errcode = '22023';
  end if;

  select v.id,
         -- One expression, in public.compass_caller_is_privileged() — w0-appelant (#58).
         not (public.compass_caller_is_privileged() or v.publicly_redistributable)
    into v_vintage, v_withheld
  from public.bdcom_vintage v
  where v.year = p_vintage_year;

  if v_vintage is null then
    raise exception 'unknown vintage year % (known: 2017, 2020, 2023)', p_vintage_year
      using errcode = '22023';
  end if;

  if v_withheld then
    perform public.compass_record_question(
      'rpc', 'compass_premises_within', 'retenue_licence',
      p_lat, p_lng, p_radius_m, p_vintage_year, 'premises');
    return query select
      null::bigint, null::integer, null::double precision, null::double precision,
      null::double precision, null::text, null::smallint, null::text, null::bigint,
      null::text, null::text, null::smallint, null::text, null::boolean,
      null::smallint, null::text, null::text, null::text,
      null::boolean, null::boolean, null::boolean, null::boolean,
      null::boolean, null::double precision, null::text, null::text, null::date, null::date, null::text,
      null::text, null::boolean, null::boolean, null::boolean,
      null::bigint, true;
    return;
  end if;

  v_point := ST_MakePoint(p_lng, p_lat)::geography;
  v_limit := greatest(coalesce(p_limit, 500), 1);

  return query
  -- The counted set. Two identities and a distance: no label is fetched here, because
  -- `total_matched` does not depend on one and the caller never sees the rows beyond `top`.
  with hit as (
    select l.id  as location_id,
           o.id  as observation_id,
           ST_Distance(l.geom, v_point) as distance_m
    from public.premise_location l
    join public.premise_observation o
      on o.location_id = l.id and o.vintage_id = v_vintage
    where ST_DWithin(l.geom, v_point, p_radius_m)
  ),
  top as (
    select h.location_id, h.observation_id, h.distance_m
    from hit h
    -- Total order: distance ties are the rule here, not the exception. See the header.
    order by h.distance_m, h.location_id
    limit v_limit
  )
  select
    l.id                                              as location_id,
    l.ordre                                           as ordre,
    ST_Y(l.geom::geometry)                            as lat,
    ST_X(l.geom::geometry)                            as lng,
    t.distance_m                                      as distance_m,
    trim(concat_ws(' ', l.num::text, nullif(l.let, ''), l.typ_voie, l.lib_voie)) as address,
    l.arrondissement                                  as arrondissement,
    q.name                                            as quartier_name,
    l.street_segment_id                               as street_segment_id,
    o.activity_code                                   as activity_code,
    a.label                                           as activity_label,
    a.niv18                                           as activity_niv18,
    a.label_18                                        as activity_group,
    coalesce(a.is_vacant, false)                      as is_vacant,
    o.size_band                                       as size_band,
    sb.label                                          as size_label,
    st.label                                          as situation_label,
    o.sign_name                                       as sign_name,
    l.plu_protected                                   as plu_protected,
    l.plu_commerce_artisanat                          as plu_commerce_artisanat,
    l.plu_commerce_proximite                          as plu_commerce_proximite,
    l.plu_commerce_culturel                           as plu_commerce_culturel,
    l.chantier_exposed                                as chantier_exposed,
    l.chantier_distance_m                             as chantier_distance_m,
    c.objet                                           as chantier_objet,
    c.description                                     as chantier_description,
    c.date_debut                                      as chantier_date_debut,
    c.date_fin                                        as chantier_date_fin,
    c.statut_label                                    as chantier_statut_label,
    l.terrasse_status                                 as terrasse_status,
    l.terrasse_permanente                             as terrasse_permanente,
    l.terrasse_estivale                               as terrasse_estivale,
    l.terrasse_etalage                                as terrasse_etalage,
    (select count(*) from hit)                        as total_matched,
    false                                             as withheld
  from top t
  join public.premise_location    l  on l.id = t.location_id
  join public.premise_observation o  on o.id = t.observation_id
  left join public.bdcom_activity      a  on a.code = o.activity_code
  left join public.bdcom_size_band     sb on sb.code = o.size_band
  left join public.bdcom_situation     st on st.code = o.situation_code
  left join public.quartier            q  on q.id = l.quartier_id
  left join public.chantier_perturbant c  on c.id = l.nearest_chantier_id
  order by t.distance_m, t.location_id;

  -- Cette fonction n'a jamais porte de marqueur out_of_corpus : seule
  -- compass_scoring_context_within en a recu un (20260825000003). Un point hors des 80
  -- quartiers y rend donc zero ligne, indistinguable d'un rayon vide. Le journal, lui, les
  -- distingue : compass_record_question resout deja le quartier du point, donc il sait. La
  -- correction cote APPELANT reste ouverte — DIAGNOSTIC.md §36.
  get diagnostics v_rows = row_count;
  perform public.compass_record_question(
    'rpc', 'compass_premises_within',
    case when v_rows = 0 then 'vide' else 'repondu' end,
    p_lat, p_lng, p_radius_m, p_vintage_year, 'premises');
end;
$function$
;

CREATE OR REPLACE FUNCTION public.compass_scoring_context_within(p_lat double precision, p_lng double precision, p_radius_m double precision DEFAULT 800, p_vintage_year smallint DEFAULT 2023)
 RETURNS TABLE(lat double precision, lng double precision, is_vacant boolean, total_matched bigint, withheld boolean, out_of_corpus boolean)
 LANGUAGE plpgsql
 STABLE PARALLEL SAFE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_rows       bigint;
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
         -- One expression, in public.compass_caller_is_privileged() — w0-appelant (#58).
         not (public.compass_caller_is_privileged() or v.publicly_redistributable)
    into v_vintage, v_withheld
  from public.bdcom_vintage v
  where v.year = p_vintage_year;

  if v_vintage is null then
    raise exception 'unknown vintage year %', p_vintage_year using errcode = '22023';
  end if;

  -- One row, and it says so. Not zero rows, which would read as "no premises".
  if v_withheld then
    perform public.compass_record_question(
      'rpc', 'compass_scoring_context_within', 'retenue_licence',
      p_lat, p_lng, p_radius_m, p_vintage_year, 'premises');
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
    perform public.compass_record_question(
      'rpc', 'compass_scoring_context_within', 'hors_corpus',
      p_lat, p_lng, p_radius_m, p_vintage_year, 'premises');
    return query select null::double precision, null::double precision,
                        null::boolean, null::bigint, false, true;
    return;
  end if;

  v_point := ST_MakePoint(p_lng, p_lat)::geography;

  return query
  -- Same fence as compass_street_rotation above, same reason: probed by primary key
  -- 17 173 times for 34 346 pages, on a table of 222 rows that is eleven pages long.
  with act as materialized (
    select a.code, a.is_vacant
    from public.bdcom_activity a
  ),
  hit as (
    select ST_Y(l.geom::geometry) as lat,
           ST_X(l.geom::geometry) as lng,
           coalesce(a.is_vacant, false) as is_vacant
    from public.premise_location l
    join public.premise_observation o
      on o.location_id = l.id and o.vintage_id = v_vintage
    left join act a on a.code = o.activity_code
    where ST_DWithin(l.geom, v_point, p_radius_m)
  )
  select h.lat, h.lng, h.is_vacant, (select count(*) from hit), false, false from hit h;

  -- Apres RETURN QUERY, et non avant : ROW_COUNT distingue ici le vrai vide — le Bois de
  -- Vincennes, 20260825000003 — d'une reponse. Les deux sont des reponses honnetes, et elles
  -- ne menent pas a la meme action : un rayon vide ne reclame aucune source, un n/a si.
  get diagnostics v_rows = row_count;
  perform public.compass_record_question(
    'rpc', 'compass_scoring_context_within',
    case when v_rows = 0 then 'vide' else 'repondu' end,
    p_lat, p_lng, p_radius_m, p_vintage_year, 'premises');
end;
$function$
;
