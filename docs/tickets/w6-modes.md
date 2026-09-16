# [P1] w6-modes — Trois modes métier

**ID** `w6-modes` · **vague 6** · **Q4 2026** · **P1**
**Dépend de** `w0-fiche`, `w1-terrasses`, `w0-plu`
**Sources** —

## Pourquoi
Même corpus, phrases différentes. Un dashboard unique moyenne ce que le README refuse.

## Comment
Restauration (cuisine, terrasse, PPRI cave, licence). Boutique (linéaire, PLU, rotation prêt-à-porter). Artisanat (PLU artisanat, copro, livraison).

## Doctrine
Pas un score par métier. Une checklist par métier.

## Fait quand
Le basculement de mode réordonne les axes et les alertes, sans inventer de chiffre.

Voir [`docs/PLAN-ACTION-VACANCE.md`](../PLAN-ACTION-VACANCE.md). Relit `docs/PLAN.md`, `docs/PERIMETRE.md`.

## Livré — 16 septembre 2026

**Un mode est un ORDRE DE LECTURE et une CHECKLIST, et il ne touche à aucun chiffre.** C'est ce
que `docs/PERIMETRE.md` §4 promet depuis le premier jour — *« Compass affiche les axes séparément
et laisse le métier arbitrer »* — sauf qu'« arbitrer » se faisait jusqu'ici dans la tête du
lecteur. `src/core/modes.ts` met l'arbitrage à l'écran sans lui laisser toucher une valeur.

### Le critère, démontré dans un navigateur

Chrome sans tête, build local servi depuis le disque, quatre lectures de la même adresse — aucun
mode, puis les trois. Ce qui est comparé entre les quatre : la séquence des cartes de constat, la
séquence des alertes, et **le texte de chaque carte, chiffre compris**.

**Adresse à linéaire protégé — `48.884943, 2.337073` (18ᵉ), 16 septembre 2026**, verdict composé
en **1 594 ms** puis 804, 574 et 548 ms sur les trois modes :

| | axes réordonnés | même population | chiffres identiques | alertes réordonnées | mêmes alertes |
| --- | --- | --- | --- | --- | --- |
| restauration | oui | oui | **oui** | non — voir plus bas | oui |
| boutique | oui | oui | **oui** | non | oui |
| artisanat | oui | oui | **oui** | non | oui |

Les quatre phrases de verdict, mot pour mot, sur la même adresse et dans la même minute :

> *(aucun)* Tissu commercial dense, passage soutenu, desserte ferrée forte, services marchands à pied nombreux.
> *restauration* Passage soutenu, desserte ferrée forte, tissu commercial dense, services marchands à pied nombreux.
> *boutique* Tissu commercial dense, passage soutenu, services marchands à pied nombreux, desserte ferrée forte.
> *artisanat* Services marchands à pied nombreux, tissu commercial dense, desserte ferrée forte, passage soutenu.

Quatre séquences, une seule affirmation : les mêmes quatre clauses, sur les mêmes quatre axes
porteurs. `Tissu commercial = 100/100`, `Passage = 92/100`, `Desserte ferrée = 77/100`,
`Services marchands à pied = 63/100`, `Commerces alimentaires = 68/100` dans les quatre lectures.

**« Alertes réordonnées : non » sur cette adresse est correct, et c'est pour ça qu'il en fallait
une seconde.** Un point sain ne porte qu'UN trou rattaché à un axe — le mandataire de `passage` —
et les trois autres n'appartiennent à aucun axe. Il n'y a donc rien à permuter, et une session qui
se serait arrêtée là aurait conclu que la moitié « alertes » du critère était tenue alors que rien
ne l'aurait montrée.

**Adresse hors corpus — Massy, `48.730000, 2.270000`**, refus composé en 303 ms puis 535, 284 et
283 ms. Cinq trous y portent un axe :

| | axes réordonnés | même population | chiffres identiques | **alertes réordonnées** | mêmes alertes |
| --- | --- | --- | --- | --- | --- |
| restauration | oui | oui | oui | **oui** | oui |
| boutique | oui | oui | oui | **oui** | oui |
| artisanat | oui | oui | oui | **oui** | oui |

Le refus se réordonne comme le verdict et nomme les mêmes manques :

