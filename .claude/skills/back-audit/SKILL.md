---
name: back-audit
description: >
  Audit back-end approfondi du projet EMIS — sécurité, RLS, validation,
  atomicité, performance, schéma, storage. 9 sections avec 3 niveaux de
  criticité (CRITIQUE / MEDIUM / MINOR), scorecard pondéré et top 5 actions.
  Utiliser quand l'utilisateur dit "audit back", "audit backend",
  "check le back", "review API", "audit RLS", ou en complément de
  `perf-audit` / `code-review` pour zoomer côté serveur.
user-invocable: true
argument-hint: "[--section <nom>] [--full] [--fix-cosmetic]"
allowed-tools: Read, Grep, Glob, Bash, Edit
---

# Audit back-end EMIS

Audit ciblé du back-end : `src/app/api/**`, `src/lib/{db,auth,validation}/**`,
`supabase/migrations/**`. Ne couvre PAS le front-end (voir `code-review` ou `perf-audit`).

## Contexte projet (rappel)

- Next.js 16 App Router + Supabase (RLS multi-tenant par `owner_id`)
- 2 modes serveur :
  - `createServerSupabase()` → routes SSR (cookies, RLS)
  - `supabaseAdmin` (service-role) → routes terrain Bearer UNIQUEMENT
- Mode admin via `profiles.is_admin` + `is_admin()` SQL + `checkIsAdmin()` TS
- RPC SECURITY DEFINER pour cascades + merge JSONB atomique
- Rules à imposer : `.claude/rules/{api-conventions,db-schema,process}.md`

## Contexte automatique (diff git)

```
!`git diff --name-only HEAD~1 2>/dev/null; git diff --name-only 2>/dev/null; git diff --name-only --cached 2>/dev/null`
```

## Phases

### Phase 1 — Scope

1. Si `--full` : auditer toutes les sections sur tous les fichiers cibles.
2. Sinon : à partir des fichiers modifiés, déduire les sections concernées via la table ci-dessous.
3. Si `--section <nom>` : ne scoper que cette section.
4. Si aucun fichier back-end modifié et pas de `--full` : afficher
   `"Aucun fichier back-end modifié — utiliser --full pour audit complet."` et s'arrêter.

### Phase 2 — Lecture des règles

Pour chaque section concernée, lire UNE FOIS le fichier `references/checks-N-<section>.md`.
Ne jamais inventer de règle hors des références documentées.

### Phase 3 — Vérification

Pour chaque règle :

- **auto-vérifiable** (grep/AST) : exécuter le pattern, résultat binaire
- **jugement** : lire le code, évaluer factuel
- Statut : `PASS` (respectée) | `WARN` (partiel/limite) | `FAIL` (violation claire)
- Si WARN/FAIL : citer `fichier:ligne`, attendu vs trouvé

### Phase 4 — Scorecard

- Score section = `(PASS × 10) / total règles applicables`, arrondi à 1 décimale
- Score global pondéré : CRITIQUE × 3, MEDIUM × 2, MINOR × 1

### Phase 5 — Top 5 actions

Trier les violations par : criticité → score section → effort.
Pour chaque action : **Quoi** (1 phrase) | **Pourquoi** (impact) | **Effort** (S/M/L) | **Fichiers**.

### Phase 6 — Sortie & sauvegarde

**Sortie en chat** (format ci-dessous, toujours).

**Sauvegarde double** :

1. **Snapshot daté dans le repo** (TOUJOURS, à chaque exécution) :
   `docs/audits/findings/back-audit-{YYYY-MM-DD}.md`
   Si un fichier du même nom existe déjà (audit ré-exécuté le même jour),
   suffixer avec un numéro `-2`, `-3`, etc.
   Contenu : scorecard complet + forces + faiblesses + violations + corrections appliquées s'il y en a.

