# Section 6 — Rules (.claude/rules)

**Niveau** : MEDIUM
**Cibles** : `.claude/rules/*.md`

Les rules sont chargées **conditionnellement** sur la base de leur `globs`.
Une rule sans `globs` se charge toujours (ou jamais, selon le harness) et
gaspille du contexte. Une rule avec un scope flou couvre trop de fichiers ou
les mauvais fichiers.

## Règles

### 6.1 — Frontmatter avec `globs:` non-vide

- **Méthode** : Read frontmatter
- **Attendu** : champ `globs:` présent ET non-vide. Format glob standard
  (`src/app/api/**`, `**/*.tsx`, `supabase/migrations/**`).
- **Signal FAIL** : frontmatter absent, ou `globs:` vide / manquant.
- **Signal WARN** : `globs: **` (charge toujours, ce que la rule doit éviter sauf cas spécial).

### 6.2 — `globs` ciblé (pas de surfaces gigantesques)

- **Méthode** : Read + jugement
- **Pattern** : `globs: src/**/*.ts` est trop large. Préférer un scope précis
  (`src/app/api/**`, `supabase/migrations/**`).
- **Attendu** : globs ciblé sur les fichiers où la rule s'applique réellement.
- **Signal WARN** : globs trop large couvrant > 80% du repo (ex. `src/**`).
- **Exception** : process.md = règles transverses → `globs: **/*` toléré.

### 6.3 — Scope clair en début de fichier

- **Méthode** : Read body
- **Attendu** : la première section dit où la rule s'applique (ex. "Pages tableur",
  "API routes", "Conventions schéma DB"). Cohérent avec le `globs`.
- **Signal WARN** : rule sans paragraphe d'introduction qui contextualise.

### 6.4 — Pas de duplication entre 2 rules

- **Méthode** : grep + jugement
- **Pattern** : deux rules qui couvrent le même domaine (ex. deux rules sur les
  routes API) doivent être fusionnées ou explicitement disjointes.
- **Signal WARN** : duplication de patterns / exemples entre rules.

### 6.5 — Pas de patterns obsolètes

- **Méthode** : Read + cross-check code
- **Pattern** : si une rule mentionne `createClient()`, `supabaseAdmin` dans un
  contexte client, ou des fonctions / fichiers qui n'existent plus → rule à
  mettre à jour.
- **Signal WARN** : rule cite un fichier/fonction inexistant en code.
- **Note** : check par grep simple sur les noms de fichiers cités.

### 6.6 — Naming kebab-case

- **Méthode** : Glob + regex
- **Pattern** : nom de fichier (sans `.md`) match `^[a-z0-9]+(-[a-z0-9]+)*$`
- **Signal FAIL** : nom non conforme.

### 6.7 — Rules listées dans CLAUDE.md ou un skill

- **Méthode** : grep cross
- **Pattern** : chaque rule devrait être référencée au moins une fois (CLAUDE.md
  table, ou via un skill qui la cite).
- **Attendu** : rule trouvée référencée explicitement.
- **Signal WARN** : rule orpheline (existe mais jamais citée).

### 6.8 — Pas de tabs, pas de markdown cassé

- **Méthode** : Read + grep `\t`
- **Attendu** : indentation espaces, listes / code-blocks bien formés.
- **Signal WARN** : tabs détectés (peut casser certains parsers Claude).
