# Section 7 — Cohérence CLAUDE.md ↔ skills réels ↔ MEMORY.md

**Niveau** : CRITIQUE
**Cibles** : `CLAUDE.md` racine, `.claude/skills/**`, `memory/MEMORY.md`,
`memory/*.md`, `docs/audits/README.md`

C'est la section qui détecte les dérives — un skill listé dans `CLAUDE.md` qui
n'existe plus, une entrée memory qui pointe vers un fichier disparu, un index
audits qui n'a plus rien à voir avec le contenu réel de `findings/`.

## Règles

### 7.1 — Skills listés dans `CLAUDE.md` existent

- **Méthode** : Read `CLAUDE.md` table "Skills" + cross-check `.claude/skills/`
- **Pattern** : pour chaque skill listé dans la table de `CLAUDE.md` (section
  "Skills (`skills/`)"), vérifier qu'un dossier `.claude/skills/<nom>/` existe.
- **Signal FAIL** : skill cité mais inexistant — référence cassée.

### 7.2 — Skills présents listés dans `CLAUDE.md`

- **Méthode** : Glob + Read
- **Pattern** : pour chaque dossier `.claude/skills/*/`, vérifier qu'il apparaît
  dans la table `CLAUDE.md` OU qu'il est un skill tiers (`zod-v4`, `react-best-practices`).
- **Signal WARN** : skill présent mais absent de la table — soit ajouter, soit assumer
  comme tiers (le mentionner explicitement quelque part).
- **Note** : skills `recipe-*`, `ai-development-guide`, `coding-principles` etc.
  installés depuis le marketplace — tolérés sans listing si reconnus comme tiers.

### 7.3 — Entrées `MEMORY.md` pointent vers des fichiers existants

- **Méthode** : Read `MEMORY.md` + cross-check
- **Pattern** : chaque ligne `- [Title](file.md) — ...` dans MEMORY.md → le `file.md`
  doit exister dans le dossier memory.
- **Signal FAIL** : entrée pointe vers un fichier inexistant.

### 7.4 — Fichiers memory orphelins

- **Méthode** : Glob memory/\*.md + cross-check `MEMORY.md`
- **Pattern** : chaque `.md` dans `memory/` (hors `MEMORY.md` lui-même) doit avoir
  une entrée dans `MEMORY.md`.
- **Signal WARN** : fichier memory non indexé.

### 7.5 — `MEMORY.md` ≤ 200 lignes

- **Méthode** : `wc -l`
- **Attendu** : MEMORY.md est un index — au-delà de 200 lignes, le harness tronque.
- **Signal WARN** : > 180 lignes (proche limite).
- **Signal FAIL** : > 200 lignes (truncation effective).

### 7.6 — `MEMORY.md` n'a pas de frontmatter

- **Méthode** : Read tête de fichier
- **Attendu** : MEMORY.md est un index pur, sans bloc YAML.
- **Signal WARN** : frontmatter présent — Claude le parsera comme une mémoire au lieu d'un index.

### 7.7 — Skill cité dans memory existe

- **Méthode** : grep + cross-check
- **Pattern** : entrées memory mentionnent des skills (ex.
  "skill `perf-audit` créé") → vérifier que le skill existe.
- **Signal WARN** : skill cité dans memory mais inexistant (memory périmée).

### 7.8 — Roadmap `CLAUDE.md` cohérente avec migrations

- **Méthode** : Read `CLAUDE.md` table Roadmap + Glob `supabase/migrations/`
- **Pattern** : si la table Roadmap mentionne migration `00X_*.sql`, le fichier doit
  exister dans `supabase/migrations/`.
- **Signal WARN** : référence migration inexistante (la roadmap a divergé).

### 7.9 — Index `docs/audits/README.md` à jour

- **Méthode** : Read `docs/audits/README.md` + Glob `docs/audits/findings/`
- **Pattern** : chaque fichier dans `findings/` doit apparaître dans la table
  "Index — résultats" de `README.md`.
- **Signal WARN** : snapshot d'audit non listé dans l'index.

### 7.10 — Entrée `audit_*.md` en memory pointe vers le snapshot le plus récent

- **Méthode** : Read memory `project_*_audit*.md` + Glob findings
- **Pattern** : la synthèse memory cite un fichier snapshot daté ;
  ce fichier doit être le plus récent dans `findings/<audit-name>-*.md`.
- **Signal WARN** : memory pointe vers un snapshot, mais un snapshot plus récent existe.
