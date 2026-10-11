# [P1] w1-brief-appariement — brief.ts attache le mauvais numéro d'issue, et y accroche désormais un ordre d'arrêt

**ID** `w1-brief-appariement` · **vague 1** · **P1** · issue [#189](https://github.com/IvandeMurard/paris-compass/issues/189)
**Dépend de** — *rien*
**Sources** — *aucune source nouvelle*

Trouvé le 15 septembre 2026 par la **revue** de [PR #187](https://github.com/IvandeMurard/paris-compass/pull/187), puis vérifié.

## Ce qui est mesuré

`npm.cmd run brief`, contre la table dérivée qui, elle, dit vrai :

| Ticket | Ce que `brief` annonce | Le vrai |
| --- | ---: | ---: |
| `w6-contexte` | **#142** | #119 |
| `w1-observabilite` | **#81** | #72 |

## Pourquoi

`issueDuTicket` apparie sur `\b<id>\b` **n'importe où dans le titre**. Deux façons de se
tromper, les deux constatées :

- une issue qui **mentionne** le ticket lui vole sa ligne — c'est #142 pour `w6-contexte` ;
- `-` n'est pas un caractère de mot, donc `\b` **ne ferme pas un préfixe d'identifiant** :
  `w1-observabilite` matche à l'intérieur de `w1-observabilite-echappement`.

**Le dépôt a déjà corrigé exactement ça**, pour la table d'ordre, après
[#131](https://github.com/IvandeMurard/paris-compass/issues/131) : l'appariement y est **ancré
en tête de titre** (`^\[P\d\]\s+<id>\s`). `brief.ts` est resté sur l'ancienne façon.

## Pourquoi c'est devenu urgent le 15 septembre

Hier, un mauvais numéro en en-tête était un détail lisible. Depuis
[#187](https://github.com/IvandeMurard/paris-compass/pull/187), **un ordre « ARRÊTE-TOI,
l'issue est fermée » est accroché à ce numéro.** Une session peut donc recevoir l'ordre de ne
rien faire à cause de l'état d'une **autre** issue. Et l'inverse est ouvert :
[#129](https://github.com/IvandeMurard/paris-compass/issues/129) est **ouverte** et nomme
`w6-contexte` dans son titre.

La PR #187 n'a pas créé ce défaut — elle en a aggravé la conséquence.

## Comment

**Le code correct existe déjà** : `scripts/session-issues.ts`, posé par
[#176](https://github.com/IvandeMurard/paris-compass/pull/176), porte l'appariement ancré et
sert déjà `sessions` et `sessions:check`. Il faut le faire lire à `brief.ts` — un propriétaire,
trois lecteurs, au lieu de deux appariements divergents.

## Fait quand

1. `brief w6-contexte` annonce **#119**, `brief w1-observabilite` annonce **#72**.
2. **Contre-preuve jouée** : un ticket dont aucune issue ne porte l'ancre rend « inconnu »,
   jamais le numéro d'une issue qui le mentionne.
3. **Un contrôle recoupe les deux appariements** — celui de `brief` et celui de la table — et
   rougit s'ils divergent. Sans ça, le même défaut peut revenir par l'autre fichier.
4. `npm.cmd run test` et `sessions:check` restent au vert.

**Ce que ça ne rattrape pas.** L'ancre suppose que le titre de l'issue suit la convention. Une
issue de ticket mal titrée reste invisible aux deux côtés — c'est déjà vrai pour la table, et ce
ticket ne le change pas.

## Livré — 15 septembre 2026

`scripts/brief.ts` ne lit plus GitHub pour son compte : il appelle `lireIssues()` et
`issuesDuTicket()` de `scripts/session-issues.ts`, les mêmes que la table d'ordre. Un
propriétaire, trois lecteurs.

**Les quatre points du « Fait quand ».**

1. Mesuré sur le distant, le 15 septembre 2026 :

   ```
   npm.cmd run brief w6-contexte        [STOP] issue #119 est FERMEE
   npm.cmd run brief w1-observabilite   [STOP] issue #72  est FERMEE
   ```

   Et sur la population entière — 65 tickets de `docs/tickets/` contre les 117 issues du dépôt,
   remesurées le même jour — l'ancien appariement divergeait sur **deux** tickets, exactement ceux du
   tableau ci-dessus. Aucun autre, et **aucun ticket ne perd son issue** au passage à l'ancre :
   zéro « inconnu » sur les 65.

2. La contre-preuve est jouée sur une population substituée, dans `scripts/brief.test.ts` : un
   ticket qu'aucune issue n'ancre rend `{ num: "?", clos: null }` alors même qu'une issue
   **fermée** le nomme dans son titre. Elle est substituée et pas réelle pour une raison
   mesurée : sur le distant du jour, **aucun** ticket n'est dans ce cas, donc la population
   réelle ne peut pas porter cette preuve-là.

3. Le recoupement est en deux moitiés, parce que le défaut a deux façons de revenir :
   - `etatDeLIssue` (brief) et `issuesDuTicket` (table) doivent rendre le même numéro sur la
     même population, pour les 65 tickets du disque et pour les pièges du fixture ;
   - **et surtout** : aucun autre script du dépôt ne lit la population complète des issues
     (`gh issue list --state all`). C'est ce contrôle-là qui vaut, le premier étant vrai par
     construction tant que les deux côtés appellent le même propriétaire. Sa population est
     dérivée de `scripts/**` — un fichier neuf y tombe sans que personne l'inscrive.

   **Sabotage joué** sur la vraie fonction, pas sur une copie : l'ancien
   `\b<id>\b` remis dans `etatDeLIssue` fait rougir **5 des 17** tests du fichier.

4. `typecheck`, `test`, `build` et `sessions:check` verts — relevés dans la proposition.

**Ce que ça ne rattrape pas**, en plus de la limite écrite plus haut :

- Le contrôle « un seul propriétaire » repère un fichier qui **relit** la population
  (`--state all`) ; il ne verrait pas un appariement qui se trompe à partir d'une population
  reçue en argument. C'est le premier contrôle qui couvre ce cas-là, et lui est trivialement
  vrai tant que personne ne réécrit `etatDeLIssue`.
- Le brief refuse désormais quand **deux** issues portent le titre officiel d'un ticket, comme
  `sessions` depuis #176. Il ne dit toujours rien d'une issue de ticket **mal titrée** : elle
  reste invisible des deux côtés.
