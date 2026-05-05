# Section 3 — Data fetching & reseau

**Niveau** : CRITIQUE
**Cibles** : `src/app/api/**/*.ts`, `src/lib/db/**/*.ts`

## Regles

### 3.1 — `Promise.all` pour fetchs independants

- **Methode** : jugement
- **Cibles** : routes qui font 2+ `await supabase.from(...)` independants
- **Pattern** :
  ```
  rg -n -B 1 -A 8 'export async function (GET|POST|PATCH|DELETE)' src/app/api/
  ```
- **Attendu** : `Promise.all([req1, req2, req3])` quand pas de dependance
  (ex. `terrain/download` : session + items + bolt_specs + dropdowns en parallele).
- **Signal FAIL** : `await req1; await req2; await req3` independants
  -> latence cumulee au lieu de parallele.
- **Source** : `.claude/rules/api-conventions.md` + [Next.js — Parallel data fetching](https://nextjs.org/docs/app/getting-started/fetching-data#parallel-data-fetching)

### 3.2 — N+1 -> `IN` clause + Map

- **Methode** : grep
- **Pattern** :
  ```
  rg -n -B 2 '\.single\(\)' src/app/api/ src/lib/db/ | rg -B 2 'for|forEach|map\('
  ```
- **Attendu** : `for (const x of xs) { await ...single() }` remplace par
  `.in("id", ids)` + `Map` de lookup.
- **Signal FAIL** : N+1 confirme -> latence x nombre d'elements.
- **Fix** :
  ```ts
  const ids = Array.from(new Set(items.map((i) => i.id)));
  const { data: rows } = await supabase.from("flanges").select("*").in("id", ids);
  const byId = new Map(rows?.map((r) => [r.id, r]));
  for (const item of items) {
    const flange = byId.get(item.id); // ...
  }
  ```
- **Source** : `.claude/rules/api-conventions.md` (section "Parallelisation et batch queries")

### 3.3 — Pagination 1000 avec `.order()` stable

- **Methode** : grep
- **Pattern** :
  ```
  rg -n '\.range\(' src/app/api/ src/lib/db/
  ```
  Pour chaque match : verifier qu'un `.order(...)` precede dans la chaine.
- **Attendu** : boucle while avec `.range(from, from + 999)` + `.order()`
  jusqu'a exhaustion (cf. `.claude/rules/api-conventions.md`).
- **Signal FAIL** :
  - `.select("*")` sans range sur table > 1000 lignes -> Supabase tronque a 1000.
  - `.range()` sans `.order()` -> resultats non-deterministes entre pages.
- **Source** : `.claude/rules/api-conventions.md` (section "Pagination")

### 3.4 — Pas d'`await` sequentiel evitable

- **Methode** : jugement
- **Pattern** :
  ```
  rg -n -A 3 'export async function (GET|POST)' src/app/api/
  ```
- **Attendu** : 2+ awaits dans un handler -> verifier les dependances de donnees.
  Si independants : `Promise.all`.
- **Signal WARN** : sequence d'awaits dont les calls n'utilisent pas le resultat
  des precedents.

### 3.5 — Signed URLs Storage : duree raisonnable + batch

- **Methode** : grep
- **Pattern** :
  ```
  rg -n 'createSignedUrl|createSignedUrls' src/app/api/
  ```
- **Attendu** :
  - Photos terrain : 15 min (`createSignedUrl(path, 900)`).
  - Plans : duree adaptee (consultation breve OK avec 15 min, 1h max).
  - Si N urls : utiliser `createSignedUrls` (batch) plutot que N x `createSignedUrl`.
- **Signal WARN** :
  - Duree > 1h sans raison -> exposition prolongee.
  - Boucle avec `createSignedUrl` au lieu de `createSignedUrls`.
- **Source** : `.claude/rules/api-conventions.md` (section "Terrain API")

### 3.6 — `.select()` cible (pas `*`)

- **Methode** : grep
- **Pattern** :
  ```
  rg -n "\.select\(\)" src/app/api/ src/lib/db/
  rg -n "\.select\(['\"][*]['\"]\)" src/app/api/ src/lib/db/
  ```
- **Attendu** : si seules 3-4 colonnes sont utilisees, `.select("a, b, c")`.
- **Signal WARN** : `.select()` ou `.select("*")` sur `flanges` (~55 col) alors
  que la route n'utilise que `id, item, bride_no` -> ~95% bande passante perdue.
- **Source** : back-audit checks-6-performance regle 6.6 (consolidee ici)

### 3.7 — Ne pas appeler Route Handlers depuis Server Components

- **Methode** : grep
- **Pattern** :
  ```
  rg -n "fetch\(['\"]/api/" src/app/ | rg -v "use client"
  ```
- **Attendu** : Server Components appellent directement les fonctions `src/lib/db/*`,
  pas un fetch HTTP vers `/api/...`.
- **Signal FAIL** : Server Component fait `fetch('/api/projects')` -> aller-retour HTTP
  inutile (la route est sur le meme serveur).
- **Source** : [Next.js — Route Handlers](https://nextjs.org/docs/app/guides/production-checklist#data-fetching-and-caching)

### 3.8 — Cache fetch / `unstable_cache` quand applicable

- **Methode** : jugement
- **Cibles** : queries readonly dont les donnees changent rarement
  (ex. `bolt_specs`, `dropdown_lists`).
- **Attendu** : envelopper dans `cache()` (par-request) ou `unstable_cache(...)` (persistant).
- **Signal WARN** : query repetee a chaque page sur table read-only stable.
- **Source** : [Next.js — Data Caching](https://nextjs.org/docs/app/guides/production-checklist#data-fetching-and-caching) + [react.dev/reference/react/cache](https://react.dev/reference/react/cache)
