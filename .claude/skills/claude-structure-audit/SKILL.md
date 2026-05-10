---
name: claude-structure-audit
description: >
  Audit de la structure Anthropic du projet — `.claude/skills`, `.claude/agents`,
  `.claude/rules`, `CLAUDE.md`, `memory`. Vérifie best practices Anthropic
  (frontmatter, progressive disclosure, naming, < 500 lignes) et cohérence
  interne (skills listés vs présents, refs memory valides, pas de doublons
  triggers, errors INDEX synchro). 8 sections avec 3 niveaux de criticité
  (CRITIQUE / MEDIUM / MINOR), scorecard pondéré et top 5 actions. Utiliser
  quand l'utilisateur dit "audit claude", "audit structure", "audit anthropic",
  "check .claude", "structure check". Distinct de `skill-adherence-audit` qui
  audite le CODE vs les skills.
user-invocable: true
argument-hint: "[--section <nom>] [--full] [--fix]"
allowed-tools: Read, Grep, Glob, Bash, Edit
---

# Audit structure Anthropic EMIS

Audit ciblé de la structure `.claude/` : skills, agents, rules, errors, plus
les fichiers d'orchestration (`CLAUDE.md` racine, `memory/MEMORY.md`).
Ne couvre PAS le code applicatif (voir `skill-adherence-audit` pour vérifier
que le code respecte les patterns documentés).

## Contexte projet (rappel)

- Skills classés en 2 groupes : **projet** (back-audit, perf-audit, fin-session,
  domain-maintenance, …) et **tiers** (zod-v4, react-best-practices)
- Rules avec frontmatter `globs:` ciblé (ex. `globs: src/app/api/**`)
- Errors classés par domaine technique (univer, supabase-postgres, pwa-offline, …),
  pas par feature applicative
- Memory : `MEMORY.md` index + fichiers individuels (`user_*`, `feedback_*`,
  `project_*`, `reference_*`)
- Convention transverse : tout skill d'audit produit un snapshot daté
  (`docs/audits/findings/`) + synthèse memory + ligne dans `docs/audits/README.md`

## Sources de vérité

- `~/.claude/skills/skill-creator/SKILL.md` — best practices Anthropic
- https://code.claude.com/docs/llms.txt — documentation officielle
- `CLAUDE.md` racine — table des skills attendus et de leurs domaines
- `.claude/rules/process.md` — protocole avant changements non-triviaux

## Contexte automatique (diff git)

```
!`git diff --name-only HEAD~1 2>/dev/null; git diff --name-only 2>/dev/null; git diff --name-only --cached 2>/dev/null`
```

## Phases

### Phase 1 — Scope

1. Si `--full` : auditer toutes les sections sur tous les fichiers cibles.
2. Sinon : à partir des fichiers modifiés, déduire les sections concernées via la table de routage.
3. Si `--section <nom>` : ne scoper que cette section.
4. Si aucun fichier `.claude/` ou `CLAUDE.md` modifié et pas de `--full` : afficher
   `"Aucun fichier de structure modifié — utiliser --full pour audit complet."` et s'arrêter.

### Phase 2 — Lecture des règles

Pour chaque section concernée, lire UNE FOIS le fichier `references/checks-N-<section>.md`.
Ne jamais inventer de règle hors des références documentées.

### Phase 3 — Vérification

Pour chaque règle :

- **auto-vérifiable** (grep / Glob / parse YAML) : exécuter le pattern, statut binaire
- **jugement** : lire le fichier, évaluer factuel
- Statut : `PASS` (respectée) | `WARN` (partiel/limite) | `FAIL` (violation claire)
- Si WARN/FAIL : citer `fichier:ligne`, attendu vs trouvé

### Phase 4 — Scorecard

- Score section = `(PASS × 10) / total règles applicables`, arrondi à 1 décimale
- Score global pondéré : CRITIQUE × 3, MEDIUM × 2, MINOR × 1
- Statut section : `OK` >= 8.0, `WARN` 5.0-7.9, `FAIL` < 5.0

### Phase 5 — Top 5 actions

Trier les violations par : criticité → score section → effort.
Pour chaque action : **Quoi** (1 phrase) | **Pourquoi** (impact) | **Effort** (S/M/L) | **Fichiers**.

### Phase 6 — Sortie & sauvegarde

**Sortie en chat** (format ci-dessous, toujours).

**Sauvegarde double** :

1. **Snapshot daté dans le repo** (TOUJOURS, à chaque exécution) :
   `docs/audits/findings/claude-structure-audit-{YYYY-MM-DD}.md`
   Si un fichier du même nom existe déjà (audit ré-exécuté le même jour),
   suffixer avec un numéro `-2`, `-3`, etc.
   Contenu : scorecard complet + forces + faiblesses + violations + corrections appliquées (mode `--fix`).

