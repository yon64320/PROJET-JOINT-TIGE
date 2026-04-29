---
name: fin-session
description: >
  Audit de fin de session — verifie si les fichiers .md du projet
  (CLAUDE.md, rules, skills, memory) sont a jour par rapport aux
  changements de code effectues. Utiliser en fin de session de dev,
  ou quand l'utilisateur dit "mets a jour la doc", "sync les .md",
  "fin de session".
user-invocable: true
context: fork
agent: general-purpose
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
argument-hint: "[--dry-run]"
---

# Fin de session — audit et mise a jour des .md

Tu es invoque en fin de session de developpement. Ta mission :
identifier ce qui a change dans le code et mettre a jour les .md
concernes (CLAUDE.md, rules, skills, memory).

## Contexte automatique

Fichiers modifies depuis le dernier commit propre :

```
!`git diff --stat HEAD~1`
```

Commits recents :

```
!`git log --oneline -5`
```

## Workflow

1. **Categoriser les changements** a partir du diff injecte ci-dessus.
   Utiliser la matrice dans [references/checklist.md](references/checklist.md)
   pour identifier les .md potentiellement impactes.

2. **Lire chaque .md identifie.** Comparer son contenu avec l'etat reel
   du code. Chercher :
   - Roadmap/statuts perimes (features marquees "A faire" alors qu'elles sont done)
   - Listes de migrations, tables, ou RPC incompletes
   - Patterns ou conventions non documentes qui apparaissent dans le diff
   - Skills/rules qui ne mentionnent pas une techno ou un piege rencontre
   - Memoires projet dont le statut a change

3. **Appliquer les corrections** directement (Edit tool).
   Respecter les conventions :
   - CLAUDE.md : concis, tableaux, pas de prose
   - Rules : exemples de code, pattern correct vs incorrect
   - Skills : imperatif, < 500 lignes, progressive disclosure
   - Memory : frontmatter (name, description, type) + Why/How to apply

4. **Mettre a jour `docs/pivot.md`** avec les decisions et changements
   de cap pris pendant la session. Creer le fichier s'il n'existe pas
   (avec un titre `# Pivot — historique des decisions`).

   Une entree par decision, en tete du fichier (ordre antichronologique) :

   ```
   ## YYYY-MM-DD — Titre court

   **Decision** : ce qui a ete acte
   **Justification** : pourquoi (incident, contrainte, preference user)
   **Avant/apres** : si revirement, ce qui a change
   ```

   Cas a tracer obligatoirement :
   - Revirement (option A abandonnee pour option B en cours de projet)
   - Suppression d'une feature/colonne/RPC anterieurement deployee
   - Choix entre 2+ alternatives techniques
   - Modification d'une convention etablie (nommage, structure, pattern)

   **Si la justification d'une decision n'est pas explicite dans
   l'historique de la conversation, DEMANDER a l'utilisateur** avant
   d'ecrire l'entree. Ne jamais inventer une motivation.

5. **Si `--dry-run`** est passe en argument : lister les changements
   proposes sans les appliquer. Sinon, appliquer et resumer.

6. **Resumer** en une liste a puces ce qui a ete mis a jour et pourquoi.

## Regles

- Ne jamais inventer d'information. Si un doute, lire le fichier source.
- Ne pas creer de nouveaux fichiers .md sauf si un skill ou une rule
  manque totalement (nouveau domaine technique sans skill existant).
  Exception : `docs/pivot.md` est cree au besoin (etape 4 du workflow).
- Ne pas toucher aux fichiers qui ne sont pas impactes par le diff.
- Privilegier l'enrichissement de l'existant plutot que la creation.
- Les fichiers memoire ne doivent contenir que des decisions et
  preferences non derivables du code.
- Pour `docs/pivot.md` : chaque entree doit avoir une justification
  explicite. Demander a l'utilisateur si elle n'est pas connue.
