# [P1] w6-dossier — Dossier exportable d'une adresse

**ID** `w6-dossier` · **vague 6** · **Q4 2026** · **P1**
**Dépend de** `w0-fiche`, `w0-provenance`
**Sources** —

## Pourquoi
C'est ce que le banquier et le franchiseur signeront. Déjà en design ; le MCP le produit déjà.

## Comment
Un fichier (PDF/JSON) depuis la fiche, pas depuis une liste. Chaque chiffre : source, licence, millésime, méthode. Pas d'export de masse.

## Doctrine
Un dossier, une adresse. Pas de bouton « tout exporter ».

## Fait quand
Depuis une fiche, télécharger un fichier dont chaque figure est re-dérivable.

Voir [`docs/PLAN-ACTION-VACANCE.md`](../PLAN-ACTION-VACANCE.md). Relit `docs/PLAN.md`, `docs/PERIMETRE.md`.

## Livré — 15 septembre 2026

**Le bouton part d'une fiche, et il n'existe nulle part ailleurs.** `ContextDossier` est rendu par
`src/pages/Context.tsx` sous le même `point &&` que le reste de la fiche ; il n'y en a aucun sur
`/carte`, aucun sur une liste de résultats, et `downloadDossier` **n'a pas de forme plurielle**.
La doctrine du ticket — un dossier, une adresse, pas de bouton « tout exporter » — tient donc dans
la structure et non dans la discipline, comme `compareAddresses` tient la borne de deux adresses.

**Le contenu est du noyau.** `src/core/dossier.ts`, pur, sans DOM et sans fetch : c'est le partage
que `docs/PLAN.md` §2.6 demande — *« le contenu … est du noyau ; le bouton, sa place et la
génération du fichier »* au front — et c'est ce qui rend le même dossier atteignable par un agent
sans passer par le navigateur. `src/lib/downloadDossier.ts` porte la moitié DOM : un `Blob`, une
ancre, **aucune dépendance ajoutée**.

### Ce que le fichier porte, et pourquoi il fallait plus que `Measured<T>`

`Measured<T>` portait déjà source, licence, millésime, méthode — quatre des cinq mots du
« Comment ». Il manquait de quoi **refaire le calcul** : la formule, ses constantes, le rayon, et
surtout l'**opérande**. Une fiche qui dit « 100/100, APUR BDCom 2023, calculé par une formule
publiée » ne laisse vérifier que la confiance. `ScoringOperands` est né de là — le compte de locaux,
les cinq comptes par famille, la distance à l'arrêt, la somme d'exposition routière — et il sort de
**la même traversée de l'index** que les scores (`scoreLocationDetailed`), jamais d'un second
comptage posé à côté.

Ligne d'un dossier réel, téléchargé rue de Bretagne le 15 septembre 2026 :

```
density  100/100   APUR BDCom 2023 · ODbL-1.0 · 2023-06 · derived
         100 × (1 − exp(−n / S))   {"S":90} sur {"n":920} · rayon 400 m
```

### La démonstration du « Fait quand »

Chrome sans tête, build local servi sur `http://localhost:4179`, `Browser.setDownloadBehavior`
vers un répertoire temporaire, **clic sur le vrai bouton**, fichier relu **sur le disque** et
chaque figure re-dérivée sans rien importer du dépôt. Le geste complet est dans
`docs/REPRISE-PIEGES.md` ; la sonde était jetable et n'est pas au dépôt, comme
`scripts/eval/sonde-w1-81.ts` avant elle.

| | clic à 0,9 s | clic après 13 s |
| --- | --- | --- |
| verdict rendu | 874 ms | 1 072 ms |
| fichier écrit | **167 ms** après le clic, 6 625 octets | **161 ms**, 6 541 octets |
| adresse | libellé de l'URL, **provenance de l'URL** | « Rue de Bretagne 75003 Paris », BAN, Licence Ouverte (Etalab 2.0) |
| `noise` | `indetermine`, **`pending: true`** | `source_injoignable` |
| figures | 6 · 5 chiffrées · 1 retenue | 6 · 5 chiffrées · 1 retenue |
| provenance incomplète | **0** | **0** |
| écarts de re-dérivation | **0** | **0** |

