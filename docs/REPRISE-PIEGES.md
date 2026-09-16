# Pièges qui ont coûté du temps

Extrait de `docs/REPRISE.md` le 31 août 2026, deuxième découpage de cette page après celui
qui a produit `docs/JOURNAL.md` le 26 août. **Ce fichier ne se lit pas en début de session** :
il se consulte au moment de faire la chose risquée, ou quand on vient de se cogner.
Le repérer au `grep`, lire le paragraphe, refermer.

Le titre d'origine disait « aujourd'hui ». Il était faux dès le lendemain : cette liste
s'accumule depuis le 9 août 2026 et chaque entrée porte sa date.

L'état courant est dans `docs/REPRISE.md`, le récit des sessions dans `docs/JOURNAL.md`,
les défauts du code dans `DIAGNOSTIC.md`.

---


**Les portes qui interrogent le distant rendent un faux rouge sur une base froide,
code Postgres `57014`.** `canceling statement due to statement timeout`, sur un
invariant différent à chaque fois, puis vert au passage suivant sans que rien
n'ait changé. Mesuré sur `eval:anon` le 26 août — deux passages rouges puis un
vert — et sur **`eval`** le 27 août à 08 h 11 UTC, premier appel de la matinée :
mort dans le bras A, repassé intégralement au vert à 08 h 18. Le premier appel
matinal paie le réveil de l'instance et la reconstruction des caches ; c'est la
latence, pas la donnée.

> **La fenêtre a un chiffre depuis le 27 août** : `anon` porte
> `statement_timeout = 3s`, `authenticated` et `authenticator` 8 s, relevés dans
> `pg_roles.rolconfig`. Ce n'est pas une valeur PostgREST à deviner, c'est une
> option de rôle qu'on peut lire.

**`eval:anon` ne rend plus ce faux rouge — et `eval` non plus depuis le 31 août.** Depuis
`#61`, la porte anonyme classe un `57014` en **« suspendu — panne amont »** et sort en **3** :
ni vert, ni rouge, et le mot « INDÉTERMINÉ » est écrit en toutes lettres. Rejouer une sortie 3
est légitime ; rejouer un **FAIL** ne l'est pas. **Le bras A de `eval` a la même distinction
depuis `#69`** : il nomme l'invariant suspendu, **va au bout**, et B, C et E sont joués.
`verify:mcp` ne l'a toujours pas — là, **rejouer avant de diagnostiquer** reste la règle, et ne
conclure à une régression qu'au deuxième rouge.

