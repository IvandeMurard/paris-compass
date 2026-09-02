# [P1] w1-porte-publiee — Dix portes disent que le dépôt va bien, aucune que le site répond

**ID** `w1-porte-publiee` · **vague 1** · **P1**
**Dépend de** — `w1-porte-planifiee` (#71)
**Sources** — *aucune source nouvelle*

## Pourquoi

**Ce ticket n'est pas « ajouter un contrôle de plus ». C'est fermer l'angle mort dans lequel un
défaut a déjà vécu sans qu'aucune porte ne le voie.**

Le 2 septembre 2026, `https://paris-compass.lovable.app` a rendu une page blanche. Les neuf bras
de la porte planifiée étaient verts — et ils avaient raison de l'être : ils prouvent que **ce
dépôt se construit**, jamais que **ce que Lovable sert fonctionne**. Le bundle publié portait
`const zL=void 0,ob=void 0` à la place de l'URL et de la clé publiable, `createClient` levait à
l'évaluation du module, et rien n'était monté. Cause et correctif : `DIAGNOSTIC.md` §32.

La cause est corrigée à trois endroits — `.env` suivi sous exception ancrée, une garde
`prebuild`, une garde dans `src/main.tsx`. **L'angle mort, lui, ne l'était pas.** Les trois
gardes portent sur l'artefact que *ce poste* ou *ce runner* produit ; aucune ne regarde ce que
le visiteur reçoit. Un défaut de la même famille — une variante de build chez Lovable, une
publication qui ne repart pas, un `.env` régénéré autrement — repasserait invisible.

Et il resterait invisible **longtemps** : le défaut du 2 septembre n'a été trouvé ni par une
porte ni par une session, mais parce que quelqu'un a ouvert l'URL.

## Comment

Un dixième bras, `porte:publie`, joué par `.github/workflows/porte.yml` avec les autres.

Il récupère la page publiée, en extrait le bundle d'entrée sous `/assets/`, et vérifie que **la
référence du projet Supabase y est figée**. C'est exactement la valeur qui manquait, et celle
dont l'absence est toujours un défaut de ce dépôt.

Trois décisions qui font la différence entre une porte et un bruit :

- **La référence est lue dans `.env`, jamais écrite en dur.** Un changement de projet Supabase
  ne peut donc pas laisser le bras cautionner l'ancien.
- **Elle n'est jamais imprimée.** Le rapport de la porte est publié dans une issue d'un dépôt
  public ; `scripts/porte/redaction.ts` la masquerait, mais un bras qui compte sur le masquage
  est un bras qui fuitera le jour où le masquage rate.
- **Les chunks sont suivis si l'entrée ne porte rien.** Depuis le §32, `App` est un chunk séparé.
  Un bras qui ne lirait que l'entrée crierait au rouge le jour d'un changement de découpage —
  un rouge sur une coïncidence est un rouge qu'on finit par couper.

Un Lovable injoignable rend **3**, pas un rouge : leur indisponibilité n'est pas un défaut d'ici.

## Fait quand

1. `porte:publie` est joué par un workflow qui porte un `on.schedule`, donc classé `planifié` par
   `scripts/porte/arms.ts` — sinon `test` échoue, ce qui est la règle de `#71`.
2. **Les quatre codes de sortie sont démontrés**, pas supposés : 0 quand la configuration est
   dans le bundle servi, 1 quand elle n'y est dans aucun, 3 quand le site ne répond pas, et 1
   quand la page ne charge aucun module. Contre un bouchon local, jamais contre la production —
   une panne ne se provoque pas sur demande contre un site en ligne.
3. Le bras passe contre la production réelle, et la mesure est datée.
4. La référence du projet n'apparaît dans aucune sortie.

Et, comme pour `#70` et `#71` : **dire ce que la règle ne rattrape pas.** Elle vérifie que la
configuration est arrivée dans le bundle, pas que la page **s'affiche** — il y faudrait un
navigateur sans tête, écarté par décision. Elle ne dit pas non plus par quel chemin Lovable a
bâti : un vert ne prouve pas que la garde `prebuild` a tourné.
