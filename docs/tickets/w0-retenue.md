# [P0] w0-retenue — La règle de retenue, rendue mécanique — et `compass_street_rotation`, sa 5ᵉ victime

**ID** `w0-retenue` · **vague 0** · **P0**
**Dépend de** —
**Bloque** la fermeture de l'épic vague 0 (#41)
**Sources** — *aucune source nouvelle*

## Pourquoi

**Ce ticket n'est pas « corriger une cinquième fonction ». C'est « faire en sorte qu'il n'y ait
pas de sixième ».** Corriger `compass_street_rotation` seule reproduirait exactement le défaut
que `DIAGNOSTIC.md` §20 vient de nommer : réparer la donnée sans laisser la règle derrière.

La règle existe depuis le 9 août — *une fonction qui traverse `premise_observation` doit annuler
son propre contenu sur un millésime retenu, et ne jamais compter sur RLS pour l'avoir fait*.
Elle a été **réécrite quatre fois à la main**, une paire d'invariants par fonction :

| Fonction lisant `premise_observation` | Paire d'invariants | Occurrence |
| --- | --- | --- |
| `compass_address_timeline` | `I9`/`I10` | §9 |
| `compass_scoring_context_within` | `I12`/`I13` | §10 |
| `compass_premises_within` | `I14`/`I15` | §11 |
| `compass_premise_history` | `I16`/`I17`, puis `I18` | §10, §12 |
| **`compass_street_rotation`** | **aucune** | **§19 — celle-ci** |
| `compass_bodacc_within`, `compass_vintages`, `compass_source_freshness` | **aucune** | non examinées |

*Mesuré le 25 août par comptage des occurrences dans `eval/invariants.sql`.*

Quatre implémentations de la même règle, zéro expression de la règle. Chaque nouvelle fonction
naît fausse et n'est rattrapée que si quelqu'un regarde. La cinquième a été trouvée en écrivant
`w1-survie` — par accident, pas par un contrôle.

**Le défaut lui-même**, mesuré aux Halles, rayon 300 m (`DIAGNOSTIC.md` §19) :
un appelant privilégié voit 2017, 2020 et 2023 et `changed_since_previous = 78` ; un appelant
anonyme voit 2023 seul et **`0`**, sans marqueur. Zéro est une réponse positive : le taux de
rotation est rendu comme un fait alors qu'il est le résidu d'une retenue.

## Comment

**Dans cet ordre, et la partie 2 est le livrable.**

1. **Corriger `compass_street_rotation`** sur le patron déjà écrit quatre fois : lire
   `request.jwt.claims`, exposer la retenue, ne pas s'appuyer sur RLS. Migration, puisque le
   type de retour change. Le couple d'invariants qui va avec — l'un contre la fuite, l'autre
   contre la retenue excessive — comme `I16`/`I17`.

2. **Écrire la règle une fois pour toutes.** Un invariant de recensement qui **énumère** depuis
   le catalogue (`pg_proc`, `pg_depend`) toute fonction `compass_*` lisant `premise_observation`,
   et échoue si l'une d'elles n'est pas couverte par un test de retenue. Alors la sixième
   fonction ne peut plus naître sans qu'on le sache — c'est ça, la règle qui survit au
   rechargement et au changement de consommateur.

3. **Traiter les trois non examinées** — `compass_bodacc_within`, `compass_vintages`,
   `compass_source_freshness`. Le recensement de l'étape 2 les fera sortir de lui-même. Chacune
   est soit corrigée, soit déclarée hors périmètre **avec sa raison écrite**, jamais laissée en
   silence.

## Doctrine

Corriger une donnée n'est pas corriger un défaut. La règle vit là où la valeur est produite —
dans la fonction, pas dans l'écran, pas dans le front, pas dans le MCP qui l'appelle.

