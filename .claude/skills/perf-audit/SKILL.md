---
name: perf-audit
description: >
  Audit performance full-stack du projet EMIS — RSC/bundle, data fetching,
  DB queries/indexes, Univer, offline/PWA, Web Vitals, workers. 8 sections
  avec 3 niveaux de criticite (CRITIQUE / MEDIUM / MINOR), scorecard pondere
  et top 5 actions. Utiliser quand l'utilisateur dit "audit perf",
  "performance", "bundle size", "ca rame", "optimise les requetes",
  "check les perfs", "le tableur J&T rame", ou en complement de back-audit /
  code-review pour zoomer sur la performance.
user-invocable: true
argument-hint: "[--section <nom>] [--full] [--measure]"
allowed-tools: Read, Grep, Glob, Bash, WebFetch
---

# Audit performance EMIS

Audit perf full-stack EMIS : front (RSC/bundle/Univer), reseau, DB Postgres,
offline/PWA, Web Vitals, workers. Skill canonique pour la performance — la
section 6 de `back-audit` pointe ici, ne pas dupliquer.

## Contexte projet (rappel)

- Next.js 16 App Router + React 19 + Supabase + Univer (LUT/J&T/Robinetterie)
- Stack client lourde : Univer (~MB), pdfjs-dist, @react-pdf/renderer, SheetJS
- 14 tables Postgres, table `flanges` ~55 colonnes (incl. GENERATED DELTA/RETENU)
- Routes API mixtes : SSR cookies (`createServerSupabase`) + Bearer terrain (`supabaseAdmin`)
- Pagination obligatoire 1000 lignes (limite Supabase)
- PWA terrain offline : Dexie + Serwist, photos WebP, sync mutations
- Rules a connaitre : `.claude/rules/{api-conventions,db-schema,page-layout}.md`

## Contexte automatique (diff git)

```
!`git diff --name-only HEAD~1 2>/dev/null; git diff --name-only 2>/dev/null; git diff --name-only --cached 2>/dev/null`
```

## Phases

### Phase 1 — Scope

1. Si `--full` : auditer toutes les sections sur tous les fichiers cibles.
2. Sinon : a partir des fichiers modifies, deduire les sections concernees via la table de routage.
3. Si `--section <nom>` : ne scoper que cette section.
4. Si aucun fichier touche au scope perf et pas de `--full` : afficher
   `"Aucun fichier perf-relevant modifie — utiliser --full pour audit complet."` et s'arreter.

### Phase 2 — Lecture des references

Pour chaque section concernee, lire UNE FOIS le fichier `references/checks-N-<section>.md`.
Ne jamais inventer de regle hors des references documentees (sources externes citees dans
`references/sources.md`).

### Phase 3 — Verification

Pour chaque regle :

- **auto-verifiable** (grep / glob / SQL) : executer le pattern, statut binaire
- **jugement** : lire le code, evaluer factuel
- Statut : `PASS` (respectee) | `WARN` (partiel/limite) | `FAIL` (violation claire)
- Si WARN/FAIL : citer `fichier:ligne`, attendu vs trouve

### Phase 4 — Mesures (si `--measure`)

Voir section "Flag --measure" plus bas. Ne pas executer en mode standard.

### Phase 5 — Scorecard

- Score section = `(PASS x 10) / total regles applicables`, arrondi a 1 decimale
- Score global pondere : CRITIQUE x 3, MEDIUM x 2, MINOR x 1
- Statut section : `OK` >= 8.0, `WARN` 5.0-7.9, `FAIL` < 5.0

### Phase 6 — Top 5 actions

Trier les violations par : criticite -> score section -> effort.
Pour chaque action : **Quoi** (1 phrase) | **Pourquoi** (impact) | **Effort** (S/M/L) | **Fichiers**.

### Phase 7 — Sortie & sauvegarde

**Sortie en chat** (format ci-dessous, toujours).

**Sauvegarde double** :

1. **Snapshot daté dans le repo** (TOUJOURS, à chaque exécution) :
   `docs/audits/findings/perf-audit-{YYYY-MM-DD}.md`
   Si un fichier du même nom existe déjà (audit ré-exécuté le même jour),
   suffixer avec un numéro `-2`, `-3`, etc.
   Contenu : scorecard complet + forces + violations CRITIQUE/MEDIUM/MINOR + top 5 actions + corrections appliquées s'il y en a + mesures (`--measure`) si exécutées.

2. **Synthèse Claude** :
   `C:\Users\Yon\.claude\projects\C--Users-Yon-Desktop-CLAUDE-CODE-JOINT-TIGE\memory\project_perf_audit.md`
   Mettre à jour UNIQUEMENT si :
   - premier audit (pas de fichier existant), OU
   - ecart > 1.0 vs score global precedent
     La synthèse pointe vers le snapshot le plus récent.

3. **Mettre à jour l'index** : ajouter une ligne dans `docs/audits/README.md`
   table "Index — résultats" avec date, score, lien vers le snapshot.

