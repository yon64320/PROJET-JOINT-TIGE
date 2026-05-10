# Section 4 — Qualité description & triggers

**Niveau** : CRITIQUE
**Cibles** : `.claude/skills/**/SKILL.md` (frontmatter `description`)

La `description` est le seul point de contact entre la requête utilisateur
et le skill. Si elle est générique, l'auto-load ne se déclenche pas — ou pire,
deux skills entrent en collision sur la même phrase clé.

## Règles

### 4.1 — Description = "ce qu'il fait + quand l'utiliser"

- **Méthode** : Read frontmatter + jugement
- **Attendu** : la description contient :
  - une phrase d'action claire ("Audite X", "Génère Y", "Implémente Z")
  - une formule "Use when" / "Utiliser quand" / "Trigger when" avec triggers concrets
- **Signal FAIL** :
  - phrase générique sans triggers ("Helps with code review")
  - description = juste un nom étendu ("Skill pour auditer le back-end")
  - aucun verbe d'action

### 4.2 — Triggers concrets (mots/phrases utilisateur)

- **Méthode** : Read description + jugement
- **Attendu** : 3+ triggers concrets en guillemets, formulés comme l'utilisateur parle :
  `"audit back"`, `"check le back"`, `"ça rame"`, `"audit RLS"`.
- **Signal WARN** : seulement 1-2 triggers, ou triggers trop abstraits ("when discussing performance").
- **Signal FAIL** : aucun trigger en guillemets.
- **Exception** : skills marketplace knowledge (frontmatter contient
  `metadata.author` non-projet, ou skill installé depuis un marketplace tiers)
  — la convention upstream "Use when ..." sans guillemets est tolérée.
  Concerne notamment : `ai-development-guide`, `coding-principles`,
  `documentation-criteria`, `implementation-approach`, `integration-e2e-testing`,
  `subagents-orchestration-guide`, `task-analyzer`, `test-implement`,
  `testing-principles`, `typescript-rules`. Pour les skills projet (EMIS),
  triggers en guillemets obligatoires.

### 4.3 — Pas de collision de triggers entre 2 skills

- **Méthode** : grep cross-skills + jugement
- **Pattern** :
  ```
  rg '"audit ' .claude/skills/*/SKILL.md
  rg '"performance"' .claude/skills/*/SKILL.md
  ```
- **Attendu** : un trigger appartient à 1 seul skill (ou explicite la délégation
  via "Distinct de X qui audite Y").
- **Signal WARN** : trigger partagé sans clause de délégation.
- **Note** : `back-audit` et `perf-audit` se renvoient explicitement — pattern OK.

### 4.4 — Description mentionne la délégation pour skills proches

- **Méthode** : Read + jugement
- **Pattern** : si un skill a un voisin proche (ex. `back-audit` ↔ `perf-audit`,
  `fin-session` ↔ `fin-conversation`, `claude-structure-audit` ↔ `skill-adherence-audit`),
  la description doit dire "Distinct de X qui ..." ou équivalent.
- **Signal WARN** : pas de clause de délégation pour skills jumeaux connus.

### 4.5 — Pas de markdown lourd dans la description

- **Méthode** : Read frontmatter
- **Attendu** : description en texte plat. Pas de listes à puces, pas de code blocks,
  pas de table.
- **Signal WARN** : description avec `\n- ` ou triple backticks (parser YAML
  l'accepte mais la description finit affichée brute dans certains outils).

### 4.6 — Pas de référence interne hors-contexte

- **Méthode** : Read description
- **Pattern** : description ne mentionne pas de fichier interne du skill
  (`references/checks-1-foo.md`) — l'utilisateur n'a pas accès au contenu en
  amont du chargement.
- **Signal WARN** : description avec lien vers fichier `references/`.

### 4.7 — Skills proactifs : "Use proactively when"

- **Méthode** : Read + jugement
- **Pattern** : skills désignés pour usage proactif (catalog-error, fin-session,
  document-reviewer côté agents) doivent contenir "proactivement" / "PROACTIVELY"
  dans leur description.
- **Signal WARN** : skill clairement proactif sans signal explicite (Claude ne le déclenchera pas seul).

### 4.8 — Longueur raisonnable (40-300 mots)

- **Méthode** : Read + word count
- **Attendu** : description entre 40 et 300 mots — assez pour 3 triggers + 1 délégation,
  pas tellement qu'elle pèse sur le contexte.
- **Signal WARN** : < 30 mots (trop court, pas de trigger) ou > 350 mots (gaspillage).