> *(aucun)* Compass ne compose pas de verdict pour cette adresse — le tissu commercial : hors du corpus ; le passage : hors du corpus ; la desserte ferrée : hors du corpus ; les services marchands à pied : hors du corpus.
> *artisanat* Compass ne compose pas de verdict pour cette adresse — les services marchands à pied : hors du corpus ; le tissu commercial : hors du corpus ; la desserte ferrée : hors du corpus ; le passage : hors du corpus.

### « Sans inventer de chiffre », tenu par le type et pas par la vigilance

`modeAxisOrder(mode)` rend une **permutation** de `VERDICT_AXIS_ORDER` : la tête est déclarée par
le mode, la queue est calculée depuis l'ordre du noyau. Un septième axe ajouté à `verdict.ts`
entre donc dans les trois modes le jour où il est ajouté, en queue, au lieu de disparaître de deux
d'entre eux. `composeVerdict` accepte cet ordre en troisième argument et **réordonne sans
sélectionner** : les axes porteurs restent `VERDICT_AXES`, donc aucun mode ne peut changer ce que
la phrase affirme. `orderGapsForMode` fait la même chose sur le bloc des trous, et son contrôle
est l'égalité des deux populations — un mode qui pourrait cacher une alerte rendrait la page plus
complète qu'elle n'est, ce que ce bloc existe précisément pour empêcher.

### La checklist, et la moitié vide qui est la moitié honnête