Zéro n'est pas une absence. `withheld` n'est pas vide. Et un taux calculé sur un sous-ensemble
retenu n'est pas un taux : c'est un artefact de licence, qui doit se nommer comme tel.

## Fait quand

Trois choses, et la deuxième est celle qui compte :

1. Un appel anonyme sur `compass_street_rotation` aux Halles ne rend plus `0` sans marqueur,
   mais une retenue nommée. Le couple d'invariants passe, éprouvé contre un sabotage dans
   chaque sens comme l'a été `I16`/`I17`.
2. **Un invariant de recensement échoue si l'on ajoute une fonction `compass_*` lisant
   `premise_observation` sans test de retenue.** Démontré en en ajoutant une pour de faux, dans
   une transaction annulée : la porte doit passer au rouge.
3. Les trois fonctions non examinées ont chacune un verdict écrit — corrigée, ou hors périmètre
   avec sa raison.

Et, comme pour `I22` : **dire ce que la règle ne rattrape pas.** Elle a toujours une limite.

Voir `DIAGNOSTIC.md` §19 pour la mesure, §20 pour la règle générale, §9 à §12 pour les quatre
occurrences précédentes.

---

# Fait le 25 août 2026 — session 11

**Ce ticket n'a pas produit une cinquième correction, il en a produit trois — et c'est
l'énumération qui a trouvé les deux autres.** L'ordre du ticket était le bon : écrire la règle
avant de corriger la fonction aurait suffi ; écrire la règle *en corrigeant* la fonction a
convaincu deux fonctions que la session précédente avait explicitement innocentées.

## Le critère 2 d'abord, parce que c'est lui qui compte

**`I23` et `I24` remplacent la liste tenue de mémoire par une énumération du catalogue.**

- **`I23`, structurel** — depuis `pg_proc`, toute fonction `compass_*` dont le corps cite une
  table dont une politique `SELECT` porte un prédicat autre que `true` doit être
  `SECURITY DEFINER` **et** porter une colonne `withheld`. La population des *tables* vient elle
  aussi du catalogue, pas du nom `premise_observation` : la table restreinte suivante sera
  couverte sans que personne y pense.
- **`I24`, la couverture** — même population, puis vérification qu'au moins un invariant
  `-- @as anon` **appelle** chaque fonction, commentaires retirés. Une mention en commentaire ne
  vaut pas couverture : `I16` cite ses trois voisines dans son en-tête sans rien vérifier à leur
  sujet.

`I24` est le seul contrôle de cette porte qui croise le catalogue avec `eval/invariants.sql`
lui-même. Aucune requête SQL ne peut le faire — le fichier est sur la machine du développeur, pas
sur le serveur — d'où la moitié TypeScript, dans `scripts/eval/census.ts`.

### Démontré par sabotage, pas supposé

```powershell
npm.cmd run eval:sabotage
```

Le script crée `compass_sabotage_probe` — sixième fonction lisant `premise_observation`,
`SECURITY INVOKER`, sans colonne `withheld`, sans test — **dans une transaction annulée**, rejoue
`I23` et `I24` contre elle, annule, puis les rejoue au propre. Il importe le verdict de
`scripts/eval/census.ts`, celui qu'utilise la porte : une preuve qui rejoue une copie du contrôle
ne prouve rien sur le contrôle.

Mesuré des deux côtés de la migration, et les deux mesures disent des choses différentes :

| | `I23` | `I24` |
| --- | --- | --- |
| **Avant** la migration, au propre | **3 lignes** — les trois fonctions `INVOKER` | 6 fonctions recensées, toutes couvertes |
| **Avant**, sous sabotage | **4 lignes** | **`compass_sabotage_probe` non couverte**, population à 7 |
| **Après** la migration, au propre | **0 ligne** | 6 fonctions, toutes couvertes |
| **Après**, sous sabotage | **1 ligne** | **`compass_sabotage_probe` non couverte**, population à 7 |
| Après `rollback` | 0 ligne | 6 fonctions, toutes couvertes |

