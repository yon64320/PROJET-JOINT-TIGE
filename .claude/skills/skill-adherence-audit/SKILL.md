---
name: skill-adherence-audit
description: >
  Audit d'adherence — verifie si le code produit respecte les patterns
  documentes dans les skills et rules du projet. Utiliser quand l'utilisateur
  dit "audit skills", "check adherence", "est-ce que t'as respecte les skills",
  ou en complement de fin-session pour valider le code (pas les .md).
user-invocable: true
context: fork
agent: general-purpose
allowed-tools: Read, Glob, Grep, Bash, Edit
argument-hint: "[skill-name] [--fix] [--full]"
---

# Audit d'adherence skills/rules

Verifier que le code produit pendant la session respecte les patterns et conventions
documentes dans les skills (.claude/skills/_/SKILL.md) et rules (.claude/rules/_.md).

Ceci n'est PAS un audit des fichiers .md (c'est fin-session). C'est un audit du CODE vs les REGLES.

## Contexte automatique

Fichiers modifies :

```
!`git diff --name-only HEAD~1 2>/dev/null; git diff --name-only 2>/dev/null; git diff --name-only --cached 2>/dev/null`
```

## Phase 1 — Identification du scope

1. A partir des fichiers modifies ci-dessus, deduire les skills et rules pertinents
   via la table dans [references/file-skill-map.md](references/file-skill-map.md).

2. Si un argument `skill-name` est passe (ex: `/skill-adherence-audit terrain-offline`),
   ne scope que sur ce skill. Sinon, prendre tous les skills/rules matches.

3. Si `--full` est passe, auditer TOUS les skills et rules, pas seulement ceux du diff.

4. Si aucun fichier modifie ne matche de skill/rule, afficher :
   "Aucun skill/rule concerne par les changements actuels." et s'arreter.

5. Lister les skills/rules identifies. Si pas `--full`, demander confirmation
   avant de continuer (sauf si un seul skill est concerne).

## Phase 2 — Extraction des regles

Pour chaque skill/rule identifie :

1. Lire le SKILL.md ou le fichier .md de la rule
2. Extraire chaque regle verifiable. Consulter
   [references/rule-extraction-guide.md](references/rule-extraction-guide.md) pour la methode.
3. Classer : **auto-verifiable** (grep/read) | **jugement** (analyse semantique) | **non applicable**
4. Eliminer les "non applicable" — ne garder que les regles qui concernent les fichiers du diff

Ne jamais inventer de regle. Uniquement celles documentees dans les .md existants.

## Phase 3 — Verification

Pour chaque regle retenue :

1. **Auto-verifiable** : executer le grep ou lire le code. Resultat binaire.
2. **Jugement** : lire le code concerne et evaluer. Etre factuel, pas opinione.
3. Attribuer un statut :
   - `PASS` — regle respectee
   - `WARN` — partiellement respectee ou cas limite
   - `FAIL` — violation claire
4. Si `WARN` ou `FAIL` : citer le fichier, la ligne, ce qui est attendu vs trouve.

## Phase 4 — Scorecard

Afficher le rapport :

```
## Audit adherence — [date]

**Scope** : N fichiers → [skills/rules concernes]
**Score** : X/Y regles respectees (Z%)

### [Nom du skill/rule]

| # | Regle | Statut | Detail |
|---|-------|--------|--------|
| 1 | Description courte | PASS/WARN/FAIL | fichier:ligne si violation |

### Violations a corriger
1. `fichier:ligne` — attendu: X, trouve: Y

### Recommandations
- Actions concretes si violations trouvees
```

## Phase 5 — Auto-fix (si `--fix`)

Si `--fix` est passe en argument :

1. Corriger les violations auto-fixables (patterns de code, imports, nommage)
2. Ne PAS toucher aux violations qui necessitent un choix d'architecture
3. Apres correction, re-verifier les regles corrigees et mettre a jour le scorecard
4. Lister ce qui a ete corrige et ce qui reste a faire manuellement

## Regles du skill

- Lire les skills/rules une seule fois au debut, pas a chaque regle
- Le rapport est affiche a l'utilisateur, pas ecrit dans un fichier (sauf demande)
- Etre concis : pas de prose, aller droit au resultat
- Si le diff est vide, s'arreter immediatement
- Les regles de jugement doivent rester factuelles — "ce fichier n'utilise pas TerrainLayout" pas "l'architecture est mauvaise"
