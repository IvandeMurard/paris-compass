# Sessions de développement — par où commencer, avec quel modèle

Une session, un ticket. Ce fichier dit lesquels, dans quel ordre, avec quel modèle, et ce
qu'il faut ajouter au prompt commun pour chacun.

État de départ vérifié le 24 août 2026 : `tsc --build` sans erreur, **73 tests au vert**,
arbre propre, `main` = `origin/main`. `DATABASE_URL` et `VITE_SUPABASE_URL` pointent bien
tous deux sur `dbefhvmyfmmhjeetdddu` — le piège des trois projets Supabase est écarté.

---

## Lovable — la règle s'applique le jour où tu l'ouvres

**Il n'y a pas d'échéance.** Précisé par Ivan le 31 août 2026 : Lovable reprend la main **quand
il l'ouvre**, pas à une date. Les versions antérieures de cette page annonçaient une fenêtre
fermant le 1ᵉʳ septembre — c'était faux, et une session l'aurait lu comme un compte à rebours.

Ce qui reste vrai, et qui est la seule chose à retenir : **tant que Lovable n'est pas ouvert,
la synchronisation bidirectionnelle n'a pas lieu**, donc le risque d'éditer les mêmes fichiers
des deux côtés n'existe pas. Le jour où il l'ouvre, la règle de `CLAUDE.md` reprend en plein —
`git pull` avant, pousser après, ne pas toucher `.lovable/`.

Corollaire pratique : pousser à la fin de chaque session, toujours. Ce n'est pas une course
contre une date, c'est ce qui garantit que Lovable trouvera l'arbre à jour le jour où il
s'ouvre, quel qu'il soit.

---

## Le prompt commun

**Ne le recopie pas à la main.** `npm.cmd run brief <ticket>` l'assemble : le prompt
ci-dessous avec l'identifiant et le numéro d'issue déjà remplis, les consignes propres à
la session s'il y en a, et la liste précise de ce qu'il faut lire.

```powershell
npm.cmd run brief w0-appelant     # ou brief appelant — le nom partiel suffit
```

Le texte source, pour référence :