La ligne « avant, au propre » vaut autant que les autres : la règle a été écrite contre une base où
elle échouait, pas ajustée jusqu'à passer. Et la fonction n'existe pas en base après coup —
vérifié par `pg_proc` dans le script lui-même, dernier contrôle du script.

> **`pg_depend` ne pouvait pas répondre, et le ticket le demandait.** Mesuré le 25 août : pour ces
> fonctions, `pg_depend` ne porte que le schéma, le langage et les types — **jamais les tables
> lues**. Postgres n'enregistre les dépendances du corps d'une fonction que pour la syntaxe SQL
> standard `BEGIN ATOMIC` (PG14+) ; avec un corps en chaîne, `plpgsql` comme `sql`, le corps est
> opaque au catalogue. D'où `pg_proc.prosrc`.

## Le critère 1 : `compass_street_rotation`

`20260825000014` la passe `SECURITY DEFINER`, lui fait lire le claim, et rend **une ligne marquée
par millésime retenu** — jamais une par tronçon, ce qui divulguerait où le millésime retenu a des
locaux (la fuite que `20260809000011` avait dû fermer sur la fonction sœur).

Mesuré sur le distant, centroïde du quartier **Halles (48,86229 / 2,34490)**, rayon 300 m,
périmètre commerce, sommé sur les 98 tronçons :

| Appelant | 2017 | 2020 | 2023 |
| --- | --- | --- | --- |
| Privilégié — avant | 660 locaux, `chg` **0** | 631, `chg` 76 | 619, `chg` 81 |
| Anonyme — avant | *absent* | *absent* | 619, **`chg` 0 sans marqueur** |
| Privilégié — après | 660, `chg` **nul** | 631, `chg` 76 | 619, `chg` 81 |
| **Anonyme — après** | **1 ligne `withheld`** | **1 ligne `withheld`** | 619, `chg` **nul** |

Le `0` a disparu des deux côtés, pour deux raisons différentes — voir plus bas.

**`I25`/`I26`** forment la paire : l'une contre le dénombrement fabriqué, l'autre contre la
retenue excessive. **Éprouvées contre un sabotage dans chaque sens**, chacun dans une transaction
annulée, comme l'ont été `I16`/`I17` :

| Sabotage | `I25` | `I26` |
| --- | --- | --- |
| Version correcte | 0 ligne | 0 ligne |
| Le dénombrement est calculé contre un millésime retenu | **échoue, 20 lignes** — ex. un tronçon de 2 locaux avec `changed_since_previous = 0` | 0 ligne |
| Tout est retenu, y compris l'ODbL | 0 ligne | **échoue, 1 ligne** — « millésime ODbL retenu ou vidé : 2023 » |

Aucune des deux n'est vide, et aucune ne couvre le défaut de l'autre — c'est pour cela que `I25`
ne dit **rien** du millésime ODbL lui-même : la version qui retient tout le satisfait, et c'est
`I26` qui doit la refuser.

`I27`/`I28` sont éprouvées de la même façon : déclarer 2017 et 2020 redistribuables fait sortir le
volet BDCom (**`I27` échoue**, `withheld = false`, 310 / 268 / 86,5 % ; `I28` reste au vert), et
retirer le métier 111 du pont NAF vide le volet SIRENE (**`I28` échoue**, `cohort_n` nul ; `I27`
reste au vert). Et le bras D (`npm.cmd run eval:anon`) la joue par HTTP avec la seule clé
publiable, parce que le bras A ne pose jamais `set local role` : **jouée contre l'ancienne
fonction, qui ne lisait pas le claim, une sonde du bras A aurait vu la réponse privilégiée et
n'aurait rien trouvé.** C'est le même angle mort qui a caché `compass_premise_history` pendant
quinze jours.

