# Sessions de développement — par où commencer, avec quel modèle

Une session, un ticket. Ce fichier dit lesquels, dans quel ordre, avec quel modèle, et ce
qu'il faut ajouter au prompt commun pour chacun.

État de départ vérifié le 24 août 2026 : `tsc --build` sans erreur, **73 tests au vert**,
arbre propre, `main` = `origin/main`. `DATABASE_URL` et `VITE_SUPABASE_URL` pointent bien
tous deux sur `dbefhvmyfmmhjeetdddu` — le piège des trois projets Supabase est écarté.

---

## La fenêtre du 24 au 31 août

**Lovable est indisponible jusqu'au 1ᵉʳ septembre.** Conséquence directe : la
synchronisation bidirectionnelle n'a pas lieu, donc le risque d'éditer les mêmes fichiers
des deux côtés — celui que `CLAUDE.md` décrit comme coûteux — **n'existe pas pendant cette
fenêtre**. Le travail sur `src/` est plus sûr maintenant qu'après.

Une seule contrainte en échange : **tout doit être poussé avant le 1ᵉʳ septembre.** Lovable
reprendra la main sur l'arbre qu'il trouvera. S'il trouve un arbre en retard, il écrasera du
travail.

La fenêtre change l'ordre : les tickets qui touchent `src/` passent devant, pas derrière.

---

## Le prompt commun

À coller au début de chaque session, en remplaçant `<ID>` et `<NUM>`.

```
Ticket <ID> (issue #<NUM>).

Lis d'abord docs/REPRISE.md, puis docs/tickets/<ID>.md, puis les sections de
docs/PLAN.md et docs/PERIMETRE.md que le ticket cite. Le "Fait quand" du ticket
est le critère d'acceptation : ne me dis pas que c'est fini avant de l'avoir
démontré, pas supposé.

Trois choses avant d'écrire quoi que ce soit :

- Les chiffres des tickets ont été rédigés sans accès en lecture au dépôt et
  quatre étaient faux. Remesure ce que tu comptes réutiliser, ne le recopie pas.
- Le ticket redit peut-être une section de PLAN.md. Si oui, dis-le et traite les
  deux comme un seul chantier — ne laisse pas deux backlogs diverger.
- git pull avant de commencer, et pousse avant de finir : Lovable reprend la main
  le 1er septembre sur l'arbre qu'il trouvera.

Termine par : ce qui est démontré, ce qui ne l'est pas, et ce que tu as laissé
de côté. Si le ticket devient faux en cours de route, arrête-toi et dis-le
plutôt que de livrer contre un critère périmé.

Et écris-le dans le dépôt, pas seulement ici. Ce qui n'existe qu'au chat meurt
avec la session : un défaut trouvé va dans DIAGNOSTIC.md, un chiffre remesuré
dans le fichier qui le portait, un piège dans docs/REPRISE.md. Ne me résume que
ce que tu ne peux pas faire toi-même — l'état GitHub (fermer l'issue, en ouvrir
une), et ce qui demande une décision.

Avant de pousser, les portes — dans cet ordre, et ne pousse pas sur un rouge :

    npm.cmd run typecheck
    npm.cmd run test
    npm.cmd run verify:mcp     # si tu as touché src/core/ ou mcp-server/
    npm.cmd run build          # et build:dev après toute montée de vite

verify:mcp exerce les six outils MCP contre le distant : inventaire, provenance
par couche, chemin anonyme, modes de panne. Il rend "panne" et non "échec" quand
un miroir Overpass est indisponible — ça n'est pas un rouge. Il rend "défaut" sur
les défauts déjà consignés, et passe au ROUGE si l'un d'eux disparaît : c'est
voulu, ça veut dire qu'il faut fermer l'issue et mettre à jour DIAGNOSTIC.md.

Puis lance npm.cmd run sessions et commite ce qu'il change. Si tu as touché à
l'ordre, au modèle ou aux consignes d'une session, c'est dans scripts/sessions.ts
pour les deux premiers, dans docs/SESSIONS.md hors du bloc généré pour la
troisième.
```

Inutile d'y rappeler `npm.cmd`, la pureté de `src/core/`, `Measured<T>` ou l'encadrement des
loyers : `CLAUDE.md` est chargé à chaque session.

### Comment ce fichier reste juste

`CLAUDE.md` porte la règle : **une documentation n'est pas une mesure.** Un tableau d'ordre
tapé à la main vieillit dès qu'une session ferme une issue — c'est arrivé deux fois le
24 août. Le fichier est donc coupé en deux.