```
Ticket <ID> (issue #<NUM>).

La liste exacte de ce qu'il faut lire est en bas de ce message. Tiens-t'en à
elle : docs/REPRISE-ARCHIVE.md fait cinq cents lignes et docs/JOURNAL.md plus de deux
mille, les lire en entier coûte cher et n'apporte rien. Le "Fait quand" du ticket
est le critère d'acceptation : ne me dis pas que c'est fini avant de l'avoir
démontré, pas supposé.

Trois choses avant d'écrire quoi que ce soit :

- Les chiffres des tickets ont été rédigés sans accès en lecture au dépôt et
  quatre étaient faux. Remesure ce que tu comptes réutiliser, ne le recopie pas.
- Le ticket redit peut-être une section de PLAN.md. Si oui, dis-le et traite les
  deux comme un seul chantier — ne laisse pas deux backlogs diverger.
- Travaille dans TON worktree, jamais dans l'arbre partage : plusieurs sessions
  vivent dans le meme checkout et un git switch deplace les fichiers des autres
  (#143). git pull sur main, puis git worktree add .claude/worktrees/<ID> -b
  ticket/<ID>, et travaille la. A la fin, depuis ce worktree : gh pr create puis
  gh pr merge --squash --delete-branch. La trace est exigee, pas l'approbation.

Termine par : ce qui est démontré, ce qui ne l'est pas, et ce que tu as laissé
de côté. Si le ticket devient faux en cours de route, arrête-toi et dis-le
plutôt que de livrer contre un critère périmé.

Et écris-le dans le dépôt, pas seulement ici. Ce qui n'existe qu'au chat meurt
avec la session : un défaut trouvé va dans DIAGNOSTIC.md, un chiffre remesuré
dans le fichier qui le portait, un piège dans docs/REPRISE-PIEGES.md. Ne me résume que
ce que je ne peux pas lire dans le depot, et ce qui demande une decision.

Puis poste ton recap en commentaire de l'issue #92, la boite aux lettres de la
file : son adresse ne change jamais, un nom de session si. N'y mets QUE ce que
la file doit faire et que tu n'as pas fait : issues a fermer ou ouvrir, ordre a
changer, decision qui attend Ivan, revue due — regarde ton diff contre les
quatre signes de « La revue » dans docs/SESSIONS.md, tu les vois en premier.
Le reste est deja dans le depot, et le redire est du bruit.

L'etat GitHub n'est pas de la prose : la table d'ordre en est DERIVEE. Donc
ferme l'issue toi-meme quand le "Fait quand" est demontre, avec la demonstration
en commentaire, PUIS regenere la table — dans cet ordre, sinon elle est fausse
des ta fermeture. Dis-le moi dans le resume. Une issue que tu ouvres en passant
suit la meme regle. Si tu prefères que je ferme moi-meme, ne regenere pas : dis
"table a regenerer apres fermeture" et npm.cmd run sessions:check me le rappellera.

POSER UNE CADENCE NE RECHARGE RIEN. Si tu donnes un cron, un seuil ou une
sonde à quelque chose qui existe déjà, recharge ou mesure une fois dans la
foulée. Sinon la porte comptera comme du retard le trou entre ta déclaration et
la première occurrence — et elle aura raison, puisque rien n'a vérifié pendant
ce temps-là. Mesuré le 5 septembre : le cron chantiers de #70 est arrivé six
heures après son créneau du mardi, première occurrence possible huit jours plus
tard, porte rouge quatre matins entre les deux (docs/REPRISE-PIEGES.md).

Avant d'ouvrir la proposition, les portes — dans cet ordre, et n'ouvre pas sur
un rouge. La proposition rejoue typecheck et test toute seule ; les six autres
bras ne tournent que sur main, chaque matin, donc c'est ici qu'ils se jouent :

    npm.cmd run typecheck
    npm.cmd run test
    npm.cmd run verify:mcp     # si tu as touché src/core/ ou mcp-server/
    npm.cmd run build          # et build:dev après toute montée de vite

Un rouge que tu laisses derrière toi réveillera quelqu'un demain matin : les
mêmes portes tournent seules chaque matin. CLAUDE.md dit comment les lire — une
panne amont n'est pas un échec, et cette distinction se corrige dans le bras,
jamais dans le rapport.

Puis npm.cmd run sessions, commite ce qu'il change dans la meme branche, et
termine par sessions:check avant d'ouvrir la proposition. L'ordre et le modele se changent dans scripts/sessions.ts, les
consignes d'une session dans docs/SESSIONS.md hors du bloc genere.

Une source de donnees rejoint src/services/opendata/sources.ts le jour ou un
ECRAN la lit, pas le jour ou elle est chargee. Si ton ticket met une source a
l'ecran, ajoute-la — sinon la page /sources annonce une provenance que le produit
n'a pas, ou tait celle qu'il a. Trois sources y ont manque pendant deux jours.
```

Inutile d'y rappeler `npm.cmd`, la pureté de `src/core/`, `Measured<T>` ou l'encadrement des
loyers : `CLAUDE.md` est chargé à chaque session.

### La revue — pour toutes les propositions, depuis le 15 septembre 2026

Depuis le 6 septembre, chaque session passe par une proposition. La proposition est la trace ;
la **revue** est autre chose, et **elle est désormais due partout** — décidé par Ivan le
15 septembre 2026.