> **Le chiffre du ticket n'était pas reproductible.** `DIAGNOSTIC.md` §19 annonçait **78**
> changements sur 2023 sans nommer son point de mesure. Remesuré : **81** sur 2023, **76** sur
> 2020. Aucune variante essayée — périmètre commerce ou non, 300 m — ne rend 78. « Un chiffre
> mesuré porte sa date » vaut aussi pour **son lieu** : sans coordonnées, un dénombrement
> géographique n'est pas vérifiable, seulement recopiable. Les chiffres écrits ici portent les
> leurs.

## Ce que l'énumération a trouvé et que personne ne cherchait

**Deux fonctions de plus, et une exemption écrite noir sur blanc qui était fausse.**
`20260824000002` avait tranché : « les deux fonctions `_within` restent `INVOKER` légitimement :
elles n'ont pas de colonne `observed`, donc RLS leur coûte des lignes et non la vérité. » `I23`,
écrit pour attraper la cinquième fonction, en a rendu **trois**.

Mesuré le 25 août, Halles 800 m, millésime 2017, avec `set local role` pour que RLS s'applique :

| Appelant | `compass_scoring_context_within` | `compass_premises_within` |
| --- | --- | --- |
| Privilégié | 4 773 locaux | 4 773 appariés |
| Anonyme | 1 ligne `withheld` | 1 ligne `withheld` |
| **Authentifié** | **0 ligne, aucun marqueur** | **0 ligne, aucun marqueur** |

Zéro ligne sans marqueur : **le défaut du point 9 mot pour mot, vivant pour quiconque a créé un
compte**, sur les deux fonctions déclarées saines. Corrigé par deux `alter function ... security
definer` — les corps étaient justes, seul le mode l'était pas. `DIAGNOSTIC.md` §21.

**Un sixième défaut, sur le chemin privilégié, sans licence.** `changed_since_previous` valait
**0** sur le premier millésime de la série : `previous_code` y est nul partout, le filtre ne
retient rien, `count(*)` rend 0 — « aucun changement en 2017 », dit d'une année qui n'a pas de
prédécesseur. Vrai depuis `20260808000005`, donc depuis le premier jour. Même famille que le
point 11. Corrigé dans la même migration : `changed_since_previous` est nul dès que la comparaison
est impossible, donc un `0` de cette colonne redevient un zéro **mesuré**. `DIAGNOSTIC.md` §22.

## Le critère 3 : chaque fonction a son verdict

Mesuré le 25 août par énumération — **13 fonctions `compass_*`**, dont **6** lisent une table
restreinte :

| Fonction | Lit une table restreinte | Verdict |
| --- | --- | --- |
| `compass_address_timeline` | oui | déjà juste — `I9`/`I10` |
| `compass_premise_history` | oui | déjà juste — `I16`/`I17` |
| `compass_scoring_context_within` | oui | **corrigée** — `DEFINER` |
| `compass_premises_within` | oui | **corrigée** — `DEFINER` |
| `compass_street_rotation` | oui | **corrigée** — `DEFINER` + marqueur, `I25`/`I26` |
| `compass_survival_by_trade` | oui | juste, mais **sans test anonyme** — `I27`/`I28` ajoutés |
| `compass_bodacc_within` | **non** | hors périmètre |
| `compass_vintages` | **non** | hors périmètre |
| `compass_source_freshness` | **non** | hors périmètre |
| `compass_max_radius_m`, `compass_street_key`, `compass_bodacc_street_key`, `compass_survival_min_cohort` | non | sans donnée |

**Les trois « non examinées » du ticket ne lisent aucune table restreinte** — et c'est le
recensement qui le dit, pas une lecture. Mesuré le 25 août, réponses **strictement identiques**
pour les trois appelants :

