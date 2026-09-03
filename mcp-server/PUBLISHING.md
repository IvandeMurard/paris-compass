# Publier le serveur MCP — la suite exacte, sur ce poste

Windows + PowerShell. **Toujours `npm.cmd`, jamais `npm`** : la politique d'exécution bloque
`npm.ps1` (`CLAUDE.md`). Et le `!` qu'on voit parfois devant une commande est un préfixe de
Claude Code, **pas de PowerShell** — dans un vrai terminal, il fait une erreur de syntaxe.

Deux registres, dans cet ordre, et le second dépend du premier :

| Registre | Ce qu'il héberge | Ce qui rend le serveur… |
| --- | --- | --- |
| **npm** | l'artefact — le code que `npx` exécute | **accessible** |
| **registre MCP** | des métadonnées seulement, qui pointent vers npm | **détectable** |

---

## 1. Monter la version

Trois valeurs doivent bouger ensemble, dans deux fichiers :

- `package.json` → `version`
- `server.json` → `version` **et** `packages[0].version`

Ne pas les tenir en phase est l'erreur que le registre rend *après* la publication npm, donc trop
tard pour la reprendre sans monter encore. `npm.cmd run test` le refuse d'avance —
`scripts/mcpRegistry.test.ts`.

La version que l'agent lit à `initialize` n'est **pas** à toucher : elle vient de `package.json`.

## 2. Les portes, avant de publier quoi que ce soit

Depuis la racine du dépôt :

```powershell
npm.cmd run typecheck
npm.cmd run test
npm.cmd run verify:mcp     # exerce les six outils contre le distant
npm.cmd run mcp:paquet     # empaquette, installe hors du dépôt, parle MCP au binaire installé
```

`mcp:paquet` est celui qui compte ici : il joue ce qu'un tiers recevra, pas ce qu'on a construit.
Il a déjà attrapé un `dist/` périmé qui serait parti sur npm.

## 3. Publier sur npm

```powershell
cd C:\Users\ivand\Documents\GitHub\paris-compass\mcp-server   # chemin entier : ne pas supposer d'où l'on part
npm.cmd publish --access public --auth-type=web
```

`--auth-type=web` **n'est pas optionnel en pratique** : npm exige un second facteur pour publier,
et le prompt `Enter OTP:` ne sait recevoir qu'un code TOTP. Avec un passkey — ou simplement sans
l'application d'authentification sous la main — il n'y a rien à y taper. Le drapeau délègue au
navigateur déjà connecté.

**Un OTP npm ne s'envoie jamais par courriel.** C'est un code de l'application appairée à
l'activation de la 2FA. S'il est refusé alors qu'il a l'air juste, c'est l'horloge : le TOTP est
calculé sur l'heure. `w32tm /resync` en administrateur.

Puis vérifier ce que le registre sert vraiment, et non ce qu'on croit avoir envoyé :

```powershell
cd C:\Users\ivand\Documents\GitHub\paris-compass
npm.cmd view paris-compass-mcp version
npm.cmd run mcp:paquet -- --registre
```

Le drapeau `--registre` installe le paquet **depuis npm** au lieu de l'archive locale. Une archive
locale prouve que l'empaquetage est juste, jamais que la publication l'est.

## 4. Publier au registre MCP

Une seule fois, installer l'outil — **hors du dépôt**, pour ne pas déposer un binaire dans un
arbre de sources. Vérifié le 3 septembre 2026 : la version `v1.8.1` publie bien un
`mcp-publisher_windows_arm64.tar.gz`, donc ce poste n'a pas besoin d'émulation.

```powershell
$arch = if ([System.Runtime.InteropServices.RuntimeInformation]::ProcessArchitecture -eq "Arm64") { "arm64" } else { "amd64" }
$tools = "$env:USERPROFILE\Tools"
New-Item -ItemType Directory -Force $tools | Out-Null
Invoke-WebRequest "https://github.com/modelcontextprotocol/registry/releases/latest/download/mcp-publisher_windows_$arch.tar.gz" -OutFile "$env:TEMP\mcp-publisher.tar.gz"
tar xf "$env:TEMP\mcp-publisher.tar.gz" -C $tools mcp-publisher.exe
Remove-Item "$env:TEMP\mcp-publisher.tar.gz"
& "$tools\mcp-publisher.exe" --help
```

Puis, **depuis `mcp-server/`** — et le chemin est écrit en entier exprès : l'outil n'est pas dans
le `PATH`, et un chemin relatif dépend de l'endroit d'où on part.

```powershell
& "$env:USERPROFILE\Tools\mcp-publisher.exe" login github   # code d'appareil sur github.com/login/device
& "$env:USERPROFILE\Tools\mcp-publisher.exe" publish
```

**L'esperluette `&` est obligatoire** devant un chemin entre guillemets : sans elle, PowerShell
lit la chaîne au lieu de l'exécuter.

Vérifier :

```powershell
curl.exe "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.ivandemurard/paris-compass-mcp"
```

## Ce qui casse, et pourquoi

| Message | Cause réelle |
| --- | --- |
| `ENEEDAUTH` | pas connecté à npm — `npm.cmd login` |
| `403 … Two-factor authentication … is required` | 2FA exigée : reprendre avec `--auth-type=web` |
| `Registry validation failed for package` | `mcpName` de `package.json` ≠ `name` de `server.json`, ou paquet npm pas encore publié dans cette version |
| `You do not have permission to publish this server` | le nom ne commence pas par `io.github.<login>/`, ou le compte GitHub connecté n'est pas celui-là |
| `422 … expected length <= 100` sur `body.description` | la description de `server.json` dépasse 100 caractères. Mesuré le 3 septembre 2026 en s'y cognant ; `npm.cmd run test` le refuse désormais d'avance |
| `Invalid or expired Registry JWT token` | rejouer `mcp-publisher login github` |

## Ce que rien ici ne garantit

- **Aucun bras planifié ne joue `mcp:paquet`** — un `npm pack` et une installation réseau chaque
  matin dépenseraient ça contre un artefact qui ne bouge qu'à la publication. Une version publiée
  qui se casserait après coup ne serait pas vue. C'est écrit dans `scripts/porte/cadence.json`.
- **npm ne laisse retirer une version que pendant 72 h**, et un nom non scopé ne se transfère pas
  à une organisation ensuite. Le nom `paris-compass-mcp` et chaque numéro publié sont définitifs.
- **Le compte npm dépend de sa 2FA.** Créé le 2 septembre 2026, 2FA activée neuf minutes après.
  Sans les codes de récupération, un appareil perdu ferme la porte à toute publication future.