> **Ce que cette décision renverse, et ce qui l'a renversé.** Cette page disait jusqu'ici
> l'inverse : *« elle ne se justifie pas partout — une revue systématique devient une case à
> cocher, et une case à cocher ne lit rien. »* L'argument reste vrai et le risque reste réel.
> Ce qui l'a emporté est une mesure, le même jour : la première revue jamais faite ici a lu
> trois propositions déjà fusionnées et a trouvé, dans `#165`, une lecture qui **échoue
> ouvert** — `(\d+)` rendant 10 sur `10_000`, un délai tombant de 14 000 à 4 010 ms, et le bras
> rougissant chaque matin sur une page saine. Trois sessions n'avaient rien vu sur leur propre
> ouvrage, et les quatre tests du délai non plus. Le même jour, la session de `#187` a rapporté
> qu'une de ses expressions régulières avait **passé sa propre relecture** en ne matchant rien.
>
> **Le signe à guetter, puisque le risque est nommé** : le jour où les revues cessent de
> trouver quoi que ce soit, la case à cocher est arrivée — ce n'est pas la règle qu'il faudra
> alors desserrer, c'est la façon de lire qu'il faudra reprendre.

**Quand elle est due.** Toujours. Les quatre signes ci-dessous ne décident plus *si* une revue a
lieu ; ils disent ce qu'elle doit regarder **en premier**, et une proposition qui en coche un
mérite un lecteur qui connaît le domaine :

| Signe | Ce qu'il oriente |
| --- | --- |
| Touche `supabase/migrations/` | Posé sur une base vivante, et une migration ne se défait pas |
| Touche `src/core/` | Partagé par le front et le MCP — `w0-provenance` a déplacé les deux et les formules publiées |
| Ajoute ou change un invariant, un bras, ou une règle d'énumération | C'est l'instrument qui mesure tout le reste |
| Porte l'étiquette `P0` | |

**Une proposition qui n'en coche aucun se relit quand même**, et plus court : les cinq questions
valent pour un fichier de documentation comme pour une migration, et la première — un chiffre
recopié plutôt que remesuré — s'y trompe autant.

**Qui la fait.** Une session distincte de celle qui a fait le travail. Pas pour la défiance : une
session qui vient d'écrire une règle en connaît l'intention, et c'est précisément ce qui l'empêche
de voir qu'elle ne la tient pas. `#72` a conclu qu'aucun invariant ne pouvait voir l'absence
d'écriture ; il a fallu une autre lecture pour distinguer l'exécution de la déclaration.

**Ce qu'elle demande** — cinq questions, toutes payées au moins une fois par ce dépôt :

```
Revue de la proposition #<N>, ticket <ID>.

Lis le diff et le ticket. Ne réécris rien : tu réponds à cinq questions et tu
poses ton verdict en commentaire de la proposition.

1. UN CHIFFRE A-T-IL ÉTÉ RECOPIÉ PLUTÔT QUE REMESURÉ ? « Le ledger distant est à
   24 migrations » était vrai le 17 août et faux le 24. Le pont NAF a inventé deux
   codes. CLAUDE.md a annoncé dix bras alors qu'il y en avait onze. Tout chiffre
   du diff doit porter sa source et sa date, ou avoir été remesuré.

2. LA RÈGLE ÉNUMÈRE-T-ELLE, OU LISTE-T-ELLE ? Une liste tenue à la main est juste
   le jour où on l'écrit. I23/I24, arms.ts, cadence.json, catalogue.json et
   observabilite.ts dérivent leur population ; une sixième règle qui listerait
   serait fausse au premier ajout.

3. LE CORRECTIF SURVIT-IL À UN RECHARGEMENT, ET PROTÈGE-T-IL UN CONSOMMATEUR QUI
   N'EXISTE PAS ENCORE ? C'est la doctrine de CLAUDE.md. Un UPDATE qu'un chargeur
   réécrira n'est pas un correctif.

4. LA DÉMONSTRATION PROUVE-T-ELLE LE CONTRÔLE, OU UNE COPIE DU CONTRÔLE ? Un
   sabotage qui rejoue sa propre version de la règle ne prouve rien sur celle qui
   part en production — c'est la raison d'être de scripts/eval/census.ts.

5. CE QUE ÇA NE RATTRAPE PAS EST-IL ÉCRIT ? Une règle sans limite déclarée sera
   crue plus large qu'elle n'est.

Verdict en trois états : RIEN À REDIRE ; À CORRIGER AVANT FUSION, avec quoi ;
FUSIONNABLE MAIS À SUIVRE, avec l'issue à ouvrir. Ne fusionne pas toi-même.
```

