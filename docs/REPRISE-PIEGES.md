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

**Ne jamais passer `--omit=optional` à npm sur ce projet.** Rollup livre son
binaire natif (`@rollup/rollup-win32-x64-msvc`) en dépendance *optionnelle* :
l'omettre casse `vitest` et `vite build` avec un `MODULE_NOT_FOUND` sur
`rollup/dist/native.js`, dont le message ne dit pas d'où vient le manque. Un
`npm.cmd install` simple répare.

---