## Sections (8) — table de routage

| #   | Section                  | Niveau   | Reference                                                         | Cibles principales                                             |
| --- | ------------------------ | -------- | ----------------------------------------------------------------- | -------------------------------------------------------------- |
| 1   | RSC & rendering          | CRITIQUE | [checks-1-rendering.md](references/checks-1-rendering.md)         | `src/app/**/*.{tsx,ts}`                                        |
| 2   | Bundle & code-splitting  | CRITIQUE | [checks-2-bundle.md](references/checks-2-bundle.md)               | `next.config.ts`, `src/components/**`, `package.json`          |
| 3   | Data fetching & reseau   | CRITIQUE | [checks-3-data-fetching.md](references/checks-3-data-fetching.md) | `src/app/api/**`, `src/lib/db/**`                              |
| 4   | DB queries & indexes     | CRITIQUE | [checks-4-db-queries.md](references/checks-4-db-queries.md)       | `supabase/migrations/**`, hot paths `src/app/api/**`           |
| 5   | Univer & tableurs lourds | MEDIUM   | [checks-5-univer.md](references/checks-5-univer.md)               | `src/components/sheets/**`, `src/lib/univer/**`                |
| 6   | Offline & PWA            | MEDIUM   | [checks-6-offline.md](references/checks-6-offline.md)             | `src/lib/offline/**`, `public/sw.js`, `src/app/api/terrain/**` |
| 7   | Web Vitals & UX          | MEDIUM   | [checks-7-web-vitals.md](references/checks-7-web-vitals.md)       | pages publiques + tableurs                                     |
| 8   | Workers & heavy parsing  | MINOR    | [checks-8-workers.md](references/checks-8-workers.md)             | `src/lib/excel/**`, `src/lib/pdf/**`, imports lourds           |

Sources externes consolidees dans [references/sources.md](references/sources.md) (Next.js, web.dev, Supabase, React).

## Format de sortie

```
## Audit perf — {YYYY-MM-DD}

### Scorecard

| Section | Niveau | Score | Statut |
|---------|--------|-------|--------|
| 1. RSC & rendering | CRITIQUE | 7.5/10 | WARN |
| 2. Bundle & code-splitting | CRITIQUE | 6.0/10 | WARN |
| ... | ... | ... | ... |

**Score global pondere : X.X / 10** (precedent : Y.Y / 10)

### Violations CRITIQUE

1. `src/components/sheets/JtSheet.tsx:12` — regle 2.3 : Univer importe statiquement
   -> Attendu : `dynamic(() => import('...'), { ssr: false })`
   -> Fix : remplacer par dynamic import + Suspense

### Violations MEDIUM / MINOR

[idem]

### Top 5 actions

1. **[CRITIQUE]** Quoi : ... | Pourquoi : ... | Effort : S/M/L | Fichiers : ...

### Mesures (si --measure)

- Bundle : `.next/diagnostics/analyze` (taille total + top 10 modules)
- DB : EXPLAIN ANALYZE sur 3 hot paths (cf. section 4)
- Lighthouse : commande suggeree (non executee automatiquement)

### Comparaison vs audit precedent

[delta par section si fichier memoire existe, sinon "Premier audit — pas de baseline"]
```

## Flag `--measure` (mesures reelles)

Quand passe, executer en plus :

### Bundle (front)

```bash
ANALYZE=true npm run build  # si @next/bundle-analyzer installe
# OU
npx next experimental-analyze --output  # Next.js >= 16.1
```

Si aucun outil installe : afficher `"Mesure bundle non executee — installer @next/bundle-analyzer (ANALYZE=true npm run build)"` et continuer.

Parser `.next/diagnostics/analyze/*` ou la sortie `@next/bundle-analyzer` pour
extraire taille total client + top 10 modules par taille. Inclure dans la sortie.

### DB queries (Supabase)

Si `mcp__supabase__execute_sql` disponible : executer `EXPLAIN (ANALYZE, BUFFERS) ...`
sur les 3 queries hot path identifiees pendant la phase 3 section 4. Afficher
temps execution + Seq Scan vs Index Scan.

Si MCP indisponible : afficher la commande SQL pour execution manuelle.

Optionnellement : `mcp__supabase__get_advisors` pour suggestions auto.

### Lighthouse / Web Vitals

NE PAS executer automatiquement. Afficher la commande suggeree :

```
npx unlighthouse --site http://localhost:3000
```

L'utilisateur lance lui-meme apres `next build && next start`.

## Regles du skill

- Lire les references concernees une seule fois
- Sortie concise, pas de prose, aller au scorecard
- Citer `fichier:ligne` pour chaque violation
- Ne jamais inventer de regle hors des references documentees
- Si `--full` produit > 50 violations : 20 premieres par criticite + `+N autres dans <section>`
- Pas d'auto-fix : la perf demande jugement humain (contrairement a back-audit `--fix-cosmetic`)
- En cas de doute sur une regle, lire la source citee dans `references/sources.md`
