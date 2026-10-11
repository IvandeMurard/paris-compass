-- La contrainte de finitude que `meuble_autorisation.geom` n'avait pas — w4-meubles (#27).
--
-- POURQUOI UNE MIGRATION NEUVE PLUTÔT QU'UNE CORRECTION DE 20260908000002 : celle-ci est posée
-- depuis le 10 septembre 2026 et le ledger en garde le texte du jour. La réécrire divergerait de
-- lui pour toujours — c'est le geste qui a produit `#83`, deux fois le 25 août.
--
-- CE QUE `I42` A MESURÉ, le 10 septembre 2026, immédiatement après la pose :
--
--   FAIL  I42 — public.meuble_autorisation.geom : aucune contrainte CHECK validée
--               n'interdit le non-fini sur cette colonne
--
-- Troisième fois que cette colonne manque à l'appel sur une table neuve — `idfm_station` le
-- 7 septembre (20260907000003), `filosofi_grid_200m` le 8 (20260908000001), celle-ci le 10.
-- L'invariant les a attrapées toutes les trois, ce qui est exactement son travail ; mais une
-- règle qu'on redécouvre à chaque table neuve est une règle que le modèle de migration devrait
-- porter, et ce constat vaut plus que le correctif. Il est consigné dans `DIAGNOSTIC.md`.
--
-- L'EXPRESSION TESTE LE WKT ET NON `ST_X`/`ST_Y`, pour la raison écrite dans 20260905000006 :
-- en Postgres `NaN = NaN` est VRAI, donc le test IEEE ne rend aucune ligne sur une table qui en
-- porte — c'est ce qui avait laissé passer quinze locaux à `POINT(NaN NaN)` (`#68`). `~*`
-- attrape `NaN` comme `Infinity`, et aucun nom de type WKT ne contient « nan » ni « inf ».
--
-- CE QUE ÇA NE RATTRAPE PAS : la contrainte garde ce qui ENTRE dans la colonne, jamais ce que
-- la source publie. Une autorisation géocodée au centroïde de l'arrondissement porte un point
-- parfaitement fini et parfaitement faux ; c'est au chargeur de le refuser, pas ici.

alter table public.meuble_autorisation add constraint meuble_autorisation_geom_fini
  check (geom is null or extensions.ST_AsText(geom) !~* '(nan|inf)');

comment on constraint meuble_autorisation_geom_fini on public.meuble_autorisation is
  'Interdit NaN et Infinity dans la géométrie — I42. Teste le WKT parce que NaN = NaN est vrai '
  'en Postgres et qu''un test IEEE ne verrait rien. Posée le 10 septembre 2026 par '
  '20260910000004, après que I42 eut trouvé la colonne sans garde.';
