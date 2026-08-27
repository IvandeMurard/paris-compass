# Modes de défaillance — le contrat

Source de vérité de ce qui compte comme **mauvaise sortie** pour Compass, et du
seuil à partir duquel c'est inacceptable. Modifier un seuil est une décision
explicite : PR, plus une trace dans `docs/PLAN.md`.

Repris du dispositif *evaluation-by-design* d'Aetherix
(`docs/adr/0007-evaluation-by-design.md`), avec une adaptation qui n'est pas
cosmétique.

---

## Ce qui change par rapport à Aetherix

Aetherix évalue un **modèle**, donc ses seuils sont statistiques : un MAPE qui
dérive de plus de 3 points est une régression. La sortie est bonne ou moins
bonne, sur un continuum.

Compass n'a pas de modèle qui dérive. Ce qui dérive ici, c'est **l'écart entre ce
qu'on affirme et ce que la donnée soutient**. Une affirmation fabriquée n'est pas
3 % moins bonne : elle est fausse. Trois conséquences.

**La plupart des seuils sont binaires, à tolérance zéro.** Pas de « moins de 5 %
de lignes fautives » : une seule ligne qui affirme ce que la source ne dit pas
casse la promesse fondatrice, et une seule suffit à faire perdre la confiance
qu'elle sert à construire.

**Les invariants portent sur 100 % des lignes, pas sur un échantillon.** Aetherix
échantillonne parce que le comportement d'un modèle varie ; les données de
Compass sont déterministes, donc on peut vérifier toute la base à chaque fois.
C'est plus fort qu'un jeu doré, et c'est moins de travail à maintenir.

**Le jeu doré garde un rôle, mais second.** Les invariants attrapent des
*classes* de faute ; le jeu doré attrape les régressions sur des cas nommés dont
on a vérifié la vérité à la main — dont les deux qui ont motivé tout ceci.

---

## Bras A — invariants, tolérance zéro

Chaque invariant est une requête qui **doit renvoyer zéro ligne**. Une seule
ligne fait échouer la porte.

| # | Ce qu'il empêche | Origine |
| --- | --- | --- |
| **I1** | Une chronologie affirme un fait là où `observed = false` | Erreur réelle du 9 août 2026 : « non observé » rendu par « plus un commerce » |
| **I2** | Un fait `etabli` sans pièce jointe | Un niveau de fiabilité doit être justifié, pas décrété |
| **I3** | Un prix sans la phrase source qui le porte | Un nombre produit par une expression régulière ne voyage jamais seul |
| **I4** | Un relevé dont le millésime n'a ni licence ni date | `Measured<T>` exige source, licence et date |
| **I5** | Un code d'activité affiché qui n'est pas dans la nomenclature | Un libellé inventé est pire qu'un libellé absent |
| **I6** | Un rattachement à une rue sans méthode enregistrée | Nom ou proximité : la différence doit rester lisible |
| **I7** | Un avis BODACC `etabli` alors que l'adresse est un siège social ou partagée | La faute d'inférence du 9 août 2026, rendue impossible |
| **I8** | Un relevé promu sans ligne de staging correspondante | Un recensement à moitié chargé est indiscernable d'un recensement incomplet |
| **I9** | Un appelant **anonyme** voit quoi que ce soit d'un millésime non redistribuable — contenu, absence, ou simple existence | La licence de 2017 et 2020 n'est pas lue. Trois migrations ont été nécessaires : retenir le contenu laissait fuiter l'absence, ce qui révélait l'existence |
| **I10** | Un millésime redistribuable revient retenu par erreur | Le miroir de I9. **Sur-restreindre est aussi une faute** : retenir de l'ODbL prive sans raison et masque un défaut de logique |

