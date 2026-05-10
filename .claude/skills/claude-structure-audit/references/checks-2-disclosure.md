# Section 2 — Progressive disclosure & taille

**Niveau** : CRITIQUE
**Cibles** : `.claude/skills/**`

Le contexte est public. Un SKILL.md trop gros pollue chaque session où il se
charge. La règle Anthropic : SKILL.md ≤ 500 lignes, contenu détaillé poussé
en `references/`, scripts dans `scripts/`, assets dans `assets/`.

## Règles

### 2.1 — SKILL.md ≤ 500 lignes

- **Méthode** : `wc -l` (ou Read + count)
- **Pattern** :
  ```
  for f in .claude/skills/*/SKILL.md; do
    lines=$(wc -l < "$f")
    [ "$lines" -gt 500 ] && echo "$f:$lines"
  done
  ```
- **Attendu** : 0 fichier > 500 lignes.
- **Signal WARN** : 400 < lignes ≤ 500 (proche limite, plan à splitter).
- **Signal FAIL** : > 500 lignes — splitter en `references/`.

### 2.2 — Pas de fichier parasite dans un skill

- **Méthode** : Glob
- **Cibles** : `.claude/skills/*/{README,CHANGELOG,INSTALLATION,INSTALL,QUICK_REFERENCE,USAGE}.md`
- **Attendu** : 0 résultat. Le SKILL.md est l'unique point d'entrée — pas de
  documentation auxiliaire (clutter, contexte gaspillé).
- **Signal FAIL** : tout fichier parasite à supprimer (`/trash`).
- **Exceptions tolérées** (skills tiers MIT — fidélité upstream) :
  - `LICENSE` partout (obligatoire pour la licence MIT)
  - `react-best-practices/LICENSE` (Vercel)
  - `zod-v4/LICENSE` (Anivar)
  - `supabase-postgres-best-practices/{README.md, AGENTS.md, CLAUDE.md}` (bundle Supabase)
- **Skills non-tiers** : règle stricte, aucune exception.

### 2.3 — Structure `references/` quand utilisée

- **Méthode** : Glob + Read
- **Pattern** : si un skill a un dossier `references/`, vérifier :
  - profondeur ≤ 1 niveau (pas de `references/sub/sub/...`)
  - chaque fichier référencé dans SKILL.md existe
  - chaque fichier référence est référencé au moins une fois dans SKILL.md
- **Attendu** : pas de fichier orphelin, pas de lien cassé.
- **Signal WARN** : fichier `references/foo.md` existe mais jamais référencé.
- **Signal FAIL** : SKILL.md pointe vers `references/foo.md` qui n'existe pas.

### 2.4 — Pas de duplication SKILL.md ↔ references/

- **Méthode** : grep + jugement
- **Pattern** : pour chaque skill avec `references/`, scanner si des sections
  entières du SKILL.md sont dupliquées dans les références (table de règles,
  exemples).
- **Attendu** : SKILL.md = workflow + index, references = contenu détaillé.
- **Signal WARN** : duplication ≥ 30 lignes.
- **Note** : règle de jugement, ne pas faire de comparaison char-par-char.

### 2.5 — `scripts/` testable et documenté

- **Méthode** : Read + jugement
- **Pattern** : pour chaque fichier dans `scripts/` :
  - extension cohérente avec le shebang/runtime
  - mentionné quelque part dans SKILL.md (sinon orphelin)
- **Signal WARN** : script orphelin, ou script mentionné dans SKILL.md mais inexistant.

### 2.6 — `assets/` ne contient que des outputs

- **Méthode** : Glob
- **Attendu** : pas de `.md` dans `assets/` (ce serait des références déguisées).
- **Signal WARN** : `.md` dans `assets/` → déplacer vers `references/`.

### 2.7 — Skill purement knowledge ≤ 200 lignes

- **Méthode** : Read + jugement
- **Pattern** : un skill sans flag, sans workflow, juste une référence (ex.
  `coding-principles`, `react-best-practices`) doit être compact.
- **Signal WARN** : skill knowledge > 300 lignes sans `references/` — candidat
  au split même s'il est < 500.

### 2.8 — Profondeur des liens dans les references

- **Méthode** : grep liens markdown
- **Attendu** : les references linkent vers SKILL.md ou entre elles à plat.
  Pas de `references/foo.md` qui linke vers `references/sub/bar.md`.
- **Signal WARN** : nesting > 1 niveau dans les references.
