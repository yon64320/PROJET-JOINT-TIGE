# Sources externes consultees

Date de fetch initiale : **2026-05-04**.

A re-verifier annuellement (les seuils Web Vitals, l'API Next.js et les guides
Supabase evoluent). Si une regle d'un fichier `checks-N-*.md` ne correspond plus
a la source, mettre a jour la regle ET la date ci-dessous.

## Next.js (App Router) — version 16

- [Production checklist](https://nextjs.org/docs/app/guides/production-checklist)
  Routing/rendering, data fetching, caching, fonts, images, scripts, web vitals, bundle analyzer.
- [Optimizing package bundling](https://nextjs.org/docs/app/guides/package-bundling)
  `optimizePackageImports`, `serverExternalPackages`, lazy loading, heavy client workloads,
  bundle analyzer experimental Turbopack + `@next/bundle-analyzer` Webpack.
- [Lazy loading](https://nextjs.org/docs/app/guides/lazy-loading) — `dynamic()` avec `ssr: false`.
- [Link component](https://nextjs.org/docs/app/api-reference/components/link) — prefetch automatique.
- [Image component](https://nextjs.org/docs/app/api-reference/components/image) — lazy + WebP.
- [Font Module](https://nextjs.org/docs/app/api-reference/components/font) — auto-host, swap, no FOIT.
- [Script component](https://nextjs.org/docs/app/guides/scripts) — strategie afterInteractive / lazyOnload.
- [useReportWebVitals](https://nextjs.org/docs/app/api-reference/functions/use-report-web-vitals).

## Web Vitals (web.dev)

- [Vitals — definitions et seuils](https://web.dev/articles/vitals)
  LCP <= 2.5s, INP <= 200ms, CLS <= 0.1 (75e percentile, segmentation mobile/desktop).
- [Learn performance](https://web.dev/learn/performance)
  Critical path, resource loading, images/video, fonts, code-splitting, prefetch, Web Workers.

## Supabase (Postgres)

- [Indexes Postgres](https://supabase.com/docs/guides/database/postgres/indexes)
  B-tree par defaut, indexes partiels, ordres, `EXPLAIN`, `CREATE INDEX CONCURRENTLY`,
  Index Advisor dans le dashboard.
- [Performance plateforme](https://supabase.com/docs/guides/platform/performance)
  Connection pooling, `pg_stat_activity`, custom Postgres config, sizing.

## React 19

- [react.dev/reference/react/cache](https://react.dev/reference/react/cache)
  Memoization par-request en Server Components. Definir au module level, partager
  une seule instance memoisee.

## Outils mesure (mentionnes dans `--measure`)

- `@next/bundle-analyzer` (npm) — analyse bundle Webpack avec rapport visuel.
- `npx next experimental-analyze --output` — analyzer Turbopack (Next 16.1+).
- `npx unlighthouse --site http://localhost:3000` — audit Lighthouse multi-page.
- `mcp__supabase__execute_sql` (MCP) — `EXPLAIN (ANALYZE, BUFFERS) ...`.
- `mcp__supabase__get_advisors` (MCP) — Index Advisor + suggestions perf auto.

## Rules projet citees

- `.claude/rules/api-conventions.md` — pagination, `Promise.all`, batch queries, signed URLs.
- `.claude/rules/db-schema.md` — indexes documentes (`idx_flanges_num_rob`, `idx_equipment_plans_*`).
- `.claude/rules/page-layout.md` — Suspense + skeleton meme structure.

## Skills projet referencies

- `.claude/skills/back-audit/references/checks-6-performance.md` — base perf reprise/etendue.
- `.claude/skills/univer-patterns` — workbookData, batch CF/DV, dispose, debounce auto-save.
- `.claude/skills/terrain-offline` — Dexie compound indexes, SW strategies, photos WebP, sync.
- `.claude/skills/react-best-practices` — Vercel Engineering, MIT.
- `.claude/skills/supabase-postgres-best-practices` — Supabase, MIT.
