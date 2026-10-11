# [P1] w0-hors-corpus — Un point hors corpus rendu comme un quartier sans commerces

**ID** `w0-hors-corpus` · **vague 0** · **P1**
**Dépend de** `w0-mcp-verif`
**Sources** — *aucune source nouvelle*

> **Fichier écrit rétrospectivement le 15 septembre 2026**, pour que ce ticket ait un identifiant
> comme ses cinquante-neuf voisins. Le travail est clos depuis le 25 août 2026. Le dossier
> complet — mesures, trois voies comparées, recommandation — est dans
> [`#55`](https://github.com/IvandeMurard/paris-compass/issues/55) et dans `DIAGNOSTIC.md` §16 ;
> ce fichier ne les recopie pas, il les résume et dit où lire.

## Pourquoi

Trouvé le 24 août 2026 en écrivant le contrôle de conformité du serveur MCP (`w0-mcp-verif`).

C'est le défaut §9 dans sa variante **géographique**. Les défauts 9 à 12 venaient d'une couche
retenue par licence ; celui-ci vient d'une couche absente **parce que le corpus s'arrête aux
limites de Paris**. La forme est identique — un vide lu comme un zéro — et la conséquence aussi :
un chiffre fabriqué qui porte une source.

Mesuré le 24 août contre le distant, appelant anonyme, point **(48,7 · 2,2)** — Massy, à ~18 km
du 1ᵉʳ arrondissement : `score_location` rendait `footfall: 22`, `missingReason: null`, cité
« APUR BDCom 2023 + OpenStreetMap via Overpass ». **Aucun local BDCom n'avait été lu** : les 22
venaient entièrement d'OpenStreetMap, et nommaient l'APUR comme co-source d'une contribution
nulle.

**Pourquoi les gardes existantes ne l'attrapaient pas.** Un millésime retenu fait lever la
requête ; une base injoignable fait échouer le `fetch`. Un point hors corpus fait **réussir** la
requête avec zéro ligne — donc la couche compte comme chargée, donc le score se calcule.

## Comment

Trois voies avaient été posées, et **deux sont mesurablement fausses** — c'est ce que la mesure du
24 août a établi, et c'est la partie du dossier qui vaut d'être relue :

1. **Resserrer la boîte** ne corrige rien. Le rectangle le plus serré sur les 80 quartiers
   (48,8156–48,9022 / 2,2241–2,4698) contient encore Boulogne, Levallois, Saint-Mandé et
   Montreuil — c'est-à-dire l'anneau où quelqu'un se tromperait le plus vraisemblablement.
2. **Traiter zéro ligne comme couche non chargée** détruit une information vraie. Le **bois de
   Vincennes** est dans Paris, dans le quartier `Picpus`, et porte réellement **zéro** local dans
   400 m. Cette voie le rendrait « inconnu » et casserait le contre-test « un vrai vide reste un
   vrai vide » à l'endroit précis de Paris où il se vérifie.
3. **Demander à PostGIS l'appartenance à un quartier** sépare les deux cas. C'est la seule
   définition non arbitraire de « dans le corpus », et les 80 polygones sont déjà en base.

## Doctrine

**Un vide n'est pas un zéro, et un vrai zéro n'est pas un vide.** La correction devait séparer
les deux, pas en sacrifier un pour l'autre — c'est ce qui disqualifie la voie 2, et c'est la même
règle que `Measured<T>` applique aux chiffres.

## Fait quand

Un point hors du corpus rend une absence nommée, un rayon réellement vide **dans** Paris rend un
vrai zéro, et les deux sont gardés par un invariant plutôt que par une relecture.

## Fait le 25 août 2026

Corrigé par la **voie 3**, l'appartenance PostGIS. Les deux cas sont gardés séparément, et les
deux gardes tournent à chaque passage de `eval:anon` :

- **`I19`** — un point hors du corpus est rendu comme un quartier sans commerces, via
  `compass_scoring_context_within` ;
- **`I20`** — un rayon réellement vide dans Paris se lit comme un point hors corpus.

`eval/invariants.sql` porte en plus, à `I20`, la note qui dit pourquoi la seconde moitié ne se
saute pas : corriger `I19` en traitant tout résultat vide comme une absence referait exactement
le défaut que `I20` interdit.

**Ce que ça ne rattrape pas.** L'appartenance est celle d'un quartier parisien : un point dans
Paris mais dans un rayon qui déborde des limites mélange toujours un corpus complet et un corpus
tronqué, et aucun des deux invariants ne le voit.
