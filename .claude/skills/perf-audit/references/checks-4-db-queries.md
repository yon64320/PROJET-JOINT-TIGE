# Section 4 — DB queries & indexes

**Niveau** : CRITIQUE
**Cibles** : `supabase/migrations/**/*.sql`, hot paths `src/app/api/**/*.ts`

## Regles

### 4.1 — Indexes sur colonnes WHERE / FK

- **Methode** : Read migrations + grep usages + jugement
- **Pattern** :
  ```
  rg -n 'CREATE INDEX' supabase/migrations/
  rg -nh "\.eq\(['\"]([^'\"]+)['\"]" src/app/api/ src/lib/db/ | sort -u
  rg -nh "\.in\(['\"]([^'\"]+)['\"]" src/app/api/ src/lib/db/ | sort -u
  ```
- **Attendu** : indexes sur :
  - FK frequemment jointes (`project_id`, `ot_item_id`, `flange_id`)
  - Colonnes `WHERE` policies RLS (`owner_id`)
  - Colonnes de tri par defaut
  - Filtres partiels frequents (`WHERE num_rob IS NOT NULL`)
- **Signal WARN** : table > 10k rows sans index sur ses FK ou ses colonnes RLS.
- **Source** : [Supabase — Indexes Postgres](https://supabase.com/docs/guides/database/postgres/indexes) + back-audit 6.5

### 4.2 — Indexes documentes dans le projet sont utilises

- **Methode** : Read + EXPLAIN
- **Pattern** :
  ```
  rg -n 'idx_flanges_num_rob|idx_equipment_plans_natural|idx_equipment_plans_general' supabase/migrations/
  ```
- **Attendu** : chaque index documente dans `.claude/rules/db-schema.md` est utilise
  par au moins une query reelle (verifier via EXPLAIN ou par grep des WHERE
  correspondants).
- **Signal WARN** : index defini mais aucun WHERE n'y matche -> index mort
  (cout d'ecriture sans benefice de lecture).
- **Source** : `.claude/rules/db-schema.md` + [Supabase — Indexes](https://supabase.com/docs/guides/database/postgres/indexes)

### 4.3 — Pas de `count: 'exact'` sur grosses tables

- **Methode** : grep
- **Pattern** :
  ```
  rg -n "count: ['\"]exact['\"]" src/app/api/ src/lib/db/
  ```
- **Attendu** : sur `flanges` / `ot_items` (potentiellement > 10k rows),
  preferer `count: 'estimated'` ou `count: 'planned'` ou ne pas demander de count.
- **Signal WARN** : `count: 'exact'` sur table large -> Postgres scan complet
  pour le count, latence ajoutee.
- **Source** : [Supabase — count parameter](https://supabase.com/docs/reference/javascript/select#with-count)

### 4.4 — Colonnes GENERATED indexees si filtrees

- **Methode** : grep + Read
- **Pattern** :
  ```
  rg -n "delta_dn|delta_pn|_retenu" src/app/api/ src/lib/db/
  rg -n "delta_dn|delta_pn|_retenu" supabase/migrations/
  ```
- **Attendu** : si `delta_dn`, `delta_pn`, `*_retenu` sont utilises dans `WHERE`
  -> index dedies (les colonnes GENERATED STORED peuvent etre indexees).
- **Signal WARN** : `WHERE delta_dn = true` sans index dedie sur `flanges` -> seq scan.
- **Source** : `.claude/rules/db-schema.md` + [Supabase — Indexes](https://supabase.com/docs/guides/database/postgres/indexes)

### 4.5 — Pas de `.single()` en boucle

- **Methode** : grep (cf. section 3.2 N+1, dimension DB ici)
- **Pattern** :
  ```
  rg -n -B 2 '\.single\(\)' src/app/api/ src/lib/db/ | rg -B 2 'for|forEach|map\('
  ```
- **Attendu** : remplacer par `.in("id", ids)` + Map.
- **Signal FAIL** : N+1 -> latence x nombre d'elements (vu cote DB :
  N round-trips reseau + N planifications de query).
- **Source** : back-audit 6.1

### 4.6 — `EXPLAIN ANALYZE` sur queries vues J&T 55 colonnes (mesure `--measure`)

- **Methode** : SQL via MCP Supabase
- **Cibles** : queries qui frappent `flanges` avec gros `SELECT` (vue J&T) ou jointures `ot_items`
- **Action si `--measure`** :
  - Si `mcp__supabase__execute_sql` disponible : executer
    ```sql
    EXPLAIN (ANALYZE, BUFFERS)
    SELECT * FROM flanges WHERE project_id = $1 ORDER BY ot_item_id, bride_no;
    ```
    Idem sur 2 autres hot paths (ex. vue Robinetterie filtree par `num_rob`).
  - Sinon : afficher la commande SQL et indiquer "Mesure non executee — copier dans SQL Editor Supabase".
- **Attendu** : `Index Scan` sur les colonnes filtrees, pas de `Seq Scan` ni `Heap Fetch` excessif.
- **Source** : [Supabase — Indexes (EXPLAIN)](https://supabase.com/docs/guides/database/postgres/indexes)

### 4.7 — Index Advisor (Supabase MCP)

- **Methode** : MCP
- **Action si `--measure` et MCP disponible** : appeler
  `mcp__supabase__get_advisors({ type: 'performance' })` et inclure les recommendations
  dans la sortie.
- **Source** : [Supabase — Indexes (Index Advisor)](https://supabase.com/docs/guides/database/postgres/indexes)

### 4.8 — `CREATE INDEX CONCURRENTLY` dans les migrations vivantes

- **Methode** : grep
- **Pattern** :
  ```
  rg -n 'CREATE INDEX' supabase/migrations/
  ```
- **Attendu** : sur prod live (vs squash initial), nouveaux indexes en
  `CREATE INDEX CONCURRENTLY` pour ne pas bloquer les ecritures.
- **Signal WARN** : nouvelle migration ajoutant un index sans `CONCURRENTLY` sur
  table ecrite en prod.
- **Source** : [Supabase — Indexes (concurrent creation)](https://supabase.com/docs/guides/database/postgres/indexes)

### 4.9 — Connection pooling actif (PgBouncer / Supavisor)

- **Methode** : Read `.env*`, jugement
- **Attendu** : URL DB pour les routes API utilise le pooler Supabase
  (`...pooler.supabase.com:6543`) si la charge est lourde / serverless.
- **Note** : Supabase JS client gere generalement bien la connexion HTTP via REST,
  donc moins critique. Pertinent si scripts Node directs (ex. `scripts/gammes-to-lut.ts`).
- **Source** : [Supabase — Performance / Connection pooling](https://supabase.com/docs/guides/platform/performance)
