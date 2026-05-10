# Section 8 — Errors INDEX cohérent

**Niveau** : MINOR
**Cibles** : `.claude/errors/INDEX.md`, `.claude/errors/*.md`

Le référentiel d'erreurs n'est utile que si l'INDEX route correctement vers le
bon fichier. Dérive classique : on ajoute une entrée dans un fichier `errors/foo.md`
sans la lister dans `INDEX.md` (ou inverse).

## Règles

### 8.1 — Tous les fichiers `errors/*.md` listés dans `INDEX.md`

- **Méthode** : Glob + grep
- **Pattern** : chaque `.claude/errors/*.md` (hors INDEX.md) doit apparaître dans la
  table "Fichiers référentiels" d'`INDEX.md`.
- **Signal FAIL** : fichier d'erreurs présent mais absent de l'index.

### 8.2 — Toutes les entrées `INDEX.md` pointent vers un fichier existant

- **Méthode** : Read `INDEX.md` + cross-check
- **Pattern** : chaque lien `[file.md](file.md)` dans INDEX.md → le fichier doit exister.
- **Signal FAIL** : lien cassé.

### 8.3 — Lookup par symptôme cohérent avec le contenu

- **Méthode** : Read INDEX.md + sample read 3 fichiers cibles
- **Pattern** : pour 3 lignes random de la table "Lookup rapide par symptôme",
  vérifier que la section citée existe vraiment dans le fichier cible.
- **Signal WARN** : section nommée dans INDEX.md mais introuvable dans le fichier.

### 8.4 — Pas de doublons de symptôme

- **Méthode** : Read INDEX.md
- **Pattern** : un même symptôme ne doit pas apparaître dans 2 lignes du tableau "Lookup".
- **Signal WARN** : doublon (l'utilisateur ne sait pas où chercher).

### 8.5 — Domaines couverts cohérents avec les rules

- **Méthode** : grep cross
- **Pattern** : si une rule existe pour un domaine (ex. `excel-python.md`,
  `tailwind-css.md`), un fichier d'erreurs équivalent existe ou ne se justifie pas.
- **Note** : règle souple — les erreurs catégorisent par techno (univer,
  supabase-postgres, etc.), les rules par convention. Pas un mapping 1:1 strict.
- **Signal WARN** : rule sans erreur catalogée alors que des bug fixes ont eu lieu
  (jugement, hors scope strict).

### 8.6 — INDEX.md mentionne `/catalog-error`

- **Méthode** : grep
- **Pattern** : l'INDEX dit aux lecteurs comment ajouter une erreur.
- **Attendu** : mention de `catalog-error` ou `/catalog-error`.
- **Signal WARN** : pas de pointeur vers le workflow d'ajout — l'index dérive seul.
