---
name: fin-conversation
description: >
  Audit de fin de conversation avant `/clear` du contexte. Distinct de
  `fin-session` (git-based, applique direct depuis HEAD~1) — celui-ci se
  base sur la conversation entière, applique un **filtre de pertinence
  strict** (ne trace que ce qui est structurant), et **auto-applique**
  les modifications sur fichiers de documentation passive (`CLAUDE.md`,
  `.claude/rules/`, `memory/`, `docs/pivot.md`, `docs/audits/README.md`,
  `.claude/errors/`). Demande validation explicite **uniquement** pour
  les modifications de `.claude/skills/**` et `.claude/agents/**` qui
  altèrent le comportement runtime de Claude.
  Utiliser quand l'utilisateur dit "fin de conversation", "avant /clear",
  "wrap up", "audit avant clear", "structure check".
user-invocable: true
argument-hint: "[--dry-run]"
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, AskUserQuestion
---

# Fin de conversation — audit structurel avant `/clear`

Tu es invoqué juste avant `/clear`. Mission : tracer **uniquement** ce
qui est structurant dans les fichiers Claude Code, en respectant les
conventions Anthropic ([references/conventions-anthropic.md](references/conventions-anthropic.md)).

**Vs `fin-session`** : `fin-session` regarde le `git diff HEAD~1` et
applique direct. Celui-ci regarde la conversation entière, **filtre par
pertinence**, et applique direct **sauf** pour les fichiers qui
définissent le comportement de Claude (skills + agents) où une
validation est requise.

## Phase 1 — Inventaire conversation

Récapituler **soi-même** (sans outil) :

- Modifications de code (nouveaux fichiers, refactors significatifs)
- Décisions techniques ou stratégiques prises
- Bugs résolus avec leur cause racine
- Préférences utilisateur (corrections OU validations surprenantes)
- Patterns émergents (3+ occurrences = candidat rule)
- Intentions futures non codées

## Phase 2 — Filtre de pertinence

**Ne pas tout tracer.** Appliquer ce filtre AVANT toute proposition.
Skip silencieux pour ce qui ne passe pas — ne pas le mentionner dans
le rapport.

| Mérite trace                                                            | À skipper                            |
| ----------------------------------------------------------------------- | ------------------------------------ |
| Décision archi impactant 3+ fichiers ou cross-domain                    | Fix ponctuel isolé                   |
| Revirement, abandon de feature en cours                                 | Amélioration mineure (typo, format)  |
| Convention transverse nouvelle (ex. "tous les audits archivent dans X") | Détail dérivable du code             |
| Préférence user explicite et forte                                      | Évidence ("le code suit Next.js")    |
| Pattern 3+ occurrences                                                  | Pattern unique                       |
| Bug non-évident (piège récurrent)                                       | Bug local résolu dans un commit      |
| Audit complet lancé (back/perf/code-review)                             | Audit qui passe sans rien trouver    |
| Création d'un skill ou agent                                            | Réorganisation cosmétique d'un skill |

**Règle d'or** : si tu hésites à tracer, **skip**. La concision a plus de
valeur que l'exhaustivité.

## Phase 3 — Conformité Anthropic

Pour chaque fichier qui sera touché en Phase 5, vérifier la conformité au
format canonique. Référence détaillée :
[references/conventions-anthropic.md](references/conventions-anthropic.md).

## Phase 4 — Classification par mode d'action

| Mode         | Cibles                                                                                                                   | Action                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| **AUTO**     | `CLAUDE.md`, `.claude/rules/*.md`, `.claude/errors/*.md`, `memory/*.md` + `MEMORY.md`, `docs/pivot.md`, `docs/audits/**` | Appliquer direct                      |
| **APPROVAL** | `.claude/skills/**/*.md` (SKILL.md + references/), `.claude/agents/*.md`                                                 | Présenter fiche + demander validation |

**Pourquoi cette distinction** : skills et agents définissent le
comportement de Claude au prochain trigger. Les autres fichiers sont de
la documentation passive — leur modification n'altère pas le comportement
runtime.

## Phase 5 — Application

### Pour les AUTO

1. Appliquer chaque modification (Edit pour update, Write pour nouveau)
2. Annoncer en chat 1 ligne par modif :
   `✓ <fichier> — <quoi>`

### Pour les APPROVAL (skills/agents)

1. Présenter fiche numérotée :
   ```
   [N] <fichier>
   Quoi : <résumé 1 ligne>
   Pourquoi : <ce que la conversation a révélé>
   Diff : <bloc avant/après>
   ```
2. Si 2-4 propositions : `AskUserQuestion` (multiSelect)
3. Si > 4 propositions : demander réponse texte libre
   (`"1, 3, 5-7"`, `"tous"`, `"aucun"`, `"X sauf Y"`)
4. Appliquer **uniquement** les validés

Si `--dry-run` : ne rien appliquer, juste afficher le plan.

## Phase 6 — Synthèse

```
## Audit fin de conversation — YYYY-MM-DD

### Auto-appliqué (N)
- ✓ <fichier> — <quoi>
…

### Skills/agents — validation requise (N)
[fiches numérotées]

### Suggestion commit
git add -A && git commit -m "docs: sync .claude structure"
```

Si rien à tracer : afficher
`Aucune trace nécessaire — la conversation n'a rien produit de structurant.`

## Règles strictes

- **Filtrer avant tracer** — la concision prime sur l'exhaustivité.
- **AUTO sans demander** — ne pas spammer l'utilisateur de validations
  triviales (rules, memory, pivot, errors, CLAUDE.md, audits index).
- **APPROVAL pour skills/agents uniquement** — fichiers qui modifient le
  comportement Claude → validation user obligatoire.
- **Pas d'invention** — si une justification manque, demander avant trace.
- **Privilégier l'enrichissement** — pas de nouveau fichier si un
  existant peut accueillir le contenu.
- **Pas de duplication** : `pivot.md` ≠ `memory/` ≠ `rules/`. Référer à
  [references/conventions-anthropic.md](references/conventions-anthropic.md)
  pour la séparation des rôles.
- **Si `/fin-session` déjà exécuté dans la conversation** : ne pas
  refaire le diff git, focus sur les décisions purement
  conversationnelles et la conformité Anthropic.
- **MEMORY.md cohérent** : toute nouvelle mémoire ajoutée → maj de
  l'index dans la même opération.