**Ce que la revue ne remplace pas** : les portes. Elle lit ce qu'un contrôle ne peut pas lire —
l'intention, la limite non dite, le chiffre plausible. Elle ne rejoue rien.

### Comment ce fichier reste juste

`CLAUDE.md` porte la règle : **une documentation n'est pas une mesure.** Un tableau d'ordre
tapé à la main vieillit dès qu'une session ferme une issue — c'est arrivé deux fois le
24 août. Le fichier est donc coupé en deux.

| Partie | Origine | Qui la change |
| --- | --- | --- |
| Le bloc entre `BEGIN sessions` et `END sessions` | **dérivé** de `docs/tickets/` et de l'état GitHub | `npm.cmd run sessions`, jamais la main |
| L'ordre | décision humaine | la constante `ORDER` de `scripts/sessions.ts` |
| Le modèle, et l'effort qui s'en dérive | le modèle est une décision, l'effort une règle | `scripts/session-choix.ts` |
| Les consignes par session, plus bas | jugement sur un ticket | à la main, hors du bloc généré |

**Avec quel modèle et quel effort lancer — `npm.cmd run brief` le dit tout seul**, en tête de
sa sortie et **hors du bloc collable** : c'est un réglage à poser dans l'application avant de
coller, pas une instruction à la session. Le modèle reste une décision par ticket ; l'effort
s'en dérive, pour qu'il n'y ait pas une troisième liste à tenir en phase :

| | Effort | Pourquoi |
| --- | --- | --- |
| Un ticket **P0** | `max` | P0 est aussi le quatrième signe qu'une revue est due — le dépôt a déjà jugé que ces tickets méritent une seconde lecture, donc ils méritent une première plus lente |
| Sinon, un ticket routé vers **Sonnet 5** | `medium` | Plomberie d'ingestion : endpoint, licence et cadence sont déjà tranchés, l'effort n'y achète rien |
| Tout le reste | `high` | Du jugement, pas de l'exécution |

Un ticket dont la première ligne ne porte pas `[P0]`/`[P1]`/`[P2]` est traité comme `high` et
non comme `medium` : un en-tête mal formé doit coûter du calcul, jamais de l'attention.

**Ce que cette règle n'est pas** : une mesure. Rien n'a été éprouvé en A/B sur ce dépôt, et le
dire autrement serait la « documentation présentée comme une mesure » que `CLAUDE.md` interdit.
Elle encode un jugement — les sessions qui ont le plus coûté ici sont celles qui ont livré une
règle ne gardant rien (`#132`, `#133`, `porte:publie`), et toutes portaient `P0` ou touchaient
les instruments.

Le générateur **refuse de réécrire** s'il ne peut pas joindre GitHub : mieux vaut une table
datée qu'une table devinée. Il signale aussi les tickets sans issue et compte ce qui reste
hors de la file, pour qu'aucun ticket ne disparaisse en silence.

**Une table dérivée vieillit aussi, si personne ne la dérive.** Être générée prouve qu'elle a
été vraie *une fois* — exactement le piège que `CLAUDE.md` décrit pour un chiffre mesuré sans
sa date. D'où une seconde commande, qui ne réécrit rien :

```powershell
npm.cmd run sessions:check   # « la table dit vrai », ou ce qui a bougé, et sort en 1
```

Elle compare **ce que la table affirme**, pas ses octets : la ligne « régénérée le … » diffère
tous les jours, et un contrôle qui rougirait dessus serait du bruit — le bruit est la façon
dont un contrôle finit désactivé. Quand elle est rouge, elle nomme le ticket qui a bougé et
les deux états, pour qu'il n'y ait pas de `diff` à lire. Éprouvée le 26 août en remettant
`w1-terrasses` à « ouvert » dans la table alors que `#15` était fermée : rouge, avec la ligne
fautive.

