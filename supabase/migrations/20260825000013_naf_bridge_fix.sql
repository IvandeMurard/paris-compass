-- The NAF bridge of 20260825000012 carried two invented level-18 codes. Corrected
-- against the nomenclature itself rather than against the assumption that produced them.
--
-- Measured on public.bdcom_activity, 25 August 2026 — the twelve level-18 posts are:
--
--   101 Grand magasin                 107 Bricolage-Jardinage
--   102 Alimentaire                   108 Service aux particuliers
--   103 Equipement de la personne     109 Agence
--   104 Santé-Beauté                  110 Auto-Moto
--   105 Equipement de la maison       111 Café et Restaurant
--   106 Culture et loisirs            112 Hôtel et Auberge de jeunesse
--
-- What was wrong, and it is worth naming precisely because only one of the two was inert:
--
--   101 -> the ten retail food NAF codes. **101 is Grand magasin, not Alimentaire.** This one
--         was live and wrong: it would have answered a question about department stores with
--         the survival of grocers. Alimentaire is 102.
--   114 -> 96.02A/96.02B (hairdressing, beauty). 114 does not exist in the nomenclature;
--         Santé-Beauté is 104. Inert — the join matched nothing and the function raised
--         `unknown activity niv18` — but inert for the wrong reason, and an inert wrong row
--         is one edit away from becoming a live wrong row.
--
-- 111 was correct, which is the one the w1-survie criterion exercises and the only one that
-- had actually been measured before being written. That is the whole lesson: the codes that
-- were checked were right and the codes that were assumed were wrong, in the same table, in
-- the same commit.
--
-- A migration already pushed is not rewritten; the correction is its own file, as
-- 20260825000006 was for the chantier cadence.

delete from public.activity_naf_bridge where niv18 in (101, 114);

insert into public.activity_naf_bridge (niv18, naf) values
  -- 102 Alimentaire — retail food trades, NAF division 47.1x/47.2x
  (102, '47.11B'),  -- supérettes
  (102, '47.11C'),  -- supermarchés
  (102, '47.11D'),  -- supermarchés (grande surface)
  (102, '47.11F'),  -- hypermarchés
  (102, '47.21Z'),  -- fruits et légumes
  (102, '47.22Z'),  -- viandes et produits à base de viande
  (102, '47.23Z'),  -- poissons, crustacés et mollusques
  (102, '47.24Z'),  -- pain, pâtisserie et confiserie
  (102, '47.25Z'),  -- boissons
  (102, '47.29Z'),  -- autres commerces alimentaires en magasin spécialisé
  -- 104 Santé-Beauté — personal care services only. Pharmacies (47.73Z) are deliberately
  -- absent: a pharmacy is a regulated health outlet whose survival is governed by licensing
  -- rather than by trade, and mixing it into a beauty cohort would compare two different
  -- economies under one label.
  (104, '96.02A'),  -- coiffure
  (104, '96.02B')   -- soins de beauté
on conflict (niv18, naf) do nothing;
