# [P1] w1-parite-refus — La parité est verte sur un refus que le point rend impossible

**ID** `w1-parite-refus` · **vague 1** · **P1**
**Dépend de** `w6-amenites-corpus`
**Sources** — *aucune source nouvelle*

## Pourquoi

**Mesuré le 15 septembre 2026, deux passages de `npm.cmd run verify:mcp` à vingt minutes
d'écart, sur le même point :**

| Passage | `V1` | Ce que l'agent a reçu |
| --- | --- | --- |
| Premier | **ok** | `kind=refus` — « le tissu commercial : source injoignable » |
| Second | **ok** | `kind=compose` — « Tissu commercial dense, passage soutenu… » |

Les deux passages sortent en **0**. Le bras ne voit pas la différence.

**Or le point rend le refus impossible.** `mcp-server/src/verify.ts` le déclare lui-même :

```ts
/** Montorgueil — dense commercial centre, inside the BDCom corpus. */
const MONTORGUEIL = { lat: 48.8657, lng: 2.3459 }
```

Un refus sur `density/source_injoignable` à Montorgueil n'est donc **jamais** une réponse : c'est
toujours une panne de lecture du corpus. La déclaration existe déjà dans le fichier ; `V1` et
`V2` ne s'en servent pas.

**Ce que ça laisse passer.** La promesse centrale du produit — *« la même réponse, pour un
agent »* — peut être fausse en production pendant que le bras reste vert. C'est exactement la
forme des trois défauts d'instrument de cette semaine (`#132`, `#133`, `porte:publie`) : un
contrôle vert sur les **deux** branches d'une alternative dont une seule est correcte ici.

## Comment

`V1` et `V2` connaissent déjà le point qu'ils interrogent. Il leur manque d'en tirer la
conséquence : à un point déclaré dense et dans le corpus, un `refus` porté par
`source_injoignable` n'est pas `ok`.

Le harnais a déjà l'état qu'il faut — `type Status = "ok" | "fail" | "outage" | "defaut"`. Un
refus dû à une source injoignable est une **panne amont** (`outage`), pas un échec : c'est la
distinction que `CLAUDE.md` impose, et elle se décide dans le bras, jamais dans le rapport. Ce
qui doit cesser, c'est le `ok`.

**Ce qu'il ne faut surtout pas faire.** Ne pas exiger `compose` partout : `OUTSIDE_CORPUS`
(Boulogne) et `TRUE_EMPTY` (bois de Vincennes) sont dans le fichier précisément pour que le refus
et le vrai zéro restent des réponses légitimes. La règle vise **le point déclaré dense**, pas la
famille.

## Doctrine

**Un contrôle qui accepte les deux branches d'une alternative ne garde aucune des deux.** Ici la
branche correcte dépend du point, et le point est déjà écrit — donc la règle se dérive de la
déclaration au lieu de s'ajouter à côté d'elle.

## Fait quand

1. **À `MONTORGUEIL`, un `kind=refus` porté par `source_injoignable` ne sort plus `ok`** — il
   sort `outage`, et le relevé nomme la couche qui a manqué.
2. **Contre-preuve jouée** : le relevé du premier passage du 15 septembre — refus sur
   `density/source_injoignable` — doit produire ce classement. Rejouée hors ligne si la panne ne
   se représente pas, jamais attendue.
3. **Contre-preuve inverse** : un refus à `OUTSIDE_CORPUS` et un vrai zéro à `TRUE_EMPTY`
   restent **verts**. Une règle qui les rougirait aurait détruit ce que `w0-hors-corpus` a établi.
4. `npm.cmd run verify:mcp` passe sur un corpus joignable.

**Ce que ça ne rattrape pas.** Le bras interroge **un** point dense : une panne de lecture du
corpus qui n'affecterait pas Montorgueil reste invisible. Et il ne mesure pas une **fréquence** —
il dira qu'une lecture a échoué à cet instant, jamais qu'elle échoue une fois sur deux, ce qui
est pourtant ce qui a été observé le 15 septembre.

## Hors périmètre

Pas de nouveau bras, pas de reprise de la famille `PARITE` au-delà de ce classement, pas de
changement du serveur MCP. Le produit fonctionne : ce ticket garde une promesse, il ne la crée
pas.

Voir [`w6-amenites-corpus.md`](./w6-amenites-corpus.md) et `mcp-server/src/verify.ts`.
