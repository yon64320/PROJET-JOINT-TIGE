# Audits du projet EMIS

Index chronologique des audits réalisés sur le projet. Chaque audit a deux représentations :

- **Ici (`docs/audits/`)** : snapshot complet, daté, archivé dans Git → versionné, partageable, relisable hors-Claude.
- **Dans `memory/project_*_audit.md`** : synthèse vivante, plus courte, utilisée par Claude comme baseline pour comparer aux audits suivants.

## Convention

| Type de fichier       | Emplacement                                  | Contenu                                                    |
| --------------------- | -------------------------------------------- | ---------------------------------------------------------- |
| Plan / prompt d'audit | `docs/audits/audit-{nom}.md`                 | Brief autonome pour lancer un audit                        |
| Résultat daté         | `docs/audits/findings/{nom}-{YYYY-MM-DD}.md` | Snapshot complet avec scorecard, violations, fix appliqués |
| Synthèse Claude       | `memory/project_{nom}_audit.md`              | Baseline courte pour comparaison                           |

Quand un audit récurrent (`back-audit`, `perf-audit`) est ré-exécuté, le skill génère un **nouveau snapshot daté** dans `findings/` et **met à jour** la synthèse `memory/` avec le delta vs baseline précédente.

## Index — résultats

| Date       | Audit                                                 | Score                                     | Lien                                                                                               | Status                                                                                                                     |
| ---------- | ----------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-06 | **claude-structure-audit** (passage 2, post-fixes)    | 9.8/10 (+2.1 vs baseline)                 | [findings/claude-structure-audit-2026-05-06-2.md](findings/claude-structure-audit-2026-05-06-2.md) | Toutes sections OK, fixes appliqués (database-designer cleanup, name alignés, tools ajoutés, tolérances tiers documentées) |
| 2026-05-06 | **claude-structure-audit** (premier passage `--full`) | 7.7/10 baseline                           | [findings/claude-structure-audit-2026-05-06.md](findings/claude-structure-audit-2026-05-06.md)     | Baseline (16 corrections appliquées dans passage 2)                                                                        |
| 2026-05-04 | **perf-audit** (premier passage `--full`)             | 6.8/10 baseline → ~9/10 après corrections | [findings/perf-audit-2026-05-04.md](findings/perf-audit-2026-05-04.md)                             | 9 CRITIQUE corrigés                                                                                                        |
| 2026-05-04 | **back-audit** (premier passage `--full`)             | 9.0/10                                    | [findings/back-audit-2026-05-04.md](findings/back-audit-2026-05-04.md)                             | Top 5 corrigés (migration 006 + helper `serverError`)                                                                      |
| 2026-04-29 | Synthèse 4 audits (RLS + correctness + CI + deps)     | 🔴 ROUGE → corrigé                        | [findings/synthese-2026-04-29.md](findings/synthese-2026-04-29.md)                                 | Toutes les failles HIGH closes par migration 002 + commits associés                                                        |
| 2026-04-29 | RLS Supabase (audit ciblé service-role)               | —                                         | [findings/rls-2026-04-29.md](findings/rls-2026-04-29.md)                                           | Inclus dans la synthèse                                                                                                    |
| 2026-04-29 | Correctness domain                                    | —                                         | [findings/correctness-2026-04-29.md](findings/correctness-2026-04-29.md)                           | Inclus dans la synthèse                                                                                                    |
| 2026-04-29 | CI / quality gates                                    | —                                         | [findings/ci-2026-04-29.md](findings/ci-2026-04-29.md)                                             | Inclus dans la synthèse                                                                                                    |
| 2026-04-29 | Dépendances / secrets                                 | —                                         | [findings/audit-deps-secrets.md](findings/audit-deps-secrets.md)                                   | Inclus dans la synthèse                                                                                                    |

## Index — plans / prompts d'audit

| Plan                     | Domaine                                               | Lien                                                       |
| ------------------------ | ----------------------------------------------------- | ---------------------------------------------------------- |
| Audit RLS Supabase       | Sécurité autorisation, service-role, RLS multi-tenant | [audit-rls-supabase.md](audit-rls-supabase.md)             |
| Audit CI / quality gates | Pipelines CI, hooks, lint, tests                      | [audit-ci-quality-gates.md](audit-ci-quality-gates.md)     |
| Audit domain correctness | Logique métier (triplet EMIS/BUTA, OPERATION, valves) | [audit-domain-correctness.md](audit-domain-correctness.md) |

## Skills d'audit récurrents

Le projet définit 4 skills qui produisent des snapshots datés ici :

- **`/back-audit`** — back-end (auth, RLS, validation, atomicité, perf DB, schéma, storage, errors). 9 sections, pondéré.
- **`/perf-audit`** — performance full-stack (RSC, bundle, data fetching, DB, Univer, offline, Web Vitals, workers). 8 sections, pondéré.
- **`/claude-structure-audit`** — structure Anthropic (frontmatter skills, progressive disclosure, naming, cohérence CLAUDE.md ↔ skills ↔ memory, errors INDEX). 8 sections, pondéré.
- **`/code-review`** — review ponctuelle de changements git (sécurité, perf, patterns, conventions).

Lancer un audit en chat → skill produit le rapport + sauvegarde automatique dans `docs/audits/findings/{nom}-{YYYY-MM-DD}.md` + mise à jour de `memory/project_{nom}_audit.md`.

## Lien avec `docs/pivot.md`

Quand un audit débouche sur un revirement ou une décision structurelle (migration, refactor, abandon de pattern), une entrée datée est ajoutée à [`../pivot.md`](../pivot.md) avec le lien vers le snapshot ici.
