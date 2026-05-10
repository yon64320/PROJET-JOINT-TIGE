# Section 1 — Frontmatter & metadata des skills

**Niveau** : CRITIQUE
**Cibles** : `.claude/skills/**/SKILL.md`

Les skills sont chargés en partie par leur frontmatter. Un YAML cassé ou un
`description` absent rend le skill invisible à l'auto-discovery, ou pire, le
charge mais sans déclencheur clair.

## Règles

### 1.1 — Frontmatter YAML présent et valide

- **Méthode** : Read + parse YAML
- **Pattern** : chaque `SKILL.md` commence par un bloc `---` ... `---` parsable.
- **Attendu** : YAML valide, pas de tab, pas de guillemets non fermés, indentation cohérente.
- **Signal FAIL** :
  - pas de bloc frontmatter du tout
  - bloc présent mais YAML invalide (parse error)
  - bloc fermé incorrectement (pas de `---` final)

### 1.2 — Champ `description` présent

- **Méthode** : Read frontmatter
- **Attendu** : `description` non-vide, > 80 caractères, < 1024 caractères.
- **Signal FAIL** :
  - champ `description` absent
  - description vide ou réduite à un mot ("Audit du projet", "Skill back-end")
  - description > 1024 caractères (frontmatter trop lourd → cf. section 4 pour la qualité du contenu)
- **Exception** : skills marketplace avec `disable-model-invocation: true`
  (ex. `recipe-*` workflow agents) — la description est consommée par l'humain
  via `/<name>`, longueur < 80 chars tolérée. La règle ne s'applique pas
  quand le skill ne peut pas être auto-loadé par le modèle.

### 1.3 — Champ `name` aligné avec le dossier

- **Méthode** : Read frontmatter + inspect path
- **Pattern** :
  - le dossier parent du `SKILL.md` : `.claude/skills/<dirname>/SKILL.md`
  - frontmatter `name: <fname>`
- **Attendu** : `dirname == fname` (l'absence de `name` est tolérée — il prend la valeur du dossier).
- **Signal FAIL** : `name` explicite ≠ nom du dossier.
- **Note** : un nom incohérent peut casser l'invocation `/<name>`.

### 1.4 — `allowed-tools` quand le skill exécute des commandes

- **Méthode** : Read frontmatter + scan body
- **Pattern** : si le SKILL.md utilise des appels du genre `!`...``, des
blocs Bash explicites, ou écrit/édit des fichiers → `allowed-tools`doit être
présent et lister au minimum`Read, Edit, Bash` selon usage.
- **Attendu** : liste tools cohérente avec le contenu (pas plus, pas moins).
- **Signal WARN** :
  - skill utilise Bash mais `allowed-tools` absent
  - `allowed-tools` liste des outils jamais utilisés (verbosité inutile)
- **Signal FAIL** : skill modifie des fichiers sans déclarer `Edit` ou `Write`.

### 1.5 — `user-invocable` cohérent

- **Méthode** : Read frontmatter + jugement
- **Attendu** : `user-invocable: true` si le skill est conçu pour être appelé via `/<nom>`
  (ex. `back-audit`, `perf-audit`, `fin-session`). `user-invocable: false` ou absent
  pour les skills d'arrière-plan (knowledge, patterns, conventions — ex. `domain-maintenance`).
- **Signal WARN** :
  - skill avec `argument-hint` mais sans `user-invocable: true` (incohérent)
  - skill exposant un workflow exécutable sans `user-invocable: true`
- **Note** : tolérer l'absence du champ pour les skills passifs.

### 1.6 — `argument-hint` cohérent avec les flags documentés

- **Méthode** : Read frontmatter + scan body
- **Pattern** : si le body documente des flags (`--full`, `--measure`, `--fix`),
  ils doivent apparaître dans `argument-hint`.
- **Attendu** : `argument-hint` aligné, format `[--flag <type>]`.
- **Signal WARN** :
  - flag documenté absent de `argument-hint`
  - flag dans `argument-hint` jamais traité dans le body

### 1.7 — Pas de champ frontmatter inconnu / typo

- **Méthode** : Read frontmatter
- **Champs valides** (référence skill-creator + llms.txt) : `name`, `description`,
  `allowed-tools`, `user-invocable`, `disable-model-invocation`, `argument-hint`,
  `model`, `context`, `agent`, `hooks`.
- **Signal WARN** : champ inconnu (typo type `tools:` au lieu de `allowed-tools:`,
  ou `triggers:` qui n'existe pas).
- **Exception** : skills tiers MIT (origine upstream documentée via `metadata.author`
  ou bloc `license:`) tolèrent `license`, `metadata`, `agentic`, `compatibility` —
  ces champs servent à l'attribution et ne doivent pas être réécrits sous peine
  de casser la fidélité upstream. Concerne actuellement : `react-best-practices`,
  `supabase-postgres-best-practices`, `zod-v4`.

### 1.8 — `globs` interdit dans un skill

- **Méthode** : grep
- **Pattern** :
  ```
  rg -l '^globs:' .claude/skills/
  ```
- **Attendu** : 0 résultat. `globs` est un champ pour les **rules**, pas les skills.
- **Signal FAIL** : tout match — confusion rule/skill.
