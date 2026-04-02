---
name: tech-audit
description: Audit technique réutilisable — évalue 10 critères qualité du projet et produit un scorecard + top 5 actions
user_invocable: true
---

# Audit technique du projet EMIS

## Objectif

Évaluer la santé technique du projet sur 10 critères et produire un plan d'action priorisé.

## Procédure

### Étape 1 — Exploration parallèle (3 agents)

Lancer 3 agents Explore en parallèle :

**Agent 1 — Structure & Architecture**

- Arborescence `src/` (profondeur, organisation)
- Composants dupliqués (chercher patterns similaires entre fichiers)
- Taille des fichiers > 300 lignes (candidats au refactoring)
- Imports circulaires

**Agent 2 — Qualité du code**

- Couverture de tests : présence de `*.test.ts`, `*.spec.ts`
- Types : compter les `any` explicites, `Record<string, unknown>` non-documentés
- Validation des inputs (Zod ou équivalent sur les routes API)
- Gestion d'erreurs dans les API routes

**Agent 3 — Config & Infra**

- CI/CD : `.github/workflows/`, scripts npm
- Formatage : Prettier config, lint-staged, husky
- Variables d'env : `.env.local` vs `.env.example`
- Sécurité : RLS, auth middleware, service role key

### Étape 2 — Scorecard (10 critères)

| #   | Critère                                       | Score 0-10 | Poids |
| --- | --------------------------------------------- | ---------- | ----- |
| 1   | Architecture (séparation concerns, cohérence) |            | x2    |
| 2   | Tests (couverture, qualité)                   |            | x3    |
| 3   | CI/CD (pipeline, quality gates)               |            | x2    |
| 4   | Sécurité (auth, RLS, validation inputs)       |            | x2    |
| 5   | Types (exhaustivité, cohérence)               |            | x1    |
| 6   | Duplication (DRY, code partagé)               |            | x1    |
| 7   | Formatage (Prettier, cohérence style)         |            | x1    |
| 8   | Git (branches, commits, hooks)                |            | x1    |
| 9   | Documentation (README, CLAUDE.md, JSDoc)      |            | x1    |
| 10  | Validation données (frontière Excel/DB)       |            | x2    |

**Score pondéré** = Σ(score × poids) / Σ(poids) → note /10

### Étape 3 — Top 5 actions prioritaires

Pour chaque action :

1. **Quoi** : description en 1 phrase
2. **Pourquoi** : impact attendu
3. **Effort** : S/M/L
4. **Fichiers concernés**

### Étape 4 — Comparaison (si audit précédent disponible)

Chercher dans la mémoire projet un fichier `audit_*.md`. Si trouvé :

- Comparer les scores critère par critère
- Identifier les améliorations et régressions
- Mettre à jour le fichier mémoire avec le nouveau score

Si c'est le premier audit :

- Sauver les résultats dans la mémoire projet : `project_tech_audit.md`

## Format de sortie

```
## Audit technique — {date}

### Scorecard
[Tableau 10 critères avec scores]

**Score global : X.X / 10** (précédent : Y.Y / 10)

### Top 5 actions
1. ...
2. ...

### Détails par critère
[Explications, fichiers concernés, exemples]
```

## Fréquence recommandée

- Après chaque phase majeure complétée
- Avant un jalon (démo, mise en prod)
- Mensuellement en routine
