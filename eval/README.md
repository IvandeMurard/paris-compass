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

## Les trois bras

| Fichier | Ce qu'il vérifie | Tolérance |
| --- | --- | --- |
| `invariants.sql` | Huit requêtes qui doivent renvoyer zéro ligne, sur **100 % de la base** | Zéro |
| `baselines/ingestion.json` | Quinze effectifs gelés au chargement | Signalé, bloquant au-delà de 1 % |
| `golden.jsonl` | Six chronologies vérifiées à la main | Zéro |

Codes de sortie, repris d'Aetherix : `0` PASS · `1` FAIL · `2` ERROR · `3` WARN.
Comptez environ une minute — deux invariants balaient les 85 418 locaux.

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
