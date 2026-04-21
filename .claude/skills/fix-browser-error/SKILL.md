---
name: fix-browser-error
description: >
  Debug et fix des erreurs navigateur via Chrome DevTools Protocol.
  Utiliser quand l'utilisateur signale un bug front, une erreur console,
  une page blanche, un clic qui ne marche pas, ou dit "check la console",
  "j'ai un bug", "fix l'erreur".
user-invocable: true
allowed-tools: Bash, Read, Edit, Glob, Grep, Write
argument-hint: "[description du bug]"
---

# Fix Browser Error

Debug automatise : capture les erreurs Chrome, analyse, corrige, valide.

## Prerequis

- Chrome lance avec `--remote-debugging-port=9222` (raccourci `Chrome Debug.bat`)
- Script listener : `scripts/chrome-console.mjs` (existe dans le projet)
- Log capture dans : `scripts/console.log`

## Contexte automatique

Erreurs recentes :

```
!`tail -50 scripts/console.log 2>/dev/null || echo "Pas de log console. Lancer le listener d'abord."`
```

## Phase 1 — Capture

1. Si `scripts/console.log` existe et contient des erreurs recentes, les utiliser directement
2. Sinon lancer le listener :
   ```bash
   node scripts/chrome-console.mjs &
   sleep 5
   ```
3. Si le listener echoue (Chrome pas en mode debug), afficher :
   > Chrome n'est pas en mode debug. Ferme Chrome completement, puis relance avec **Chrome Debug.bat**. Reessaie ensuite.
4. Lire `scripts/console.log`, extraire les lignes ERROR, NET 4xx/5xx, WARN

## Phase 2 — Analyse

Classifier chaque erreur :

| Type            | Pattern                            | Action                                 |
| --------------- | ---------------------------------- | -------------------------------------- |
| JS Exception    | `ERROR Uncaught: ...` + stack      | Extraire fichier:ligne depuis la stack |
| Erreur reseau   | `NET 4xx/5xx METHOD /api/...`      | Lire la route API serveur              |
| React error     | `Minified React error` / hydration | Lire le composant concerne             |
| Requete echouee | `NET FAILED ... net::ERR_*`        | Verifier CORS, URL, connectivite       |

Pour chaque erreur :

1. Mapper le chemin webpack vers `src/` (voir section Mapping ci-dessous)
2. Lire le fichier source ±20 lignes autour de l'erreur
3. Si erreur reseau sur `/api/*`, lire aussi la route API dans `src/app/api/`

## Phase 3 — Diagnostic

1. Formuler la **root cause** en une phrase
2. Proposer un **plan** (1-3 etapes max) avant d'executer
3. Si incertain : demander de reproduire ou preciser

Ne jamais executer sans avoir annonce le plan.

## Phase 4 — Fix

Appliquer le correctif minimal. Patterns courants :

- **Null/undefined** → guard `?.`, `?? default`, early return
- **Erreur reseau** → corriger fetch (URL, headers, body)
- **Hydration mismatch** → `useEffect` ou supprimer rendu conditionnel SSR
- **GENERATED column** → corriger la colonne source, jamais la colonne generee

Pas de refactor opportuniste.

## Phase 5 — Validation

```bash
npm run type-check && npm run lint
```

Si OK : resumer le fix en 1-2 lignes.
Si echec : corriger et relancer (max 2 iterations).

## Mapping chemins webpack → source

| Stack trace                     | Fichier source |
| ------------------------------- | -------------- |
| `webpack-internal:///src/...`   | `src/...`      |
| `(app-pages-browser)/./src/...` | `src/...`      |

Si chemin pas clair, utiliser Glob pour trouver le fichier par nom.

## Mapping routes API

Pattern : URL `/api/x/y` → fichier `src/app/api/x/y/route.ts`
