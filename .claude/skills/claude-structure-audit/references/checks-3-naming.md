# Section 3 — Naming & filesystem

**Niveau** : MEDIUM
**Cibles** : `.claude/skills/**`

Le nom d'un skill est sa clé d'invocation. Un nom non-conforme casse
l'auto-discovery ou la commande `/<nom>`.

## Règles

### 3.1 — kebab-case strict

- **Méthode** : Glob + regex
- **Pattern** : nom de dossier match `^[a-z0-9]+(-[a-z0-9]+)*$`
- **Attendu** : que des minuscules, chiffres, et tirets — pas de `_`, pas de majuscule, pas d'espace.
- **Signal FAIL** : `MySkill/`, `my_skill/`, `skill 1/`, `Skill-Name/`.

### 3.2 — Longueur ≤ 64 caractères

- **Méthode** : Glob + length check
- **Attendu** : nom dossier ≤ 64 chars.
- **Signal FAIL** : > 64 caractères.

### 3.3 — Dossier ↔ frontmatter `name`

- **Méthode** : Read frontmatter + inspect path
- **Attendu** : si `name:` présent dans frontmatter, il doit égaler le nom du dossier.
- **Signal FAIL** : mismatch (ex. dossier `back-audit/` avec `name: backaudit`).
- **Note** : recouvre 1.3 — peut être consolidé en sortie.

### 3.4 — Pas de doublon (case-insensitive)

- **Méthode** : Glob + comparaison
- **Pattern** : deux dossiers de skills qui ne diffèrent que par la casse
  (`MySkill/` et `myskill/`) — invisible sur Windows, problème sur Linux.
- **Attendu** : 0 collision.
- **Signal FAIL** : collision détectée.

### 3.5 — Pas de skill imbriqué

- **Méthode** : Glob
- **Pattern** :
  ```
  rg -l --files-with-matches '^---' .claude/skills/*/*/SKILL.md
  ```
- **Attendu** : 0 résultat. Les SKILL.md sont au premier niveau de leur dossier.
- **Signal FAIL** : `.claude/skills/foo/bar/SKILL.md` (skill imbriqué — invisible).

### 3.6 — Préfixes recettes cohérents

- **Méthode** : Glob
- **Pattern** : skills `recipe-*` doivent former une famille cohérente (préfixe
  réservé aux recettes / workflows, pas aux audits).
- **Attendu** : un skill nouveau ne hijack pas le préfixe `recipe-` sans en être un.
- **Signal WARN** : nom préfixé `recipe-` qui n'est pas une recette structurée.

### 3.7 — Préfixe `audit` réservé aux audits

- **Méthode** : Glob + Read
- **Pattern** : skills nommés `*-audit` doivent produire un scorecard + snapshot
  daté (convention projet, cf. `docs/audits/README.md`).
- **Attendu** : `back-audit`, `perf-audit`, `claude-structure-audit`,
  `skill-adherence-audit` respectent tous le pattern (scorecard + findings + memory).
- **Signal WARN** : skill `*-audit` sans output dans `docs/audits/findings/`.