- **`compass_bodacc_within`** — lit `bodacc_establishment`, `bodacc_announcement`,
  `bodacc_judgment`, `premise_location` ; toutes `using (true)`, BODACC en Licence Ouverte.
  Halles 400 m : 200 lignes, `total_matched` 2 573, 80 rattachements. Le point qui vaut d'être
  retenu : `premise_location` n'est pas restreinte non plus — **ce sont les relevés qui portent la
  licence, pas les locaux.**
- **`compass_vintages`** — ne lit que `bdcom_vintage`. Elle publie pourtant à `anon` le
  `record_count` de 2017 (**84 031**) et 2020 (**83 399**). Maintenu, pour deux raisons dont la
  seconde pèse plus : ces nombres décrivent la **taille du fichier publié**, pas un agrégat d'un
  sous-ensemble choisi — la distinction que `w1-survie` avait tranchée en retenant « n = 310 » ; et
  cette fonction est **ce qui rend la retenue lisible** (licence, date, URL). La retenir viderait
  de sens tous les marqueurs `withheld` du corpus. Question rouverte seulement si l'APUR répond que
  la taille du fichier elle-même n'est pas diffusable.
- **`compass_source_freshness`** — lit `ingestion_run`, non restreinte, publie `bdcom: 228 275`,
  soit la somme des trois millésimes, donc exactement ce que `compass_vintages` publie déjà ligne
  par ligne. Son commentaire de `20260825000001` l'avait anticipé.

## Un défaut trouvé en chemin, consigné et non corrigé

**En sabotant `I28`.** `compass_survival_by_trade` dérive le volet BDCom de **deux** millésimes et
ne cite, sur la branche divulguée, que la licence de celui d'**arrivée**. Mesuré aux Halles,
niv18 111, appelant privilégié : `86,5 %` sur la période **2017 → 2023**, `licence = ODbL-1.0` —
alors que 2017 porte `custom` et `publicly_redistributable = false`, ce qui est le motif même de la
retenue de la branche d'à côté. Famille du point 13, variante *dérivation*. La règle qui manque
s'énonce en une phrase : **une valeur dérivée de plusieurs millésimes porte la licence la plus
restrictive.** `DIAGNOSTIC.md` §24, avec sa portée — un appelant anonyme ne voit jamais cette
ligne, donc le défaut ne touche que ceux qui pourraient republier.

Au même endroit, un écart de documentation : le commentaire de `20260825000012` annonce qu'un
métier absent du pont NAF ne produit « aucune ligne SIRENE ». Mesuré : la ligne sort, chiffres nuls
et raison nommée. Le comportement est meilleur que l'annonce — c'est le commentaire qui est faux.

## Ce que la règle ne rattrape pas

- **`I23` lit du texte.** `prosrc ~ '\ytable\y'` ne voit pas une table atteinte par une **vue**,
  par du SQL dynamique, ou via une autre fonction ; et signale à tort une fonction qui la cite en
  commentaire. Le faux positif coûte une lecture, le faux négatif coûte un défaut — d'où ce
  sens-là. Aucune vue interposée aujourd'hui : c'est une mesure, pas une garantie.
- **`I24` vérifie qu'un test existe, pas qu'il teste.** Un invariant `@as anon` appelant la
  fonction sans rien contrôler d'utile satisferait la couverture. Limite de `I22` sous une autre
  forme.
- **Le bras A ne joue pas RLS.** `I25`/`I26` ne valent pour l'appelant réel que *parce que* la
  fonction lit désormais le claim. C'est le bras D qui tient cette moitié, et c'est pourquoi les
  deux nouvelles fonctions y sont ajoutées.
- **La doctrine `authenticated` n'est pas tranchée ici.** Un appelant connecté reçoit le contenu
  2017 — il le recevait déjà des trois fonctions `DEFINER`, mesuré. Que le rôle de *quiconque a
  créé un compte* soit « privilégié » est une décision du 9 août (`20260809000010`), notée dans
  `DIAGNOSTIC.md` §21 pour qu'elle cesse d'être invisible, pas réglée par ce ticket.

## Portes

