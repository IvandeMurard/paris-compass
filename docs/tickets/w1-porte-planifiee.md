# [P1] w1-porte-planifiee — Le cerveau existe, le rythme n'existe pas : la porte ne tourne que si quelqu'un la lance

**ID** `w1-porte-planifiee` · **vague 1** · **P1**
**Dépend de** —
**Sources** — *aucune source nouvelle*

## Pourquoi

**Le protocole d'évaluation est écrit, éprouvé, et il ne tourne pas tout seul.** Vingt-quatre
invariants, vingt-quatre baselines, huit chronologies, cinq bras — dont deux qui énumèrent
depuis le catalogue au lieu de lister. C'est ce qui garantit la fiabilité du socle, et **rien
ne le déclenche** : `eval`, `eval:anon` et `verify:mcp` attendent tous qu'une main les lance.

Conséquence directe : entre deux sessions, personne ne sait si le distant est encore sain. Une
régression posée un mardi se découvre le jeudi, quand quelqu'un ouvre une session pour un autre
sujet — c'est exactement comme ça que les cinq défauts de licence de `DIAGNOSTIC.md` §9 à §12
ont été trouvés, et le sixième le sera pareil si rien ne change.

**Et le cron d'ingestion ne signale pas ses échecs.** Mesuré le 31 août : aucun `if: failure`,
aucune alerte, aucune notification dans `.github/workflows/ingestion.yml`. Un chargement qui
échoue laisse `run_by = 'schedule'` affirmer que l'automatisation fonctionne pendant que
`ingested_at` vieillit. **Une cadence silencieuse est pire qu'une cadence absente** : elle
supprime la vigilance sans fournir la garantie.

## Comment

**Dans cet ordre, et le point 3 est ce qui rend le reste durable.**

1. **Planifier la porte.** Un job qui joue `eval`, `eval:anon` et `verify:mcp` à une cadence
   décidée — et la décider par la mesure, pas par confort. `eval` coûtait 115 s le 28 août
   (#69) : cette cadence dépend de ce que `#69` conclura, donc **traiter `#69` d'abord** ou
   dimensionner en conséquence.

2. **Faire en sorte qu'un rouge atteigne quelqu'un.** Un rouge qui n'est lu par personne ne vaut
   pas mieux qu'un contrôle absent. Le plus simple qui tienne : une issue ouverte
   automatiquement, avec la sortie en corps. Le dépôt est public — attention à ce qui sort dans
   les journaux, un identifiant de base n'a rien à y faire.

   **Distinguer le rouge de la panne amont.** `verify:mcp` sait déjà le faire — un miroir
   Overpass à 429 n'est pas un défaut — et `#61` a appris la même chose à `eval:anon`. Une
   alerte qui crie sur une panne amont sera coupée en deux semaines.

3. **La règle derrière.** Un contrôle qui échoue si un bras de porte existe sans être planifié.
   Six bras dans six mois, dont un que personne ne lance, c'est le trou que `#70` vient de
   trouver côté sources — quatre cadences posées à la main, quatre sources arrivées après qui
   ne s'y sont pas inscrites. Même forme, un cran plus haut.

4. **Le cron d'ingestion signale ses échecs**, sur le même canal. C'est le complément de `#70` :
   celui-là donne une cadence aux quatre sources qui n'en ont pas, celui-ci fait que l'échec
   d'une cadence se voit.

## Doctrine

**L'amélioration continue porte sur ce que la porte détecte, jamais sur ce qu'elle tolère.**
Un système qui tourne seul et dont la métrique de succès est « rester vert » converge vers la
complaisance. Ce ticket automatise le *déclenchement* et le *signalement* ; il ne donne à
personne le droit d'ajuster un seuil pour éteindre un rouge — la règle des baselines de
`REPRISE.md` tient, avec ses trois conditions.

Afficher une date de fraîcheur n'est honnête que si le rafraîchissement est réel — et un
rafraîchissement dont l'échec est muet n'est pas réel.

## Fait quand

1. Les trois bras tournent sans intervention, à une cadence écrite et justifiée par une mesure.
2. **Un rouge produit un signal qu'un humain reçoit**, et une panne amont n'en produit pas.
   Démontré dans les deux sens : sabotage qui doit crier, panne amont simulée qui doit rester
   silencieuse.
3. Un contrôle échoue si l'on ajoute un bras sans le planifier — démontré en en ajoutant un
   pour de faux, comme `eval:sabotage` le fait pour `I23`/`I24`.
4. Un échec du cron d'ingestion se voit.

Et, comme pour `I22` et `I23` : **dire ce que la règle ne rattrape pas.** Elle vérifie qu'un
déclencheur existe, pas qu'il a réussi ni que sa cadence est la bonne.

Voir `.github/workflows/ingestion.yml`, `eval/FAILURE_MODES.md`, `#69` pour le coût de `eval`,
`#70` pour la même forme côté sources, et la direction du 31 août dans `docs/REPRISE.md`.

---

## Fait le 31 août 2026

**Aucune migration.** `.github/workflows/porte.yml` joue **huit** bras tous les jours à
07:29 UTC, derrière le verrou `concurrency` de l'ingestion. La cadence est déduite d'une
mesure du 31 août, deux passages — `eval` **306** puis **299 s**, `eval:anon` **5 s**,
`verify:mcp` **114** puis **227 s**, l'écart étant Overpass — et **non
des 115 s du ticket**, qui étaient `I1` seul avant son découpage par `#69`.

Le livrable est `scripts/porte/arms.ts` : tout script de `package.json` doit être joué par un
workflow qui porte une cadence, ou porter une raison écrite dans `scripts/porte/cadence.json`.
`npm.cmd run porte:sabotage` le démontre en trois actes, et la démonstration a aussi été jouée
sur le vrai bras — clé invalide → sortie 2 → signal ; hôte injoignable → sortie 3 → silence.

Le compte rendu en trois blocs est dans `scripts/porte/report.ts` et **`#73` le réutilise**.

**Ce que ça ne rattrape pas**, en plus de ce que le ticket annonçait :

- **Il reste une décision humaine avant le premier passage** : le dépôt ne porte que
  `DATABASE_URL`. `SUPABASE_URL` et `SUPABASE_ANON_KEY` — l'URL du projet et la clé
  *publiable* — sont à poser. Le job s'arrête en les nommant tant qu'elles manquent.
- **GitHub désactive les workflows planifiés d'un dépôt public après 60 jours sans activité.**
  Même limite que `w0-cron`, et elle vaut désormais pour la porte aussi : un dépôt qui
  s'endort perd sa cadence sans que rien ne le dise.
- **Deux scripts qui pointent le même fichier ne se distinguent pas** dans la détection par
  chemin — `verify:mcp` et `smoke:mcp`. Aujourd'hui sans conséquence, les deux workflows
  passant par `npm run`.

Le détail, les mesures et les cinq autres limites :
[`#71`](https://github.com/IvandeMurard/paris-compass/issues/71).