**Un `57014` dans le bras A de `eval` n'est pas toujours une instance froide — corrigé le
31 août.** Le 28 août, deux passages morts **à 120 000 ms exactement** — pas une latence, une
fenêtre : le lanceur se connectait en `postgres`, dont `statement_timeout` valait **`2min`**,
hérité d'un réglage de cluster. Remesuré à froid le 31 août : **`I1` seul à 118 137 ms**, 1,6 %
de marge. Fermé par [`#69`](https://github.com/IvandeMurard/paris-compass/issues/69) —
découpage en tranches, fenêtre déclarée à 60 000 ms, alerte à 30 000 ms, `DIAGNOSTIC.md` § 30.

> **Et la leçon de méthode, qui vaut au-delà de ce ticket : la fenêtre est par instruction,
> pas par bras.** « Le bras A passe à 115,3 s » se lit comme un budget de bras ; c'était `I1`
> seul, et le bras entier faisait 216 s sans qu'aucun plafond ne s'y applique. Confondre les
> deux mène à monter le plafond ; les distinguer mène à découper l'instruction. **Avant de
> déplacer une limite, vérifier ce qu'elle compte.**

> **La méthode qui donne le diagnostic en une fois** : jouer les invariants un par un
> sur une connexion où l'on a relevé `set statement_timeout = '180s'`, et chronométrer.
> `readInvariants()` de `scripts/eval/census.ts` est exporté, c'est vingt lignes. Ici :
> `I1` 83,6 s, `I2` 65,4 s, `I7` 45,4 s, **les 37 à zéro ligne** — le contenu est vert,
> c'est l'horloge qui ne l'est pas. **Depuis `#69`, un invariant `@chunk` attend deux
> paramètres de bornes** : lui passer `[null, null]` le joue en entier, comme le fait
> `scripts/eval/census-sabotage.ts`.
>
> **Et le premier appel de la session est la mesure qui compte.** Le 31 août, `I1` a rendu
> 118 137 ms au premier appel contre 83 785 ms une fois chaud : **41 % d'écart**, c'est-à-dire
> toute la marge. Une session qui commence par réchauffer l'instance a dépensé la seule
> mesure à froid qu'elle pouvait obtenir — voir le piège du cache plus bas.
>
> **Et ne pas conclure d'un `| tail`** : `npm.cmd run eval | tail -30` rend le code de
> sortie de `tail`, soit **0**, sur une porte sortie en 2. Même règle que
> `Select-Object -First N` plus bas, rencontrée sous bash.

**Un refus du classificateur sur `supabase db push` peut céder à la relance —
essayer une fois avant de passer la main.** Quatrième et cinquième poussées, le
28 août : la **même commande, inchangée**, refusée puis acceptée quelques minutes
plus tard. Ça confirme ce que la note de procédure du 24 août disait — le refus
n'est pas corrélé au contenu — et ça ajoute la conduite à tenir : relancer une
fois, et seulement ensuite préparer la ligne pour qu'Ivan la lance. Ne pas
contourner en appliquant le SQL à la main : le ledger `supabase_migrations` ne
serait pas tenu, et c'est lui qui dit ce qui est posé.

**On ne peut pas fabriquer un cache froid sur cette instance — ne pas y passer la
matinée.** Trois voies essayées le 28 août, trois impasses. Faire tourner le pool avec
un gros balayage ne suffit pas : douze passages de ~28 000 pages sur
`sirene_etablissement_stock` et `bodacc_establishment` laissent `Shared Read Blocks` à
**0** sur la requête visée, parce que ses pages portent un `usagecount` de 5 sur 5 et
que l'horloge de remplacement trouve toujours des victimes plus tièdes.
`pg_buffercache_evict()` existe bien en PostgreSQL 17.6 mais rend **`42501`** : elle
demande un vrai superutilisateur, et le rôle `postgres` de Supabase n'en est pas un. Et
même réussi, rien de tout ça n'atteint le cache du système sous Postgres.

> **Ce qui marche, à la place.** Mesurer **la page touchée** — `explain (analyze,
> buffers)` —, qui ne dépend pas de la température : c'est le travail à faire, le cache
> ne décide que du prix de chaque page. Et, pour le froid réel, **attendre** : le premier
> appel après une nuit d'inactivité est la mesure que le critère de `#62` demandait, et
> c'est comme ça qu'elle a été obtenue. Une session à cheval sur une nuit vaut de
> dépenser son premier appel sur la mesure qui compte, avant toute autre requête.

**Mesurer le corps d'une fonction plpgsql comme une requête SQL nue la sous-estime
d'un facteur deux.** C'est le geste évident face à une boîte noire — `explain` sur
une fonction plpgsql ne rend qu'un `Function Scan` —, et il est faux. Les requêtes
d'une fonction plpgsql passent par le **cache de plans** : au bout de cinq
exécutions elles basculent sur le plan **générique**, et c'est celui-là que la
production exécute. Une requête recopiée à la main est planifiée en **custom**, avec
les vraies valeurs, donc mieux. Mesuré le 28 août sur `compass_street_rotation` à
2 000 m : **151 778 pages en custom, 286 710 en générique**, et `auto` prend le
générique à tous les coups. Deux conséquences :

> **Pour lire le plan que la production exécute** : `prepare` le corps comme
> instruction paramétrée, l'exécuter **cinq fois** pour que le cache bascule, et
> expliquer le **sixième** appel. Vérifier au passage avec `set local
> plan_cache_mode = force_generic_plan` / `force_custom_plan`, qui départage en une
> mesure.
>
> **Une « bascule entre deux plans d'un passage à l'autre » n'est probablement pas
> du hasard.** `eval/baselines/anon-budget.json` a porté cette phrase une journée sur
> deux fonctions, et justifiait un seuil avec ; les deux valeurs étaient les deux
> plans du cache, pas de la chance. Avant de traiter un écart de mesure comme du
> bruit, forcer les deux modes.
>
> **Le même cache mord une seconde fois : un GUC de planification ne réinvalide pas
> un plan déjà en cache.** Mesurer `enable_nestloop = on` puis `off` sur la même
> connexion mesure **le premier deux fois**, et rend « aucun changement » — ce qui
> est faux et rassurant. Rencontré le 28 août en instruisant
> [`#65`](https://github.com/IvandeMurard/paris-compass/issues/65) : connexion neuve
> par configuration, et ne retenir que les passages 6 et suivants.

**Une estimation géographique fausse n'accuse pas l'histogramme — vérifier d'abord
que l'estimateur le lit.** Sur `premise_location`, `l.geom && _ST_Expand(point, d)`
— la forme qui **consulte** les statistiques — estime correctement à tous les rayons,
tandis que `ST_DWithin(l.geom, point, d)` rend **9 partout**, soit 85 418 × 0,0001 :
la sélectivité de repli de PostGIS. Le geste, avant de toucher à `SET STATISTICS` :
comparer les deux formes, ça coûte deux requêtes qui n'exécutent rien.

> **Et monter la cible sur une colonne `geography` détruit ce qu'elle prétend
> affiner** : au-delà de **1 000**, l'histogramme ND tombe de 15 360 cellules à **19**
> et l'estimation `&&` s'effondre à 1. Il est de toute façon **déjà à son plafond à la
> valeur par défaut**. Mesuré le 28 août, `DIAGNOSTIC.md` § 29.

**Deux faux zéros rassurants, tous deux rencontrés le 28 août.** `not (ST_X(g) = ST_X(g))`
ne trouve **aucune** géométrie `NaN` — en Postgres, `NaN = NaN` est **vrai** ; utiliser
`ST_X(g) = 'NaN'::float8`. Et `proname like 'compass[_]%'` rend **zéro** — les crochets
sont de la syntaxe SQL Server, l'échappement Postgres est `like 'compass\_%'`. Le second
servait à vérifier qu'aucune fonction de sabotage n'était restée sur le distant : un zéro
faux y est le pire retour possible.

**Trois gardes qui ne gardent rien contre une coordonnée absente — mesurés le 5 septembre 2026,
`#68`.** Le service ArcGIS de l'APUR annonce un point absent par la **chaîne** `"NaN"`
(`{"x":"NaN","y":"NaN"}`, et `"coordinates":[]` en `f=geojson`). Trois écritures d'apparence
prudente la laissent passer, chacune pour une raison différente, et il faut les trois pour que
quinze locaux arrivent en base en `POINT(NaN NaN)` :

> `geometry?: { x: number; y: number }` — une **déclaration TypeScript n'est pas une
> validation**. Le fil envoie ce qu'il veut ; le type ne fait que persuader le lecteur suivant
> que quelqu'un a vérifié.
>
> `feature.geometry?.x ?? null` — `??` ne mord que sur `null` et `undefined`. `"NaN"` n'est ni
> l'un ni l'autre, et `Number("NaN")` rend NaN sans se plaindre. Au passage : `Number("")` et
> `Number(null)` rendent **0**, donc un garde qui laisse la chaîne vide passer place le local au
> large du golfe de Guinée. Le seul test juste est `Number.isFinite` **après** avoir refusé le
> vide et l'absent.
>
> `where s.x is not null` en SQL — Postgres coule `'NaN'` en `double precision` NaN, qui n'est
> **pas nul**. Le garde-fou de la promotion lisait donc « coordonnée présente ».

**Et le corollaire qui a réellement produit un faux :** `order by l.geom <-> s.geom limit 1` ne
sait pas dire qu'il ne sait pas. Sur une géométrie `NaN` — ou `NULL` — la distance ne classe
rien et la sous-requête rend **quand même une ligne**, la première que le plan présente. Dix des
quinze locaux portaient un `street_segment_id` posé ainsi, sept d'entre eux le même tronçon sur
les six de la rue des Cheminots ; la même sous-requête lancée sur une géométrie `NULL` rend ce
même identifiant, ce qui est la preuve que ce n'est pas la proximité qui avait choisi. Un
`order by … limit 1` **doit** être gardé sur `geom is not null` en amont — l'ordre ne refuse
jamais de trancher.

Voir aussi, plus haut dans cette page, le faux zéro de `not (ST_X(g) = ST_X(g))` : en Postgres
`NaN = NaN` est **vrai**, donc le recensement écrit d'instinct rend zéro ligne sur une table qui
en porte quinze. Le test qui vaut pour toutes les formes de géométrie est sur le WKT —
`ST_AsText(g) ~* '(nan|inf)'` — parce qu'un sommet non fini au milieu d'une ligne ne se voit ni
par `ST_X` ni par `ST_IsEmpty`. `docs/BDCOM.md` § 4 bis, `I42`.

**Un corps de fonction remplacé dans une transaction annulée exige un contrôle
positif.** Un candidat qui n'a pas pris ressemble exactement à « aucun changement » —
c'est-à-dire à la réponse qu'on cherche. Relire `prosrc` après le `create or replace`
**avant** de conclure quoi que ce soit de la mesure.

**Une démonstration de sabotage ne s'imbrique pas dans une transaction avec du code
qui gère les siennes — sinon elle écrit pour de bon sur le distant.** Le 28 août, la
preuve que le bras E attrape une fonction de rayon ajoutée a été écrite en ouvrant
une transaction puis en appelant `runBudget` dedans. `runBudget` ouvre et **annule**
ses propres transactions pour poser le claim `anon` : son `rollback` a annulé la
transaction englobante, et le `create function` qui suivait est parti **en
autocommit**. La fonction de sabotage a réellement été posée sur
`dbefhvmyfmmhjeetdddu` ; elle a été vue au passage suivant de `npm.cmd run eval`,
qui est sorti rouge sur elle, puis retirée et `pg_proc` revérifié. `pg` ne signale
pas un `begin` imbriqué autrement que par un avertissement du serveur que le client
n'affiche pas. **`scripts/eval/census-sabotage.ts` fait autrement, et c'est le
modèle à copier.**

**Deux sessions dans le même arbre de travail se commitent l'une l'autre.** Le
26 août au soir, deux sessions ont tourné en parallèle sur ce dépôt : l'une
scindait `REPRISE.md` vers `JOURNAL.md`, l'autre posait `w0-appelant`. La
première a fait `git add -A` et **emporté dans son commit** (`c861bac`, poussé)
les fichiers de travail temporaires de la seconde — `.fn-dump/`, quatre scripts
`scripts/eval/_*.ts` — **et sa migration**, `20260826000002`, sous un message qui
parle de tout autre chose. Rien n'est perdu et rien n'est cassé ; l'historique,
lui, ment sur qui a fait quoi. Les fichiers temporaires sont retirés par le commit
suivant, en marche avant : réécrire un historique déjà poussé coûterait plus cher
que l'écart qu'il corrige.

> **Ce n'est pas un cas de la règle Lovable de `CLAUDE.md`** — qui parle de deux
> *outils* éditant le dépôt — mais elle a la même cause et la même parade. Une
> session qui commite doit regarder ce qu'elle met dans son commit : `git add -A`
> dans un arbre partagé n'ajoute pas « mes fichiers », il ajoute *tout ce qui
> traîne*. Et une session qui écrit des fichiers de travail doit les nommer de
> façon à ce qu'ils soient ignorés, ou les tenir hors du dépôt : le répertoire de
> travail temporaire de l'agent existe pour ça.

**Comparer un corps de fonction en base à son fichier exige de normaliser les
fins de ligne.** `core.autocrlf=true` donne un arbre de travail en CRLF, et
`supabase db push` envoie les octets tels quels : le corps stocké porte alors un
`\r` en fin de chaque ligne. `prosrc = <fichier>` répond **faux** sur une
migration parfaitement posée. Mesuré le 24 août sur les dix fonctions `compass_*`
du distant — **six portent des CR, quatre non**, selon la machine qui les a
poussées. Sans conséquence pour Postgres, qui traite `\r` comme une espace ; mais
une session qui compare naïvement conclura que le distant a divergé du dépôt.
Comparer après `replace(/\r/g, "")`.

**Une politique RLS n'est pas un `GRANT`.** Toutes les migrations ont d'abord été
écrites sans droit de lecture : les fonctions échouaient pour un visiteur avant
qu'aucune politique ne soit consultée. Corrigé en `20260809000009`.

**Dans une fonction `SECURITY DEFINER`, `current_user` est le propriétaire.**
Tester le privilège avec lui conclut toujours « privilégié ». Il faut lire le
rôle que PostgREST met dans `request.jwt.claims`.

**Le chemin privilégié réussit toujours.** Les trois défauts d'exposition n'ont
été trouvés qu'en jouant le chemin **anonyme**. Le lanceur d'évaluation sait le
faire : marqueur `-- @as anon` dans `eval/invariants.sql`.

**Mais « anonyme » a deux sens, et l'un des deux ne voit rien.** Le marqueur
`-- @as anon` pose `request.jwt.claims` sur une connexion **privilégiée** et
n'émet jamais `set local role anon` : RLS **ne s'applique pas** pendant qu'il
tourne. Il n'éprouve donc que le test que la fonction fait sur le *claim*. Une
fonction qui ne lit pas le claim du tout — c'était `compass_premise_history`
jusqu'au 24 août — lui rend **tout le contenu** sans que rien paraisse anormal.
C'est ce qui l'a rendue invisible pendant quinze jours, et c'est pour ça que le
bras D (`npm.cmd run eval:anon`, vraie clé publiable, RLS derrière) n'est pas un
doublon du bras A. Corollaire pour toute correction de ce type : la fonction doit
**nuller ses colonnes elle-même**, jamais compter sur RLS pour avoir vidé la
jointure — sans quoi le bras A lira du vrai contenu sur une ligne marquée retenue.

**Une absence n'est pas une mesure, et `coalesce(..., false)` en fabrique une.**
Le défaut de licence a une version sans licence : `coalesce(a.is_vacant, false)`
répondait « pas vacant » de 24 573 locaux jamais relevés en 2023. Même faute que
« zéro ligne = quartier mort », sur la colonne dont le produit fait son sujet.
`DIAGNOSTIC.md` §11. À chercher partout où un `coalesce` comble une jointure
externe par une valeur qui se lira comme un fait.

**`TRUNCATE ... CASCADE` sur une table de référence vide la table qui la
référence.** Le chargeur de géographie a effacé les 85 418 locaux avant d'être
corrigé ; seule la transaction a sauvé le chargement.

**Docker Desktop qui se coince** laisse le port ouvert mais tue la poignée de
main. `docker restart` du seul conteneur de base recrée la liaison sans toucher
au volume — ne pas faire `supabase stop`, plus risqué pour les données. Si le
démon lui-même ne répond plus : `wsl --shutdown`, puis relancer Docker Desktop.

Vécu le 12 août, avec une variante : le démon répondait sur le tube nommé mais
rendait **500 sur toutes les routes `/info`**. Épingler une version d'API basse
(`DOCKER_API_VERSION`) n'y change rien — ce n'est pas un décalage client/serveur.
Il faut tuer les processus `Docker Desktop` et `com.docker.backend`, puis
`wsl --shutdown`, puis relancer. Compter deux à trois minutes avant que le démon
réponde ; les conteneurs remontent seuls, volumes intacts.

**Le terminal d'Ivan est PowerShell 5.1**, pas 7 : ni `&&`, ni `grep`, ni `ls -l`.
Et `npm.ps1` est bloqué — toujours `npm.cmd` et `npx.cmd`.

**`Select-Object -First N` en bout de tuyau fabrique un faux échec.** PowerShell
ferme le tuyau dès qu'il a ses N lignes, le processus en amont reçoit un tube
rompu, et le code de sortie remonte à 1 alors que rien n'a échoué. Vu le 17 août
sur `src/smoke-test.ts`, qui rendait 0 sans filtre et 1 avec. **Ne jamais conclure
d'un code de sortie relevé derrière un filtre tronquant** : relancer sans le
filtre, ou rediriger vers `$null` et lire `$LASTEXITCODE`.

**Pousser sur `main` contourne une règle de protection, en silence ou presque.**
Le dépôt exige une pull request ; le compte d'Ivan a le droit de passer outre,
donc `git push origin main` réussit et GitHub se contente d'une ligne —
`Bypassed rule violations for refs/heads/main`. Facile à manquer dans la sortie.

> **Et c'est le mode voulu, tranché par Ivan le 27 août 2026 : pousser sur
> `main`.** Les versions antérieures de cette page disaient l'inverse, en
> s'appuyant sur les PR #2 et #3 — mais aucune PR n'avait été ouverte pour un
> ticket depuis le 25 août, et la question a été posée en clôturant `#61` : la
> réponse est le push direct. Ne pas ouvrir de PR pour un ticket sans qu'on la
> demande.

**Ne jamais relire un corps d'issue GitHub dans une variable PowerShell pour le
réécrire.** Le 24 août, la commande `$b = gh issue view 41 --json body -q .body`
puis `gh issue edit --body-file` a **corrompu** le corps de l'épic #41 : `ç` est
devenu `├º`, `—` est devenu `ÔÇö`. Mesuré sur les octets bruts par
`gh api ... --jq .body | od -c` — `342 224 234 302 272` au lieu de `303 247` —
donc bien dans la donnée stockée, pas dans l'affichage. PowerShell décode la
sortie de `gh` avec la page de codes de la console et non en UTF-8 ; réécrire
cette chaîne en UTF-8 la ré-encode une seconde fois.

**Le sens aller est sain, le sens retour non.** Passer une chaîne accentuée *à*
`gh` en argument fonctionne — vérifié, et l'issue #52 créée le même jour a ses
accents intacts. C'est la **capture** de la sortie qui casse. Une vérification
qui ne teste que l'aller conclut à tort que tout va bien : c'est exactement
l'erreur qui a été commise.

**La corruption a fait une seconde victime, invisible pendant vingt-quatre heures : les
cases à cocher.** Réparer le corps de #41 l'a réécrit depuis une copie **périmée**, où `#7`,
`#10` et `#51` n'étaient pas encore cochés — et `docs/REPRISE.md` affirmait pourtant, dans la
même journée, que l'épic les cochait. Constaté le 24 août à la clôture de la session 4, sur
les octets bruts (`gh api … --jq .body`), en fermant `#8` : `#8` s'est coché tout seul —
GitHub suit les listes de tâches qui référencent une issue — et les trois autres, fermés
depuis plus longtemps, sont apparus **décochés**.

**La règle générale : réparer un contenu depuis une copie efface tout état qui ne vivait que
dans l'original.** L'encodage se voit, l'état ne se voit pas. Une réparation qui ne recoupe
que ce qu'elle voulait corriger conclut à tort qu'elle est finie — c'est le même mode de
défaillance que « le sens aller est sain, le sens retour non », un cran plus haut. **Avant de
réécrire un corps d'issue, relever ce qu'il porte et qui n'est écrit nulle part ailleurs.**

**Non reproduit**, et c'est à savoir avant de croire à un correctif : dans un
`powershell.exe -NoProfile -File` non interactif sur cette même machine,
l'aller-retour est propre **sans** rien changer. La casse dépend donc de
l'encodage console du terminal réellement utilisé. `[Console]::OutputEncoding =
[Text.Encoding]::UTF8` est le garde-fou correct mais n'a pas pu être éprouvé
contre le cas qui a échoué. **Donc la règle est d'éviter le motif, pas de le
rustiner** : modifier le corps depuis l'interface web, ou faire la lecture et
l'écriture depuis un outil qui parle UTF-8 de bout en bout — c'est par là que la
réparation est passée.

**Le chemin agent n'hérite d'aucune des politesses du navigateur.** `User-Agent`,
cookies, `Origin` : tout ce que le navigateur pose gratuitement est absent d'un
`fetch` Node, et un service public a le droit de s'en formaliser. Overpass rend
**406** sans `User-Agent`, ce qui a rendu le miroir principal du serveur MCP
inatteignable sans que rien ne le signale. À vérifier pour toute source que
`mcp-server/` interroge et que le front interroge aussi : la même requête n'est
pas la même requête des deux côtés.

**Un contrôle qui lit un fichier ligne par ligne meurt en silence sur des fins de ligne
Windows — 31 août 2026.** `scripts/porte/workflow.test.ts` et `scripts/ingest/workflow.test.ts`
lisent leur workflow YAML et cherchent des motifs ancrés (`^\s*- cron:`, `- name: eval\n`).
Un fichier réécrit une fois par un outil qui écrit en `\r\n` — n'importe quel script Python
lancé sur ce poste avec `io.open(..., 'w')` — fait que **tous** ces motifs cessent de trouver,
et le test rend « attendu '' » sans dire pourquoi. Une demi-heure perdue. Les deux fichiers
normalisent maintenant `\r\n` avant de découper, `scripts/porte/arms.ts` aussi ; le piège reste
valable pour tout nouveau contrôle qui lira un fichier du dépôt.

**Les secrets de dépôt ne sont pas ceux du poste — mesuré le 31 août 2026.** Le dépôt ne porte
que `DATABASE_URL` ; `.env.local` porte en plus `VITE_SUPABASE_URL` et
`VITE_SUPABASE_PUBLISHABLE_KEY`, et `mcp-server/.env` sa propre paire. Un workflow qui joue
`eval:anon` ou `verify:mcp` a donc besoin de `SUPABASE_URL` et `SUPABASE_ANON_KEY` **posés
comme secrets**, sans quoi il échoue là où rien n'est cassé. `.github/workflows/porte.yml` le
vérifie en tête de job et s'arrête en le nommant, plutôt que de rendre trois bras rouges pour
une seule cause. `gh secret list` dit ce qui est réellement posé.

**Une population enumeree se recoupe sur ce qui NOMME, jamais sur ce qui EXECUTE — 1er
septembre 2026.** `#71` l'avait rencontre sur les scripts : `verify:mcp` et `smoke:mcp` lancent
le meme fichier, donc un workflow citant `scripts/verify-mcp.mjs` aurait repondu pour les deux
alors qu'un seul decide quelque chose. `#70` a rencontre le meme piege un cran plus bas, et cette
fois il est **present dans le depot** : la branche `bdcom)` de `.github/workflows/ingestion.yml`
lance `bdcom.ts` **puis `geography.ts`**. Un controle qui aurait apparie les sources aux chemins
de leurs chargeurs aurait donc conclu que le cron trimestriel de BDCom tient la cadence de
`geography` — vrai en pratique ce jour-la, faux comme regle, et surtout invisible le jour ou
l'enchainement disparait. `scripts/porte/cadences.ts` apparie sur la table `cron -> source` que
le workflow ecrit lui-meme, une source par planification, et jamais sur ce que le bras execute.
La consequence a assumer : une source **reellement** rechargee en passant par un bras voisin est
lue comme non planifiee. C'est voulu — elle doit avoir sa propre entree `cron` ou sa raison
ecrite dans `scripts/porte/cadence.json`.

**Ne jamais passer `--omit=optional` à npm sur ce projet.** Rollup livre son
binaire natif (`@rollup/rollup-win32-x64-msvc`) en dépendance *optionnelle* :
l'omettre casse `vitest` et `vite build` avec un `MODULE_NOT_FOUND` sur
`rollup/dist/native.js`, dont le message ne dit pas d'où vient le manque. Un
`npm.cmd install` simple répare.

---

---

## Un workflow planifié tourne, mais six heures après l'heure déclarée — 1er septembre 2026

**Ne pas conclure qu'une cadence est cassée parce que rien n'a tourné à l'heure dite.** GitHub
retarde les workflows `schedule` des dépôts publics sous charge, et ce dépôt le subit
lourdement. Mesuré le 1er septembre sur les quatre derniers passages de `ingestion.yml`, dont
le créneau `bodacc` est déclaré à **03:17 UTC** :

| Jour | Exécution réelle | Retard |
| --- | --- | --- |
| 29 août | 10:10 | 6 h 53 |
| 30 août | 09:18 | 6 h 01 |
| 31 août | 09:51 | 6 h 34 |
| 1er septembre | 08:43 | 5 h 26 |

**Environ six heures, systématiquement.** Le retard n'est ni une panne ni une erreur de
configuration : les quatre passages sont en succès.

Conséquence pratique : `porte.yml`, déclaré à `29 7 * * *`, ne tourne pas à 07:29 mais vers
13:30 UTC. Constater son absence en fin de matinée ne prouve rien. Pour savoir si une cadence
fonctionne, lire `gh run list --workflow=<nom>` sur plusieurs jours — jamais l'heure au mur.

**Ce que ça change pour ce qui s'appuie dessus.** Une vérification « la porte a-t-elle tourné
dans les dernières 24 h ? » reste juste. Une vérification « a-t-elle tourné ce matin ? » sera
fausse un jour sur deux. Et le créneau déclaré est une *intention*, pas une mesure — l'écrire
comme une heure d'exécution serait le même défaut qu'un chiffre sans sa date.


---

## Un défaut du build publié ne se reproduit pas sur ce poste : `.env.local` le masque — 2 septembre 2026

La production a rendu une page blanche pendant que `npm.cmd run dev` et `npm.cmd run build`
étaient au vert ici, le même jour, sur le même arbre. Ce n'était pas une intermittence : Vite
charge `.env.local`, qui porte `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` sur cette
machine. Le build publié part d'un clone du dépôt, où ce fichier n'existe pas — et à l'époque
`.env` non plus. Deux environnements, deux résultats, aucun moyen de voir le second depuis le
premier.

**Ce qui a tranché, et qui coûte trente secondes :** aller lire le bundle publié plutôt que
raisonner dessus.

```bash
curl -s https://paris-compass.lovable.app/ | grep -o 'src="[^"]*\.js"'
curl -s https://paris-compass.lovable.app/assets/<le chunk>.js > /tmp/pc.js
grep -c 'dbefhvmyfmmhjeetdddu' /tmp/pc.js     # 0 = la valeur n'a pas été figée au build
grep -o 'const [A-Za-z$_]*=void 0,[A-Za-z$_]*=void 0' /tmp/pc.js
```

Une variable Vite absente au build ne laisse **aucune trace d'erreur** : elle devient `void 0`
dans le bundle, et c'est le consommateur en aval qui lève, loin de la cause. Chercher le
symptôme dans le code ne mène nulle part ; chercher la valeur dans l'artefact tranche tout de
suite. Voir `DIAGNOSTIC.md` §32.

Corollaire : **une vérification faite en local ne dit rien de la production** tant qu'elle
s'appuie sur un fichier que le dépôt ne porte pas. C'est ce que la garde `prebuild` mesure
désormais avec le `loadEnv` de Vite, et ce que `scripts/build/envPublic.test.ts` empêche de
redevenir vrai.

---

## Une garde placée sous un `import` statique ne tourne jamais — 2 septembre 2026

Les imports ES sont hissés et évalués **avant la première instruction du module**. Écrire dans
`src/main.tsx` :

```tsx
import App from './App.tsx'                    // App atteint le client Supabase…
if (!import.meta.env.VITE_SUPABASE_URL) { … }  // …donc on n'arrive jamais ici
```

donne une garde inatteignable dès que le module importé lève à l'évaluation — ce que fait
`src/integrations/supabase/client.ts`, qui appelle `createClient` au niveau du module. La garde
se lit comme correcte, se teste mal, et ne protège rien.

Le contournement est un `import()` dynamique après le contrôle. Il a un coût réel — une requête
avant le premier rendu, et un chunk séparé — à annoncer plutôt qu'à découvrir.

**La forme générale du piège :** un correctif situé en aval d'une levée à l'import n'est pas
« un correctif qui ne marche pas », c'est un correctif jamais exécuté. Deux commits successifs
s'y sont perdus avant qu'on regarde le bundle.

---

## Un motif `.env` dans `.gitignore` n'a pas de racine : le retirer les désignore tous — 2 septembre 2026

`.gitignore` traite un motif sans `/` comme s'appliquant **à toute la profondeur de l'arbre**.
La ligne `.env` couvrait donc aussi `mcp-server/.env`, et la retirer pour suivre celui de la
racine a désignoré les deux d'un coup : le premier `git add -A` a indexé `mcp-server/.env`.

Ce jour-là il ne portait qu'une URL et une clé anonyme, et n'avait jamais été committé. C'est
de la chance, pas une règle.

**La forme correcte est une exception ancrée**, l'ignorance étant conservée :

```gitignore
.env
!/.env      # la racine seulement — le `/` initial est ce qui ancre
```

Et le contrôle qui ne dépend de personne : après toute modification de `.gitignore`, lire
`git status --short` **avant** de committer, et vérifier ce que `git ls-files '*.env'` rend.
Tenu par `scripts/build/envPublic.test.ts` depuis le même jour.

## Un champ de licence vide n'est pas une licence confirmée — 5 septembre 2026

Écrit en posant les onze sondes de `w1-catalogue` (#73). Deux des trois sources **ingérées** ne
publient aucune licence à l'endroit où le produit les lit, mesuré ce jour-là :

| Source | Endpoint | Ce qu'il rend |
| --- | --- | --- |
| BDCom 2023 | `carto2.apur.org/.../BDCOM/bdcom2023/MapServer/0?f=json` | `copyrightText: ""` |
| BODACC | `bodacc-datadila.opendatasoft.com/api/.../annonces-commerciales` | `license: null` |

Une comparaison naïve — « le champ ne contredit pas ce qu'on a consigné, donc c'est vérifié » —
aurait rendu ces deux sondes vertes pour toujours, y compris le jour où l'APUR change de
licence. **Un champ absent ne confirme rien**, et le prendre pour une confirmation est la même
faute que lire une absence comme un « non », que ce dépôt a déjà séparée six fois
(`DIAGNOSTIC.md` §9 à §16).

D'où la règle de `scripts/porte/catalogue.json` : `licence-attendue: null` n'est légal
**qu'accompagné** de `licence-non-lisible`, une phrase qui dit d'où vient alors la licence — un
échange avec l'APUR, la DILA — et ce que la sonde vérifie réellement à la place. Une sonde sans
l'un ni l'autre est rendue `contradictoire`, donc rouge, par `scripts/porte/catalogue.test.ts`.

Le corollaire vaut pour toute source à venir : **avant d'écrire qu'une licence est vérifiée,
regarder si l'endpoint la publie**. Trois des onze sondes ne vérifient qu'une joignabilité, et
elles le disent — c'est moins que ce qu'on voudrait, et c'est ce qui est vrai.

---

## Poser une cadence ne recharge rien : le trou entre la déclaration et la première occurrence — 5 septembre 2026

**Ajouter un `cron` pour une source déjà chargée à la main ne remet pas son âge à zéro**, et le
seuil compte ce délai comme du retard — à juste titre, puisque rien n'a vérifié la source
pendant ce temps-là.

Mesuré sur `chantiers`. Le créneau `- cron: "7 2 * * 2"` (mardi 02:07 UTC) est arrivé sur `main`
avec [`3dfea1d`](https://github.com/IvandeMurard/paris-compass/commit/3dfea1d), **le mardi
1er septembre à 08:14 UTC** — six heures après le créneau de ce mardi-là. Première occurrence
possible : **mardi 8 septembre**. Entre-temps la copie restait celle du chargement manuel du
25 août :

| | |
| --- | --- |
| Tolérance `weekly` | 7 j + 3 de grâce = **10 j** (`scripts/ingest/lib/cadence.ts`) |
| Dernier chargement | 25 août 2026, `run_by = manual` |
| Seuil franchi | **4 septembre** |
| Porte rouge | 5 septembre, [`#78`](https://github.com/IvandeMurard/paris-compass/issues/78) |
| Premier cron | 8 septembre — la source y serait arrivée à **14 jours d'âge**, après quatre matins rouges |

Recoupé sur `gh run list --workflow=ingestion.yml` : les seize passages depuis le 25 août n'ont
chargé que `bodacc`, `sirene` et `sirene_stock`. Le cron `chantiers` n'a **jamais** tourné.

**Le geste, le jour où l'on pose une cadence sur une source qui existe déjà** : la recharger une
fois dans la foulée — `gh workflow run ingestion.yml -f source=<jeu>` — plutôt que d'attendre la
première occurrence. Sinon la porte dira le retard, et elle aura raison.

**Ce qui ne l'attrape pas, et pourquoi.** `scripts/porte/cadences.ts` démontre qu'un `cron`
**nomme** chaque source ; il ne dit rien de la date à laquelle ce cron tombera pour la première
fois, ni de l'âge de la copie ce jour-là. Les deux questions sont différentes, et la seconde
n'est tenue par rien : c'est `freshness`, a posteriori, qui la pose — quatre matins trop tard.
Jamais élargir `TOLERANCE_DAYS` pour éteindre ce rouge : le retard était réel.

---

**`gh issue list --label` répond en retard de quelques secondes après un changement d'état —
5 septembre 2026.** `gh issue reopen 74` rend `✓ Reopened`, et `npm.cmd run porte:etat` lancé
dans la foulée a répondu **« aucun rouge ouvert »**. Le même `gh issue list --label porte-rouge
--state open` joué à la main dix secondes plus tard rendait bien `#74`. La liste passe par
l'index de recherche de GitHub, qui est cohérent *à terme* ; `gh issue view <n>`, lui, lit
l'issue elle-même et répond juste tout de suite.

Conséquence pratique, et elle vaut pour toute démonstration de `w1-porte-lue` (#77) : **ne pas
conclure d'un `porte:etat` joué dans la seconde qui suit un `reopen` ou un `close`.** Attendre,
ou recouper au `gh issue view`. Le piège est doux — il rend un **vert**, c'est-à-dire
exactement la forme d'erreur que `porte:etat` existe pour empêcher.

**`npm.cmd run <script> -- --drapeau valeur` ne passe pas les arguments depuis Git Bash —
5 septembre 2026.** Sur ce poste, `npm.cmd run porte:signal -- --corps fichier.md` échoue sur
`'C:\Program' n'est pas reconnu en tant que commande interne ou externe` : le `--` traverse le
shim `.cmd` et le chemin de l'interpréteur, qui contient une espace, part sans guillemets.
Depuis PowerShell la même ligne marche — c'est ce que `CLAUDE.md` documente et il n'y a rien à
y corriger.

Le contournement, quand on est dans Git Bash : appeler le script directement, sans passer par
npm — `npx tsx scripts/porte/signal.ts --corps … --titre … --label …`. Ne concerne que les
scripts qui prennent des drapeaux : `porte:signal`, `porte:rapport`, `mcp:paquet --registre`.

## Une fonction `STABLE` ne peut pas écrire — mais elle peut appeler une fonction qui écrit — 5 septembre 2026

Mesuré sur `dbefhvmyfmmhjeetdddu` en montant le journal des questions (`w1-observabilite`, #72).
Les deux moitiés comptent, et c'est la seconde qui débloque.

```
STABLE, insert direct dans le corps   → ERREUR : INSERT is not allowed in a non-volatile function
STABLE → perform d'une fonction VOLATILE qui insère → OK, la ligne est écrite
```

**La volatilité n'est pas transitive.** Postgres pose le drapeau « lecture seule » de SPI par
fonction, à partir de sa propre `provolatile` ; une fonction `VOLATILE` appelée depuis une
`STABLE` retrouve le droit d'écrire dans son propre cadre.

**Ce que ça évite, et c'est tout l'intérêt.** Les quatre fonctions de rayon sont
`stable parallel safe`, et leurs budgets — `DIAGNOSTIC.md` §27 à §29, deux jours de mesures —
tiennent à leurs plans. Les passer `volatile` pour qu'elles journalisent aurait été le geste
évident et il aurait fallu tout remesurer. Elles restent `STABLE` et journalisent quand même.

**Deuxième mesure, le même jour, et elle change la garde.** Dans une transaction `READ ONLY` —
ce que PostgREST ouvre sur un `GET` — l'écriture est refusée. Un bloc
`begin ... exception when others then null; end` **autour de l'insertion, dans la fonction qui
écrit**, avale le refus : la réponse sort intacte et c'est la ligne de journal qui se perd.
Vérifié dans les deux sens. La garde vit chez l'écrivain, une seule fois, plutôt que chez chaque
appelant.

**Ce que ça ne rattrape pas :** un plan parallèle. Une fonction `parallel safe` exécutée dans un
worker ne peut ni écrire ni ouvrir de sous-transaction, donc pas même attraper l'erreur. En
pratique l'appel PostgREST est planifié seul et l'appel au journal, qui passe par une fonction
`VOLATILE`, n'est de toute façon jamais parallélisé — mais ce n'est pas une garantie écrite
quelque part, c'est une propriété du planificateur.


## Un `case` ne se convertit pas tout seul vers un enum, un littéral si — 5 septembre 2026

Même journée, même chantier, et le défaut a survécu à une relecture parce qu'il ressemble à du
code qui marche.

```sql
perform f('rpc', 'compass_premises_within', 'retenue_licence', ...);              -- passe
perform f('rpc', 'compass_premises_within',
          case when v = 0 then 'vide' else 'repondu' end, ...);                   -- ECHOUE
```

Un littéral nu reste de type `unknown`, et Postgres le résout vers l'enum sans rien dire. Un
`case` n'est pas un littéral : ses branches sont d'abord résolues entre elles, il sort en `text`,
et `text -> enum` n'est pas une conversion implicite. La résolution de fonction échoue alors sur
un message qui montre une signature presque juste :

```
function public.compass_record_question(unknown, unknown, text, double precision,
        double precision, double precision, smallint, unknown) does not exist
```

**Ce qui rend le piège coûteux, c'est quel chemin il casse.** Les deux branches de retenue
passaient un littéral et fonctionnaient ; c'est le **chemin nominal** — la recherche ordinaire
qui aboutit — qui levait. Un point hors corpus et un millésime retenu répondaient pendant qu'une
requête normale échouait, ce qui est l'inverse de l'ordre dans lequel on cherche.

Trouvé par `npm.cmd run eval`, cinq minutes après le début du bras A, et non par une relecture :
la migration s'était appliquée sans une plainte, parce que plpgsql ne résout ses appels qu'à
l'exécution. Correctif : `(case ... end)::public.question_outcome`. Migration `20260905000002`.

## PostgREST choisit son mode de transaction sur la volatilité de la fonction, même en POST — 5 septembre 2026

**Une fonction `STABLE` appelée par PostgREST tourne dans une transaction `READ ONLY`**, et
donc ne peut rien écrire — pas même par une fonction `VOLATILE` intermédiaire, contrairement à
ce qui marche sur une connexion directe (piège précédent). Le mode n'est pas décidé par le verbe
HTTP : un `POST /rpc/f` sur une fonction `STABLE` est en lecture seule.

Mesuré sur `dbefhvmyfmmhjeetdddu`, deux sondes jetables identiques appelées avec la vraie clé
publiable :

| Volatilité de la fonction | `current_setting('transaction_read_only')` |
| --- | --- |
| `STABLE` | **`on`** |
| `VOLATILE` | `off` |

**Ce qui a rendu ça coûteux, et c'est le §32 une fois de plus.** La preuve d'origine avait été
prise par le pilote `pg`, donc sur le chemin **privilégié**, où la fonction `VOLATILE` appelée
depuis une `STABLE` écrit bel et bien. Le chemin d'un visiteur n'avait pas été joué. Et le
symptôme était **muet** : la garde `exception when others` de l'écrivain avalait le refus, la
réponse sortait intacte, la table restait vide — c'est-à-dire exactement ce à quoi ressemble un
produit sans trafic, ce que celui-ci est par ailleurs. Trouvé en appelant le produit comme un
visiteur, trois appels avec la vraie clé, et non par une relecture.

**La sortie est de rendre la fonction `VOLATILE`**, ce qui impose `PARALLEL UNSAFE` — une
fonction qui écrit ne peut pas tourner dans un worker. Remesuré aussitôt sur le bras E : les
pages ne bougent pas d'une unité (`compass_premises_within` 92 147, `compass_scoring_context_within`
86 083, identiques à avant), parce que ces fonctions sont en plpgsql, jamais inlinées, et que
leurs instructions internes sont planifiées pour elles-mêmes. Ce que la volatilité retire est
autre chose : **PostgREST refuse désormais un `GET` sur ces fonctions** (405). Aucun appelant
n'en fait — `supabase-js` poste par défaut — mais c'est une promesse d'API retirée.


## PostgREST ne relit pas le catalogue tout seul : `notify pgrst, 'reload schema'` — 5 septembre 2026

Payé deux fois dans la même heure, sous deux déguisements.

- Une fonction **créée** puis appelée aussitôt rend **404 `PGRST202`**, avec un message qui
  affirme qu'elle n'existe pas et suggère une fonction voisine. Elle existe : c'est le cache de
  schéma de PostgREST qui ne l'a pas vue.
- Une fonction **modifiée** — ici sa volatilité — continue d'être servie **avec l'ancienne
  définition**. C'est le cas dangereux : rien n'échoue, l'API répond 200, et le comportement
  reste celui d'avant la migration. Une migration appliquée n'est donc pas une migration servie.

```sql
notify pgrst, 'reload schema';   -- en fin de toute migration qui touche une signature,
                                 -- une volatilité ou un droit d'exécution
```

Compter quelques secondes avant de vérifier. `supabase db push` ne l'émet pas.

---

## `git add -A` emporte le travail des sessions parallèles — trois fois, 26 août au 5 septembre

**Le dépôt n'a pas un seul écrivain.** Des sessions Claude tournent en parallèle et Lovable
synchronise dans les deux sens : à tout instant, l'arbre porte du travail qui n'est pas celui de
la session qui commite. Un `git add -A` revendique tout.

**Les trois occurrences, et la troisième est l'inverse des deux premières :**

| Commit | Date | Ce qui a été emporté, ou manqué |
| --- | --- | --- |
| `c861bac` | 26 août | `.fn-dump/` (8 fichiers) et quatre `scripts/eval/_*.ts`, d'une session travaillant sur `#58` |
| `ffe217c` | 5 sept. | `scripts/tmp-nan.ts`, le brouillon de la session `#68` **alors en cours** |
| `be63054` | 5 sept. | l'inverse — le message annonçait une règle `.gitignore` restée **non stagée**, jamais commitée |

**Ce qui distingue les deux premiers, mesuré et non supposé** : tous les chemins emportés étaient
en statut `A` — l'ajout d'un fichier jusque-là non suivi. Les commits ordinaires de ce dépôt
portent des `M`. Et **un seuil de volume n'aurait rien vu** : le second balayage faisait six
fichiers, exactement la taille d'un commit normal ici. C'est le premier réflexe de garde, et il
était faux.

**La garde posée le 6 septembre** : `.githooks/pre-commit` refuse un commit qui ajoute des
fichiers, sauf `COMPASS_AJOUTS=1`. Elle ne se déclenche qu'à l'ajout — environ un commit sur
trois — donc elle ne devient pas le bruit qu'on filtre. `npm install` pose `core.hooksPath` par
le script `prepare`, sinon la garde ne vivrait que sur le poste où elle a été posée.

**Ce que ça ne rattrape pas**, et c'est la moitié qui reste humaine : la *modification* d'un
fichier suivi faite par une autre session. Git enregistre ce qui a changé, jamais qui
travaillait, et rien ne peut l'inférer. Stager par nom reste la règle ; le crochet retire
l'accident, pas la discipline.

**Et pour le troisième** : aucune garde mécanique. Un `git status` avant de valider montre
` M` (non stagé) à côté de `M ` (stagé), et l'écart tient dans une colonne. La seule parade est
de lire `git diff --cached --name-only` avant de commiter — un commit dit ce qu'il porte, jamais
ce qu'on voulait y mettre.


---

## Une règle qui dérive sa population de git ne voit pas les brouillons ignorés — 6 septembre 2026

Mesuré en écrivant le contre-test de `w1-observabilite-echappement` (#81), et le contre-test
s'est retourné contre la règle avant de servir à quoi que ce soit.

La règle énumère les fichiers qui atteignent PostgREST — `git ls-files --cached --others
--exclude-standard` — et exige de chacun l'échappement d'observabilité ou une raison écrite.
Pour la démontrer, une sonde a été écrite : elle appelle `compass_premises_within` par PostgREST
avec la vraie clé publiable et ne pose pas l'en-tête. **Elle est passée au vert.**

```
scripts/tmp-w1-81-sonde.ts   → invisible, la règle est verte
scripts/eval/sonde-w1-81.ts  → même contenu, la règle est ROUGE
```

`--exclude-standard` honore `.gitignore`, et `.gitignore` ligne 94 ignore `scripts/tmp-*.ts` —
la garde posée le 5 septembre après que `ffe217c` eut emporté `scripts/tmp-nan.ts` d'une session
parallèle. **La garde contre un accident ouvrait la porte à un autre**, et pas un accident
lointain : un brouillon de session est le candidat le plus probable qu'il y ait pour un appel
non journalisé — c'est littéralement ce qu'était cette sonde.

*Ce qu'il faut en retenir, au-delà de ce ticket.* « Ignoré » veut dire *ne commite pas ça*,
jamais *ne regarde pas ça*. Un brouillon qui pollue une table la pollue que git le suive ou non.
Toute règle qui énumère des FICHIERS depuis git doit balayer aussi
`git ls-files --others --ignored --exclude-standard -- <dossiers de code>` — scopé aux
répertoires qu'une personne écrit, sinon `node_modules` entre avec ses cent mille fichiers.
Les trois règles voisines n'ont pas ce trou parce qu'elles n'énumèrent pas des fichiers :
`arms.ts` lit `package.json`, `cadences.ts` lit les migrations, `catalogue.ts` lit un tableau
markdown.

*Ce que ça ne rattrape toujours pas* : un fichier ignoré hors des répertoires de code, et un
appel émis depuis ailleurs que le dépôt.

## Les fixtures d'une règle entrent dans sa propre population — 6 septembre 2026

Même journée, même chantier, et le symptôme est un vert trompeur plutôt qu'un rouge.

`scripts/porte/observabilite.ts` reconnaît un appelant de PostgREST à deux signes dans le texte
du fichier : `@supabase/supabase-js` avec `createClient`, ou le chemin `/rest/v1/`. Son propre
test écrit ces deux chaînes **en littéral**, pour prouver que la détection les voit. Résultat au
premier passage : la population comptait **5 fichiers au lieu de 4**, et le cinquième était le
test — classé « échappé », **sur la foi de la fixture qui prouve que l'en-tête est reconnu**.
Un vert sur la pire raison possible.

La sortie n'est pas de tordre les fixtures pour qu'elles ne ressemblent plus à du code : la
prochaine personne qui écrit un cas de test retomberait dedans sans le savoir. C'est d'exclure
`*.test.*` de la population — un test joue la règle, il n'est pas une des choses dont elle
parle — **et de refermer le trou que cette exclusion ouvre** : `testsImportingClient` refuse
qu'un fichier de test *importe* un client PostgREST. Une fixture n'est jamais un import, et un
import est la seule façon dont un test atteindrait vraiment la base.

Le cousin de ce piège est déjà dans ce fichier : `arms.ts` retire les lignes de commentaire des
workflows, parce qu'un workflow qui *explique* pourquoi il ne joue pas un script ne doit pas
être lu comme le jouant. Même geste, une population plus loin — et ici deux fichiers en
vivaient : `scripts/build/envGuard.ts` et `src/main.tsx` parlent de `createClient` sans jamais
l'appeler.

## Le ledger garde le TEXTE des migrations, et il ne se rejoint pas sur les points-virgules — 6 septembre 2026

Deux mesures faites en écrivant `w1-ledger` (#82), et la première est une bonne nouvelle qu'il
aurait été coûteux de ne pas aller chercher.

**`supabase_migrations.schema_migrations` porte trois colonnes : `version`, `name`, et
`statements text[]`.** Le ticket faisait de la comparaison des corps une promesse conditionnelle
— *« à mesurer avant de promettre : si le ledger ne garde pas le texte, dire que le bras ne
compare que les identifiants »*. Il le garde : mesuré le 6 septembre 2026 sur
`dbefhvmyfmmhjeetdddu`, **53 lignes, aucune `statements` nulle, aucune vide**, la dernière à 20
statements dont le premier est l'en-tête de commentaire du fichier. Le corps est donc comparable,
et le contrôle que `_cmp-fn.ts` emportait avec lui le 26 août est reprenable.

**Mais la reconstruction n'est pas un `join(";")`.** Le CLI ne conserve pas la place des
points-virgules : il les mange au découpage et n'en remet aucun. Mesuré sur les 53 lignes, en
comparant au fichier suivi après réduction des espaces :

| Reconstruction | Identiques |
| --- | ---: |
| `statements.join(";")` | **0** / 53 |
| `statements.join(";") + ";"` | **2** / 53 |
| `statements.join(" ")`, `;` traité comme un espace | **51** / 53 |

C'est la troisième qui est juste, et les deux lignes restantes ne sont pas du bruit de
normalisation : ce sont deux migrations réellement réécrites après leur application
(`DIAGNOSTIC.md` §39). La forme qui *semble* la plus fidèle — rejoindre sur `;` — aurait rendu
53 divergences sur 53, donc un bras rouge dès sa naissance, donc un bras désactivé dans la
semaine.

*Ce que la normalisation retenue ne voit pas, et il faut le dire :* une différence qui ne
tiendrait qu'à des espaces ou à la place d'un point-virgule. C'est le prix de la première ligne
du tableau.

**Et le retour chariot, une fois de plus.** Le fichier lu sur ce poste porte des `\r\n`, le
ledger n'en a aucun. Sans le les retirer d'abord, **les 53 lignes divergeaient ici et aucune sur
un runner** — un verdict qui dépend du système d'exploitation, ce que `DIAGNOSTIC.md` §33 a déjà
coûté une fois sur `esbuild`. Troisième occurrence de ce piège dans ce fichier ; c'est
maintenant un réflexe à avoir avant d'écrire la première comparaison, pas après.

## `ST_MakePoint` seul rend un point SANS SRID, et `ST_Contains` répond faux sans se plaindre — 6 septembre 2026

Rencontré en instruisant `w6-analyse` (#50), et il coûte d'autant plus qu'il ne ressemble pas à
une erreur : **la requête réussit, elle rend simplement zéro ligne.**

```sql
-- Zéro ligne. Le point est pourtant au centre du quartier des Halles.
select q.id from public.quartier q
where ST_Contains(q.geom::geometry, ST_MakePoint(2.34490, 48.86229));

-- Une ligne, la bonne. La seule différence est le passage par geography.
select q.id from public.quartier q
where ST_Contains(q.geom::geometry, ST_MakePoint(2.34490, 48.86229)::geography::geometry);
```

`ST_MakePoint` rend une géométrie de **SRID 0**. `quartier.geom` est en 4326. Comparer deux
SRID différents ne lève pas : PostGIS répond `false`. Le cast en `geography` pose le 4326, et
c'est pour ça que toutes les fonctions du dépôt écrivent
`v_point := ST_MakePoint(p_lng, p_lat)::geography` **avant** de s'en servir — la ligne existe
dans `compass_survival_by_trade`, `compass_street_rotation` et les autres, et elle n'est pas
décorative.

**Le contrôle qui départage en une requête**, quand un prédicat géographique rend un vide
suspect : `ST_Distance` ne se tait pas, lui.

```sql
select q.name, ST_Distance(q.geom, ST_MakePoint(2.34490, 48.86229)::geography) d
from public.quartier q order by d limit 3;   -- Halles, 0
```

Une distance nulle avec un `ST_Contains` faux ne laisse qu'une explication, et ce n'est pas la
géométrie.

**Et l'ordre des arguments est l'autre moitié du piège** : `ST_MakePoint(lng, lat)`, la
longitude **d'abord**. Inversé, le point tombe en Somalie, `ST_Contains` rend `false` de la même
façon, et les deux fautes produisent le même symptôme — zéro ligne, aucune erreur. Vérifier le
SRID avant de soupçonner l'ordre : le second se voit à `ST_Distance`, qui rend alors des
millions de mètres au lieu de zéro.


## Un `cross join` implicite après un `join` explicite est une erreur de syntaxe, pas un plan lent — 6 septembre 2026

Même session. Écrit d'instinct, refusé par le planificateur :

```sql
-- ERREUR : invalid reference to FROM-clause entry for table "p"
select ... from public.premise_location l, p
join public.premise_observation o on o.location_id = l.id
where ST_DWithin(l.geom, p.g, 250);
```

La virgule et le `join` explicite ne se mélangent pas dans cet ordre : `p` n'est pas visible
depuis la clause `on` du `join`, qui est évaluée avant. La forme qui marche met le `cross join`
en premier, explicitement :

```sql
select ... from public.premise_location l
cross join p
join public.premise_observation o on o.location_id = l.id
where ST_DWithin(l.geom, p.g, 250);
```

Sans conséquence sur le résultat une fois corrigé — mais le message d'erreur
(`errorMissingRTE`, `parse_relation.c`) ne nomme pas la cause, et il envoie chercher une faute
de nom qui n'existe pas.


## Un jeu Opendatasoft peut republier sous un `dataset_id` qui ne se fixe pas — 7 septembre 2026

w2-idfm (#19). Le portail IDFM (`data.iledefrance-mobilites.fr`) republie chaque trimestre
« Validations sur le réseau ferré : Profils horaires par jour type », et l'identifiant du jeu
NE SE FIXE PAS d'une édition à l'autre — contrairement à tous les jeux Paris Data déjà lus
(`chantiers-perturbants`, `terrasses-autorisations`, `plub_protcom`), dont l'id est stable
depuis toujours. Mesuré ce jour-là : trois éditions sur quatre portent
`validations-reseau-ferre-profils-horaires-par-jour-type-Neme-trimestre`, la quatrième (2e
trimestre 2025) porte `validations-sur-le-reseau-ferre-profils-horaires-par-jour-type-2eme-
trimestre-2025` — un `-sur-le-` et une année en plus que rien n'annonce à l'avance.

Épingler l'id du jour, comme `chantiers.ts` épingle `chantiers-perturbants`, aurait répété #56
(SIRENE stock, ressource remplacée sous une URL consignée) le trimestre où IDFM change à
nouveau l'orthographe. `scripts/ingest/lib/idfmOpendata.ts` (`resolveDataset`) ne pingle donc
jamais cet id : il cherche par TITRE (stable, lui, sur toutes les éditions mesurées) via l'API
de recherche du portail (`?q=…`), et prend l'édition la plus récemment modifiée parmi celles
dont le titre correspond à un prédicat écrit par l'appelant. La sonde du catalogue
(`scripts/porte/catalogue.json`), elle, épingle quand même l'édition du jour — c'est la seule
façon de vérifier une licence par une réponse HTTP plutôt qu'une page — et porte la réserve
écrite que son 404, seul, à l'échéance semestrielle de la source, se lit comme « l'id a
tourné », jamais comme une source disparue.

**À vérifier avant de soupçonner autre chose** : un identifiant Opendatasoft qui semblait fixe
peut ne pas l'être — chercher par titre plutôt que supposer la stabilité d'un id non encore
mesuré sur plusieurs éditions.


## Deux profils qui somment chacun à 100 % ne se moyennent PAS tranche par tranche — 7 septembre 2026

w2-idfm (#19). Une station desservie par deux lignes publie DEUX profils horaires
indépendants (un par `code_stif_arret`), chacun sommant à 100 % sur ses propres heures.
Combiner les deux en un seul profil de station semblait exiger une moyenne par tranche
horaire — sommer les pourcentages des deux codes à une heure donnée, diviser par le nombre de
codes ayant publié CETTE heure-là. Ça se sondait juste sur un premier échantillon et faisait
sommer dix stations à 115-180 % sur l'ensemble parisien : un code qui ne publie rien à 3 h du
matin (parce qu'il n'y circule aucun train à cette heure, pas parce qu'il « n'a pas d'avis »)
faisait diviser cette tranche par un compte plus petit, donc la surestimait.

Le correctif : compter les codes UNE FOIS par (station, jour type) — jamais par tranche — et
diviser chaque tranche par ce compte fixe. Un code silencieux à une heure contribue 0 à cette
heure, comme il se doit, et la somme reste 100 quels que soient les trous.

**Ce que ce correctif n'a pas rattrapé, et qu'il a fallu chercher séparément** : une zdc
parisienne sur 259, 71545 « Porte de Clichy », publie jusqu'à QUATRE lignes pour le même
(code, jour type, tranche horaire) avec des pourcentages différents (0,97 à 26,41 à midi), sans
aucun champ du schéma (huit colonnes, aucune ne discrimine) pour dire laquelle retenir. Ni la
moyenne par tranche ni le compte fixe ne peuvent le voir : les deux supposent une seule ligne
par (code, tranche), et cette station en a plusieurs. `scripts/ingest/idfm.ts`
(`aggregateProfiles`) détecte cette multiplicité et écarte la station entière plutôt que de
publier un chiffre inventé — mesuré : la seule exception sur 259, pas une défense générale.

**À vérifier avant de faire confiance à une agrégation de pourcentages** : que chaque clé
qu'on croit unique (ici `code_stif_arret` par tranche) l'est réellement dans le jeu source —
compter les lignes par clé avant de moyenner, pas après.

---

## Un lockfile publié ne voyage pas : monter `mcp-server/package-lock.json` ne protège aucun consommateur — 9 septembre 2026

**Ce qui a été cru, et qui est faux.** En fermant les trois alertes `hono` du 9 septembre, la
session a raisonné ainsi : `hono` est une `dependencies` **dure** de
`@modelcontextprotocol/sdk`, donc installée chez qui installe `paris-compass-mcp` ; monter le
lockfile de `mcp-server/` protège donc les tiers. **La première moitié est vraie, la conclusion
ne l'est pas.**

**La mesure.** Installation du paquet publié dans un répertoire neuf, comme un tiers le ferait :

```
npm install paris-compass-mcp
  added 104 packages, and audited 105 packages
  found 0 vulnerabilities
  hono résolu : 4.13.7
```

Et ce **0** ne doit rien au lockfile du dépôt. Un paquet npm publié **n'embarque pas son
lockfile** — `files` ne liste que `dist` et `README.md`, et npm ne l'installerait pas même s'il
y était. Le consommateur résout les plages `^` du `package.json` publié **au moment de son
installation**, donc vers la dernière version compatible du jour. Il aurait eu `hono` 4.13.7 le
9 septembre que le dépôt ait monté son lockfile ou non — parce que 4.13.5 était publiée depuis
la veille chez l'éditeur de `hono`, pas parce que nous avons touché à quoi que ce soit.

**Ce que le lockfile de `mcp-server/` gouverne réellement**, et c'est tout : l'arbre de cette
machine et celui du runner — donc ce que `verify:mcp`, `mcp:paquet` et `npm audit` voient, et
ce sur quoi Dependabot ouvre des alertes. C'est un arbre de développement, pas un arbre livré.

**La conséquence qui compte, et elle va dans l'autre sens.** Ce qu'un tiers reçoit ne dépend pas
de notre diligence mais de la **plage** que nous déclarons et de ce que l'amont a publié. Un
`^4.11.4` laisse entrer la correction sans nous, et laisserait aussi entrer une régression sans
nous. La seule chose qui protège vraiment un consommateur est **la version de
`@modelcontextprotocol/sdk` que nous déclarons**, puisque c'est elle qui fixe la plage de `hono`.

**Ce que ça ne rattrape pas.** Un tiers qui a installé **avant** la publication d'une correction
garde l'arbre vulnérable jusqu'à sa prochaine installation, et rien de ce que fait ce dépôt ne
l'atteint. Il n'y a pas de rappel de lot en npm.

## Le panneau de navigation masqué ne peint pas, donc `react-helmet-async` n'écrit rien dans `<head>` — 10 septembre 2026

**Ce qui a été observé, et pendant combien de temps ça a ressemblé à un défaut.** En vérifiant le
`noindex` de `/contexte/:slug` (`w6-contexte`, #119), le `<head>` du serveur de développement ne
portait **ni `<title>` de page, ni `canonical`, ni `alternate`, ni `robots`** — sur la page neuve
comme sur `/methodologie`, qui utilise le même composant `Seo` depuis des semaines. La conclusion
évidente — « `Seo` est inerte, `HelmetProvider` manque » — est fausse : `src/main.tsx` monte bien
`HelmetProvider`.

**La cause.** `react-helmet-async` applique ses balises derrière `requestAnimationFrame` quand
`defer` vaut vrai, et `defer` vaut vrai par défaut (`node_modules/react-helmet-async/lib/index.js`,
`handleStateChangeOnClient`). Un onglet dont l'onglet est **masqué** ne peint pas : `rAF` ne se
déclenche jamais, et rien n'est jamais posé. Mesuré sur place — `document.visibilityState` rendait
`"hidden"` et un `requestAnimationFrame` posé à la main n'a pas tiré en 1 500 ms.

**Comment trancher en dix secondes**, avant de soupçonner le code : poser un `rAF` et voir s'il
tire. S'il ne tire pas, `<head>` ne prouve rien. Une fois la fenêtre revenue au premier plan, la
même page portait `robots: noindex, follow`, le `canonical` et les trois `alternate` attendus.

**Ce que ça ne rattrape pas.** Le même mécanisme vaut pour un robot d'indexation qui n'exécute pas
de rendu, et pour toute capture faite dans un onglet d'arrière-plan. Ce n'est pas un piège d'outil
seulement : c'est une propriété du produit, et le jour où le référencement des pages générées se
rediscutera (voir `docs/tickets/w6-contexte.md`, « Le référencement »), c'est `defer` qu'il faudra
regarder en premier.

## Une carte Leaflet sans vue n'attache AUCUNE des couches qu'on lui ajoute — 13 septembre 2026

**Le symptôme ne ressemble pas à sa cause.** `instance.fitBounds(circle.getBounds())` jette
`Cannot read properties of undefined (reading 'layerPointToLatLng')`. On cherche ce qui est
`undefined` du côté de la carte ; c'est le **cercle** qui n'a pas de carte.

**Le mécanisme, lu dans `node_modules/leaflet/src`.** `Map.addLayer` ne pose pas `layer._map`
lui-même : il appelle `this.whenReady(layer._layerAdd, layer)`. `whenReady` exécute tout de suite
si `this._loaded` est vrai, et **s'abonne à l'événement `load` sinon**. `_loaded` ne devient vrai
qu'au premier `setView`. Une carte créée par `L.map(node, options)` sans `center`/`zoom` et sans
`setView` n'est donc jamais chargée : chaque couche ajoutée est mise en attente d'un événement
que personne n'émettra, `layer._map` reste `undefined`, et la première méthode de couche qui lit
`this._map` jette. `Circle.getBounds()` est celle-là — elle fait
`this._map.layerPointToLatLng(...)`.

**Ce qui rend le piège coûteux** : rien ne prévient. Les `addTo` réussissent, `L.circle` réussit,
la carte existe, le conteneur porte `.leaflet-container`. Le seul symptôme est la méthode qui lit
`_map`, et elle peut arriver dix lignes plus loin ou jamais — `ContextMap` a vécu du 11 au
13 septembre 2026 en plantant **à chaque montage**, miroirs debout ou non, sans que personne le
sache : la page mourait dans la frontière d'erreur et la panne Overpass concomitante fournissait
une explication toute faite (`DIAGNOSTIC.md` §50, `#156`).

**La règle qui en sort** : poser la vue AVANT la première couche, et ne jamais demander à une
couche des bornes que l'appelant peut calculer lui-même. `src/lib/contextMapFrame.ts` calcule le
cadre depuis le point, sans Leaflet ; `L.latLng(p).toBounds(d)` fait aussi le travail sans carte,
si l'on veut rester chez Leaflet.

**Et le corollaire de test** : un défaut qui n'existe qu'une fois monté ne se voit pas dans un
harnais `environment: 'node'`. Celui-ci se reproduit en trois lignes sous jsdom avec le vrai
Leaflet, et **jsdom suffit** — mesuré : la séquence corrigée monte même sur un conteneur de
taille nulle, Leaflet bornant le zoom à 19 au lieu de 14 sans rien jeter.

## Un budget d'attente ne rend pas atteignable le miroir qui répond — 13 septembre 2026

**Mesuré sur les trois miroirs d'`OVERPASS_ENDPOINTS`, requête réelle de la fiche, cinq
adresses** : `overpass-api.de` refuse en **0,15 à 0,28 s** (406 Apache, avec ou sans
`User-Agent` de navigateur), `overpass.kumi.systems` met **35 à 43 s** à rendre un 504 ou ne
répond pas du tout avant 70 s, et `overpass.private.coffee` — le seul qui ait répondu — prend
**9, 10,6, 19,5 ou 49,5 s**, quand il ne rend pas lui aussi un 504 à 36-41 s.

**La conséquence n'est pas intuitive.** Le miroir qui répond est **troisième**. Sous un budget
total de dix secondes, le premier échoue en 0,2 s, le deuxième consomme les 9,8 s restantes, et
le troisième n'est jamais interrogé. Monter le budget à vingt secondes ne change que la durée du
même refus. **Un budget borne ce qu'on dépense, il ne réordonne pas ce qu'on interroge** — et
face à une liste où le lent précède le vivant, ces deux choses ne sont pas la même.

À se rappeler avant de croire qu'un délai trop court est la raison d'un refus : regarder d'abord
lequel des miroirs a été atteint. La trace est dans l'onglet réseau, un seul appel au lieu de
trois.

## Un test qui monte un composant n'est plus couvert par `include: 'src/**/*.test.ts'` — 13 septembre 2026

Le harnais tourne en `environment: 'node'` et n'incluait que `.ts`. Un fichier `.test.tsx` posé
à côté d'un composant **ne tourne pas et ne dit rien** : `vitest run` sort en 0 en l'ignorant, ce
qui ressemble exactement à un test qui passe. Les deux lignes à changer sont dans
`vitest.config.ts` — le motif, et `@vitest-environment jsdom` en tête du fichier concerné.

**Et la divergence de verrous qui va avec.** `jsdom` est entré en dépendance de développement le
13 septembre 2026 (`^26.1.0`, `npm audit` à zéro vulnérabilité). `package-lock.json` le porte,
**`bun.lockb` non** : la régénération passe par Docker (`CLAUDE.md`, « Bun ne tourne pas sur cette
machine ») et n'a pas été faite. Sans conséquence attendue — Lovable bâtit par `vite build`, qui
ne charge aucune dépendance de test — mais c'est un écart écrit plutôt que tu, et la règle des
verrous identiques ne vaut que pour les paquets nommés par un avis.

## `pr.yml` tourne en Node 20 et `porte.yml` en Node 22 : une proposition verte n'est pas une porte verte — 13 septembre 2026

**Mesuré en payant le rouge.** `jsdom` a d'abord été installé en **30.0.1**, sa dernière version.
`npm.cmd run test` passait ici — Node 24 — et **la proposition est sortie rouge** :

```
Error: [vitest-pool]: Failed to start forks worker for test files …/ContextMap.test.tsx.
Caused by: TypeError: webidl.util.markAsUncloneable is not a function
```

La cause est dans le manifeste du paquet, pas dans le code :
`jsdom@30.0.1` déclare `engines: { node: '^22.22.2 || ^24.15.0 || >=26.0.0' }` et dépend
d'`undici@^8`. **`npm ci` n'applique pas `engines`** : l'installation réussit sans un mot, et
l'incompatibilité n'apparaît qu'à l'exécution, sous la forme d'une méthode absente. `jsdom@26.1.0`
déclare `engines: { node: '>=18' }` — c'est la plus petite version qui suffit, et c'est elle qui
est posée, `^26.1.0` excluant d'office la 27 qui relève le plancher.

**Le piège plus large, et il survivra à jsdom.** `.github/workflows/pr.yml` épingle
`node-version: 20` ; `.github/workflows/porte.yml` épingle `"22"`. Les deux portes ne jouent donc
pas le même moteur, et une dépendance qui exige Node 22 sera **verte le matin dans la porte
planifiée et rouge dans chaque proposition** — ou l'inverse. Rien ne recoupe les deux fichiers.
Avant d'ajouter une dépendance de développement, lire son `engines` **contre le plus bas des
deux**, pas contre le Node du poste.

## `gh pr merge --delete-branch` échoue depuis un worktree, APRÈS avoir fusionné — 13 septembre 2026

**Le message ment sur ce qui s'est passé.** Lancé depuis `.claude/worktrees/<ID>`, à la fin de
la session de `#156` :

```
failed to run git: fatal: 'main' is already used by worktree at 'C:/.../paris-compass'
```

et le code de sortie est **1**. Lu vite, ça dit « la fusion a échoué ». C'est faux : **la fusion
a réussi** — `gh pr view <N> --json state` rend `MERGED` avec son commit de squash. Ce qui a
échoué est l'étape d'après, purement locale : `gh` veut basculer le dépôt sur `main` avant de
supprimer la branche, et `main` est déjà occupé par l'arbre partagé. La branche **distante reste
donc en place**, seule trace du travail à demi terminé.

**La suite qui marche**, et c'est la seule chose à retenir :

```powershell
gh pr merge <N> --squash --delete-branch   # sort en 1, mais la fusion est faite
gh pr view <N> --json state,mergeCommit    # verifier : MERGED
git push origin --delete ticket/<ID>       # faire soi-meme ce que gh n'a pas pu faire
```

**Pourquoi ça va se reproduire.** La règle « une session, un worktree » (`#143`) et la règle
« une session, une branche, une proposition » (`#82`, `CLAUDE.md`) se contredisent sur ce point
précis : la seconde donne une commande qui suppose qu'on peut basculer sur `main`, la première
garantit qu'on ne peut pas. Chaque session qui suit le prompt commun jusqu'au bout tombera
dessus.

**Et le vrai danger n'est pas la branche orpheline**, c'est la lecture du code de sortie. Une
session qui conclut « la fusion a échoué » et relance, ou qui repart d'un `git merge` à la main,
travaille sur un dépôt déjà fusionné. **Vérifier l'état de la proposition avant de croire le code
de sortie** — c'est la même règle que le rapport de la porte, dans l'autre sens : ici le code de
sortie parle d'autre chose que de ce qu'on croit lui avoir demandé.

---

## Un bras neuf va dans `porte.yml` **OU** dans `cadence.json`, jamais dans les deux — 13 septembre 2026

w1-porte-page (#158). Le ticket demandait, mot pour mot, que le quinzième bras soit « dans
`porte.yml` **et** dans `cadence.json` ». Les deux ensemble sont un **rouge** : `classifyArms`
(`scripts/porte/arms.ts`) rend l'état `contradictoire` pour un script à la fois planifié par un
workflow et excusé dans `scripts/porte/cadence.json`, et `arms.test.ts` fait échouer
`npm.cmd run test` dessus. Le suivre à la lettre aurait rougi la porte du matin.

**La règle est un OU exclusif, et `cadence.json` est la branche des NON planifiés.** Son
`_lisez-moi` le dit — « soit joué par un workflow qui porte un `on.schedule`, soit nommé ici
avec une raison écrite » — mais `CLAUDE.md` la résume en une phrase qui se lit dans l'autre
sens : « un script ajouté à `package.json` fait échouer `test` tant qu'il n'est ni planifié ni
justifié dans `scripts/porte/cadence.json` ». Les deux disent la même chose ; la première se lit
vite comme une conjonction, et le ticket l'avait lue comme ça.

**Ce qu'il faut faire, en une ligne :** ajouter l'étape dans `.github/workflows/porte.yml`, ne
rien écrire dans `cadence.json`, et lancer `npx vitest run scripts/porte/arms.test.ts` — il dit
`planifie` avec le nom du fichier qui déclenche, ou il nomme l'incohérence.

**Et c'est un cas de plus de la règle du dépôt sur les tickets** : les chiffres et les
prescriptions d'un ticket ont été écrits sans accès en lecture au dépôt. Ce qu'un ticket dit de
FAIRE se vérifie contre le code qui le contrôlera, pas contre la phrase du ticket.

---

## PostgREST plafonne une RPC à mille lignes, et un compte plafonné ressemble à un quartier moins dense — 14 septembre 2026

`w6-fiche-corpus` (#157). Une fonction `compass_*_within` peut apparier dix-sept mille locaux et
n'en rendre que mille : PostgREST coupe à `db-max-rows`, sans erreur, sans en-tête d'avertissement,
avec un `200`. Mesuré rue de Bretagne sur `compass_scoring_context_within`, BDCom 2023, en `anon` :
920 sur 920 à 400 m, **1 000 sur 1 416** à 500 m, 1 000 sur 3 528 à 800 m, **1 000 sur 17 190** à
2 000 m. Le `content-range` rendu est `0-999/*` — il dit combien on a reçu, jamais combien il y en
avait.

**Demander plus ne sert à rien.** Un en-tête `Range: 0-4999` ne lève pas le plafond : c'est un
réglage de serveur, pas une préférence de client. Remesuré, même réponse à la ligne près.

**Ce qui rend ce piège dangereux est qu'il n'a pas de symptôme.** Une requête qui échoue se voit ;
celle-ci réussit, la couche compte comme chargée, et le chiffre calculé dessus est *plausible* —
une densité sur mille locaux au lieu de dix-sept mille ne ressemble pas à une erreur, elle
ressemble à un quartier plus calme. C'est §16 sous une autre forme, et il a vécu sur le chemin de
l'agent du 15 août au 14 septembre 2026 sans que rien ne le voie.

**Ce qu'il faut faire, en une ligne :** lire `total_matched` — la colonne existe sur toutes les
fonctions `_within` pour exactement cette raison — et, s'il dépasse le nombre de lignes reçues, le
dire. Soit en réserve sur le chiffre (`Measured.note`), soit en rétrécissant le rayon : la fiche
demande le corpus à **400 m**, le rayon que ses chiffres comptent vraiment, plutôt qu'à 800 m où
elle aurait acheté une troncature et pas des lignes.

---

## Un worktree neuf n'a ni `node_modules` ni les fichiers d'environnement, et trois bras s'arrêtent dessus — 14 septembre 2026

La règle « une session, un worktree » (#143) et l'outillage ne se rencontrent pas : `git worktree
add` copie ce que git suit, et `node_modules`, `.env.local` et `mcp-server/.env` ne le sont
délibérément pas. Trois arrêts, dans cet ordre, et le premier est le seul qui se lit vite.

| Ce qui s'arrête | Ce qu'il dit | Ce qu'il lui faut |
| --- | --- | --- |
| `npm.cmd run typecheck`, `test`, `build` | `tsc`/`vitest` introuvable | `node_modules` à la racine du worktree |
| `npm.cmd run verify:mcp` | « `mcp-server/node_modules` est absent » | `mcp-server/node_modules` **et** `mcp-server/.env` |
| Toute sonde lisant `DATABASE_URL` | une connexion vers rien | `.env.local`, ignoré par `*.local` |

**Une jonction évite de réinstaller 313 Mo**, et c'est la voie qui a tenu :

```powershell
cmd /c "mklink /J node_modules C:\...\paris-compass\node_modules"
cmd /c "mklink /J mcp-server\node_modules C:\...\paris-compass\mcp-server\node_modules"
```

**Donner le chemin ABSOLU de la cible.** Un chemin relatif est résolu depuis le répertoire
courant du shell et non depuis l'emplacement du lien : lancé depuis la racine du worktree,
`..\..\..\..\mcp-server\node_modules` remonte un cran de trop et crée une jonction vers un
répertoire qui n'existe pas. Elle est créée **sans erreur** — c'est `ls` qui la montre pendante,
et `verify:mcp` qui redit « absent » après qu'on croit l'avoir réparé.

Les trois fichiers copiés sont ignorés par `.gitignore`, donc ils ne peuvent pas partir dans la
proposition. Rien à nettoyer à la fin : `git worktree remove` emporte tout.

### La première ligne du tableau ne dit pas ce qui arrive sous `.claude/worktrees/` — remesuré le 15 septembre 2026

Elle annonce « `tsc`/`vitest` introuvable », c'est-à-dire un arrêt franc. **Ce n'est pas ce qui
s'est produit** depuis un worktree créé à l'emplacement que la règle prescrit,
`.claude/worktrees/<ID>` — donc **à l'intérieur du dépôt principal**. La résolution de Node
remonte les répertoires parents, trouve le `node_modules` de la racine, et **`typecheck`, `build`
et `vitest` lui-même passent au vert**.

Ce qui tombe, c'est uniquement ce qui **lance un processus fils par chemin absolu** :

```
Error: Cannot find module
  'C:\...\paris-compass\.claude\worktrees\<ID>\node_modules\tsx\dist\cli.mjs'
```

**Mesuré : 6 tests en échec sur 2 fichiers** — `scripts/porte/publie.test.ts` (5) et
`scripts/eval/anon-http.test.ts` (1) — les 750 autres au vert. Après `npm.cmd install` dans le
worktree : **756 sur 54, sortie 0**, sans qu'une ligne du code ait bougé.

**Pourquoi c'est plus cher qu'un arrêt franc.** Un rouge qui nomme deux bras sans rapport avec le
ticket en cours ressemble à une régression qu'on vient d'introduire, pas à un `node_modules`
manquant — la même forme d'erreur que le `\y` mangé plus haut : ça ressemble à une découverte.
**Le réflexe** : avant de diagnostiquer un rouge dans un worktree neuf, vérifier que
`node_modules` existe à SA racine, même si les portes ont l'air de tourner.

**Reproduit à l'identique le 15 septembre 2026 au soir**, depuis `.claude/worktrees/w6-dossier` :
mêmes **6 échecs sur les 2 mêmes fichiers**, 779 autres au vert, et `typecheck`, `build` et
`vitest` verts avant comme après. `npm.cmd install` dans le worktree : **785 sur 55, sortie 0**.
Le piège tient, et il tient deux jours de suite sur deux tickets sans rapport.

---

## Smart App Control bloque le binaire natif de `@swc/core`, et `vite` refuse de démarrer — 26 août 2026, levé depuis

**Déplacé de `CLAUDE.md` le 14 septembre 2026**, où il occupait 1 591 octets sur un fichier
chargé à chaque session pour un cas qui ne se présente presque jamais. Le plafond de
`scripts/porte/documents.test.ts` était atteint à l'octet près, et la règle du dépôt est
qu'ajouter une règle coûte un retrait. Ce qui reste dans `CLAUDE.md` est la phrase de
reconnaissance du symptôme, les trois commandes de contournement, et les deux règles
permanentes — les deux configurations restent en phase, et toute montée de `vite` exige de
lancer les deux builds. Rien n'est perdu : c'est le récit qui est ici.

**Le symptôme.** `vite` refuse de démarrer sur « Failed to load native binding ».

**La cause, le 26 août 2026.** Windows Smart App Control bloquait le binaire natif de
`@swc/core` sur cette machine. Il n'a **ni liste d'autorisation ni exception par fichier** : on
ne peut pas lui faire accepter ce fichier-là, et le désactiver est **irréversible sans
réinstaller Windows**.

**Depuis, le blocage a disparu — remesuré quatre fois**, le 28 août, le 31 août et deux fois le
2 septembre 2026 : `require('@swc/core').transformSync` rend du code, et `npm.cmd run build` /
`npm.cmd run build:dev` vont au bout en produisant des hashes identiques à `build:local`.

**Ce qui se remesure ici est l'identité des trois chemins, pas les hashes eux-mêmes.** Ceux-ci
bougent dès qu'une dépendance ou une source bouge, et les recopier sans les redater est le piège
que `CLAUDE.md` interdit ailleurs.

| Mesure | Empreintes |
| --- | --- |
| Les trois premières | `index-DKJzmj15.js`, `MapView-8C8F8Ymz.js`, `index-C7sT89I7.css` |
| La quatrième, 2 septembre | `index-z86I-NBQ.js`, `MapView-CcIGsnA-.js`, `index-CXVx5M-3.css` |

La quatrième suit la montée de `browserslist` en 4.28.8 et de `postcss-selector-parser` en
6.1.4 — **les trois chemins toujours d'accord entre eux**. L'écart n'est pas attribuable à la
seule montée : le dépôt a aussi reçu entre-temps le correctif de l'écran blanc (`2aaab7e`), qui
touche l'environnement de build.

**Pourquoi le contournement reste en place.** Rien n'explique la disparition — pas de changement
connu de la politique Smart App Control entre les dates — **donc le blocage peut revenir**. Les
trois commandes `*:local` lisent `vite.config.local.ts`, volontairement séparé de
`vite.config.ts` que Lovable réécrit.

**Ce que ça ne rattrape pas.** Le 26 août, les chemins `*:local` ne remplaçaient pas les portes
d'origine à l'identique : le bundle produit divergeait de celui de SWC. Depuis le 28 et le
31 août les deux chemins rendent le même bundle — mais si Smart App Control se remet à bloquer
SWC, cette divergence peut revenir sans préavis, et aucune mesure ne la verrait avant qu'on
compare les deux builds.

---

## Un jeu IDFM qui promet des « validations » ne porte aucun volume — 15 septembre 2026

**`compass_station_profile` rend une FORME, jamais un compte.** Sa colonne utile s'appelle
`pct_validations` et c'est la part d'une journée de station tombant dans une tranche horaire :
les 24 tranches `JOHV` d'Oberkampf — Filles du Calvaire somment à **99,99 %**, mesuré ce jour-là.
Le jeu IDFM ne publie **aucun compte absolu**, donc deux stations n'y sont pas comparables sur
leur fréquentation — seulement sur le profil de leur journée.

**Ce que ça coûte quand on ne le vérifie pas.** `docs/PLAN.md` §3.2 annonçait « Remplace le
passage estimé par un nombre compté » ; `docs/tickets/w6-amenites-corpus.md` a recopié la phrase
en « IDFM — comptages de validation réels par station » et a bâti son axe `transit` dessus. Les
deux documents portaient la même erreur, donc **aucun des deux ne pouvait corriger l'autre** : il
a fallu lire la migration et interroger la base. `20260907000002` le dit pourtant en toutes
lettres dans son en-tête, et c'est la lecture qui a tranché.

**Ce que la fonction donne réellement d'utilisable** : `station_name` et `distance_m`, l'arrêt
ferré le plus proche dans le rayon. C'est ce que l'axe `rail` lit.

**La règle, et elle est plus large que ce cas** : le nom d'un jeu de données décrit ce qu'il
mesure, jamais la forme sous laquelle il le publie. Un jeu « validations » peut ne contenir que
des pourcentages ; un jeu « trafic annuel » peut n'avoir aucun profil horaire (c'est pourquoi
`w2-idfm` a écarté data.gouv.fr). **Interroger la table avant d'écrire un ticket qui compte
dessus.** Le coût ici : une conception d'axe entièrement refaite en cours de session.

---

## Une fonction `compass_*` ne porte pas les colonnes de sa voisine — 15 septembre 2026

**`compass_scoring_context_within` rend six colonnes et aucun code d'activité :**
`lat, lng, is_vacant, total_matched, withheld, out_of_corpus`. Mesuré.

Le ticket `w6-amenites-corpus` annonçait « BDCom — locaux commerciaux et **codes d'activité** —
déjà lus par `compass_scoring_context_within` ». Faux : les codes vivent sur
`compass_premises_within`, une autre fonction, avec sa propre forme de ligne et son propre
plafond. Les deux lisent les mêmes tables, ce qui rend la confusion facile et la vérification
rapide — un `POST /rest/v1/rpc/<nom>` et un `Object.keys` sur la première ligne.

**Pourquoi ça compte plus qu'une ligne de ticket** : élargir la fonction aurait demandé une
**migration**, et `supabase db push` est lancé par Ivan, pas par une session (voir le piège du
classifieur). Un ticket qui suppose une colonne inexistante est donc un ticket dont le critère
d'acceptation n'est pas atteignable dans la session qui le prend. La conception a été refaite
autour des fonctions existantes.

---

## Couper les miroirs Overpass pour de bon, sans toucher au dépôt — 15 septembre 2026

Plusieurs tickets demandent une démonstration « Overpass injoignable, **coupé** pour de bon, pas
attendu ». Attendre un vrai 429 ne le démontre pas : un miroir qui met 70 s à mourir prouve le
budget, pas l'indépendance. Deux voies, mesurées, aucune n'écrit dans le dépôt.

**Dans le navigateur** — la coupure au résolveur, qui échoue immédiatement :

```
--host-resolver-rules=MAP overpass-api.de ~NOTFOUND,MAP overpass.kumi.systems ~NOTFOUND,MAP overpass.private.coffee ~NOTFOUND
```

127.0.0.1 reste joignable, donc un build local servi en statique marche, et Supabase et la BAN
passent normalement : c'est une coupure de **source**, pas de réseau.

**Dans Node** — un préchargement qui refuse les seules URL `overpass` :

```
NODE_OPTIONS=--import file:///<chemin>/coupe-miroirs.mjs   # remplace globalThis.fetch
```

`NODE_OPTIONS` se propage aux processus enfants, donc `npm.cmd run verify:mcp` le transmet au
serveur MCP qu'il lance. C'est ainsi que le critère 2 de `w6-amenites-corpus` a été démontré.

**Ce que ça ne démontre pas** : le comportement sous un miroir **lent**. Une résolution qui
échoue en 1 ms et un miroir qui expire en 70 s prennent le même chemin de code mais pas le même
temps — la fiche répond en 1 316 à 2 411 ms miroirs coupés, contre ~10 200 ms quand ils pendent
et que `CONTEXT_BUDGET_MS` va au bout. Les deux mesures sont vraies et ne se remplacent pas.

### Et un critère d'acceptation écrit sur « injoignable » ne teste alors RIEN — mesuré le 15 septembre 2026

Le paragraphe ci-dessus n'est pas une précision d'écrivain : c'est ce qui décide si un ticket est
démontrable. `w6-fiche-delai` (#180) demandait « miroirs Overpass **injoignables**, le verdict en
moins de trois secondes ». Coupés au résolveur, **`main` rendait déjà son verdict en 480, 584 et
915 ms** — trois passages, avant la première ligne du ticket. Le critère était donc **vert sur le
dépôt qu'il existait pour corriger**.

La raison est entière dans la phrase du dessus : un `~NOTFOUND` échoue en une milliseconde, donc
le `Promise.allSettled` qui tenait la page ne tenait rien. Le défaut de production — 10 976 ms
mesurés rue de Bretagne — est un miroir qui **pend**, pas un miroir qui refuse.

**Le puits, qui reproduit le cas de production sans dépendre d'un miroir saturé** : pointer les
trois hôtes sur un socket local qui accepte la connexion et ne renvoie jamais rien, donc une
poignée de main TLS qui n'aboutit pas.

```
--host-resolver-rules=MAP overpass-api.de 127.0.0.1:<port>,MAP overpass.kumi.systems 127.0.0.1:<port>,MAP overpass.private.coffee 127.0.0.1:<port>
```

Sous cette condition, `main` mettait **10 178, 10 188 et 10 201 ms** — le budget consommé en
entier, et le chiffre du ticket retrouvé. C'est la condition sous laquelle `#180` a été démontré.

**Et pour la contre-preuve — « miroirs debout » — il faut un miroir à soi.** Aucun miroir public
ne répond dans le budget de la fiche : `overpass-api.de` refuse en 0,2 s, et le seul qui ait
jamais répondu à la vraie requête met 10 587 ms. Même recette, mais l'hôte pointe sur un serveur
HTTPS local à certificat auto-signé qui rend une réponse Overpass valide, plus
`--ignore-certificate-errors`. **Ce que ça ne démontre pas** : que le miroir public répondra.

**La règle qui en sort** : un critère d'acceptation qui nomme une panne doit nommer LAQUELLE.
« Injoignable », « lent » et « refuse » sont trois chemins de code identiques et trois mesures
différentes ; écrire l'un et mesurer l'autre est comment un ticket se ferme sur un vert qui ne
dit rien.
## `\b` ne ferme jamais un mot accentué, en regex JavaScript — 15 septembre 2026

`/Livré\b/` ne matche **jamais** `## Livré — 15 septembre 2026`. `é` n'est pas un caractère de
mot pour une regex JavaScript : `\w` vaut `[A-Za-z0-9_]`, donc il n'existe aucune frontière entre
`é` et l'espace qui suit, et `\b` échoue là où l'œil voit évidemment une fin de mot.

Ce qui rend le piège cher, c'est qu'il **ne ressemble pas à un défaut d'échappement** : la regex
est lisible, elle se compile, elle passe en revue, et elle rend simplement « aucun résultat » —
c'est-à-dire exactement ce que rend une population réellement vide. Même forme d'erreur que le
`\y` mangé du 26 août, consigné plus haut : un défaut de regex ressemble à une découverte.

**Le geste** : après `é è à ç ô ù` — ou n'importe quel caractère hors `[A-Za-z0-9_]` — remplacer
`\b` par une anticipation explicite, `(?=\s|$)` ou `(?=[\s—:,.])`. Et **jouer la regex contre la
population du disque avant de la croire**, pas contre deux exemples écrits à la main : c'est le
contrôle sur `docs/tickets/` de `scripts/brief.test.ts` qui a montré que les trois rapports
`Livré` passaient encore au travers, après la correction censée les attraper.

Trouvé en corrigeant `DIAGNOSTIC.md` §54 — la coupe du rapport de clôture de `scripts/brief.ts`.

## Une issue fermée n'empêchait rien : `brief` assemblait son prompt quand même — 15 septembre 2026

Une session a été lancée sur `w6-fiche-delai` (`#180`) **après** sa fermeture, sa fusion et la
régénération de la table d'ordre. `npm.cmd run brief` ne lisait pas l'état de l'issue : il
demandait `--state all` puis ne gardait que `number` et `title`. Corrigé le jour même, et le
détail est dans `DIAGNOSTIC.md` §54.

**Ce qui reste vrai après la correction, et c'est le piège** : le bandeau ne protège que ce qui
passe par `npm.cmd run brief`. Un prompt de session écrit ou recopié à la main ne voit rien —
c'est précisément par là que celui-ci est arrivé. **Avant de commencer un ticket, lire l'état de
son issue**, une commande : `gh issue view <NUM> --json state`. Si elle est fermée, le
« Fait quand » est un critère périmé et le redémontrer ne change rien dans le dépôt.


---

## Un chiffre ROND dans un gabarit de test rend une famille entière de sabotages invisible — 15 septembre 2026

`w6-dossier` (#33) publie, à côté de chaque figure exportée, l'**opérande** sur lequel la formule
a tourné — le nombre de locaux comptés, la distance à l'arrêt. Le test du ticket re-dérive chaque
chiffre depuis ce que le fichier porte, et il est passé **du premier coup**. Un test qui n'a jamais
été vu rouge ne prouve rien, donc trois sabotages ont été joués contre lui, chacun restauré après :

| Sabotage de `src/core/dossier.ts` | Le test |
| --- | --- |
| constante de `density` recopiée à 91 au lieu d'importer `PREMISE_SATURATION` | **rouge**, sortie 1 |
| distance ferrée publiée arrondie à la dizaine | **VERT — il ne voyait rien** |
| absence de bruit re-dérivée en zéro plutôt qu'en `null` | **rouge**, sortie 1 |

**Le contrôle était sain, le gabarit était aveugle.** Il posait `nearestStationM: 190`, et 190
arrondi à la dizaine fait 190 : le sabotage était un no-op sur cette donnée-là, pas sur le code.
Passé à **187**, le même sabotage rend la troisième colonne rouge comme les deux autres.

**Le réflexe** : dans un gabarit, préférer un nombre que la moitié des transformations plausibles
déplacerait — 187 plutôt que 190, 1 003 plutôt que 1 000, 48,8631 plutôt que 48,86. C'est la même
famille que « ne pas épingler la page d'un portail à la place de son endpoint » : ce qu'on
recoupe doit pouvoir être en désaccord.

Et le corollaire, plus cher : **un sabotage vert n'accuse pas forcément le contrôle.** Le premier
mouvement a été de croire le test mal écrit. Regarder la DONNÉE avant le code a coûté deux
minutes ; réécrire le test en aurait coûté trente, pour un test moins bon.

---

## Télécharger un dossier depuis un navigateur sans tête, et le re-dériver — le geste — 15 septembre 2026

La démonstration du « Fait quand » de `w6-dossier` (#33) — *« depuis une fiche, télécharger un
fichier dont chaque figure est re-dérivable »* — ne peut pas se jouer hors ligne : un test unitaire
prouve que la fonction rend un objet re-dérivable, jamais qu'un visiteur obtient un **fichier**.
La sonde qui l'a démontré est **jetable et n'est pas au dépôt** — c'est le précédent de
`scripts/eval/sonde-w1-81.ts`, qui a servi une fois et n'a pas été gardé. Voici de quoi la
réécrire en dix minutes.

```powershell
npm.cmd run build
npx serve dist -l 4179       # -s : repli sur index.html, sinon /contexte/... rend 404
```

Puis, en CDP — la même mécanique que `scripts/porte/chrome.ts`, et **sans Playwright** :

1. `Browser.setDownloadBehavior` avec `behavior: "allow"` et un `downloadPath` temporaire.
   **Sans lui, `<a download>` ne produit RIEN en `--headless=new`**, sans erreur et sans trace :
   le clic réussit, la page ne bronche pas, et le répertoire reste vide.
2. attendre que `#verdict` porte une phrase — le critère de `scripts/porte/page.ts`, à reprendre
   tel quel plutôt qu'à réinventer ;
3. cliquer le vrai bouton de la section `#dossier` ;
4. **attendre le fichier sur le DISQUE** en relisant le répertoire, pas attendre un événement CDP ;
5. le relire et re-dériver chaque figure **sans rien importer du dépôt** : réécrire
   `100 × (1 − exp(−n / S))` et `100 × exp(−d / D)` depuis la chaîne `formula` que le fichier
   publie. C'est le geste du lecteur qui ne nous croit pas, et c'est le seul qui démontre quelque
   chose : re-dériver avec les fonctions du noyau prouverait que le noyau s'accorde avec lui-même.

**Ce qu'on ne voit qu'à ce prix** : les deux défauts de `DIAGNOSTIC.md` §55 étaient invisibles au
test unitaire et le seraient restés. Ils se lisent dans l'en-tête du fichier téléchargé.

**Et le MOMENT du clic est une variable.** Cliquer 0,9 s après le verdict et cliquer 13 s après
produisent deux fichiers différents et tous deux corrects — provenance de l'URL contre provenance
BAN, `noise` en route contre `noise` injoignable. Une sonde qui ne joue qu'un des deux instants
laisse l'autre moitié du comportement sans témoin.

## Le drapeau PLU qui s'appelle `artisanat` est la protection GÉNÉRALE — 16 septembre 2026

`plub_protcom` publie trois drapeaux par linéaire, et le nom de colonne choisi pour le premier
induit exactement l'erreur qu'on vient chercher :

| colonne de `premise_location` | drapeau source | ce que c'est | locaux sur 85 418 |
| --- | --- | --- | ---: |
| `plu_commerce_artisanat` | `pca` | protection **générale** du commerce et de l'artisanat | **26 074** |
| `plu_commerce_proximite` | `ppa` | protection du **commerce artisanal de proximité** | **3 809** |
| `plu_commerce_culturel` | `pcc` | protection du commerce culturel | **828** |
| `plu_protected` | les trois | au moins l'une des trois, colonne générée | **29 338** |

Mesuré le 16 septembre 2026 sur le distant, connexion directe. Une checklist artisanat qui lirait
`plu_commerce_artisanat` parce que son nom contient « artisanat » compterait la protection
générale — sept fois plus large — et dirait à un artisan que sa façade est protégée *au titre de
son métier* dans 26 074 cas au lieu de 3 809. `w6-modes` lit donc `ppa` pour l'artisanat et
`plu_protected` pour la boutique, et le nomme dans la phrase affichée.

**Le nom vient de la source**, qui appelle bien `pca` « protection du commerce et de l'artisanat ».
Il n'y a rien à corriger dans la migration — une migration posée ne se réécrit pas — et c'est
donc ici que ça s'écrit.


## `premise_location` et « les locaux relevés » ne comptent pas la même chose — 16 septembre 2026

Deux mesures du même point, le même jour, qui ne s'accordent pas et ont toutes les deux raison :

| point | `premise_location` dans 25 m | ce que la fiche affiche |
| --- | ---: | ---: |
| rue de Bretagne, `48.8631, 2.3621` | **28** | **25** |
| 18ᵉ, `48.884943, 2.337073` | **11** | **10** |

`premise_location` est la table des EMPLACEMENTS, tous millésimes confondus ;
`compass_premises_within(…, p_vintage_year => 2023)` rend les locaux **relevés au millésime
demandé**, en joignant `premise_observation`. Un emplacement relevé en 2017 et disparu en 2023
existe dans la première et pas dans la seconde.

**Conséquence pour une remesure** : recouper un compte d'écran par un `select count(*) from
premise_location where ST_DWithin(...)` donnera toujours un nombre un peu plus grand, et conclure
à un filtre cassé serait faux. Le recoupement juste passe par la même fonction, ou joint
`premise_observation` sur le millésime que l'écran épingle (`SHEET_VINTAGE`).

Corollaire utile : ce même `order by h.distance_m, h.location_id limit v_limit` fait qu'une
réponse plafonnée par PostgREST perd les locaux les plus LOINTAINS. Un compte de champ proche —
25 m — est donc entier même quand le compte à 400 m est un plancher.


## Un worktree neuf n'a ni `node_modules`, ni `.env.local`, ni `mcp-server/.env` — 16 septembre 2026

`git worktree add` copie ce que git suit, donc rien de tout ça. Six tests de `npm.cmd run test`
échouent alors sur `Cannot find module …/node_modules/tsx/dist/cli.mjs` — **et `npx vitest`
marche quand même**, parce que la résolution Node remonte jusqu'au `node_modules` du dépôt
principal, tandis que les bras qui lancent `tsx` par un chemin ABSOLU dans le worktree ne le
peuvent pas. Un échec qui ressemble à une régression du dépôt et n'en est pas.

```powershell
npm.cmd install                      # le worktree, pour les bras qui lancent tsx par son chemin
cd mcp-server; npm.cmd install; cd ..  # sinon verify:mcp s'arrête avant de mesurer
Copy-Item ..\..\..\.env.local .env.local
Copy-Item ..\..\..\mcp-server\.env mcp-server\.env
```

Sans `.env.local`, `npm.cmd run build` s'arrête sur sa garde `prebuild` ; sans
`mcp-server/.env`, `verify:mcp` s'arrête en le nommant, ce qui est le bon comportement et pas
une panne.


## Le `noise` de la fiche ne lit PAS les 25 094 tronçons du corpus — 16 septembre 2026

`w6-mode-raison` (#197) est parti d'une phrase écrite dans son propre énoncé : « `noise` vient
des voies, `footfall` de la densité et du rail, **sur 25 094 tronçons du même corpus** ». La
première moitié est vraie, la seconde est fausse, et l'écart change ce qu'une mesure coûterait.

| axe | ce qu'il lit vraiment | d'où |
| --- | --- | --- |
| `footfall` | 65 % densité de locaux + 35 % desserte ferrée (`FOOTFALL_WEIGHTS`) | le corpus : APUR BDCom et l'arrêt IDFM le plus proche |
| `noise` | l'exposition aux voies, pondérée et décroissante (`noiseExposure`) | **OpenStreetMap, à la demande** |

Lu le 16 septembre 2026 dans `src/core/scoring.ts`, `src/services/opendata/scoring.ts`
(`snapshot.roads`) et `src/hooks/useAddressContext.ts` — où `OVERPASS_LAYERS` vaut
`['amenities', 'roads']`, donc les voies sont la **seule couche encore lue sur Overpass** par la
fiche. Les 25 094 tronçons existent bien : c'est `street_segment`, chargé le 8 août. Mais
`grep -rn street_segment --include=*.ts src mcp-server/src` ne rend **qu'une ligne**,
`street_segment_id` dans `src/types/database.ts` : aucun écran et aucun outil MCP ne les lit.

**Pourquoi c'est un piège et pas une coquille.** Recouper le bruit et le passage — la mesure que
`#197` déclare « mesurable, non mesurée » — ne se fait pas par une requête sur le corpus. Elle
passe par la couche qui tombe, celle dont `#156` et `#163` racontent les miroirs à 429 et à 504 :
des milliers d'appels Overpass, ou reprendre le bruit sur `street_segment`, qui est un autre
ticket. Une session qui croirait le chiffre de l'énoncé estimerait cette mesure à une requête.

**Ce que ça ne rattrape pas** : rien ici ne dit que le bruit DEVRAIT se lire sur `street_segment`.
Les deux sources ne décrivent pas la même chose — un tronçon du corpus porte un côté de rue,
une voie OSM porte une classe de trafic — et cette comparaison-là n'a pas été faite.