**Depuis le 15 septembre 2026, la même commande recoupe aussi les listes des huit épics.**
Chaque `[épic] Vague N` portait une liste de tickets cochée à la main : trois des huit étaient
fausses ce matin-là — `#42` listait 7 de ses 17 tickets étiquetés, et toute la famille
porte/instruments (`#70` à `#82`) ne figurait dans aucune liste. La population se dérive
maintenant des étiquettes `epic` et `vague-N`, jamais d'une liste de numéros. Trois écarts
rougissent : un ticket étiqueté absent de la liste, une ligne dont l'issue ne porte plus
l'étiquette ou n'existe pas, et une case qui contredit l'état de l'issue.

```powershell
npm.cmd run sessions -- --epiques   # réécrit le bloc `## Tickets` de chaque épic sur GitHub
```

Seul ce bloc est régénéré : le préambule et le « Fait quand » sont de la prose humaine, et
**l'ordre des lignes aussi** — `#43` à `#46` et `#48` sont rangés par ce qu'il faut faire
d'abord. Une ligne déjà là garde sa place, une nouvelle tombe à la fin, une ligne dont l'issue
a perdu l'étiquette s'en va. Ce que ça ne rattrape pas : ça recoupe des étiquettes à des cases,
jamais qu'une étiquette est la bonne, et un ticket sans étiquette de vague reste invisible aux
deux côtés.

---

## L'ordre

<!-- BEGIN sessions -- généré par `npm.cmd run sessions`, ne pas éditer à la main -->

*Table dérivée de `docs/tickets/` et de l'état GitHub, régénérée le 15/09/2026.*

