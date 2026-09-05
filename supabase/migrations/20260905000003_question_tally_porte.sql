-- La porte ne doit pas se compter elle-meme — w1-observabilite (#72).
--
-- MESURE LE 5 SEPTEMBRE 2026, ET C'EST CE QUI A FAIT CE CORRECTIF. Apres un `npm.cmd run eval`,
-- un `eval:anon` et un `verify:mcp`, `question_tally` portait DIX seaux alors que le produit
-- n'a aucun trafic. Le bras A et le bras E jouent leurs appels dans des transactions annulees
-- et ne laissent rien ; `eval:anon` et `verify:mcp`, eux, passent par PostgREST avec la vraie
-- cle publiable, donc leurs appels COMMITENT — indistinguables de ceux d'un visiteur.
--
-- POURQUOI C'EST GRAVE ET PAS COSMETIQUE. Le journal existe pour repondre « quels quartiers
-- sont demandes et mal servis ». La porte demande toujours le meme point — Chatelet — au meme
-- rayon, tous les matins. Non filtree, elle produit une demande constante et fausse sur un seul
-- quartier, et c'est exactement le quartier qu'un lecteur croirait le plus demande. Un seuil ou
-- un classement pose la-dessus serait faux le jour ou il y aurait de vraies donnees, ce que le
-- ticket dit deja d'une autre facon.
--
-- LE SIGNAL EST UN EN-TETE, ET IL EST DECLARATIF. PostgREST expose les en-tetes de la requete
-- dans `request.headers` ; un appelant qui pose `x-compass-observabilite: off` n'est pas
-- compte. C'est un ECHAPPEMENT VOLONTAIRE, pas une authentification : n'importe qui peut poser
-- cet en-tete et sortir du denombrement. C'est sans consequence — se retirer d'un compteur
-- anonyme ne retire rien a personne et n'ouvre aucune donnee — et c'est le prix d'une regle qui
-- ne peut pas reconnaitre ses propres appels autrement. Les reconnaitre par l'IP, l'heure ou le
-- point serait precisement le pistage que ce ticket refuse.
--
-- CE QUE CA NE RATTRAPE PAS : un bras qui oublierait de poser l'en-tete se compterait a nouveau
-- sans que rien ne le dise. Aucun invariant ne peut voir cette absence, parce qu'un appel non
-- journalise ne laisse par definition aucune trace. Ce qui la rendrait visible est une lecture
-- du resume : un quartier qui monte seul, tous les jours, du meme rayon.

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
  -- La porte, les sondes et tout appelant qui se declare hors mesure. Lu avant tout le reste :
  -- ce qui n'est pas compte n'a pas besoin d'etre resolu en quartier.
  begin
    if lower(coalesce(
         nullif(current_setting('request.headers', true), '')::json ->> 'x-compass-observabilite',
         '')) = 'off' then
      return;
    end if;
  exception when others then
    -- Pas de requete PostgREST autour de nous — une connexion directe, un chargeur, un test.
    -- L'absence d'en-tete n'est pas un refus de compter.
    null;
  end;

  -- Un nom hors forme n'est pas compte. Sans borne, un appelant peut faire grossir la table
  -- d'un nom invente par appel — voir « ce que ca ne rattrape pas », en tete de 20260905000001.
  if p_appelee is null or p_appelee !~ '^[a-z][a-z0-9_]{0,63}$' then
    return;
  end if;
  if p_axe is not null and p_axe !~ '^[a-z][a-z0-9_]{0,31}$' then
    return;
  end if;

  v_bande := case
    when p_radius_m is null then null
    when p_radius_m <=  250 then 250
    when p_radius_m <=  500 then 500
    when p_radius_m <=  800 then 800
    when p_radius_m <= 1200 then 1200
    else 2000
  end;

  if p_lat is not null and p_lng is not null then
    select q.code into v_quartier
    from public.quartier q
    where ST_Contains(q.geom::geometry, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326))
    limit 1;
  end if;

  -- La distinction rayon vide / hors corpus est faite ici, une seule fois, parce que c'est ici
  -- qu'on sait : compass_premises_within n'a pas de marqueur out_of_corpus (DIAGNOSTIC.md §36).
  if p_issue = 'vide' and p_lat is not null and p_lng is not null and v_quartier is null then
    p_issue := 'hors_corpus';
  end if;

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

    if v_neuf then
      delete from public.question_tally
      where jour < current_date - public.question_tally_retention_days();
    end if;
  exception when others then
    null;
  end;
end;
$$;

-- Les dix seaux ecrits par les passages de porte du 5 septembre 2026, pendant que ce chantier
-- se montait. Ce ne sont pas des questions : ce sont les miennes et celles de la porte. Un
-- journal qui demarre avec du bruit connu demarre faux, et le supprimer une fois est plus
-- honnete que de l'expliquer pour toujours.
delete from public.question_tally;
