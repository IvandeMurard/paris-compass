# Évaluation par conception

```powershell
npm.cmd run eval
```

Le contrat — ce qui compte comme mauvaise sortie et à partir de quand c'est
inacceptable — est dans [`FAILURE_MODES.md`](./FAILURE_MODES.md). **Modifier un
seuil est une décision explicite** : PR, plus une trace dans `docs/PLAN.md`.

Repris du dispositif d'Aetherix (`docs/adr/0007-evaluation-by-design.md`), avec
une adaptation qui n'est pas cosmétique et qui est expliquée dans `FAILURE_MODES.md`.

---

## Le contrat en une phrase

> Aucune modification de `supabase/migrations/`, `scripts/ingest/`, `src/core/`
> ou `eval/` ne passe sans que les invariants, les baselines et le jeu doré
> soient au vert.

## Les quatre bras

| Fichier | Ce qu'il vérifie | Tolérance |
| --- | --- | --- |
| `invariants.sql` | **Vingt-huit** requêtes, dont vingt-sept doivent renvoyer zéro ligne — la vingt-huitième est un recensement, voir plus bas | Zéro |
| `baselines/ingestion.json` | **Vingt-quatre** effectifs gelés au chargement | Signalé, bloquant au-delà de 1 % |
| `golden.jsonl` | **Huit** chronologies vérifiées à la main | Zéro |
| `../scripts/eval/anon-http.ts` | La règle de licence **par HTTP, sans identifiants de base** | Zéro |

Le quatrième bras se lance à part, et contre un projet hébergé uniquement :

```powershell
npm.cmd run eval:anon
```

Il existe parce que les trois autres tournent tous sur une connexion privilégiée.
Le bras A fait dire `anon` à cette connexion en posant `request.jwt.claims`, mais
n'émet jamais `set local role anon` : il éprouve le test que les fonctions font
sur le *claim*, ni la politique RLS en dessous, ni la sérialisation PostgREST de
la colonne `withheld`. Le bras D ne détient que la clé publiable et l'URL du
projet — ce que le navigateur embarque, et rien de plus.

Codes de sortie, repris d'Aetherix : `0` PASS · `1` FAIL · `2` ERROR · `3` WARN.
Comptez environ une minute contre la base locale, et **près de trois contre le
distant** — mesuré le 24 août : I1, I2 et I7 balaient les 85 418 locaux et pèsent
à eux seuls deux minutes et demie à travers le pooler.

**Vingt-cinq invariants portent sur ce que les fonctions renvoient ; trois
portent sur ce qu'elles sont.** I18 et I23 lisent `pg_proc` et non des données.
Le bras A ne posant jamais `set local role`, RLS ne s'applique jamais pendant
qu'il tourne : un défaut né du désaccord entre RLS et le test de claim ne peut
être attrapé que sur la structure. I18 exige `SECURITY DEFINER` d'une fonction
portant une colonne `observed` ; **I23 généralise au vrai critère** — lire une
table dont une politique RLS peut retirer des lignes — et exige en plus une
colonne `withheld`. Voir `FAILURE_MODES.md`.

**I24 est le seul contrôle de cette porte qui n'a pas la forme des autres.** Ses
lignes sont une *population*, pas des violations : il énumère depuis `pg_proc`
les fonctions auxquelles la règle de licence s'applique, et le lanceur échoue sur
tout nom qu'aucun invariant `-- @as anon` n'appelle. C'est le seul contrôle qui
croise le catalogue avec ce fichier-ci, ce qu'aucune requête SQL ne peut faire :
`invariants.sql` est sur la machine du développeur, pas sur le serveur. Il échoue
aussi si la population est **vide** — un recensement qui ne trouve plus rien a
cessé de fonctionner.

Sa preuve se rejoue :

```powershell
npm.cmd run eval:sabotage
```

Le script crée une sixième fonction fautive dans une transaction annulée, rejoue
I23 et I24 contre elle — les deux doivent passer au rouge — puis annule et les
rejoue au propre. Il importe le verdict de `../scripts/eval/census.ts`, celui
qu'utilise la porte : une preuve qui rejoue une copie du contrôle ne prouve rien
sur le contrôle. Détail et limites dans `../DIAGNOSTIC.md` §23.

> Ce fichier annonçait **dix-huit** invariants jusqu'au 25 août, alors que I19 à
> I22 existaient déjà. Un compte recopié plutôt que remesuré, exactement ce que
> `CLAUDE.md` interdit — remesuré ici par `grep -c '^-- @invariant '`.

## Prérequis

Une base locale chargée : `npx.cmd supabase start`, puis
`npx.cmd tsx scripts/ingest/bdcom.ts`, `geography.ts` et `bodacc.ts`. La porte
lit `DATABASE_URL` si elle est définie, sinon la base locale.

## Ce que la porte a déjà attrapé

Dès sa première exécution, l'invariant I7 a signalé une cession marquée
« établi ». La fonction avait raison et **c'est l'invariant qui était faux** : il
regardait n'importe quel avis de l'adresse au lieu de celui qui avait produit la
ligne. Le correctif n'a pas été d'assouplir la règle mais d'ajouter `source_ref`
à la chronologie — une ligne qui ne peut pas nommer son enregistrement d'origine
ne peut pas être vérifiée exactement. Migration `20260809000005`.

## Ajouter un cas

Une ligne dans `golden.jsonl`, avec un champ `why` qui dit **ce que le cas
verrouille** — pas ce qu'il teste. Seuls les champs nommés dans `expect` sont
comparés ; les autres restent libres, pour qu'un cas ne casse pas au premier
ajout de colonne.

Un cas doit venir d'une faute réelle ou d'une réserve documentée. Les deux
premiers viennent des deux erreurs du 9 août 2026.
