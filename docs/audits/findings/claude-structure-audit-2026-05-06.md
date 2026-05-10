# Audit structure Anthropic EMIS — 2026-05-06

**Mode** : `--full` (premier passage baseline)
**Score global pondéré** : **7.7 / 10**
**Sections auditées** : 8 (4 CRITIQUE, 3 MEDIUM, 1 MINOR)
**Cibles** : 40 skills, 24 agents, 6 rules, 7 errors, `CLAUDE.md`, `MEMORY.md`, `docs/audits/`

## Scorecard

| #   | Section                               | Niveau   | Score   | Statut |
| --- | ------------------------------------- | -------- | ------- | ------ |
| 1   | Frontmatter & metadata des skills     | CRITIQUE | 6.3/10  | WARN   |
| 2   | Progressive disclosure & taille       | CRITIQUE | 6.3/10  | WARN   |
| 3   | Naming & filesystem                   | MEDIUM   | 8.6/10  | OK     |
| 4   | Qualité description & triggers        | CRITIQUE | 6.3/10  | WARN   |
| 5   | Agents (.claude/agents)               | MEDIUM   | 8.8/10  | OK     |
| 6   | Rules (.claude/rules) — globs, scope  | MEDIUM   | 8.8/10  | OK     |
| 7   | Cohérence CLAUDE.md ↔ skills ↔ memory | CRITIQUE | 9.0/10  | OK     |
| 8   | Errors INDEX cohérent                 | MINOR    | 10.0/10 | OK     |

Calcul : sections CRITIQUE × 3, MEDIUM × 2, MINOR × 1 — somme pondérée 146.1 / 190 max = 7.7/10.

## Forces

- **Cohérence MEMORY.md ↔ fichiers memory parfaite** : 19 entrées, 19 fichiers, 0 orphelin, 0 lien cassé
- **Index `docs/audits/README.md` à jour** : tous les snapshots de `findings/` sont listés
- **`INDEX.md` errors complet** : 7 fichiers, 7 entrées, lookup par symptôme cohérent (10/10)
- **Aucun skill > 500 lignes** : la règle Anthropic de progressive disclosure est respectée structurellement
- **Aucun skill imbriqué, aucun nom non kebab-case** : naming filesystem propre
- **Toutes les rules projet ont des `globs:` ciblés** sauf `process.md`
- **Roadmap `CLAUDE.md` cohérente avec les migrations** : 007_user_scoped_templates.sql cité = présent

## Violations CRITIQUE

### 1. Descriptions courtes sur skills `recipe-*`

11 skills `recipe-*` ont `description` < 80 caractères (règle 1.2). Tous ont `disable-model-invocation: true`, donc la description sert à l'humain via `/recipe-X`. Skills tiers marketplace — violation tolérable, à documenter.

### 2. Mismatch dossier ↔ frontmatter `name`

| Dossier                 | `name` frontmatter            | Origine     |
| ----------------------- | ----------------------------- | ----------- |
| `react-best-practices/` | `vercel-react-best-practices` | Vercel, MIT |
| `zod-v4/`               | `zod`                         | Anivar, MIT |

Risque : invocation `/react-best-practices` vs `/vercel-react-best-practices` ambiguë. Skills tiers — choix : renommer dossier OU changer `name`.

### 3. Fichier parasite `database-designer/README.md`

Skill non-tiers avec `README.md` à la racine. À côté : `schema_analyzer.py`, `index_optimizer.py`, `migration_generator.py` à la racine au lieu de `scripts/`, plus dossier `expected_outputs/` non-standard (pas dans `scripts|references|assets`).

### 4. Triggers absents en guillemets

11 skills knowledge ont une description type "Use when ..." mais aucune phrase utilisateur en guillemets (règle 4.2) :
`ai-development-guide`, `coding-principles`, `documentation-criteria`, `implementation-approach`, `integration-e2e-testing`, `subagents-orchestration-guide`, `task-analyzer`, `test-implement`, `testing-principles`, `typescript-rules`, `univer-patterns`.

Impact : Claude ne déclenchera pas ces skills depuis un trigger naturel.

### 5. Pas de clause de délégation entre `skill-adherence-audit` et `claude-structure-audit`

Les deux skills sont jumeaux (audit `.claude/` vs audit code). `skill-adherence-audit` ne mentionne pas le distinguo dans sa description (règle 4.4).

## Violations MEDIUM / MINOR