Le *Comment* nomme neuf choses. **Trois sont dans le corpus aujourd'hui** — le registre des
terrasses (`w1-terrasses`, #15) et les deux protections du PLU (`w0-plu`, #9), c'est-à-dire deux
des trois dépendances déclarées de ce ticket. **Six n'y sont pas, et chacune nomme ce qui lui
manque** plutôt que d'être tue : `ppri_cave` → #13, `copropriete` → #25, `rotation_metier` → #49
et la lettre à l'APUR, et trois — extraction de cuisine, licence de débit, accès livraison — pour
lesquelles **aucune source ouverte n'a été identifiée**, ce qui est une autre phrase et ne doit
pas emprunter l'espoir de la première.

`rotation_metier` est le seul cas où le chiffre **existe en base et ne peut pas être servi** :
`compass_survival_by_trade` rend un taux par métier, et sa cohorte 2017 n'est pas redistribuable.
« Nous ne l'avons pas » et « nous l'avons et ne pouvons pas le servir » sont la distinction sur
laquelle ce produit est bâti, et elles ne sont pas fondues ici.

Ce que la checklist rend, mot pour mot, au `48.884943, 2.337073` :

> **Terrasse ou étalage autorisé** — 3 des 10 locaux relevés à moins de 25 m portent une autorisation de terrasse ou d'étalage. 4 relèvent d'une adresse où la source ne dit pas lequel est concerné : inconnu, pas absent.
> **Linéaire protégé au PLU** — Les 10 locaux relevés à moins de 25 m sont sur un linéaire portant au moins une des trois protections.
> **Protection du commerce artisanal de proximité** — Les 10 locaux relevés à moins de 25 m sont sur un linéaire protégé au titre du commerce artisanal de proximité.

Recoupé en base le même jour, connexion directe, sur ce point : **11 emplacements dans 25 m, 3 en
`terrasse oui`, 4 en `inconnu`, 11 sur linéaire protégé, 11 en `ppa`**. L'écart 11/10 n'est pas
une erreur : la base compte les `premise_location`, l'écran compte les locaux **relevés au
millésime 2023**, et c'est bien ce que la phrase dit. Même écart rue de Bretagne, 28 contre 25.

### Aucun appel de plus sur le chemin critique

Les colonnes `terrasse_*` et `plu_*` sont **dans la réponse que la fiche reçoit déjà** —
`compass_premises_within` les porte depuis `20260825000005` et `20260825000010`, et la fiche les
jetait. Elles sont comptées sur les locaux relevés à moins de `RESOLUTION_RADIUS_M` = **25 m**, le
rayon que `premiseHistory.ts` a mesuré pour cette question exacte : une protection de PLU
appartient à une façade et une autorisation de terrasse à un numéro de rue, pas à un disque de
400 m (`docs/PLAN.md` §5.3, *« la question n'est pas est-ce que ça varie mais est-ce que ça
sépare »*).

**Et le compte de proximité est immunisé contre le plafond de PostgREST**, ce qui est une
propriété du SQL et pas un espoir : `compass_premises_within` finit sur `order by h.distance_m,
h.location_id limit v_limit`, donc une réponse plafonnée perd les locaux les plus LOINTAINS. Le
champ proche est entier dès que le rayon tient quelque chose.

La seule requête ajoutée est `compass_source_freshness`, pour la date propre des deux jeux, et
elle **ne part pas tant qu'aucun mode n'est choisi** (`useTradeOrigins(mode !== null)`). Sa
réponse ne dépend pas du point, donc elle est gardée une heure sous une clé sans coordonnées : le
deuxième, le troisième et le quatrième mode essayés ne coûtent aucun réseau. Sans elle, les
contrôles du corpus rendent « couche absente » au lieu d'un compte daté d'aujourd'hui.

### Personne ne pouvait picorer un local

Le champ proche **ne choisit aucun local** : il compte l'accord sur une population nommée. « Les
10 locaux relevés à moins de 25 m sont sur un linéaire protégé » est une phrase sur la façade qui
ne désigne personne, et c'est ce qui évite la seconde erreur fondatrice de `docs/PLAN.md` §2.5 —
attacher le fait d'un local à un autre, que `premiseHistory.ts` refuse en rendant ses 25
candidats plutôt qu'en prenant le plus proche.

### Deux défauts trouvés à l'ÉCRAN, pas en relecture — `DIAGNOSTIC.md` §56

Les deux étaient **verts au test unitaire** et le seraient restés. Ils sont corrigés avant
livraison, et chacun a désormais un contrôle qui balaie une population plutôt qu'une phrase.

1. **« ne est ».** Le gabarit français écrivait « ne » et recevait un verbe nu, donc la page
   rendait *« aucun des 25 locaux relevés à moins de 25 m **ne est** sur un linéaire protégé »*.
   Le contrôle qui existait demandait si la phrase contenait « ne » — elle en contenait un.
2. **« Aucune terrasse » là où 26 locaux sur 28 sont `inconnu`.** Rue de Bretagne, le registre
   répond `oui` pour aucun local relevé et `inconnu` pour 26 des 28 emplacements — un numéro de rue
   où une autorisation existe sans que la source dise lequel la porte. S'arrêter à « aucun »
   inventait une absence, ce que `src/i18n/terrasseText.ts` refuse depuis le 25 août, reproduit un
   cran plus haut dans un agrégat.

### Ce qui attend une décision d'Ivan

**L'ordre de tête des trois modes.** `LEAD_AXES` déclare trois axes par métier, avec sa raison
écrite ; c'est un arbitrage produit et non une propriété de la donnée, et le dériver aurait été
inventer une pondération sous un autre nom. Il ne déplace rien d'autre qu'une séquence et se
change en trois lignes.

### Ce qui n'est PAS fait

- **Aucun bras de porte n'ouvre la page dans un mode.** `page` s'arrête à `/contexte/` sans clé
  `mode=`, donc une régression propre à un mode passerait au vert chaque matin — la même limite
  que `w6-dossier` a nommée pour son bouton et `w6-langue-absences` pour `/en/context/`.
- **Le mode ne suit ni dans le dossier exporté ni dans l'appel MCP montré.** `buildDossier` rend
  les figures dans l'ordre du noyau, et c'est volontaire pour le fichier — un dossier transmis à
  un tiers ne doit pas dépendre du métier du lecteur — mais ce n'était écrit nulle part avant
  cette ligne.
- **Les six contrôles sans source le resteront jusqu'à leurs tickets.** Le mode restauration est
  celui qui en porte le plus : une seule de ses quatre lignes est répondue.
- **Ce ticket redit `docs/PLAN-ACTION-VACANCE.md`, « Produit → Trois modes métier »**, qui porte
  la même clôture. Il est aussi le voisin de `w5-explain-metier` (#31, P2) — *« explain_score
  change l'ordre des phrases, pas les chiffres »* — qui est la même doctrine sur la surface
  AGENT ; les deux restent distincts et se citent.
