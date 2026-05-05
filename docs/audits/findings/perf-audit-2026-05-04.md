# Audit performance EMIS — 2026-05-04 (premier passage, mode `--full`)

> Premier audit complet via le skill `perf-audit` (8 sections / 3 niveaux de criticité).
> Branche `main`, commit `92ff25f` au moment du scan, sans flag `--measure` (mesures bundle/EXPLAIN/Lighthouse non exécutées).
> **Score global pondéré (baseline) : 6.8 / 10**

---

## Scorecard par section

| Section                    | Niveau   | Score   | Statut |
| -------------------------- | -------- | ------- | ------ |
| 1. RSC & rendering         | CRITIQUE | 8.6/10  | OK     |
| 2. Bundle & code-splitting | CRITIQUE | 5.0/10  | WARN   |
| 3. Data fetching & réseau  | CRITIQUE | 5.0/10  | WARN   |
| 4. DB queries & indexes    | CRITIQUE | 7.1/10  | WARN   |
| 5. Univer & tableurs       | MEDIUM   | 6.7/10  | WARN   |
| 6. Offline & PWA           | MEDIUM   | 10.0/10 | OK     |
| 7. Web Vitals & UX         | MEDIUM   | 8.3/10  | OK     |
| 8. Workers & heavy parsing | MINOR    | 3.3/10  | FAIL   |

## Forces du projet

- Code-splitting Univer / pdfjs ✓ (`dynamic` + `ssr: false`).
- Suspense + skeletons sur LUT/J&T/Rob/Plans ✓ (même structure que le contenu final, pas de CLS).
- `React.cache` sur queries projet (`getProjectHeader`) ✓.
- Pagination 1000 + `.order()` stable ✓.
- Indexes DB cohérents : `project_id`, `ot_item_id`, `num_rob` (partiel), `owner_id`, `flange_id` (partiel NULL).
- PWA / offline solide : Dexie compound indexes, WebP compression, sync ordre stable, `pendingPhotos` purgée.
- `next/font` + pas de `<img>` brut ✓.

## 9 violations CRITIQUE détectées

1. `terrain/photos/route.ts:163-177` — `createSignedUrl` en boucle au lieu de `createSignedUrls` batch.
2. `terrain/download/route.ts:75-87` — idem pour les plans.
3. `terrain/sync/route.ts:226-249` — DELETE séquentiel `.maybeSingle()` + `.delete()` (N+1).
4. `projets/[id]/page.tsx:18-27` — 4× `count: "exact"` sur `ot_items` / `flanges` / `field_sessions` / `equipment_plans`.
5. `gammes-detect/route.ts:65`, `gammes-confirm/route.ts:97`, `import-gammes/page.tsx:18` — `count: "exact"` pour check binaire d'existence.
6. `next.config.ts` — pas d'`experimental.optimizePackageImports`.
7. `package.json` — `@next/bundle-analyzer` absent (bundle non mesurable).
8. `next.config.ts:12` — `playwright` listé en `serverExternalPackages` mais classement dans `dependencies` à valider.
9. 8 fichiers — `<a href="/projets">` au lieu de `<Link>` (hard reload, pas de prefetch).

## Violations MEDIUM (non corrigées dans le 1er passage)

10. `JtPageClient.tsx:128-129` — `<JtSheet key={viewMode}>` force démontage/remontage de l'instance Univer (~MB) à chaque toggle vue.
11. `terrain/download/route.ts:25-26` — `bolt_specs` (135 rows read-only) et `dropdown_lists` re-fetchés à chaque session, candidats à `unstable_cache`.
12. `lib/excel/generic-parser.ts:6` — SheetJS parse côté main thread (Web Worker recommandé pour gros .xlsm).
13. `projets/[id]/jt/page.tsx:20` — `select("*, ot_items!inner(...)")` envoie ~55 colonnes au RSC (acceptable car tableur).

## Violations MINOR (non corrigées)

14. `lib/offline/photo-compression.ts:55-68` — compression WebP en main thread (Worker pour rafale 10+ photos).
15. `app/layout.tsx` — pas de `useReportWebVitals` (pas de field data en prod).

---

## Corrections CRITIQUE appliquées (commit `e618fa9`, 2026-05-04)

| #   | Action                                                                | Fichiers                                                                                              |
| --- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | `createSignedUrls` batch                                              | `terrain/photos/route.ts`, `terrain/download/route.ts`                                                |
| 2   | `count: "exact"` → `"estimated"` (compteurs UI)                       | `projets/[id]/page.tsx`                                                                               |
| 3   | `count: "exact"` → `.limit(1)` + `length === 0`                       | `gammes-detect`, `gammes-confirm`, `import-gammes/page.tsx`                                           |
| 4   | DELETE batch via `.in()` select + `.delete().in()`                    | `terrain/sync/route.ts:226-260`                                                                       |
| 5   | `withBundleAnalyzer` (ANALYZE=true) + `optimizePackageImports` Univer | `next.config.ts`                                                                                      |
| 6   | `@next/bundle-analyzer` installé en `devDependencies`                 | `package.json`                                                                                        |
| 7   | `<a href="/projets">` → `<Link href="/projets">` (8 fichiers)         | `projets/page.tsx`, `projets/[id]/{,jt,lut,plans,robinetterie,robinetterie/template,import}/page.tsx` |

**Action 8 ajustée** : `playwright` laissé en `dependencies` car utilisé runtime par `/api/pdf/fiches-rob` via `src/lib/pdf/browser.ts:1`. `serverExternalPackages: ["playwright"]` est correct.

**Plan B inutilisé** : `optimizePackageImports` sur les barrels Univer n'a pas cassé le build.

**Validation** : `npm run lint && npm run type-check && npm run build` ✓ tous passent.

## Items NON vérifiés (`--measure` absent)

- EXPLAIN ANALYZE sur queries `flanges` / J&T (rule 4.6).
- Index Advisor Supabase (rule 4.7).
- Lighthouse / unlighthouse (rule 7.8).
- Bundle size mesurable (rule 2.6) — outil installé mais analyse à faire avec `ANALYZE=true npm run build`.

## Score post-fix attendu

Estimation **~9 / 10** sur les sections CRITIQUE après corrections. À re-mesurer via `/perf-audit --full` (et `--measure` pour les chiffres bundle / DB).

## Source mémoire Claude

Synthèse vivante : `memory/project_perf_audit.md` (référence pour les audits futurs + comparaison delta).
