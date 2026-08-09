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

**Seuil.** Une variation est signalée (`WARN`) ; elle bloque (`FAIL`) au-delà de
**1 %**, parce qu'au-delà ce n'est plus une correction de source mais un
changement de comportement du pipeline.

---

## Bras C — jeu doré, cas nommés

`eval/golden.jsonl`, une ligne par scénario, vérifié à la main. Minimum un cas
par catégorie ; les deux premiers sont les fautes réellement commises.

| Catégorie | Ce qu'elle verrouille |
| --- | --- |
| `absence_non_observee` | Une année sans relevé sort en `indetermine`, libellé nul |
| `prix_etabli` | Un prix `etabli` porte sa phrase et son adresse d'établissement |
| `siege_social` | Un avis à une adresse de siège sort en `probable` |
| `adresse_partagee` | Plusieurs locaux à l'adresse : jamais `etabli`, jamais de local désigné |
| `identifiant_reattribue` | Un `ordre` réutilisé sort en `probable` |
| `perimetre_2023` | Une absence en 2023 dit « plus un commerce », jamais « vacant » |

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
