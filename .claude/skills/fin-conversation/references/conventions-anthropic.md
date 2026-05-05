# Conventions Anthropic — checklist par type de fichier

Référence canonique pour auditer chaque fichier structurant Claude Code. Sources : skills officiels `claude-memory`, `skill-creator`, `write-for-claude` + docs Anthropic.

---

## CLAUDE.md (project, racine ou `.claude/`)

### Sections autorisées (uniquement)

1. **Project purpose** (1-3 lignes) — ce que fait le projet
2. **Tech stack** (compact) — uniquement technologies non-évidentes
3. **Commands** — dev/build/test non-évidents
4. **Important files** — fichiers architecture-critiques non-évidents
5. **Rules** — interdictions et contraintes (lignes les plus utiles)
6. **Workflow** (optionnel) — uniquement si non-standard

### À NE PAS inclure

- Repository overviews (Claude découvre la structure seul)
- Code style rules (les linters s'en chargent)
- Generic best practices ("write clean code", DRY, SOLID)
- Spec redondantes (copies de configs, env vars, schémas)
- Marketing / vision / roadmap stratégique
- Explications verbeuses (un paragraphe quand une ligne suffit)

### Métriques

- Cible : < 200 lignes par fichier principal
- Concision avant tout — chaque ligne doit justifier son coût en tokens

---

## `.claude/rules/*.md`

### Frontmatter

```yaml
---
globs: "src/app/api/**/*.ts"
---
```

(`paths:` aussi accepté selon version. Le projet EMIS utilise `globs:`.)

Sans frontmatter → chargé inconditionnellement (rare).

### Contenu

- Patterns vérifiables avec exemples code (correct vs incorrect)
- Concis (une rule = un domaine)
- Pas de prose, des règles

### Patterns globs supportés

`**/*.ts`, `src/**/*`, `src/**/*.{ts,tsx}`, `{src,lib}/**/*.ts`

---

## `.claude/skills/<name>/SKILL.md`

### Frontmatter

**Obligatoire** :

- `name` : kebab-case (default = nom du dossier)
- `description` : précise + contient les **triggers** ("Use when user says X, Y, Z")

**Optionnels** :

- `user-invocable: true` — pour `/skill-name`
- `argument-hint: "[--flag]"`
- `allowed-tools: Read, Edit, Bash` — restreint les outils
- `agent: general-purpose` — agent à invoquer
- `context: fork` — fork du contexte conversation

### Contenu

- **< 500 lignes** strict (cible : < 200)
- Progressive disclosure : détails dans `references/`
- Mode impératif ("Lire X", "Vérifier Y") — pas de prose
- "Default assumption: Claude is already very smart" → ajouter uniquement le contexte que Claude n'a pas

### Structure du dossier

```
skill-name/
├── SKILL.md          (requis)
├── references/       (chargés à la demande)
├── scripts/          (exécutables optionnels)
└── assets/           (templates / icônes / fonts)
```

### Triggers dans la description

Le système matche la description pour décider quand auto-déclencher. Donc :

- **Verbes utilisateur** : "quand l'utilisateur dit X, Y, Z"
- **Contexte fichier** : "quand on travaille sur src/lib/foo"
- **Pas de jargon vague** : éviter "à utiliser parfois"

---

## `.claude/agents/*.md`

### Frontmatter

```yaml
---
name: codebase-analyzer
description: Analyzes existing codebase objectively. Use when existing code needs to be understood without hypothesis bias.
tools: Read, Grep, Glob, LS, Bash
---
```

### Contenu

Comme un skill, mais agent = exécuteur autonome avec outils délégués. Description doit indiquer **quand l'invoquer** vs résoudre soi-même.

---

## Mémoires (`memory/*.md`)

### Frontmatter obligatoire

```yaml
---
name: nom-court
description: phrase précise — sert au matching de pertinence en contexte futur
type: user | feedback | project | reference
---
```

### Structure du corps

```markdown
Règle ou fait principal.

**Why:** Raison (incident passé, contrainte, préférence forte)
**How to apply:** Quand et où appliquer
```

### Quand sauvegarder

| Type        | Critère                                                                          |
| ----------- | -------------------------------------------------------------------------------- |
| `user`      | Détail sur le rôle, préférence, contexte de l'utilisateur                        |
| `feedback`  | Correction (« non pas comme ça ») OU validation surprenante (« oui exactement ») |
| `project`   | Décision architecturale, deadline, motivation non-dérivable du code              |
| `reference` | Pointeur vers ressource externe (Linear, Slack, Grafana)                         |

### Quand NE PAS sauvegarder

- Code patterns / conventions / archi → dérivable du code
- Git history / who-changed-what → `git log` / `git blame`
- Bug solutions → corrigé dans le code, le commit message a le contexte
- Déjà documenté dans CLAUDE.md
- Détails éphémères (état conversation courante)

---

## `MEMORY.md` (index)

- **Pas de frontmatter**
- Une ligne par mémoire : `- [Titre](fichier.md) — accroche d'une ligne`
- Lignes < 150 caractères
- Organisé par sections sémantiques (User, Feedback, Décisions, État features…)
- Toujours chargé en contexte → max ~200 lignes (au-delà tronqué)

---

## `docs/pivot.md`

### Format strict

- Antichronologique (récent en haut)
- Une entrée par décision marquante :

```markdown
## YYYY-MM-DD — Titre court

**Décision** : ce qui a été acté.
**Justification** : pourquoi (incident, contrainte, préférence user).
**Avant/après** : si revirement, ce qui a changé.
```

### Cas à tracer obligatoirement

- Revirement (option A → option B mid-stream)
- Suppression d'une feature/colonne/RPC déployée
- Choix entre 2+ alternatives techniques
- Modification d'une convention établie

### Règle d'or

Si la justification d'une décision n'est pas explicite dans la conversation, **demander à l'utilisateur** avant d'écrire l'entrée. Ne jamais inventer une motivation.

### Différence pivot vs memory

- `pivot.md` = timeline brute (y compris dérivable du code)
- `memory/` = règles réutilisables (NON dérivables du code)

Une même décision peut alimenter les deux.

---

## `.claude/settings.json` / `settings.local.json`

### Sections valides

```json
{
  "permissions": { "allow": [...] },
  "hooks": { "Stop": [...], "PreToolUse": [...] },
  "enabledMcpjsonServers": ["..."],
  "enableAllProjectMcpServers": true
}
```

### Bonnes pratiques

- Hooks → uniquement pour automatisations (pas pour préférences mémoire)
- `permissions.allow` → minimaliste, ajouter au cas par cas
- JSON valide strict (pas de commentaires)

---

## `.claude/errors/`

- `INDEX.md` : table de tous les bugs catalogués par domaine
- `<domaine>.md` (ex. `nextjs-react.md`, `supabase-postgres.md`) : entrées de bugs avec :
  - Titre du bug
  - Symptôme
  - Cause racine
  - Fix
  - Date

---

## Principes transversaux (tous fichiers `.md` Claude)

- **Concision** : <200 lignes par fichier principal
- **Spécificité** : règles vérifiables ("utiliser `pnpm lint`"), jamais vagues
- **Pas de redondance** : ne pas documenter ce que Claude infère du code
- **Emphase parcimonieuse** : `IMPORTANT:`, `NEVER`, `YOU MUST` perdent leur effet si surutilisés
- **Instructions positives** : "utiliser `trash`" plutôt que "ne jamais utiliser `rm -rf`"
- **Ancrage début/fin** : règles critiques en premier ou dernier (le milieu est oublié)

## Sources

- `~/.claude/skills/claude-memory/SKILL.md`
- `~/.claude/skills/skill-creator/SKILL.md`
- `~/.claude/skills/write-for-claude/SKILL.md`
- https://code.claude.com/docs/llms.txt