2. **Synthèse Claude** :
   `C:\Users\Yon\.claude\projects\C--Users-Yon-Desktop-CLAUDE-CODE-JOINT-TIGE\memory\project_audit_claude_structure.md`
   Mettre à jour UNIQUEMENT si :
   - premier audit (pas de fichier existant), OU
   - écart > 1.0 vs score global précédent
     La synthèse pointe vers le snapshot le plus récent.
     Ajouter une ligne dans `MEMORY.md` (section "## Audits") si entrée absente.

3. **Mettre à jour l'index** : ajouter une ligne dans `docs/audits/README.md`
   table "Index — résultats" avec date, score, lien vers le snapshot.

## Sections (8) — table de routage

| #   | Section                               | Niveau   | Référence                                                     | Cibles                                               |
| --- | ------------------------------------- | -------- | ------------------------------------------------------------- | ---------------------------------------------------- |
| 1   | Frontmatter & metadata des skills     | CRITIQUE | [checks-1-frontmatter.md](references/checks-1-frontmatter.md) | `.claude/skills/**/SKILL.md`                         |
| 2   | Progressive disclosure & taille       | CRITIQUE | [checks-2-disclosure.md](references/checks-2-disclosure.md)   | `.claude/skills/**`                                  |
| 3   | Naming & filesystem                   | MEDIUM   | [checks-3-naming.md](references/checks-3-naming.md)           | `.claude/skills/**`                                  |
| 4   | Qualité description & triggers        | CRITIQUE | [checks-4-triggers.md](references/checks-4-triggers.md)       | `.claude/skills/**/SKILL.md`                         |
| 5   | Agents (.claude/agents)               | MEDIUM   | [checks-5-agents.md](references/checks-5-agents.md)           | `.claude/agents/*.md`                                |
| 6   | Rules (.claude/rules) — globs, scope  | MEDIUM   | [checks-6-rules.md](references/checks-6-rules.md)             | `.claude/rules/*.md`                                 |
| 7   | Cohérence CLAUDE.md ↔ skills ↔ memory | CRITIQUE | [checks-7-coherence.md](references/checks-7-coherence.md)     | `CLAUDE.md`, `.claude/skills/**`, `memory/MEMORY.md` |
| 8   | Errors INDEX cohérent                 | MINOR    | [checks-8-errors.md](references/checks-8-errors.md)           | `.claude/errors/*.md`                                |

## Format de sortie

```
## Audit structure Anthropic — {YYYY-MM-DD}

### Scorecard

| Section | Niveau | Score | Statut |
|---------|--------|-------|--------|
| 1. Frontmatter & metadata | CRITIQUE | 8.0/10 | OK |
| 2. Progressive disclosure | CRITIQUE | 6.5/10 | WARN |
| ... | ... | ... | ... |

**Score global pondéré : X.X / 10** (précédent : Y.Y / 10)

### Violations CRITIQUE
1. `.claude/skills/foo/SKILL.md:1` — règle 1.2 : frontmatter sans champ `description`
   → Attendu : description "ce que fait + quand utiliser"
   → Fix : ajouter description avec triggers concrets

### Violations MEDIUM / MINOR
[idem]

### Top 5 actions
1. **[CRITIQUE]** Quoi : ... | Pourquoi : ... | Effort : S/M/L | Fichiers : ...

### Comparaison vs audit précédent
[delta par section si fichier mémoire existe, sinon "Premier audit — pas de baseline"]
```

## Auto-fix (`--fix`)

Si `--fix` passé, corriger UNIQUEMENT les violations cosmétiques sûres (jamais de
réécriture sémantique sans validation) :

- **Rule sans `globs`** : proposer une valeur déduite du contenu (ex. fichier
  `db-schema.md` → `globs: supabase/migrations/**, src/lib/db/**`), demander
  confirmation avant écriture.
- **Fichier parasite dans un skill** (`README.md`, `CHANGELOG.md`,
  `INSTALLATION.md`, `QUICK_REFERENCE.md`) : confirmer puis supprimer via `trash`.
- **Référence cassée dans `CLAUDE.md` ou `MEMORY.md`** (skill listé mais
  inexistant) : signaler, demander si retirer la ligne.

NE JAMAIS auto-fix :

- une `description:` (jugement éditorial requis)
- un frontmatter complet
- la suppression d'un skill ou d'un agent
- la valeur d'un `globs:` sans confirmation utilisateur

Re-vérifier les règles corrigées et mettre à jour le scorecard.

## Règles du skill

- Lire les références concernées une seule fois
- Sortie concise, pas de prose, aller au scorecard
- Citer `fichier:ligne` pour chaque violation
- Ne jamais inventer de règle hors des références documentées
- Si `--full` produit > 50 violations : 20 premières par criticité + `+N autres dans <section>`
- En cas de doute sur une règle Anthropic, lire `~/.claude/skills/skill-creator/SKILL.md`