`typecheck` ✓ · **122 tests** ✓ (inchangé — ce ticket ne touche pas `src/`) · `build` ✓ ·
`build:dev` ✓ · `verify:mcp` **41 contrôles, 39 au vert, 0 en échec**, 2 suspendus sur panne des
miroirs Overpass (429) — relancée après la poussée, le serveur MCP appelle deux des fonctions dont
le mode de sécurité change.

**`20260825000014_licence_withholding_rule.sql` est posée**, ledger distant remesuré à **41**,
dernière `20260825000014`. Les six fonctions lisant une table restreinte sont `SECURITY DEFINER`
et portent une colonne `withheld` — remesuré en base, c'est exactement ce que `I23` vérifie.

| Porte | Résultat |
| --- | --- |
| `eval` | **28/28 invariants**, 8/8 cas dorés, dix écarts de baseline en avertissement (dérive BODACC/SIRENE connue, la plus large à 0,70 %) |
| `eval:anon` | **PASS, 11 contrôles** |
| `eval:sabotage` | **PASS** — `I23` passe de 0 à 1 ligne sous sabotage, `I24` sort `compass_sabotage_probe`, rollback propre |

**Le critère 1, démontré par appel PostgREST réel avec la seule clé publiable** :

```
ok  street_rotation Halles 300 m — 2017/2020 marqués sans tronçon, 98 tronçons rendus
    sur 2023 et changed_since_previous nul, jamais 0
ok  survival_by_trade Halles, Café et Restaurant — BDCom retenu sans effectif,
    SIRENE rendu 55.1 % sur 185 — le seul vrai taux public de ce corpus
```

**Ce que la porte rendait contre la base non encore migrée, et qui vaut d'être gardé** : `I1` à
`I22` au vert, **`I23` en échec sur 3 lignes** — les trois fonctions `security_definer = false` —
et **`I25` en erreur**, `column r.withheld does not exist`. Même signature que `I14` jouée contre la
fonction défectueuse encore en ligne (`DIAGNOSTIC.md` §10). Les invariants mordent contre la vraie
base, ce qu'aucune transaction annulée ne démontre.

### Deux échecs du bras D tranchés au passage

`DIAGNOSTIC.md` §18 laissait trois échecs ouverts sur `eval:anon`, « à trancher ». Deux venaient de
`expectWithheld`, qui exigeait que **toute** colonne soit nulle sur une ligne retenue et échouait
donc sur `out_of_corpus: false` — un marqueur orthogonal à la licence, l'appartenance au corpus se
lisant dans `quartier`, table que `anon` lit en entier. La sonde ne se contente pas de le tolérer :
elle **vérifie** qu'il vaut `false`, parce que `20260825000003` fait passer le test de licence en
premier et qu'un « hors zone » sur un millésime retenu divulguerait que la zone aurait répondu.

Le troisième, un timeout RLS, **a disparu sans que personne y touche** — remesuré à 60 845 relevés
visibles. Un défaut qui s'en va tout seul n'est pas un défaut corrigé, et §18 le dit ainsi.

### Ce qui reste

**L'issue [`#57`](https://github.com/IvandeMurard/paris-compass/issues/57) reste ouverte** : ses
trois critères sont tenus et mesurés, mais la fermer demande une autorisation explicite, comme
`#14`, `#9` et `#55` avant elle. Le point 24 n'a pas d'issue. La doctrine `authenticated` n'est pas
tranchée (`DIAGNOSTIC.md` §21).

> **Un piège de procédure, consigné dans `docs/REPRISE.md`** : `npx.cmd supabase` ne démarre plus
> sur ce poste — une stratégie de contrôle d'application bloque le binaire livré par
> `supabase@2.115.0`. Le CLI 2.98.2 déjà installé sur le `PATH` fonctionne, et c'est lui qui a posé
> la migration. Mettre à jour le CLI ramènerait le binaire bloqué.
