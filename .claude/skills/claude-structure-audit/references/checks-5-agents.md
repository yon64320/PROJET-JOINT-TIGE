# Section 5 — Agents (.claude/agents)

**Niveau** : MEDIUM
**Cibles** : `.claude/agents/*.md`

Les agents sont invoqués via la Task tool. Comme les skills, ils ont un
frontmatter (avec un `description`) et leur sélection automatique dépend
entièrement de la qualité de cette description.

## Règles

### 5.1 — Frontmatter YAML valide

- **Méthode** : Read + parse YAML
- **Attendu** : bloc `---` ... `---` parsable, indentation cohérente.
- **Signal FAIL** : YAML cassé ou bloc absent.

### 5.2 — Champ `description` présent et concret

- **Méthode** : Read frontmatter
- **Attendu** : description avec verbe d'action + triggers + clause "Use when" / "PROACTIVELY"
  pour les agents que Claude doit déclencher seul.
- **Signal FAIL** : description absente, vide, ou < 50 caractères.
- **Signal WARN** : pas de "Use when" / "PROACTIVELY" pour un agent clairement proactif
  (ex. `code-reviewer`, `investigator`, `verifier`).

### 5.3 — Champ `tools` présent

- **Méthode** : Read frontmatter
- **Attendu** : agent déclare la liste des outils via `tools:` (sinon hérite trop large).
- **Signal WARN** : `tools` absent — l'agent peut utiliser `*` par défaut, surface trop grande.
- **Signal FAIL** : agent qui modifie des fichiers (`task-executor`, `quality-fixer`)
  sans déclarer `Edit`/`Write` dans `tools`.

### 5.4 — Outils cohérents avec le rôle

- **Méthode** : Read + jugement
- **Pattern** :
  - agents read-only (`investigator`, `verifier`, `code-verifier`,
    `codebase-analyzer`, `scope-discoverer`, `design-sync`,
    `acceptance-test-generator`, `code-reviewer`, `security-reviewer`,
    `integration-test-reviewer`, `document-reviewer`) → `tools` ne devrait pas
    contenir `Write`, `Edit`, `MultiEdit`, `NotebookEdit`.
  - agents executor (`task-executor`, `quality-fixer`) → doivent avoir Edit/Write.
- **Signal WARN** : agent dit "review" / "verify" / "audit" mais possède Write/Edit.
- **Signal WARN** : agent dit "executor" / "fixer" mais sans Edit/Write.

### 5.5 — Naming kebab-case

- **Méthode** : Glob + regex
- **Pattern** : nom de fichier (sans `.md`) match `^[a-z0-9]+(-[a-z0-9]+)*$`
- **Signal FAIL** : `MyAgent.md`, `my_agent.md`, `Agent 1.md`.

### 5.6 — Pas de doublon de description

- **Méthode** : grep / jugement croisé
- **Pattern** : deux agents avec triggers très proches (ex. deux "code reviewer")
  → Claude n'arrivera pas à arbitrer.
- **Attendu** : chaque agent occupe une niche distincte ou explicite la délégation.
- **Signal WARN** : collision sans clause "Distinct de X".

### 5.7 — Description ≤ 1024 caractères

- **Méthode** : Read frontmatter + char count
- **Attendu** : description compacte. Trop long = bruit en context permanent.
- **Signal WARN** : > 1024 caractères.

### 5.8 — Agents listés correspondent aux usages docs

- **Méthode** : Read `CLAUDE.md` + cross-check
- **Pattern** : si `CLAUDE.md` ou un skill mentionne un agent par nom (ex. via la Task tool),
  cet agent doit exister dans `.claude/agents/`.
- **Signal FAIL** : agent référencé mais inexistant.
- **Signal WARN** : agent existant mais jamais référencé nulle part (orphelin) — n'est
  pas un FAIL, mais candidate au cleanup.
