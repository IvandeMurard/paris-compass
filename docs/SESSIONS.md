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
```

Inutile d'y rappeler `npm.cmd`, la pureté de `src/core/`, `Measured<T>` ou l'encadrement des
loyers : `CLAUDE.md` est chargé à chaque session.

---

## L'ordre

| # | Session | Issue | Modèle | Ouvre la voie à |
| --- | --- | --- | --- | --- |
| ~~1~~ | ~~`w0-deploy`~~ **fait le 24 août** | [#7](https://github.com/IvandeMurard/paris-compass/issues/7) | Opus 5 | #8, #6, #9 |
| 2 | `w0-provenance` | [#10](https://github.com/IvandeMurard/paris-compass/issues/10) | Opus 5 | — |
| 3 | `w0-fiche` | [#8](https://github.com/IvandeMurard/paris-compass/issues/8) | Opus 5 | toute la vague 1 |
| 4 | `w0-cron` | [#6](https://github.com/IvandeMurard/paris-compass/issues/6) | Opus 5 | — |
| 5 | `w0-plu` | [#9](https://github.com/IvandeMurard/paris-compass/issues/9) | Sonnet 5 | — |
| 6 | `w1-chantiers` | [#11](https://github.com/IvandeMurard/paris-compass/issues/11) | Sonnet 5 | — |
| 7 | `w1-terrasses` | [#15](https://github.com/IvandeMurard/paris-compass/issues/15) | Sonnet 5 | — |
| 8 | `w1-survie` | [#14](https://github.com/IvandeMurard/paris-compass/issues/14) | Opus 5 | #34 |

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

## Session 2 — `w0-provenance` (#10) · Opus 5

**Le rayon d'action le plus large du lot, et à traiter seul.** À faire tôt dans la fenêtre,
pendant que rien d'autre n'est en vol.

```
Ce ticket touche src/core/, mcp-server/ et src/pages/Methodology.tsx ensemble :
CLAUDE.md exige que les formules publiees suivent le code.

Etablis la liste complete des appelants de scoreLocation AVANT de toucher a la
signature. Ne commence rien d'autre dans cette session.
```

## Session 3 — `w0-fiche` (#8) · Opus 5

Travail d'interface, donc à placer dans la fenêtre libre. Dépend de la session 1.

```
C'est du travail d'interface. Lovable est indisponible jusqu'au 1er septembre,
donc pas de risque de synchronisation croisee — mais tout doit etre pousse avant
cette date. Ne pas toucher .lovable/.

Piege du ticket : observed=false doit se lire "non observe", jamais "vacant" ni
"plus un commerce", et pas de coalesce sur le libelle.
```

## Session 4 — `w0-cron` (#6) · Opus 5

Dépend de la session 1. Touche aux privilèges.

```
Ce job ne doit jamais porter la cle anon. Dis-moi ou tu comptes stocker le secret
AVANT de l'ecrire, pas apres.

Cadences distinctes : SIRENE mensuel, BODACC continu, BDCom triennal, geographie
rare. Afficher une date de fraicheur sans rafraichissement reel serait le loyer
fabrique sous une autre forme.
```

## Session 5 — `w0-plu` (#9) · Sonnet 5

Ingestion droite. Dépend de la session 1.

```
Ingestion classique : jeu plub_protcom d'opendata.paris.fr, version votee le
20 novembre 2024. Suis le patron de scripts/ingest/.

L'affichage est informatif, sans valeur reglementaire, et renvoie au Portail des
Regles d'Urbanisme.
```

## Sessions 6 et 7 — `w1-chantiers` (#11), `w1-terrasses` (#15) · Sonnet 5

Deux ingestions indépendantes, même patron. Réserve commune à rappeler :

```
Fait administratif, measured. Jamais une prevision d'impact sur le chiffre
d'affaires pour les chantiers ; jamais un CA terrasse deduit d'une autorisation.
Une autorisation n'est pas une terrasse installee aujourd'hui.
```

## Session 8 — `w1-survie` (#14) · Opus 5

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