> **Vingt et un invariants ont été ajoutés depuis** : I11 (une fonction `compass_*`
> non exécutable par `anon`), puis cinq paires — I12/I13 pour
> `compass_scoring_context_within`, I14/I15 pour `compass_premises_within`,
> I16/I17 pour `compass_premise_history`, I25/I26 pour `compass_street_rotation`,
> I27/I28 pour `compass_survival_by_trade` — chacune vérifiant qu'une retenue
> s'annonce *et* qu'un vide réel reste muet. Puis I18, I19/I20, I21, I22, et enfin
> **I23/I24, qui ne portent sur aucune fonction en particulier : ils énumèrent
> celles auxquelles la règle s'applique** (voir « Ce qui n'est pas couvert »).
> Enfin **I29, I30 et I31**, la première règle de ce dépôt qui porte sur la
> **prose** d'une chronologie et non sur ses colonnes : une ligne est un millésime,
> et un millésime n'atteste aucun changement — donc aucune `evidence` ne peut
> affirmer un état antérieur, ni pour l'anonyme à qui il est retenu, ni pour le
> privilégié à qui il est visible et le contredit (I31 étant le miroir : ne pas
> corriger l'affirmation en devenant muet). `w0-conclusion` (#54).
> Le tableau ci-dessus s'arrête à I10 ; `invariants.sql` fait foi.
>
> **I9, I10 et leurs suivantes prennent l'identité d'`anon` par le *claim*, pas par le
> rôle** (marqueur `-- @as anon`). C'est la leçon la plus chère du 9 août : *le chemin
> privilégié réussit toujours*. Les défauts d'exposition n'ont été trouvés qu'en jouant le
> chemin anonyme, jamais en testant en propriétaire — dans une fonction `SECURITY DEFINER`,
> `current_user` est le propriétaire et conclut donc toujours « privilégié ».
>
> **Mais « en rôle » serait faux, et cette imprécision a coûté un défaut le 24 août.** Le
> lanceur pose `request.jwt.claims` sur une connexion privilégiée et n'émet **jamais**
> `set local role` : **RLS ne s'applique à aucun moment pendant que le bras A tourne.** Deux
> conséquences que le contrat doit énoncer plutôt que laisser déduire :
>
> - **Une fonction qui ne lit pas le claim est invisible au bras A.** Elle rend tout le
>   contenu à un « anonyme » qui n'en est pas un, et rien ne paraît anormal. C'est ce qui a
>   caché `compass_premise_history` pendant quinze jours ; seul le bras D, avec une vraie clé
>   et RLS derrière, l'a vue. Corollaire pour tout correctif de retenue : **la fonction doit
>   nuller ses colonnes elle-même**, jamais compter sur RLS pour avoir vidé la jointure.
> - **Un désaccord entre RLS et le test de claim est indétectable au bras A.** La politique
>   de `20260809000008` restreint `to anon, authenticated` ; le test de claim juge privilégié
>   tout ce qui n'est pas `anon`. Une fonction `SECURITY INVOKER` hérite des deux et ment à
>   l'appelant connecté — `withheld = false` pendant que RLS retire les lignes. Aucun test de
>   comportement que cette porte sait exprimer ne peut le voir.
>
> **D'où I18, premier invariant structurel du lot** : une fonction `compass_*` qui porte une
> colonne `observed` **doit** être `SECURITY DEFINER`. `observed` est la colonne que RLS
> transforme le plus visiblement en mensonge — retirer une ligne y devient « ce local n'a pas
> été relevé ». La règle était écrite en prose dans `20260809000008` depuis le 9 août, et une
> migration l'a enfreinte le 24 en argumentant l'inverse. Une règle qui n'est pas vérifiée
> n'est qu'un commentaire.
>
> ~~Les fonctions sans cette colonne peuvent rester `INVOKER` : RLS leur coûte des lignes, pas
> la vérité.~~ **Faux, mesuré le 25 août** (`DIAGNOSTIC.md` §21) : les deux fonctions `_within`
> rendaient **zéro ligne et aucun marqueur** à un appelant `authenticated` sur un millésime
> retenu — le défaut §9 exactement, pour quiconque a créé un compte. `observed` n'était pas le
> critère, c'était la forme que le défaut avait prise en août. **Le critère est de lire une
> table dont RLS peut retirer des lignes**, et c'est ce que `I23` énonce depuis le 25 août.
> `I18` est conservé : plus étroit, il reste vrai, et une règle qui a coûté un défaut ne se
> retire pas parce qu'une plus large est arrivée.

---

## Bras B — baselines d'ingestion, tolérance zéro sur la dérive silencieuse

Les effectifs mesurés au chargement sont **gelés** dans
`eval/baselines/ingestion.json`. Un écart n'est pas forcément une faute — l'APUR
peut republier — mais il ne doit jamais passer inaperçu.

| Mesure | Valeur gelée | Si ça bouge |
| --- | ---: | --- |
| Relevés BDCom 2017 / 2020 / 2023 | 84 031 / 83 399 / 60 845 | La source a été republiée : relire le périmètre avant de recharger |
| Locaux vacants 2017 / 2020 | 7 853 / 8 764 | Idem, et vérifier que la vacance reste dérivable |
| Périmètre commun 2017 / 2020 / 2023 | 62 705 / 61 541 / 60 845 | La série publiée change de sens |
| Locaux distincts | 85 418 | L'appariement inter-millésimes a changé de comportement |
| Identifiants réattribués | 74 | Le taux de réattribution est une propriété de la source |
| Rattachement rue par le nom | 84 459 | Paris a renommé des rues, ou la correspondance s'est dégradée |
| **Composition de fiabilité** | 27 580 / 3 144 / 19 517 / 3 198 | Voir ci-dessous — c'est la métrique de qualité du produit |

**Seuil.** Une variation est signalée (`WARN`) ; elle bloque (`FAIL`) au-delà de
**1 %**, parce qu'au-delà ce n'est plus une correction de source mais un
changement de comportement du pipeline.

### La composition de fiabilité est la métrique de qualité

Quatre nombres — `etabli`, `corrobore`, `probable`, `indetermine` — comptés sur
une cohorte **fixe** de 10 000 locaux. Fixe et non aléatoire : son rôle est
d'être comparable d'une exécution à l'autre, pas de décrire la base.

Pour un produit dont la promesse est la traçabilité, « s'améliorer » veut dire
une chose et une seule : **déplacer ces quatre nombres vers la gauche**. Chaque
source branchée, chaque jointure améliorée se juge à ça.

Un déplacement **vers la gauche** est un progrès et doit quand même être signalé,
parce qu'il n'arrive jamais tout seul : il vient d'un changement délibéré, dont
les cas dorés doivent être mis à jour dans la même PR. C'est ce qui s'est passé
au chargement de SIRENE — la porte a fait échouer `gold-siege-001`, qui attendait
`probable` là où la fonction renvoyait désormais `corrobore`.

---

## Bras C — jeu doré, cas nommés

`eval/golden.jsonl`, une ligne par scénario, vérifié à la main. Minimum un cas
par catégorie ; les deux premiers sont les fautes réellement commises.

| Catégorie | Ce qu'elle verrouille |
| --- | --- |
| `absence_non_observee` | Une année sans relevé sort en `indetermine`, libellé nul |
| `prix_etabli` | Un prix `etabli` porte sa phrase et son adresse d'établissement |
| `siege_social` | Un siège confirmé par SIRENE sort en `corrobore` ; infirmé, il reste `probable` |
| `adresse_partagee` | Plusieurs locaux au même numéro : `probable`, quoi qu'en dise toute corroboration |
| `identifiant_reattribue` | Un `ordre` réutilisé sort en `probable` |
| `perimetre_2023` | Une absence en 2023 nomme le périmètre de la couche et ne conclut rien — ni « vacant », ni « plus un commerce » |

**Dette assumée : il manque la septième catégorie.** `millesime_retenu` — le comportement
que verrouillent I9 et I10 — n'a **aucun cas doré**, alors qu'une migration a affirmé le
contraire (« les deux chemins ont désormais un cas doré »). Les invariants couvrent la règle
sur 100 % des lignes, ce qui est plus fort ; ce qui manque est le cas *nommé* qui rendrait le
comportement lisible à la relecture. À écrire contre l'instance distante, une fois chargée —
le cas doit être joué en rôle `anon`, ce qui suppose une base déployée.

---

## Ce qui déclenche la porte

Toute modification de `supabase/migrations/`, `scripts/ingest/`, `src/core/`, ou
de `eval/` elle-même.

Codes de sortie, repris d'Aetherix : `0` PASS · `1` FAIL · `2` ERROR · `3` WARN.

---

## Ce qui n'est pas couvert, et pourquoi

**La justesse des sources.** Si l'APUR se trompe en recensant un local, Compass
propage l'erreur. Ce dispositif garantit qu'on ne dit pas plus que la source, pas
que la source dit vrai.

**Le rendu.** Les invariants portent sur ce que les fonctions renvoient. Une
interface peut encore afficher une colonne en en masquant une autre — c'est ce
que la règle d'affichage de `docs/PLAN.md` §2.5 couvre, et elle se vérifie en
revue, pas en CI.

~~**RLS et le transport.**~~ **Couvert depuis le 24 août par le bras D**
(`scripts/eval/anon-http.ts`). Les bras A à C tournent sur une connexion
privilégiée : l'usurpation du bras A pose `request.jwt.claims` sans jamais
`set local role anon`, donc elle éprouvait la logique des fonctions et non la
politique RLS ni la sérialisation PostgREST. Le bras D appelle le projet hébergé
en HTTP avec la seule clé publiable. Il reste hors du `npm.cmd run eval` par
nécessité — il n'a rien à interroger sur une base locale sans PostgREST.

~~**Les fonctions que personne n'a auditées.**~~ **Couvert depuis le 25 août par
`I23` et `I24`** — `w0-retenue` (#57). Ce paragraphe disait : « Rien dans la porte
ne dit *quelles* fonctions portent la règle de licence : cette liste est tenue à
la main, et une fonction ajoutée sans y être inscrite ne sera pas couverte. » Le
manque était écrit, daté, et il a quand même produit un défaut — la cinquième
fonction (`DIAGNOSTIC.md` §19), trouvée par accident en écrivant un autre ticket.

La liste ne se tient plus à la main. `I23` énumère depuis `pg_proc` toute fonction
`compass_*` dont le corps cite une table dont une politique `SELECT` porte un
prédicat autre que `true`, et exige qu'elle soit `SECURITY DEFINER` **et** qu'elle
porte une colonne `withheld`. `I24` reprend la même population et vérifie qu'au
moins un invariant `-- @as anon` **appelle** chacune, commentaires retirés — une
mention en commentaire ne vaut pas couverture. Détail et limites : `DIAGNOSTIC.md`
§23.

`npm.cmd run eval:sabotage` le démontre plutôt que de l'affirmer : il crée une
sixième fonction fautive dans une transaction annulée et vérifie que les deux
invariants passent au rouge. Il importe le verdict de `scripts/eval/census.ts`,
celui qu'utilise la porte — une preuve qui rejoue une copie du contrôle ne prouve
rien sur le contrôle.

**Ce qui reste non couvert de ce côté.** `I23` lit `prosrc`, donc une table
atteinte par une **vue**, par du SQL dynamique ou par une autre fonction lui
échappe ; `I24` vérifie qu'un test existe, pas qu'il teste quoi que ce soit
d'utile. La règle rend impossible la fonction née sans règle, pas la fonction mal
écrite — même limite que `I22`.

> **Et la limite la plus nette n'a pas attendu qu'on la cherche : `w0-conclusion`
> (#54) l'a trouvée le lendemain, dans un défaut que `I23`/`I24` regardaient sans
> le voir.** `compass_address_timeline` était couverte — `I9`/`I10`, `I23` à zéro
> ligne, `I24` la comptait parmi les six fonctions recensées — pendant qu'elle
> affirmait un changement d'activité à partir d'un millésime retenu, dans sa
> colonne `evidence`. Aucun invariant ne l'a signalé, parce qu'aucun ne lisait
> cette colonne-là.
>
> **`I23` vérifie qu'une fonction *peut* annoncer sa retenue ; `I24`, qu'un test
> anonyme *existe*. Ni l'un ni l'autre ne lit une phrase.** `I9`/`I10` et les
> paires qui les imitent ne regardent que les colonnes d'une ligne retenue et la
> retenue excessive — jamais l'`evidence` d'une ligne divulguée, qui peut trahir
> ce qu'un millésime voisin contient sans jamais y toucher. **Une règle
> structurelle vérifie qu'une fonction peut dire la vérité, jamais qu'elle la
> dit.** C'est la phrase que ce document et `DIAGNOSTIC.md` §§ 20 et 23 tournaient
> autour sans l'écrire ; `DIAGNOSTIC.md` § 15 le dit en toutes lettres.
>
> **I29–I31 sont la réponse** — le premier trio de ce dépôt à lire une prose plutôt
> qu'une colonne, détaillé plus haut dans ce document et dans `DIAGNOSTIC.md` § 15.
> Elles ne remplacent pas `I23`/`I24` : elles couvrent le défaut qu'aucune règle
> structurelle ne peut voir, exactement comme le bras D ne remplace pas le bras A.


## Qui est privilégié : une expression, et la décision jouée — `I32` à `I34`, 26 août 2026

`I23` et `I24` recensent les fonctions qui **doivent** retenir. Ni l'un ni l'autre ne
regardait **comment** chacune décide qui est privilégié — et la réponse était recopiée à
l'identique dans les six, sous un commentaire disant « copié verbatim pour qu'elles ne divergent
pas ». Une intention, là où `I23` avait mis une garantie : `DIAGNOSTIC.md` § 20 en miniature.

`w0-appelant` (#58) extrait `public.compass_caller_is_privileged()` et pose trois règles :

- **`I32`**, deux volets comme `I23`. Aucune autre fonction `compass_*` ne lit
  `request.jwt.claims` **et** toute fonction de la population de `I23` appelle celle-là.
  Interdire la copie ne force pas l'appel : une septième fonction pourrait ne tester personne.
- **`I33`**, `@as authenticated`. La décision du 26 août — un compte créé sur le site n'est pas
  un appelant privilégié — jouée sur le verdict **et** sur ce que l'appelant reçoit réellement
  des Halles en 2017 : une ligne marquée, là où il en recevait 4 773.
- **`I34`**, `@as service_role`. Le contre-test. Corriger un appelant en retirant le privilège à
  ceux qui exploitent Compass serait pire que le défaut.

**Ce que `I32` ne rattrape pas** : `prosrc` est du texte, donc une décision rejouée autrement —
`current_user`, un GUC applicatif, une table de rôles — lui échappe ; elle ne juge pas l'usage,
un test appelé et inversé passe ; et elle ne dit rien du **contenu** de la décision, que seuls
`I33` et `I34` portent. Même famille de limite que `I22` et `I23` : la règle rend impossible la
fonction née sans règle, pas la fonction mal écrite. Détail dans `DIAGNOSTIC.md` § 26.

`npm.cmd run eval:sabotage` en fait la démonstration plutôt que l'affirmation, en trois actes
dans des transactions annulées. Le deuxième est celui qui compte ici : la fonction sabotée est
`SECURITY DEFINER` avec colonne `withheld`, donc **irréprochable pour `I23`**, qui reste au vert
pendant que `I32` la voit.


## Une règle de doctrine tenue des deux côtés — `I21`, 25 août 2026

`w1-survie` pose un interdit qui n'est pas une question de licence mais de **formulation** :
« 72 % des cafés tiennent six ans » est une observation, « votre café a 72 % de chances » est un
prévisionnel. C'est le premier interdit de ce genre que la porte vérifie.

Il est tenu à **deux** endroits, et la raison mérite d'être écrite parce qu'elle se généralise.
`src/core/observational.ts` couvre le navigateur, le serveur MCP et tout code TypeScript ; il ne
peut rien contre une phrase écrite en SQL, et `evidence` est écrite en SQL. `I21` est cette
seconde moitié : les 80 quartiers × les deux volets de `compass_survival_by_trade`, soit
160 phrases, dont aucune ne doit porter de deuxième personne, de futur ni de vocabulaire de
probabilité.

**La leçon vaut au-delà de cet invariant.** Un garde placé sur le chemin de l'interface protège
le consommateur qui n'existe pas encore et laisse passer celui qui appelle déjà — un agent, par
PostgREST. Une règle qui compte doit vivre là où le texte est produit, pas là où il est affiché.
