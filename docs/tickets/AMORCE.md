# Amorce de session

Une session, un ticket. Coller le bloc ci-dessous en remplaçant `<ID>` et `<NUM>`.

```
Ticket <ID> (issue #<NUM>).

Lis d'abord docs/REPRISE.md, puis docs/tickets/<ID>.md, puis les sections de
docs/PLAN.md et docs/PERIMETRE.md que le ticket cite. Le "Fait quand" du ticket
est le critère d'acceptation : ne me dis pas que c'est fini avant de l'avoir
démontré, pas supposé.

Trois choses avant d'écrire quoi que ce soit :

- Les chiffres des tickets ont été rédigés sans accès en lecture au dépôt et
  quatre étaient faux. Remesure ce que tu comptes réutiliser, ne le recopie pas.
- Le ticket redit peut-être une section de PLAN.md. Si oui, dis-le et traite les
  deux comme un seul chantier — ne laisse pas deux backlogs diverger.
- git pull avant de commencer.

Termine par : ce qui est démontré, ce qui ne l'est pas, et ce que tu as laissé
de côté. Si le ticket devient faux en cours de route, arrête-toi et dis-le
plutôt que de livrer contre un critère périmé.
```

## Ce que l'amorce ne dit pas et qui vaut pour tous

`CLAUDE.md` est chargé à chaque session, donc `npm.cmd`, la pureté de `src/core/`,
`Measured<T>` et l'encadrement des loyers sont déjà connus. Inutile de les répéter.

## Trois tickets qui demandent plus que l'amorce

**`w0-provenance` (#10) — le rayon d'action le plus large.** Changer la signature de
`scoreLocation` déplace le front *et* le MCP, et les formules publiées sur
`src/pages/Methodology.tsx` doivent suivre : c'est une règle de `CLAUDE.md`. À traiter
seul, sans rien d'autre dans la même session. Ajouter à l'amorce :

```
Ce ticket touche src/core/, mcp-server/ et src/pages/Methodology.tsx ensemble.
Établis la liste complète des appelants de scoreLocation avant de modifier la
signature, et vérifie que Methodology.tsx dit encore la vérité après.
```

**`w0-fiche` (#8) — le terrain de Lovable.** Travail d'interface, donc la règle de
synchronisation s'applique en plein. Ajouter :

```
C'est du travail d'interface, que Lovable synchronise aussi. Ne rien commencer
sans git pull, pousser avant de refermer, et ne pas toucher .lovable/.
```

**`w0-cron` (#6) — les privilèges.** Le ticket demande un job à privilèges élevés.
Ajouter :

```
Ce job ne doit jamais porter la clé anon. Dis-moi où tu comptes stocker le secret
avant de l'écrire, pas après.
```

## Quel modèle

**Opus 5** pour ce qui engage une décision de conception ou traverse plusieurs couches :
`w0-provenance`, `w1-survie` (la jointure SIRENE × BDCom est l'inférence la plus difficile
du lot), `w5-entity`, `w5-entretien`, `w5-confiance-agent`, `w3-mapillary`, et tout ticket
dont le « Comment » contient un arbitrage plutôt qu'une recette.

**Sonnet 5** pour les ingestions de source, qui suivent toutes le même patron déjà écrit
dans `scripts/` : `w1-terrasses`, `w2-filosofi`, `w2-idfm`, `w4-ecoles`, `w4-meubles`,
`w4-frequentation`, `w0-plu`. Un script idempotent, une table, un contrôle de complétude.

**Opus 5 quand même** si l'ingestion pose une question de licence ou de granularité —
`w7-foncier` et `w7-inpi` en sont, malgré les apparences.
