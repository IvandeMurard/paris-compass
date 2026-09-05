# [P1] w1-observabilite-echappement — La porte se compte elle-même, et un bras neuf qui l'oublierait ne laisserait aucune trace

**ID** `w1-observabilite-echappement` · **vague 1** · **P1**
**Dépend de** `w1-observabilite` (#72), fait
**Sources** — *aucune source nouvelle*

## Pourquoi

**`#72` a trouvé le défaut en le provoquant : la porte se comptait elle-même.** Dix seaux sur un
produit sans trafic, tous à Châtelet — c'est-à-dire le quartier qu'on aurait cru le plus
demandé, alors que personne ne l'avait demandé. `eval:anon` et `verify:mcp` passent par
PostgREST avec la vraie clé publiable et **commitent**.

L'échappement existe et il est déclaratif : l'en-tête `x-compass-observabilite: off`, posé dans
`scripts/eval/anon-http.ts` et, pour le serveur MCP, via `COMPASS_OBSERVABILITE=off` que
`verify.ts` place dans l'environnement du processus fils.

**Le problème est ce qui arrive au douzième bras.** Un bras neuf qui atteindrait PostgREST sans
poser l'en-tête se compterait, et le rapport de `#72` le dit sans détour : *un appel non
journalisé ne laisse par définition aucune trace, donc aucun invariant ne peut voir cette
absence.*

C'est exact **au moment de l'exécution**, et c'est là que le raisonnement s'arrête trop tôt.
L'absence d'écriture est invisible ; **l'absence de déclaration ne l'est pas.** Le fichier qui
appelle PostgREST est sur le disque, et il porte ou ne porte pas l'échappement. C'est
exactement la forme de `scripts/porte/arms.ts` — qui énumère les scripts et exige une cadence —
et de `catalogue.json`, qui énumère les sources et exige une sonde. Quatrième application de la
même règle, et probablement la dernière de cette famille.

**Pourquoi ça compte plus qu'il n'y paraît.** Un journal pollué par la porte ne se lit pas comme
une panne : il se lit comme du trafic. Le jour où `compass_question_summary()` servira à
décider quelle source brancher — ce pour quoi `#72` existe — une pollution silencieuse ferait
choisir la source qui répond à une question que personne n'a posée. C'est le loyer fabriqué,
sous sa forme la plus retorse : un chiffre qui a l'air mesuré parce qu'il l'est, mais qui mesure
l'observateur.

## Comment

1. **Établir la population, depuis le disque et non de mémoire.** Quels scripts atteignent
   PostgREST avec la clé publiable ? `#72` dit que `scripts/eval/anon-http.ts` est « le point
   unique par lequel ce bras passe » — vérifier que c'est encore vrai, et pour les autres bras
   aussi. Si la population n'est pas dérivable proprement, le dire : une énumération approximative
   vaut moins qu'un refus documenté.

2. **Exiger l'échappement, ou une raison écrite.** Un script de la population qui ne pose pas
   l'en-tête fait échouer `test`, sur le patron de `arms.ts` et de `catalogue.json`. Une
   exception se déclare avec son motif, jamais par omission.

3. **Le démontrer par sabotage**, dans l'acte qui va bien de `eval:sabotage` : un bras factice
   qui atteint PostgREST sans l'en-tête doit faire rougir, et le retrait du sabotage doit
   reverdir.

## Doctrine

Énumérer, pas lister. C'est la quatrième fois — après les fonctions de retenue (`I23`/`I24`),
les scripts (`arms.ts`), les sources (`cadence.json`) et le catalogue (`catalogue.json`).

Un contrôle qui existe sans être appelé n'existe pas ; un échappement qui existe sans être exigé
non plus.

## Fait quand

1. La population des scripts atteignant PostgREST est **dérivée** du dépôt, pas tenue à la main.
2. Un script de cette population sans échappement ni raison écrite fait échouer `test`.
3. Démontré par sabotage, dans les deux sens.
4. Le journal est vérifié vide de seaux imputables à la porte — ou, s'il en porte, ils sont
   nommés et datés avant d'être purgés.

**Dire ce que ça ne rattrape pas**, et ici la limite est nette : la règle vérifie qu'un fichier
**déclare** l'échappement, pas qu'il l'**applique** à chaque appel. Un script qui poserait
l'en-tête sur un client et pas sur un second passerait. Et un appel émis depuis ailleurs que le
dépôt — un test manuel, un `curl` — n'est vu par rien.

Voir `#72` pour la mesure d'origine, `scripts/porte/arms.ts` et `scripts/porte/catalogue.ts`
pour le patron, et la direction du 31 août dans `docs/REPRISE.md`.