| Partie | Origine | Qui la change |
| --- | --- | --- |
| Le bloc entre `BEGIN sessions` et `END sessions` | **dérivé** de `docs/tickets/` et de l'état GitHub | `npm.cmd run sessions`, jamais la main |
| L'ordre et le choix de modèle | décisions humaines | les constantes `ORDER` et `MODEL` de `scripts/sessions.ts` |
| Les consignes par session, plus bas | jugement sur un ticket | à la main, hors du bloc généré |

Le générateur **refuse de réécrire** s'il ne peut pas joindre GitHub : mieux vaut une table
datée qu'une table devinée. Il signale aussi les tickets sans issue et compte ce qui reste
hors de la file, pour qu'aucun ticket ne disparaisse en silence.

---

## L'ordre

<!-- BEGIN sessions -- généré par `npm.cmd run sessions`, ne pas éditer à la main -->

*Table dérivée de `docs/tickets/` et de l'état GitHub, régénérée le 25/08/2026.*

| # | Ticket | Issue | État | Prio | Modèle |
| --- | --- | --- | --- | --- | --- |
| ~~1~~ | ~~`w0-deploy`~~ | [#7](https://github.com/IvandeMurard/paris-compass/issues/7) | **fait** | P0 | Opus 5 |
| ~~2~~ | ~~`w0-history`~~ | [#51](https://github.com/IvandeMurard/paris-compass/issues/51) | **fait** | P0 | Opus 5 |
| ~~3~~ | ~~`w0-provenance`~~ | [#10](https://github.com/IvandeMurard/paris-compass/issues/10) | **fait** | P0 | Opus 5 |
| ~~4~~ | ~~`w0-fiche`~~ | [#8](https://github.com/IvandeMurard/paris-compass/issues/8) | **fait** | P0 | Opus 5 |
| ~~5~~ | ~~`w0-mcp-verif`~~ | [#53](https://github.com/IvandeMurard/paris-compass/issues/53) | **fait** | P0 | Opus 5 |
| 6 | `w0-cron` | [#6](https://github.com/IvandeMurard/paris-compass/issues/6) | ouvert | P0 | Opus 5 |
| 7 | `w0-plu` | [#9](https://github.com/IvandeMurard/paris-compass/issues/9) | ouvert | P0 | Sonnet 5 |
| 8 | `w1-chantiers` | [#11](https://github.com/IvandeMurard/paris-compass/issues/11) | ouvert | P0 | Sonnet 5 |
| 9 | `w1-terrasses` | [#15](https://github.com/IvandeMurard/paris-compass/issues/15) | ouvert | P0 | Sonnet 5 |
| 10 | `w1-survie` | [#14](https://github.com/IvandeMurard/paris-compass/issues/14) | ouvert | P0 | Opus 5 |

**Hors de cette file : 29 tickets ouverts**, à prendre après la vague 0 — 
le détail par vague est dans [`PLAN-ACTION-VACANCE.md`](./PLAN-ACTION-VACANCE.md).

<!-- END sessions -->

**La règle de modèle en une phrase.** Opus 5 dès que le « Comment » du ticket contient un
arbitrage ou traverse plusieurs couches ; Sonnet 5 quand c'est une ingestion de source qui
suit le patron déjà écrit dans `scripts/ingest/` — un script idempotent, une table, un
contrôle de complétude.

---

## Session 1 — `w0-deploy` (#7) · Opus 5 — **faite le 24 août**

Le plus petit et le mieux cerné, et il débloque trois autres. Le corpus est déjà sur le
distant depuis le 15 août : ce qui reste est le **retrait à l'anonyme**.

> **Ce que la session a trouvé, et qui vaut pour les suivantes.** La consigne ci-dessous
> disait « le ledger distant est à 24 migrations ». **Il était à 25** : la migration
> demandée était déjà posée. Le chiffre venait de `docs/REPRISE.md`, juste au 17 août et
> jamais remesuré. Seule la seconde moitié — rejouer la porte en anonyme — restait à faire.
> Résultat en `docs/tickets/w0-deploy.md`, rejouable par `npm.cmd run eval:anon`.
>
> Elle a aussi trouvé un défaut non corrigé, sur `compass_premise_history` :
> `DIAGNOSTIC.md` §10. Il touche `w0-fiche` (#8), qui affiche l'historique d'un local.

À ajouter au prompt commun :

```
Le corpus est deja sur le distant depuis le 15 aout : ce ticket ne le recharge
pas. Il reste a poser 20260817000001_premises_within_withholding.sql — le ledger
distant est a 24 migrations, supabase/migrations/ en compte 25 — puis a rejouer
la porte EN ANONYME, ce que personne n'a fait.

Le critere est que 2017 et 2020 sortent en withheld et non en zero pour un
appelant sans cle. Montre-moi la reponse anonyme reelle, pas le code qui devrait
la produire.
```

## Session 2 — `w0-history` (#51) · Opus 5

**Ouvert le 24 août, trouvé par la porte anonyme de la session 1.** Quatrième défaut de
licence, et le plus dur : `compass_premise_history` ne rend pas un silence mais une
**affirmation fausse** — `observed = false` et `is_vacant = false` sur un local qui était
relevé vacant. Il bloque `w0-fiche` (#8), premier appelant prévu de cette fonction.

> **Jouée et close le 24 août.** La migration `20260824000001_premise_history_withholding.sql`
> est posée sur le distant — ledger remesuré à 26 — et les deux portes sont au vert :
> 17/17 invariants, 9 contrôles anonymes. `I16`/`I17` ont été éprouvés contre deux
> sabotages, la sonde du bras D contre la fonction défectueuse encore en ligne.
> **Issue #51 fermée le 24 août.** Rien ne reste.
>
> Elle a aussi trouvé un cinquième défaut, sans licence celui-là :
> `coalesce(a.is_vacant, false)` affirmait « pas vacant » de 24 573 locaux jamais relevés en
> 2023, sur le chemin privilégié. Corrigé dans la même migration. `DIAGNOSTIC.md` §11.
>
> **`supabase db push` refusé par le classificateur du mode auto, deuxième fois sur trois
> poussées.** Relancé à la main depuis PowerShell, il passe. À prévoir dans toute session
> qui pose une migration : préparer la ligne, la donner, la faire lancer.

```
Le patron est ecrit trois fois dans supabase/migrations/ et n'a pas a etre
invente : lire request.jwt.claims, exposer une colonne withheld, distinguer la
retenue de licence de l'absence reelle. I12/I13 et I14/I15 donnent le couple de
tests a recopier — l'un contre la fuite, l'autre contre la retenue excessive.

Le correctif change le type de retour, donc il se pose en migration et engage
tout appelant futur.

Une session de correction a ete lancee en worktree le 24 aout, branche
claude/clever-torvalds-1cc16f, absente du distant au moment d'ecrire. Verifie si
elle a atterri AVANT de commencer, ne suppose ni fait ni a faire.
```

## Session 3 — `w0-provenance` (#10) · Opus 5

**Le rayon d'action le plus large du lot, et à traiter seul.** À faire tôt dans la fenêtre,
pendant que rien d'autre n'est en vol.

```
Ce ticket touche src/core/, mcp-server/ et src/pages/Methodology.tsx ensemble :
CLAUDE.md exige que les formules publiees suivent le code.

Etablis la liste complete des appelants de scoreLocation AVANT de toucher a la
signature. Ne commence rien d'autre dans cette session.
```

## Session 4 — `w0-fiche` (#8) · Opus 5 — **faite le 24 août**

Travail d'interface, donc à placer dans la fenêtre libre. **Dépend de la session 2** : sans
le correctif de `#51`, la fiche afficherait « non observé, non vacant » sur un local qui
était vacant.

> **Faite le 24 août.** Le critère est démontré dans le navigateur sur 3 rue du Jour, quartier
> Halles — 2017 retenu, 2020 retenu, 2023 « Prêt-à-porter Homme / AGNES B », plus quatre
> annonces BODACC. `.rpc(` passe de 0 à 2 occurrences dans `src/`. **Issue #8 fermée**, épic
> #41 recoché — il ne cochait aucun des quatre tickets clos, voir le piège correspondant dans
> `docs/REPRISE.md` — et tableau ci-dessus régénéré.
>
> **Deux choses en sont sorties.** Le rattachement OpenStreetMap ↔ BDCom n'a **pas de clé** :
> mesuré, un rayon de 25 m contient une médiane de 5 locaux candidats et le plus proche est
> souvent le mauvais commerce — la fiche les liste et laisse le lecteur trancher. Et
> [**#54**](https://github.com/IvandeMurard/paris-compass/issues/54) / `DIAGNOSTIC.md` **§15**,
> ouverte : `compass_address_timeline` conclut « plus un commerce » à
> partir de millésimes qu'elle retient dans la même réponse. **Correctif SQL, et il demande une
> décision** — la même phrase est dans `PLAN.md`, corriger l'un sans l'autre ferait diverger
> la doctrine et la base.
>
> Reste ouvert et volontairement laissé de côté : le panneau ne s'ouvre que depuis la vue
> liste, les popups Leaflet étant des chaînes HTML brutes ; et les quatre chantiers que
> `PLAN.md` §2.7 met « à faire dans la foulée ».

```
C'est du travail d'interface. Lovable est indisponible jusqu'au 1er septembre,
donc pas de risque de synchronisation croisee — mais tout doit etre pousse avant
cette date. Ne pas toucher .lovable/.

Piege du ticket : observed=false doit se lire "non observe", jamais "vacant" ni
"plus un commerce", et pas de coalesce sur le libelle.
```

## Session 5 — `w0-mcp-verif` (#53) · Opus 5 — **faite le 24 août**

**Ouvert le 24 août, après la session `w0-provenance`.** Elle a changé la signature de
`scoreLocation` sous le serveur MCP et découvert au passage que celui-ci n'atteignait jamais
son miroir Overpass principal — sans que rien ne le dise ([#52](https://github.com/IvandeMurard/paris-compass/issues/52)).
Trouvé parce que quelqu'un regardait, pas parce qu'un contrôle a échoué.

**Mesuré le 24 août : rien ne couvre `mcp-server/`.** Ni le `typecheck` de la racine, qui ne
le référence pas ; ni les tests de `src/` (73 le 23 août, **96 après la session 4**) ; ni les
deux bras de la porte. `smoke-test.ts` et
`provenance-check.ts` existent mais ne sont câblés à aucun script.

> **Faite le 24 août.** `npm.cmd run verify:mcp` exerce les six outils contre
> `dbefhvmyfmmhjeetdddu` en appelant anonyme : inventaire, provenance par couche, chemin anonyme,
> quatre modes de panne. Deux passages mesurés, **0 en échec** dans les deux — 36 contrôles quand
> Overpass répond, 33 quand il rend 429. Le total n'est pas fixe **par construction** : la
> famille `PROVENANCE` tombe de cinq assertions à deux quand la couche d'aménités n'est jamais
> arrivée. Lire le `0 en échec`, pas le total. Le smoke test, qui ne démarrait pas sur cette
> machine (`npx tsx`), tourne pour la première fois — `npm.cmd run smoke:mcp`.
>
> **Le contrôle assène, il n'imprime pas.** `smoke-test.ts` sortait 0 tant que rien ne levait :
> le câbler tel quel aurait posé une porte qui reste verte pendant que chaque chiffre ment.
> C'est le piège que le ticket nomme, et la raison pour laquelle `verify.ts` a été écrit à côté
> plutôt que le smoke test câblé.
>
> **Deux écarts trouvés.** Le `README.md` du serveur annonçait encore, sous « What this does not
> cover yet », une provenance unique pour tous les champs — périmé depuis `w0-provenance`, et
> mesuré faux le jour même : `footfall` cite bien ses deux couches. Corrigé. Et
> [**#55**](https://github.com/IvandeMurard/paris-compass/issues/55) / `DIAGNOSTIC.md` **§16**,
> ouverte : un point hors du corpus BDCom mais dans la boîte de coordonnées acceptée est scoré
> comme un quartier sans commerces. **Demande une décision** — resserrer la boîte, retirer la
> couche, ou demander à PostGIS.
>
> Reste ouvert et volontairement laissé de côté : `provenance-check.ts` n'est toujours câblé à
> rien, et le `typecheck` de la racine ne référence toujours pas `mcp-server/` — c'est le script
> `verify:mcp` qui l'appelle, pas `tsc --build`. Détail dans `docs/tickets/w0-mcp-verif.md`.

```
Analyse exhaustive AVANT cablage : cabler un controle sur un serveur dont on n'a
pas etabli le comportement attendu fige l'etat present comme reference.

Les six outils, un par un, contre le distant : reponse, forme, et la provenance
citee est-elle celle de la couche lue. Puis le chemin anonyme — 2017 et 2020
retenus comme dans le front — puis au moins deux modes de panne, le miroir
Overpass injoignable en tete.

Tout ecart : corrige, ou ouvert en ticket. Ne referme pas un ecart en silence.

Ensuite seulement, le script npm a la racine, et la ligne dans SESSIONS.md qui
demande de le lancer.
```

## Session 6 — `w0-cron` (#6) · Opus 5 — **à moitié faite le 25 août, issue laissée ouverte**

Touche aux privilèges.

> **Faite à moitié le 25 août, et l'issue reste ouverte à dessein.** Le « Fait quand » est en
> deux temps : `compass_*` expose une date de fraîcheur pour les quatre sources — **fait**,
> migration `20260825000001`, ledger distant à 28 — et un cron a tourné au moins une fois sans
> intervention — **non**, le secret de dépôt `DATABASE_URL` restant à poser par une main
> humaine. L'issue se ferme au premier passage planifié, que `run_by` rendra visible en
> basculant de `manual` à `github-actions`.
>
> **Ce ticket redit `PLAN.md` §2.2bis et §2.2ter mot pour mot** ; les deux sont traités
> ensemble et se citent l'un l'autre.
>
> **Deux choses trouvées en rejouant les quatre chargeurs**, qu'aucune lecture n'aurait
> données. `bdcom.ts` **ne pouvait tourner qu'une fois** — il vidait une table que
> `premise_observation` référence, ce qui ne passe qu'au premier chargement : `DIAGNOSTIC.md`
> §17, corrigé, et la prémisse « les scripts sont idempotents » était donc fausse. Et l'URL du
> parquet SIRENE **rend 404** depuis que data.gouv.fr l'a remplacée le 21 août :
> [**#56**](https://github.com/IvandeMurard/paris-compass/issues/56), ouverte, **demande une
> décision**.
>
> La garantie centrale — une exécution ratée ne rajeunit rien — n'a pas eu à être mise en
> scène : les deux échecs ci-dessus ont laissé `compass_source_freshness()` sur « jamais
> chargé ».
>
> Reste ouvert : la fraîcheur n'atteint pas le navigateur (`src/` n'appelle pas la fonction),
> et le pipeline se connecte toujours en `postgres` là où un rôle dédié suffirait.

```
Ce job ne doit jamais porter la cle anon. Dis-moi ou tu comptes stocker le secret
AVANT de l'ecrire, pas apres.

Cadences distinctes : SIRENE mensuel, BODACC continu, BDCom triennal, geographie
rare. Afficher une date de fraicheur sans rafraichissement reel serait le loyer
fabrique sous une autre forme.
```

## Session 7 — `w0-plu` (#9) · Sonnet 5

Ingestion droite.

```
Ingestion classique : jeu plub_protcom d'opendata.paris.fr, version votee le
20 novembre 2024. Suis le patron de scripts/ingest/.

L'affichage est informatif, sans valeur reglementaire, et renvoie au Portail des
Regles d'Urbanisme.
```

## Sessions 8 et 9 — `w1-chantiers` (#11), `w1-terrasses` (#15) · Sonnet 5

Deux ingestions indépendantes, même patron. Réserve commune à rappeler :

```
Fait administratif, measured. Jamais une prevision d'impact sur le chiffre
d'affaires pour les chantiers ; jamais un CA terrasse deduit d'une autorisation.
Une autorisation n'est pas une terrasse installee aujourd'hui.
```

## Session 10 — `w1-survie` (#14) · Opus 5

**Le ticket sous-estime sa propre difficulté.** Il écrit « aucune source nouvelle » comme un
avantage ; c'est l'inverse.

```
"Aucune source nouvelle" ne veut pas dire facile : joindre SIRENE a BDCom a un
niveau defendable est l'inference la plus difficile du backlog. Un SIRET n'est pas
un local, et 69 % des locaux partagent leur numero. Non rattachable reste probable.

Interdit doctrinal a tenir a l'ecran, pas seulement dans le calcul : "72 % des
cafes tiennent six ans" est une observation, "votre cafe a 72 % de chances" est un
previsionnel. Toujours l'effectif et la periode. Dis-moi comment l'ecran empeche
la seconde lecture — le ticket ne le resout pas.
```

---

## Ce qui ne se lance pas

**`w1-historique` (#49)** — bloqué sur l'APUR. Courrier parti le 10 août, relance envoyée le
24. Son avancement est une réponse, pas une session. Il bloque aussi l'exposition publique de
2017 et 2020, et la vacance 2023.

**`w3-mapillary` (#21)** — P0 au plan d'action, mais son ordre est contesté : `#49` ouvrirait
dix-sept ans avec les vacants par une API déjà maîtrisée, là où Mapillary comble 2023–2026 par
de la vision, avec cinquante façades à annoter et un seuil à tenir. Ne pas l'engager avant que
l'APUR ait répondu.

**Les vagues 2 à 7** — après la vague 0. Rien n'y est bloqué, mais rien n'y est urgent tant
que la fiche locale n'existe pas dans le navigateur.