| # | Ticket | Issue | État | Prio | Modèle |
| --- | --- | --- | --- | --- | --- |
| ~~1~~ | ~~`w6-fiche-robuste`~~ | [#156](https://github.com/IvandeMurard/paris-compass/issues/156) | **fait** | P0 | Opus 5 |
| ~~2~~ | ~~`w6-fiche-corpus`~~ | [#157](https://github.com/IvandeMurard/paris-compass/issues/157) | **fait** | P0 | Opus 5 |
| ~~3~~ | ~~`w1-porte-page`~~ | [#158](https://github.com/IvandeMurard/paris-compass/issues/158) | **fait** | P0 | Opus 5 |
| ~~4~~ | ~~`w6-amenites-corpus`~~ | [#169](https://github.com/IvandeMurard/paris-compass/issues/169) | **fait** | P0 | Opus 5 |
| ~~5~~ | ~~`w6-fiche-delai`~~ | [#180](https://github.com/IvandeMurard/paris-compass/issues/180) | **fait** | P1 | Opus 5 |
| 6 | `w6-langue-absences` | [#181](https://github.com/IvandeMurard/paris-compass/issues/181) | ouvert | P1 | Opus 5 |
| 7 | `w1-overpass-ordre` | [#163](https://github.com/IvandeMurard/paris-compass/issues/163) | ouvert | P1 | Opus 5 |
| 8 | `w1-parite-refus` | [#177](https://github.com/IvandeMurard/paris-compass/issues/177) | ouvert | P1 | Opus 5 |
| ~~9~~ | ~~`w1-brief-appariement`~~ | [#189](https://github.com/IvandeMurard/paris-compass/issues/189) | **fait** | P1 | Opus 5 |
| 10 | `w1-page-delai-derive` | [#182](https://github.com/IvandeMurard/paris-compass/issues/182) | ouvert | P1 | Opus 5 |
| 11 | `w1-parite-axes-enumere` | [#183](https://github.com/IvandeMurard/paris-compass/issues/183) | ouvert | P1 | Opus 5 |
| ~~12~~ | ~~`w0-deploy`~~ | [#7](https://github.com/IvandeMurard/paris-compass/issues/7) | **fait** | P0 | Opus 5 |
| ~~13~~ | ~~`w0-history`~~ | [#51](https://github.com/IvandeMurard/paris-compass/issues/51) | **fait** | P0 | Opus 5 |
| ~~14~~ | ~~`w0-provenance`~~ | [#10](https://github.com/IvandeMurard/paris-compass/issues/10) | **fait** | P0 | Opus 5 |
| ~~15~~ | ~~`w0-fiche`~~ | [#8](https://github.com/IvandeMurard/paris-compass/issues/8) | **fait** | P0 | Opus 5 |
| ~~16~~ | ~~`w0-mcp-verif`~~ | [#53](https://github.com/IvandeMurard/paris-compass/issues/53) | **fait** | P0 | Opus 5 |
| ~~17~~ | ~~`w0-hors-corpus`~~ | [#55](https://github.com/IvandeMurard/paris-compass/issues/55) | **fait** | P1 | Opus 5 |
| ~~18~~ | ~~`w0-cron`~~ | [#6](https://github.com/IvandeMurard/paris-compass/issues/6) | **fait** | P0 | Opus 5 |
| ~~19~~ | ~~`w0-sirene-url`~~ | [#56](https://github.com/IvandeMurard/paris-compass/issues/56) | **fait** | P0 | Opus 5 |
| ~~20~~ | ~~`w0-retenue`~~ | [#57](https://github.com/IvandeMurard/paris-compass/issues/57) | **fait** | P0 | Opus 5 |
| ~~21~~ | ~~`w0-plu`~~ | [#9](https://github.com/IvandeMurard/paris-compass/issues/9) | **fait** | P0 | Sonnet 5 |
| ~~22~~ | ~~`w1-chantiers`~~ | [#11](https://github.com/IvandeMurard/paris-compass/issues/11) | **fait** | P0 | Sonnet 5 |
| ~~23~~ | ~~`w1-terrasses`~~ | [#15](https://github.com/IvandeMurard/paris-compass/issues/15) | **fait** | P0 | Sonnet 5 |
| ~~24~~ | ~~`w1-survie`~~ | [#14](https://github.com/IvandeMurard/paris-compass/issues/14) | **fait** | P0 | Opus 5 |
| ~~25~~ | ~~`w0-conclusion`~~ | [#54](https://github.com/IvandeMurard/paris-compass/issues/54) | **fait** | P1 | Opus 5 |
| ~~26~~ | ~~`w0-appelant`~~ | [#58](https://github.com/IvandeMurard/paris-compass/issues/58) | **fait** | P1 | Opus 5 |
| ~~27~~ | ~~`w1-licence-derivee`~~ | [#59](https://github.com/IvandeMurard/paris-compass/issues/59) | **fait** | P1 | Opus 5 |
| ~~28~~ | ~~`w1-cadence`~~ | [#70](https://github.com/IvandeMurard/paris-compass/issues/70) | **fait** | P1 | Opus 5 |
| ~~29~~ | ~~`w1-porte-planifiee`~~ | [#71](https://github.com/IvandeMurard/paris-compass/issues/71) | **fait** | P1 | Opus 5 |
| ~~30~~ | ~~`w1-porte-lue`~~ | [#77](https://github.com/IvandeMurard/paris-compass/issues/77) | **fait** | P1 | Opus 5 |
| ~~31~~ | ~~`w1-porte-publiee`~~ | [#76](https://github.com/IvandeMurard/paris-compass/issues/76) | **fait** | P1 | Opus 5 |
| ~~32~~ | ~~`w1-observabilite`~~ | [#72](https://github.com/IvandeMurard/paris-compass/issues/72) | **fait** | P1 | Opus 5 |
| ~~33~~ | ~~`w1-catalogue`~~ | [#73](https://github.com/IvandeMurard/paris-compass/issues/73) | **fait** | P1 | Opus 5 |
| ~~34~~ | ~~`w1-observabilite-echappement`~~ | [#81](https://github.com/IvandeMurard/paris-compass/issues/81) | **fait** | P1 | Opus 5 |
| ~~35~~ | ~~`w1-ledger`~~ | [#82](https://github.com/IvandeMurard/paris-compass/issues/82) | **fait** | P1 | Opus 5 |
| 36 | `w1-historique` | [#49](https://github.com/IvandeMurard/paris-compass/issues/49) | **bloqué** | P0 | Opus 5 |
| 37 | `w1-ppri` | [#13](https://github.com/IvandeMurard/paris-compass/issues/13) | ouvert | P1 | Opus 5 |
| ~~38~~ | ~~`w1-dia`~~ | [#12](https://github.com/IvandeMurard/paris-compass/issues/12) | **fait** | P1 | Opus 5 |
| ~~39~~ | ~~`w6-analyse`~~ | [#50](https://github.com/IvandeMurard/paris-compass/issues/50) | **fait** | P1 | Opus 5 |
| 40 | `w3-mapillary` | [#21](https://github.com/IvandeMurard/paris-compass/issues/21) | **bloqué** | P0 | Opus 5 |
| ~~41~~ | ~~`w2-idfm`~~ | [#19](https://github.com/IvandeMurard/paris-compass/issues/19) | **fait** | P1 | Sonnet 5 |
| ~~42~~ | ~~`w2-filosofi`~~ | [#18](https://github.com/IvandeMurard/paris-compass/issues/18) | **fait** | P1 | Sonnet 5 |
| 43 | `w2-mobiliscope` | [#20](https://github.com/IvandeMurard/paris-compass/issues/20) | ouvert | P1 | Sonnet 5 |
| ~~44~~ | ~~`w4-meubles`~~ | [#27](https://github.com/IvandeMurard/paris-compass/issues/27) | **fait** | P1 | Sonnet 5 |
| 45 | `w2-air-bruit` | [#16](https://github.com/IvandeMurard/paris-compass/issues/16) | **bloqué** | P1 | Opus 5 |
| 46 | `w4-abf` | [#23](https://github.com/IvandeMurard/paris-compass/issues/23) | ouvert | P1 | Opus 5 |
| ~~47~~ | ~~`w6-mcp`~~ | [#35](https://github.com/IvandeMurard/paris-compass/issues/35) | **fait** | P1 | Opus 5 |
| 48 | `w5-entity` | [#29](https://github.com/IvandeMurard/paris-compass/issues/29) | ouvert | P1 | Opus 5 |
| 49 | `w5-entretien` | [#30](https://github.com/IvandeMurard/paris-compass/issues/30) | ouvert | P1 | Opus 5 |
| 50 | `w5-confiance-agent` | [#28](https://github.com/IvandeMurard/paris-compass/issues/28) | ouvert | P1 | Opus 5 |
| 51 | `w5-parse` | [#32](https://github.com/IvandeMurard/paris-compass/issues/32) | ouvert | P2 | Opus 5 |
| ~~52~~ | ~~`w6-contexte`~~ | [#119](https://github.com/IvandeMurard/paris-compass/issues/119) | **fait** | P1 | Opus 5 |
| 53 | `w6-liberations` | [#34](https://github.com/IvandeMurard/paris-compass/issues/34) | ouvert | P1 | Opus 5 |
| 54 | `w6-dossier` | [#33](https://github.com/IvandeMurard/paris-compass/issues/33) | ouvert | P1 | Opus 5 |
| 55 | `w6-modes` | [#36](https://github.com/IvandeMurard/paris-compass/issues/36) | ouvert | P1 | Opus 5 |
| 56 | `w6-accueil` | [#148](https://github.com/IvandeMurard/paris-compass/issues/148) | ouvert | P1 | Opus 5 |
| 57 | `w5-explain-metier` | [#31](https://github.com/IvandeMurard/paris-compass/issues/31) | ouvert | P2 | Opus 5 |
| 58 | `w3-osm-notes` | [#22](https://github.com/IvandeMurard/paris-compass/issues/22) | ouvert | P2 | Sonnet 5 |
| 59 | `w2-bpe-marches-velo` | [#17](https://github.com/IvandeMurard/paris-compass/issues/17) | ouvert | P2 | Sonnet 5 |
| 60 | `w4-ecoles` | [#24](https://github.com/IvandeMurard/paris-compass/issues/24) | ouvert | P2 | Sonnet 5 |
| 61 | `w4-frequentation` | [#26](https://github.com/IvandeMurard/paris-compass/issues/26) | ouvert | P2 | Sonnet 5 |
| 62 | `w4-erp-copro-ads` | [#25](https://github.com/IvandeMurard/paris-compass/issues/25) | ouvert | P2 | Opus 5 |
| 63 | `w7-etude-chantiers` | [#37](https://github.com/IvandeMurard/paris-compass/issues/37) | ouvert | P1 | Opus 5 |
| 64 | `w7-foncier` | [#38](https://github.com/IvandeMurard/paris-compass/issues/38) | **bloqué** | P1 | Opus 5 |
| 65 | `w7-inpi` | [#39](https://github.com/IvandeMurard/paris-compass/issues/39) | ouvert | P2 | Opus 5 |
| 66 | `w7-kit` | [#40](https://github.com/IvandeMurard/paris-compass/issues/40) | ouvert | P1 | Opus 5 |

**4 tickets attendent autre chose que du code.** Ils restent à leur
place dans l'ordre — un blocage se lève, il ne se cache pas — mais ne pas les ouvrir
en session tant que la ligne ci-dessous tient :

- `w1-historique` — APUR — courrier le 10 août 2026, relance le 24, sans réponse au 6 septembre.
- `w3-mapillary` — jeton d'API Mapillary à créer, et l'attribution CC-BY-SA à trancher avant d'ingérer (la question est ouverte dans `catalogue.json`). Décision d'Ivan, pas travail de session.
- `w2-air-bruit` — clé d'API Airparif à demander. Bruitparif n'a pas d'endpoint ouvert épinglé.
- `w7-foncier` — convention Ville / APUR / Cerema — accès réservé aux acteurs publics.

**Tous les tickets du dépôt sont dans cette file.** Un ticket neuf tombera ici,
hors ordre, tant que `ORDER` de `scripts/sessions.ts` ne lui aura pas donné sa place —
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
> [**#54**](https://github.com/IvandeMurard/paris-compass/issues/54) / `DIAGNOSTIC.md` **§15** :
> `compass_address_timeline` concluait « plus un commerce » à partir de millésimes qu'elle
> retient dans la même réponse. **Fermée le 26 août** par `w0-conclusion` — et la décision que
> le ticket demandait a été tranchée par une mesure : la phrase était fausse pour l'appelant
> privilégié aussi, sur **18 647 des 24 573** locaux absents du millésime 2023. `PLAN.md` et
> `CONTEXTE.md` portaient la même affirmation et ont été corrigés avec la base.
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

## Session 6 — `w0-cron` (#6) · Opus 5 — **faite le 25 août**

Touche aux privilèges.

> **Faite le 25 août, issue fermée.** Les deux moitiés du « Fait quand » : `compass_*` expose
> une date de fraîcheur pour les quatre sources — migration `20260825000001`, ledger distant à
> **30** — et **un cron a tourné seul**, run
> [32807455464](https://github.com/IvandeMurard/paris-compass/actions/runs/32807455464),
> événement `schedule`, `run_by = schedule`. Déclenché à 04:02 UTC pour une planification à
> 03:17, retard habituel de GitHub.
>
> **L'enchaînement s'est vérifié en conditions réelles** : `bodacc.ts` →
> `sirene.ts --confirm-only`, 84 255 avis réévalués, confirmations intactes après un
> rechargement automatique. Sans cette chaîne, ce passage aurait détruit les 3 147 niveaux
> `corrobore` et recommencé chaque nuit.
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
