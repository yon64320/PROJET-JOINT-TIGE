# Section 5 — Architecture des couches

**Niveau** : MEDIUM
**Cibles** : `src/app/api/**/*.ts`, `src/lib/**/*.ts`, `src/components/**`

## Règles

### 5.1 — Logique métier dans `src/lib/`

- **Méthode** : jugement
- **Cibles** : route handlers > 30 lignes de calcul/transformation
- **Attendu** : la route délègue à un helper `src/lib/{domain,db,import,...}`,
  reste un fin orchestrateur (auth → validation → call lib → réponse).
- **Signal WARN** : route > 100 lignes contenant calculs métier inline (groupements,
  parsing Excel, transformations complexes) — devrait vivre dans `src/lib/`.
- **Exemple à extraire** : appariement vannes, calcul DELTA, fuzzy match colonnes.

### 5.2 — Pas de JSX / "use client" dans `src/lib/db/`

- **Méthode** : grep
- **Pattern** :
  ```
  rg -n '"use client"|<[A-Z][a-zA-Z]+|jsx' src/lib/db/
  ```
- **Attendu** : 0 résultat.
- **Signal FAIL** : JSX ou directive client dans `src/lib/db/`
  → pollue le bundle serveur avec du code client.

### 5.3 — Pas d'import `next/server` dans `src/lib/`

- **Méthode** : grep
- **Pattern** :
  ```
  rg -n "from ['\"]next/server['\"]" src/lib/
  ```
- **Attendu** : 0 résultat (sauf adapters explicitement documentés comme
  `src/lib/db/supabase-ssr.ts`).
- **Signal FAIL** : `src/lib/` couplé à Next.js Route → empêche réutilisation
  côté script CLI ou test unitaire.

### 5.4 — Duplication > 3 occurrences

- **Méthode** : jugement
- **Pattern** :
  ```
  rg -n "supabase\.from\([\"'][a-z_]+[\"']\)" src/app/api/ | sort | uniq -c | sort -rn | head
  ```
  Si une même requête (même `from` + même `select`) apparaît 3+ fois → extraire
  dans `src/lib/db/queries.ts`.
- **Attendu** : helpers réutilisés (`getProject`, `getProjectHeader`, etc.)
- **Signal WARN** : requête répétée → maintenance fragile (changement de schéma
  oblige à toucher N fichiers).

### 5.5 — Routes ne font pas de calcul lourd

- **Méthode** : jugement
- **Cibles** : routes > 200 lignes
- **Attendu** : calculs lourds (parsing, transformation, agrégation) dans `src/lib/`.
- **Signal WARN** : route handler avec boucles imbriquées > 3 niveaux ou
  algorithmes (fuzzy match, regroupement) → devrait être un module testable.

### 5.6 — `createServerSupabase()` par défaut

- **Méthode** : grep
- **Pattern** :
  ```
  rg -n 'supabaseAdmin' src/app/api/
  rg -n 'createServerSupabase' src/app/api/
  ```
- **Attendu** : `createServerSupabase()` partout sauf justification documentée
  (terrain Bearer, upload Storage avec rollback admin, etc.).
- **Signal WARN** : usage de `supabaseAdmin` dans une route SSR (non-terrain)
  sans commentaire explicatif → potentielle régression sécurité.

### 5.7 — Pas de fetch interne entre routes

- **Méthode** : grep
- **Pattern** :
  ```
  rg -n "fetch\(['\"]/api/|fetch\(['\"]http://localhost" src/app/api/ src/lib/
  ```
- **Attendu** : 0 résultat. Une route ne doit jamais `fetch()` une autre route
  du même projet — appeler directement la fonction lib correspondante.
- **Signal FAIL** : tout match → coût réseau inutile, perte d'auth context,
  duplication de logique.
