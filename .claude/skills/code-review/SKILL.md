---
name: code-review
description: Review de code expert du projet EMIS. Analyser les changements git (staged, unstaged, ou range de commits) sous l'angle securite, performance, patterns projet, et conventions. Utiliser quand l'utilisateur dit "review", "relis le code", "check mon code", "audit", ou apres une feature majeure.
allowed-tools: ["Bash", "Read", "Glob", "Grep", "Agent"]
---

# Code Review

Review technique des changements de code, calibree pour le projet EMIS (Next.js 16, React 19, TypeScript, Supabase, Univer, PWA Dexie).

## Workflow

### 1. Collecter le diff

Determiner le scope de la review :

```bash
# Changements non commites (defaut)
git diff --stat && git diff --cached --stat

# Dernier commit
git diff HEAD~1 --stat

# Branche entiere vs main
git diff main...HEAD --stat
```

Lire le diff complet, puis les fichiers touches en entier pour avoir le contexte.

### 2. Grille d'analyse

Passer chaque fichier modifie dans cette grille. Ne rapporter que les findings reels — pas de compliments, pas de padding.

#### Securite

- Injection SQL / XSS / command injection
- Donnees utilisateur non-validees passees a `supabase.rpc()` ou `.from().update()`
- PATCH sans whitelist EDITABLE — colonnes GENERATED modifiables
- Upload sans validation taille + MIME
- Secrets en dur ou exposes cote client

#### Integrite donnees

- Colonnes GENERATED (RETENU, DELTA) modifiees directement
- Read-modify-write sur extra_columns au lieu de `merge_extra_column` RPC
- DN/PN inseres comme TEXT au lieu de NUMERIC
- Valeurs texte ("CALO", "PAS D'INFO") non filtrees avant insertion numerique
- `UNIQUE(project_id, item)` potentiellement viole
- Archivage manquant avant re-import

#### Patterns Next.js / React

- `use client` manquant sur composant avec hooks/state
- Fetch cote serveur sans gestion d'erreur
- Props drillees sur 3+ niveaux (extraire un context)
- `key=` manquant sur listes dynamiques
- API route sans validation du body

#### Univer (tableur)

- Mutation du workbookData au lieu de rebuild complet
- Data validation dans buildWorkbookData au lieu de onReady
- Styles sans `mergeStyles()` (bordures manquantes)
- Colonnes GENERATED sans `readOnly: true`
- `key={viewMode}` manquant pour forcer re-mount au changement de vue

#### Supabase / PostgreSQL

- `.select("*")` sans pagination sur tables potentiellement grandes
- `.order()` manquant avec `.range()` (resultats instables entre pages)
- Transaction multi-UPDATE sans RPC (pas d'atomicite)
- RLS policy manquante ou trop permissive
- Migration sans `IF NOT EXISTS`

#### PWA / Offline (Dexie)

- Fetch direct Supabase dans composants terrain (doit passer par Dexie)
- Sync non-idempotent (risque de doublons)
- Mutation sans ajout a la queue offline
- Touch target < 56px sur UI terrain

#### Tailwind CSS v4

- `@keyframes` imbrique dans `@theme` (page blanche silencieuse)
- Classes Tailwind v3 deprecies en v4

#### TypeScript

- `any` non justifie (acceptable avec `// eslint-disable` explicite)
- Type assertion (`as`) evitable avec un narrowing
- Interface exportee mais jamais importee ailleurs

### 3. Format de sortie

Organiser les findings par severite :

```
## Review — [scope: fichiers ou range]

### CRITIQUE (bloquant)
- **[fichier:ligne]** — Description. Impact. Fix propose.

### IMPORTANT (a corriger)
- **[fichier:ligne]** — Description. Fix propose.

### SUGGESTION (amelioration)
- **[fichier:ligne]** — Description.

### Resume
- X critiques, Y importants, Z suggestions
- Verdict : SHIP / FIX THEN SHIP / BLOCK
```

Si aucun finding : `Aucun probleme detecte. SHIP.`

### 4. Verification croisee

Apres la review manuelle, lancer les checks automatiques :

```bash
npm run type-check 2>&1 | head -30
npm run lint 2>&1 | head -30
```

Rapporter les erreurs TS/ESLint comme findings CRITIQUE.

## Hors scope

- Style/formatting (gere par Prettier/ESLint)
- Nommage de variables (sauf incoherence avec conventions DB : `_emis`, `_buta`, `_retenu`)
- Commentaires manquants (le code doit etre auto-documente)
- Couverture de tests (skill separe)
