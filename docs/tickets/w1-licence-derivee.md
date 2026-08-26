# [P1] w1-licence-derivee — Un taux dérivé de deux millésimes ne peut pas citer la licence du plus permissif

**ID** `w1-licence-derivee` · **vague 1** · **P1**
**Dépend de** `w0-appelant` — pas techniquement, mais celui-là décide de la portée de celui-ci
**Bloque** rien
**Sources** — *aucune source nouvelle*

## Pourquoi

`compass_survival_by_trade` calcule le volet BDCom sur **deux** millésimes : la cohorte de départ
et le millésime d'arrivée. Sur la branche retenue, elle cite la licence de la **cohorte**, ce qui
est juste. Sur la branche divulguée, elle cite celle du millésime d'**arrivée** :

```sql
(select v.licence from public.bdcom_vintage v where v.id = v_end_id)
```

**Mesuré le 25 août 2026 sur `dbefhvmyfmmhjeetdddu`**, Halles (48,86229 / 2,34490), niv18 111
« Café et Restaurant », appelant privilégié :

| Colonne | Valeur |
| --- | --- |
| `cohort_n` / `survived_n` / `survival_rate` | 310 · 268 · **86,5 %** |
| `period_start` → `period_end` | **2017** → 2023 |
| `licence` | **`ODbL-1.0`** |

Or 2017 porte `licence = 'custom'` et `publicly_redistributable = false` — c'est le motif même de
la retenue de la branche d'à côté. **Le chiffre dérive des deux millésimes ; l'étiquette ne nomme
que le plus permissif.** Un consommateur qui republie « 86,5 %, ODbL-1.0 » attache une licence
ouverte à un résultat dont la moitié vient d'un millésime dont la licence n'a pas été lue.

**Famille du point 13** — « une licence affirmée sur des données qui n'en relèvent pas » — dans sa
variante *dérivation* : là où `scoreLocation` estampillait une couche entière, celle-ci estampille
un agrégat de deux sources de licences différentes.

**Portée, et elle dépend de `w0-appelant`.** Un appelant `anon` ne voit jamais cette ligne : elle
est retenue, et c'est la branche qui cite la bonne licence. Le défaut n'existe donc que pour les
appelants privilégiés et `authenticated` — c'est-à-dire exactement ceux qui pourraient republier.
Si `w0-appelant` retire le privilège à `authenticated`, ce défaut ne concerne plus que les
exploitants de Compass, qui connaissent déjà la licence de 2017 : il reste à corriger, il cesse
d'être une fausse déclaration servie à un tiers. **Aucun consommateur expédié ne lit cette colonne
aujourd'hui** — `src/i18n/survivalText.ts` rend le texte, pas la licence.

## Comment

1. **Citer la licence la plus restrictive** des millésimes dont le chiffre dérive. Avec deux
   valeurs — `custom` et `ODbL-1.0` — la règle se pose sans inventer d'ordre : *si l'un des
   millésimes utilisés n'est pas `publicly_redistributable`, c'est sa licence qui est citée.*
   Migration, sans changement de signature.

2. **La règle derrière**, sur le patron de `I22` et `I23` : un invariant qui échoue si une ligne
   dont la période enjambe des millésimes de licences différentes cite la plus permissive.

3. **Vérifier s'il y a d'autres dérivations dans ce cas.** `compass_survival_by_trade` est la seule
   fonction connue qui compose deux millésimes en un chiffre — à recouper depuis le catalogue
   plutôt que de mémoire, comme l'a fait `w0-retenue`.

## Doctrine

Un chiffre affiché porte sa source — et sa source, quand il y en a deux, est la plus contraignante
des deux. Une licence fausse est pire qu'une licence absente : elle autorise une redistribution que
personne n'a autorisée.

## Fait quand

1. Le volet BDCom des Halles, niv18 111, appelant privilégié, cite `custom` et non `ODbL-1.0` —
   mesuré, pas supposé.
2. Une ligne dont les deux millésimes sont redistribuables cite toujours la bonne licence : le
   contre-test, sans lequel la correction pourrait tout étiqueter `custom`.
3. L'invariant échoue si l'on remet la licence du millésime d'arrivée — éprouvé par sabotage dans
   une transaction annulée.

Et : **dire ce que la règle ne rattrape pas.**

### Ce qui est explicitement hors périmètre

Inventer un ordre entre licences dans le schéma. Avec deux valeurs, « non redistribuable l'emporte »
suffit et se lit ; une table d'ordre serait une abstraction sans usage, à tenir à jour pour rien.

Retenir la ligne à l'appelant privilégié. Le problème est l'étiquette, pas la divulgation.

> **Un écart de documentation, trouvé au même endroit et à corriger avec.** Le commentaire de
> `20260825000012` écrit qu'un métier absent du pont NAF ne produit « aucune ligne SIRENE ». Mesuré
> en retirant le métier 111 du pont dans une transaction annulée : **la ligne sort**, chiffres nuls
> et `evidence` explicite — « Aucune correspondance NAF n'est posée […] ». Le comportement est
> meilleur que l'annonce ; c'est le commentaire qui est faux. Une migration posée ne se réécrit pas :
> la correction vit dans celle de ce ticket.

Voir `DIAGNOSTIC.md` §24 pour la mesure, §13 pour l'occurrence précédente de la même famille.