| #   | Règle | Fichier                                                                                      | Note                                                                                                        |
| --- | ----- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 6   | 6.1   | `.claude/rules/process.md:1-3`                                                               | `description:` au lieu de `globs:` — comportement non-déterministe                                          |
| 7   | 2.5   | `.claude/skills/database-designer/`                                                          | `.py` à la racine + dossier `expected_outputs/` non-standard                                                |
| 8   | 2.7   | `.claude/skills/ai-development-guide/SKILL.md`                                               | 366 lignes knowledge sans `references/` — candidat split                                                    |
| 9   | 2.1   | `recipe-reverse-engineer:431`, `subagents-orchestration-guide:444`, `testing-principles:490` | Proche limite 500 lignes                                                                                    |
| 10  | 2.2   | `supabase-postgres-best-practices/{README.md, AGENTS.md, CLAUDE.md}`                         | Tolérés (tiers Supabase) mais flag                                                                          |
| 11  | 5.3   | `.claude/agents/{database-architect, supabase-auditor}.md`                                   | Champ `tools` absent — surface trop large                                                                   |
| 12  | 4.7   | `fin-session`, `code-review`                                                                 | Skills clairement proactifs sans "proactivement" / "PROACTIVELY"                                            |
| 13  | 1.7   | `react-best-practices`, `supabase-postgres-best-practices`, `zod-v4`                         | Champs `license`, `metadata`, `agentic` (tolérables tiers)                                                  |
| 14  | 7.2   | ~25 skills                                                                                   | Présents mais pas listés `CLAUDE.md` (essentiellement marketplace `recipe-*`, `ai-development-guide`, etc.) |

## Top 5 actions

1. **[CRITIQUE]** Aligner `name` ↔ dossier pour les 2 skills tiers OU marquer tolérance explicite — **S** — `.claude/skills/react-best-practices/SKILL.md`, `.claude/skills/zod-v4/SKILL.md`
2. **[CRITIQUE]** Supprimer `database-designer/README.md` (parasite) et déplacer `.py` dans `scripts/` — **S** — `.claude/skills/database-designer/`
3. **[CRITIQUE]** Ajouter clause "Distinct de `claude-structure-audit` qui audite la structure" dans description de `skill-adherence-audit` — **S** — `.claude/skills/skill-adherence-audit/SKILL.md`
4. **[CRITIQUE]** Ajouter triggers concrets en guillemets dans descriptions des skills knowledge marketplace utilisés activement — **M** — 11 SKILL.md
5. **[MEDIUM]** Ajouter `globs: "**/*"` à `process.md` (rule transverse) — **S** — `.claude/rules/process.md`

## Inventaire audité

- **Skills** : 40 (`ai-development-guide`, `back-audit`, `catalog-error`, `claude-structure-audit`, `code-review`, `coding-principles`, `database-designer`, `documentation-criteria`, `domain-maintenance`, `fin-conversation`, `fin-session`, `fix-browser-error`, `generate-pdf`, `implementation-approach`, `import-excel`, `integration-e2e-testing`, `perf-audit`, `react-best-practices`, `recipe-add-integration-tests`, `recipe-build`, `recipe-design`, `recipe-diagnose`, `recipe-fullstack-build`, `recipe-fullstack-implement`, `recipe-implement`, `recipe-plan`, `recipe-reverse-engineer`, `recipe-review`, `recipe-task`, `recipe-update-doc`, `skill-adherence-audit`, `subagents-orchestration-guide`, `supabase-postgres-best-practices`, `task-analyzer`, `terrain-offline`, `test-implement`, `testing-principles`, `typescript-rules`, `univer-patterns`, `zod-v4`)
- **Agents** : 24 (acceptance-test-generator, codebase-analyzer, code-reviewer, code-verifier, database-architect, db-inspector, design-sync, document-reviewer, excel-analyst, integration-test-reviewer, investigator, prd-creator, quality-fixer, requirement-analyzer, rule-advisor, scope-discoverer, security-reviewer, solver, supabase-auditor, task-decomposer, task-executor, technical-designer, test-runner, verifier, work-planner)
- **Rules** : 6 (api-conventions, db-schema, excel-python, page-layout, process, tailwind-css)
- **Errors** : 7 (browser-env, css-tailwind, excel-sheetjs, nextjs-react, pwa-offline, supabase-postgres, univer)

## Comparaison vs audit précédent

Premier audit — pas de baseline. Les audits suivants compareront les scores section par section.
