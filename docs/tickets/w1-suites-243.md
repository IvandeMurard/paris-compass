# [P1] w1-suites-243 — Suites de la revue de #243 : test de load(), sortie d'un quartier retiré, pooler, BDCom

**ID** `w1-suites-243` · **vague 1** · **P1** · **BDCom avant décembre 2026**
**Dépend de** — #239 fusionné
**Sources** — BDCom, SIRENE stock, géographie

## Pourquoi

Suites de la revue de #243 (`w1-chargeurs-gonflement`, #239), non bloquantes. Chacune a été relevée par la revue du 6 octobre 2026 ; aucune n'a été corrigée dans #243.

1. **Tester `load()` du stock SIRENE sur une base locale.** L'« essai à blanc » de `sirene-stock.ts --dry-run` prouve une copie de la jointure (`dryRunCounts`), pas `load()` elle-même. Il faut un test de `load()` (découpage par code postal, déplacement d'un SIRET entre deux codes postaux, nettoyage final) sur une base `supabase start`.
2. **Écrire comment sortir à la main d'un quartier retiré à la source.** Depuis #243, `geography.ts` échoue et annule tout si Paris retire un quartier encore référencé, car le stock SIRENE copie le rattachement de `premise_location`, que l'échec annule à son tour. La procédure de sortie n'est écrite nulle part. Même famille : `question_tally` référence `quartier(code)`, donc un code renuméroté fait échouer l'upsert.
3. **Vérifier que le secret `DATABASE_URL` des Actions vise le port 5432** (pooler en mode session). En mode transaction (6543), la table temporaire de session et le `VACUUM` entre deux transactions de `bodacc.ts` et `sirene-stock.ts` ne tiennent pas. `.env.local` est bien sur 5432.
4. **Découper BDCom avant décembre 2026.** `npm run disque` estime son passage du 5 janvier 2027 à ~520 Mo au tableau de bord, même staging vidé.
5. **Poser la géométrie des établissements BODACC à l'insertion** plutôt que par `UPDATE` dans la transaction de l'année (proposition de la revue). Aujourd'hui, chaque partition est écrite jusqu'à trois fois avant son `VACUUM`. C'est compté dans `disque.json`, mais évitable.
6. **N'écrire que ce qui change dans le rattachement des petits chargeurs**, relevé par la revue de suivi de #243 : `attach()` de filosofi (85 410 locaux réécrits deux fois), idfm (85 410, deux fois : la clé `ON DELETE SET NULL` au vidage des stations, puis le rattachement), plu (29 338, deux fois), terrasses (23 610, deux fois) et chantiers réécrit `premise_location` à chaque passage. Ils sont comptés comme blocs dans `disque.json` depuis #243. **Filosofi et idfm d'abord** : `npm run disque` les signale à ~478 et ~476 Mo pour mars 2027, même staging vidé. Même méthode que `geography.ts` : calculer à part, un seul `UPDATE … where … is distinct from`.

## Fait quand

1. Chacun des six points est fait, ou écarté avec sa raison écrite ici.
2. `npm run disque` ne signale plus ni BDCom, ni filosofi, ni idfm pour leur prochain passage.