2. **Synthèse Claude** :
   `C:\Users\Yon\.claude\projects\C--Users-Yon-Desktop-CLAUDE-CODE-JOINT-TIGE\memory\project_back_audit.md`
   Mettre à jour UNIQUEMENT si :
   - premier audit (pas de fichier existant), OU
   - écart > 1.0 vs score global précédent
     La synthèse pointe vers le snapshot le plus récent.

3. **Mettre à jour l'index** : ajouter une ligne dans `docs/audits/README.md`
   table "Index — résultats" avec date, score, lien vers le snapshot.

## Sections (9) — table de routage

| #   | Section                  | Niveau   | Référence                                                     | Cibles                                                       |
| --- | ------------------------ | -------- | ------------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | Auth & Authorization     | CRITIQUE | [checks-1-auth.md](references/checks-1-auth.md)               | `src/app/api/**`, `src/lib/auth/**`, `src/lib/db/supabase-*` |
| 2   | Validation entrées       | CRITIQUE | [checks-2-validation.md](references/checks-2-validation.md)   | `src/app/api/**`, `src/lib/validation/**`                    |
| 3   | RLS & Postgres           | CRITIQUE | [checks-3-rls.md](references/checks-3-rls.md)                 | `supabase/migrations/**`                                     |
| 4   | Atomicité & transactions | CRITIQUE | [checks-4-atomicity.md](references/checks-4-atomicity.md)     | `src/app/api/**`, `src/lib/db/**`, `supabase/migrations/**`  |
| 5   | Architecture couches     | MEDIUM   | [checks-5-layers.md](references/checks-5-layers.md)           | `src/app/api/**`, `src/lib/**`                               |
| 6   | Performance & requêtes   | MEDIUM   | [checks-6-performance.md](references/checks-6-performance.md) | `src/app/api/**`, `src/lib/db/**`                            |
| 7   | Schéma & migrations      | MEDIUM   | [checks-7-schema.md](references/checks-7-schema.md)           | `supabase/migrations/**`                                     |
| 8   | Storage & fichiers       | MEDIUM   | [checks-8-storage.md](references/checks-8-storage.md)         | `src/app/api/**/{photos,plans}/**`, `supabase/migrations/**` |
| 9   | Erreurs & observabilité  | MINOR    | [checks-9-errors.md](references/checks-9-errors.md)           | `src/app/api/**`                                             |

## Format de sortie

```
## Audit back-end — {YYYY-MM-DD}

### Scorecard

| Section | Niveau | Score | Statut |
|---------|--------|-------|--------|
| 1. Auth & Authorization | CRITIQUE | 8.0/10 | OK |
| ... | ... | ... | ... |

**Score global pondéré : X.X / 10** (précédent : Y.Y / 10)

### Violations CRITIQUE
1. `src/app/api/foo/route.ts:42` — règle 2.1 : utilise `.parse()` au lieu de `.safeParse()`
   → Attendu : safeParse + flattenError (api-conventions.md)
   → Fix : remplacer par const parsed = Schema.safeParse(raw); if (!parsed.success) return ...

### Violations MEDIUM / MINOR
[idem]

### Top 5 actions
1. **[CRITIQUE]** Quoi : ... | Pourquoi : ... | Effort : S/M/L | Fichiers : ...

### Comparaison vs audit précédent
[delta par section si fichier mémoire existe]
```

## Auto-fix (`--fix-cosmetic`)

Si `--fix-cosmetic` passé, corriger UNIQUEMENT les violations MINOR auto-fixables :

- format erreur uniforme `{ error, details? }`
- codes HTTP standardisés (400/401/403/404/413/500)
- ajout `console.error()` manquant pour 500

Ne JAMAIS auto-fix CRITIQUE/MEDIUM (jugement architectural requis).
Re-vérifier les règles corrigées et mettre à jour le scorecard.

## Règles du skill

- Lire les références concernées une seule fois
- Sortie concise, pas de prose, aller au scorecard
- Citer `fichier:ligne` pour chaque violation
- Ne jamais inventer de règle hors des références documentées
- Si `--full` produit > 50 violations : 20 premières par criticité + `+N autres dans <section>`
