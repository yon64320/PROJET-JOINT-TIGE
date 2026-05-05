# Section 6 — Performance & Requêtes

**Niveau** : MEDIUM
**Cibles** : `src/app/api/**/*.ts`, `src/lib/db/**/*.ts`, `supabase/migrations/*.sql`

> **Note** : la performance est désormais couverte de façon canonique par le skill
> [`perf-audit`](../../perf-audit/SKILL.md) (8 sections : RSC, bundle, data fetching,
> DB queries, Univer, offline, web vitals, workers). Cette section 6 reste dans
> `back-audit` pour les checks back-end purs (`.single()` en boucle, `.range()`
> sans `.order()`, indexes manquants côté SQL). Pour un audit perf complet
> (incluant front + DB + offline), invoquer `/perf-audit` plutôt que `/back-audit`.

## Règles

### 6.1 — Pas de `.single()` en boucle

- **Méthode** : grep
- **Pattern** :
  ```
  rg -n -B 2 '\.single\(\)' src/app/api/ src/lib/db/ | rg -B 2 'for|forEach|map\('
  ```
- **Attendu** : `for (const x of xs) { await ...single() }` → remplacer par
  `.in("id", ids)` + Map de lookup.
- **Signal FAIL** : N+1 requêtes confirmé → latence × nombre d'éléments.
- **Fix** :
  ```ts
  const ids = Array.from(new Set(items.map((i) => i.id)));
  const { data: rows } = await supabase.from("flanges").select("*").in("id", ids);
  const byId = new Map(rows?.map((r) => [r.id, r]));
  for (const item of items) {
    const flange = byId.get(item.id); // ...
  }
  ```

### 6.2 — `Promise.all` pour requêtes indépendantes

- **Méthode** : jugement
- **Cibles** : routes qui font 2+ `await supabase.from(...)` indépendants
- **Attendu** : `Promise.all([req1, req2, req3])` quand pas de dépendance.
- **Signal WARN** : `await req1; await req2; await req3` indépendants → latence
  cumulée au lieu de parallèle (ex. `terrain/download` fetch session + items + dropdowns).

### 6.3 — Pagination `.order()` + `.range()`

- **Méthode** : jugement
- **Cibles** : routes GET listant des tables potentiellement > 1000 lignes
  (`flanges`, `ot_items` sur gros projets)
- **Attendu** : boucle while avec `.range(from, from + PAGE_SIZE - 1)` jusqu'à
  exhaustion, ou pagination cliente avec curseur.
- **Signal FAIL** : `.select("*")` sans range sur table potentiellement > 1000 lignes
  → Supabase tronque silencieusement à 1000.
- **Fix** :
  ```ts
  const PAGE_SIZE = 1000;
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from("flanges")
      .select("*")
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  ```

### 6.4 — `.order()` avant `.range()`

- **Méthode** : grep
- **Pattern** :
  ```
  rg -n '\.range\(' src/app/api/ src/lib/db/
  ```
  Pour chaque match : vérifier qu'un `.order(...)` précède dans la chaîne.
- **Attendu** : chaque `.range()` est précédé d'un `.order()` (sinon résultats
  non-déterministes entre pages).
- **Signal FAIL** : `.range()` sans `.order()`.

### 6.5 — Index sur colonnes de filtre

- **Méthode** : Read migrations + jugement
- **Pattern** :
  ```
  rg -n 'CREATE INDEX' supabase/migrations/
  ```
- **Attendu** : indexes sur :
  - FK fréquemment jointes (`project_id`, `ot_item_id`, `flange_id`)
  - Colonnes utilisées dans WHERE de policies RLS (`owner_id`)
  - Colonnes de tri par défaut (ex. `flanges.bride_no` si trié par défaut)
  - Filtres partiels fréquents (`WHERE num_rob IS NOT NULL`)
- **Signal WARN** : table > 10k rows sans index sur ses FK ou ses colonnes RLS.

### 6.6 — Pas de `SELECT *` massif inutile

- **Méthode** : jugement
- **Pattern** :
  ```
  rg -n "\.select\(\)" src/app/api/ src/lib/db/
  rg -n "\.select\(['\"][*]['\"]\)" src/app/api/ src/lib/db/
  ```
- **Attendu** : si seules 3-4 colonnes sont utilisées en aval, `.select("a, b, c")`.
- **Signal WARN** : `.select()` ou `.select("*")` sur table large (`flanges` ~50 col)
  alors que la route n'utilise que `id` et `bride_no` → ~95% de bande passante perdue.
