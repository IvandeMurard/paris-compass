# Veille produit et technique

Ce que des tiers ont montré, ce qui en est repris, et **ce qui est écarté avec sa raison**.
**Ne se lit pas en début de session.** S'y vient quand on ouvre un chantier que l'une des
entrées concerne — le titre de section est l'unité utile.

Deux exigences, les mêmes qu'ailleurs ici. **Un chiffre porte sa source et sa date** : une
slide n'est pas une mesure, et une entrée qui ne dit pas d'où vient un nombre ne vaut rien.
**Une entrée dit ce qui est écarté**, pas seulement ce qui est retenu : une veille qui
n'accumule que des bonnes idées est un catalogue d'envies.

---

## Meetup ClickHouse, Station F, septembre 2026

Noté le 17 septembre 2026, d'après les photos de slides prises en séance et les notes de
la session. **Trois intervenants, un seul vendeur** : Armature, Langfuse et Flowlines
présentaient à un meetup ClickHouse, et Langfuse *appartient* à ClickHouse depuis janvier.
Aucun n'avait intérêt à montrer le cas où ClickHouse était superflu. Les entrées ci-dessous
en tiennent compte.

### Le fait de marché

**ClickHouse a racheté Langfuse le 16 janvier 2026**, avec une Série D de 400 M$ portant la
valorisation à 15 Md$. Sources : [annonce Orrick](https://www.orrick.com/en/News/2026/01/Open-source-LLM-Observability-Langfuse-Acquired-by-ClickHouse-Inc),
[billet Langfuse](https://langfuse.com/blog/joining-clickhouse), [InfoWorld](https://www.infoworld.com/article/4118621/clickhouse-buys-langfuse-as-data-platforms-race-to-own-the-ai-feedback-loop.html).
Le cœur Langfuse reste MIT et auto-hébergeable.

Conséquence pour nous : **la seule façon d'utiliser ClickHouse ici serait de ne pas
l'installer**, en passant par Langfuse qui l'encapsule. La question « adopter ClickHouse »
ne se pose donc jamais directement.

*(La même annonce mentionne un lancement Postgres. Non vérifié : `clickhouse.com` est bloqué
par le proxy sortant de la session du 17 septembre. À rouvrir avant d'en tirer quoi que ce
soit.)*

### Le seuil d'adoption, donné par le vendeur

Flowlines a affiché les quatre conditions qui, chez eux, rendent une base colonne nécessaire :
**24 M+ messages**, haute cardinalité (users × sessions × tools × intents), requêtes
concurrentes « every customer, every screen », et latence subie « someone is waiting on the
page ».

C'est le meilleur test de falsification disponible, et **Compass échoue sur les quatre** :
environ 400 k lignes métier au 31 août 2026 (`docs/REPRISE.md`), un seul écran, aucun client,
et un trafic que la migration `20260905000001` décrit comme nul. Aetherix aussi : 0 utilisateur
réel (`llms.txt` du dépôt hospitality).

**La lecture critique, et c'est elle qu'il faut retenir.** À 24 M de lignes, Postgres tient
encore. Ce qui force une base colonne dans leur cas n'est pas la première colonne de la slide
mais les deux dernières — la concurrence multipliée par une latence subie par un humain.
La slide vend le volume parce que le volume se vend. **Le seuil n'est donc pas un nombre de
lignes, c'est un nombre de gens qui attendent devant un écran.**

**Ce que ça ne rattrape pas** : je n'ai trouvé aucune trace publique de Flowlines au
17 septembre 2026 — ni site, ni levée. Le « 24 M+ » n'est recoupé par rien.

### Armature — la table d'atterrissage qui n'écrit rien

[Armature](https://armature.tech/) (YC 2026, 3 personnes, SF) vend de l'analytics MCP et un
service de découvrabilité par les agents. Leur chaîne de dépollution, telle que montrée :

1. le SDK retire les secrets connus **dans le processus du client**, avant émission ;
2. les événements arrivent par lots ;
3. côté ClickHouse : table d'atterrissage `Null` — **rien n'est écrit sur disque** —, des vues
   matérialisées qui rejouent les mêmes détecteurs sur chaque lot, puis des tables propres qui
   portent les événements, les sessions, **et un décompte de ce qui a été retiré**.

Le moteur `Null` jette l'insert mais déclenche quand même les vues attachées : c'est un
primitive documenté, pas un bricolage ([doc ClickHouse](https://clickhouse.com/docs/engines/table-engines/special/null)).

La phrase qui porte tout est en petit sur la slide : *« If a customer runs an old SDK, the
views still strip. »* La deuxième passe **ne dépend pas de la bonne conduite de l'appelant**.
C'est exactement ce que CLAUDE.md exige d'un correctif — survivre à un rechargement, protéger
un consommateur qui n'existe pas encore.

**Ce qui n'est pas repris, et c'est le principal.** Compass n'a pas ce problème : `question_tally`
ne nettoie pas une ligne brute, **elle n'a aucune colonne capable de porter une coordonnée**, et
`quartier_code` est une clé étrangère vers 80 polygones (`20260905000001`). Armature dépollue ;
ici il n'y a pas de contenant. Une convergence indépendante avec `#72`, arrivée après lui.

**Ce qui est repris** : rien dans le code. La convergence elle-même, comme argument, dans un
écrit public — en nommant la différence, pas en la gommant.

**Le SDK est lisible et ne s'installe pas.** `armature-tech/mcp-analytics`, Apache 2.0,
TypeScript. Une idée y mérite le détour : il injecte un champ `telemetry` optionnel dans le
schéma des outils, pour que l'agent **déclare** son intention au lieu qu'on l'infère.
Trois raisons de ne pas le monter dans `mcp-server/` : un champ libre rempli par un agent est
non borné et `question_tally` refuse ça par construction ; il construit un client sortant, donc
`#81` exige un verdict écrit ; et une dépendance neuve passe par `#115`.

### Armature — « nommé n'est pas choisi »

Sur des dizaines de milliers d'exécutions d'agents de code sur 50+ dépôts figés et versionnés :
Datadog nommé 302 fois, choisi 18 ; Supabase 295 / 40 ; Mixpanel 222 / 5 ; Railway 189 / 11.
Et un second constat : la part de Vercel dans les choix de bac à sable serait passée de 8 % à
61 % la semaine d'une sortie de modèle, mêmes dépôts et mêmes prompts.

Le premier tableau porte ses deux dénombrements et vaut quelque chose. Le second est une
anecdote : une semaine, aucun `n` par cellule, aucun intervalle.

**Ce qui est repris, et c'est le trou que ça révèle** : `verify:mcp` vérifie que les six outils
**répondent**. Rien ne vérifie qu'un agent les **choisit** face à une question parisienne où ils
seraient pertinents. Publier `paris-compass-mcp` sur npm ne fait pas qu'on s'en serve.

**Corollaire daté** : une mesure d'évaluation agentique **périme à la sortie de modèle
suivante**. Elle porte donc sa date *et* l'identifiant du modèle, sans quoi elle ment.
C'est la règle du chiffre daté, étendue.

### Langfuse — « Failure is a judgment, not a code »

La boucle montrée : `Trace` → `Monitor` (tableaux de bord, juge LLM, retours) → `Build datasets`
→ `Experiment` → `Evaluate` (juges, évals maison, annotation) → `Deploy`, et retour. Les deux
premières étapes en ligne, les trois suivantes hors ligne. Sur une trace : latence, coût,
tokens, spans imbriqués, et des **scores nommés** — `Answer quality: 0.78`, `Policy compliant`,
`Resolution` — annotables à la main et versables dans un jeu de données.

La phrase entre en tension apparente avec la doctrine de la porte — *« Le rapport ne lit que le
code de sortie, et jamais le texte »*. **La tension n'est qu'apparente, et la résolution est déjà
écrite dans les deux dépôts** : `npm.cmd run page` rend « un verdict, un refus nommé, ou rouge »,
et l'`EVAL_GATE.md` d'Aetherix fait porter au code de sortie une régression de plus de 3 points
ou une couverture sous 60 %. Dans les deux cas un jugement est **réduit à un seuil écrit**, et
c'est le seuil qui produit le code. C'est la forme que doit prendre le bras « choisi » ci-dessus :
N exécutions, un taux, un seuil daté.

**Ce qui manque vraiment, et c'est plus étroit que ce que la présentation suggère** : pas la
notion de jugement — les deux dépôts l'ont —, mais le **`n` par cas**. Un système non
déterministe évalué en un passage mesure autant le tirage que le système.

**Pour Aetherix** : ne pas migrer depuis Logfire pour migrer — Logfire est de Pydantic et le
nœud est FastAPI + Pydantic v2. Deux critères seulement peuvent trancher : le cœur Langfuse est
MIT et auto-hébergeable sans limite quand l'auto-hébergement Logfire est sur le plan Enterprise
([comparatif](https://www.braintrust.dev/articles/best-self-hosted-ai-evals-tools-2026)) ; et
Langfuse ingère OTLP, donc les deux peuvent recevoir les mêmes traces — le coût d'essai est
faible et le choix n'est pas exclusif.

**Ce que Langfuse ne fait pas** : aucune famille de juges de première partie avec benchmarks
publiés ; les métriques de trajectoire (`Tool Correctness`, `Plan Adherence`) sont des scorers
à écrire soi-même.

### Flowlines et Anima — écarté, et pourquoi

Flowlines propose de transformer les interactions brutes en signaux analysables **sur toute la
population**, l'exemple donné étant de détecter un départ client avant qu'il arrive.

Appliqué au nœud invité d'Aetherix, **c'est écarté**, pour trois raisons de nature différente :

1. **La population n'est pas la même.** Chez eux, un « customer » est un compte SaaS. Chez Anima,
   ce serait un client d'hôtel, donc une personne physique. Prédire le comportement d'une personne
   à partir de ses interactions est du profilage, pas de l'analytics produit.
2. **La porte existe déjà et elle dit non.** Anima est `Synthetic PoC`, **DPIA-gated**, jamais
   exécuté sur un vrai client. Monter une capacité de profilage comportemental avant que la
   porte soit franchie, c'est franchir la porte par l'outillage.
3. **Il n'y a rien à analyser.** Aucune donnée réelle. Des signaux comportementaux calculés sur
   des données fabriquées sont des signaux fabriqués.

**Ce qui est vrai dans l'intuition**, et qui mérite d'être gardé : l'objet légitime d'une
analyse de population ici n'est pas le client de l'hôtel, c'est **la session de l'agent** — quels
outils échouent, quelles intentions cassent une conversation. C'est le cadre d'Armature et de
Langfuse, pas celui de Flowlines.

### Armature et Anima — retenu, avec une réserve qui décide de tout

À l'inverse, la chaîne de dépollution d'Armature est **le seul patron de ce meetup qui
s'applique vraiment à Anima**, et pour une raison précise : Compass peut refuser d'avoir un
contenant parce qu'il reçoit des coordonnées et des rayons, entrées bornées. Anima reçoit de
la **conversation**, entrée arbitraire. Quand on ne peut pas refuser le contenant, il reste la
dépollution — et le patron à deux passes est la bonne forme, parce qu'il donne une réponse
structurelle à « et si le premier filtre échoue ».

Le décompte de ce qui a été retiré est la deuxième moitié : il transforme une promesse en
mesure, ce qu'une analyse d'impact peut lire.

**La réserve, et elle est décisive.** Armature retire des **secrets** — clés d'API, jetons :
entropie élevée, forme reconnaissable, détection à haute confiance. Anima devrait retirer des
**données personnelles** — un nom, une allergie, un numéro de chambre, une préférence. « Madame
Dupont est allergique aux fruits de mer » n'a ni entropie ni forme. **Le patron se transpose,
les détecteurs non.** Reprendre l'architecture sans écrire cette limite ferait *paraître* Anima
plus sûr sans qu'il le soit — exactement l'échec que le `CLAUDE.md` du dépôt hospitality nomme :
une phrase ajoutée ne relève pas un label.

---

## Ce qui reste à faire, par ordre de rapport sur effort

1. **Le bras « nommé n'est pas choisi »** pour `paris-compass-mcp`, bâti comme `page` : N
   exécutions, taux de sélection, seuil daté portant le code de sortie. Porte un modèle et une
   date, sans quoi il ment au passage suivant.
2. **Langfuse en double de Logfire sur Aetherix**, par OTLP, pour le seul `n` par cas. Réversible,
   ne remplace rien.
3. **Le compteur de sessions vers artefact** — la slide 4 d'Armature, sans base : les transcripts
   sont déjà des fichiers.