Les cinq chiffrées : `density` 100 sur 920 locaux, `footfall` 81, `rail` 45 sur 317,07 m,
`services` 59 sur 87/38/177/156/130, `alimentaire` 58 sur 87. Toutes re-dérivées à l'identique
depuis les seules constantes et opérandes du fichier.

**Les deux instants sont tous deux corrects et ne rendent pas le même fichier.** C'est ce qui a
fait trouver les deux défauts de `DIAGNOSTIC.md` §55, invisibles au test unitaire : le dossier
créditait la BAN d'un libellé qu'elle n'avait pas rendu, et perdait la distinction « mesure en
cours » / « source injoignable » que `#180` avait construite à l'écran. Les deux sont corrigés, et
le test qui les tient a été écrit **après** l'écran.

### Ce qui tient la livraison

- **22 tests** dans `src/core/dossier.test.ts`, dont le tour complet : chaque figure re-dérivée
  depuis un objet sorti de `JSON.parse`, la population énumérée depuis `VERDICT_AXIS_ORDER`, les
  constantes comparées à celles du noyau, un refus de verdict, une couche en vol, un axe non
  fourni. **785 sur 55 fichiers** pour la suite entière (`main` en portait 763 sur 54 : le fichier
  neuf en porte 22, et rien d'autre n'a bougé).
- **Trois sabotages joués contre ce test**, chacun restauré : constante recopiée, opérande arrondi,
  absence rendue en zéro — les trois rouges. Le deuxième était VERT avant que le gabarit passe de
  190 m à 187 m : `docs/REPRISE-PIEGES.md` porte la mesure.
- La règle est publiée sur `src/pages/Methodology.tsx`, même obligation que le verdict, la borne
  de deux adresses et la parité agent : un document qui SORT porte sa règle là où tout le monde la
  lit, pas seulement dans le module qui l'applique.

### Ce qui n'est PAS fait, et il faut le dire

- **Pas de PDF.** Le ticket écrit « (PDF/JSON) » et JSON est livré. Un générateur de PDF est une
  dépendance de plus, un avis de sécurité de plus à juger dans `scripts/porte/avis.json`, et le
  format où « re-dérivable » se vérifie par machine est celui-ci. Le jour où le PDF se décide, il
  se compose depuis ce même objet et non depuis l'écran. **Décision d'Ivan.**
- **Le dossier porte les figures DE LA FICHE, pas tout le corpus.** Ni
  `compass_address_timeline`, ni les avis BODACC, ni la suite d'activités — c'est-à-dire pas encore
  ce que le commentaire du 13 septembre sur `#33` appelait « ce qu'un banquier lira ». Depuis
  `#157` et `#169` les quatre axes porteurs lisent BDCom 2023 et le référentiel IDFM, donc le
  fichier n'est plus un instantané OpenStreetMap du jour ; il reste que mettre la chronologie sur
  la fiche est un autre ticket.
- **Aucun bras de porte n'ouvre le navigateur pour ce chemin.** `page` (le quinzième) s'arrête au
  verdict et ne clique rien. Une régression du bouton ou du téléchargement passerait donc au vert
  chaque matin ; ce qui la verrait est `npm.cmd run test`, hors ligne, qui tient le contenu mais
  pas le clic. En faire un seizième bras se discute et n'a pas été fait.
- **Aucune source nouvelle**, donc rien à ajouter à `src/services/opendata/sources.ts` : le dossier
  re-publie les quatre sources que la fiche lit déjà, et il lit le nom et la licence de la BAN
  **dans** `DATA_SOURCES` plutôt que de les retaper.
