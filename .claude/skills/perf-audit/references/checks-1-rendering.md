# Section 1 — RSC & rendering

**Niveau** : CRITIQUE
**Cibles** : `src/app/**/*.{tsx,ts}`, `src/lib/db/queries.ts`

## Regles

### 1.1 — `"use client"` justifie

- **Methode** : grep + jugement
- **Pattern** :
  ```
  rg -l '^["\x27]use client["\x27]' src/app/ src/components/
  ```
  Pour chaque fichier matche : verifier qu'il contient au moins un `useState`,
  `useEffect`, `useReducer`, `onClick`, `onChange`, ou import d'un Provider/lib
  client-only (Univer, react-pdf, browser API).
- **Attendu** : `"use client"` uniquement si interactivite reelle ou API navigateur.
- **Signal FAIL** : `"use client"` sur un composant qui ne fait que rendre du JSX
  statique ou un fetch -> bundle JS gonfle inutilement.
- **Source** : [Next.js — Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)

### 1.2 — Server Components par defaut, fetch dans le SC parent

- **Methode** : jugement
- **Cibles** : pages dans `src/app/**/page.tsx`
- **Attendu** : la page est un async Server Component qui fetch les donnees
  et les passe en props aux Client Components enfants. Pas de fetch dans
  un Client Component si l'info est connue au build/SSR.
- **Signal WARN** : `useEffect(() => { fetch(...) }, [])` dans un Client Component
  appele depuis une page (le data devrait etre fetche cote serveur).
- **Source** : [Next.js — Fetching Data](https://nextjs.org/docs/app/getting-started/fetching-data) (production-checklist).

### 1.3 — `<Suspense>` + skeleton sur pages tableur

- **Methode** : grep
- **Pattern** :
  ```
  rg -n 'JtContent|LutContent|RobContent|<Suspense' src/app/projets/
  ```
- **Attendu** : pages LUT / J&T / Robinetterie split en sous-composant async
  enveloppe dans `<Suspense fallback={<Skeleton />}>`. Skeleton meme structure
  que le layout final (cf. `.claude/rules/page-layout.md`).
- **Signal FAIL** : page tableur sans `<Suspense>` -> blocage navigation pendant fetch.
- **Source** : `.claude/rules/page-layout.md` + [Next.js — Streaming](https://nextjs.org/docs/app/api-reference/file-conventions/loading)

### 1.4 — `React.cache` sur queries projet

- **Methode** : grep
- **Pattern** :
  ```
  rg -n 'cache\(' src/lib/db/queries.ts
  rg -n 'getProjectHeader|getProject\(' src/app/ src/components/
  ```
- **Attendu** : queries projet repetees dans plusieurs sous-composants d'une
  meme requete (ex. `getProjectHeader`) memoisees via `React.cache`.
- **Signal WARN** : query projet appelee 2+ fois dans la meme page sans `cache()`.
- **Pourquoi** : `React.cache` deduplique les calls dans la meme requete serveur.
- **Source** : [react.dev/reference/react/cache](https://react.dev/reference/react/cache)

### 1.5 — Pas de `useEffect` pour fetch initial si SSR possible

- **Methode** : grep
- **Pattern** :
  ```
  rg -n -A 3 'useEffect\(\(\) => \{' src/components/ src/app/ | rg 'fetch\(|supabase'
  ```
- **Attendu** : data initiale fetchee cote serveur (Server Component) puis
  passee en props. `useEffect` reserve aux interactions / refresh / temps reel.
- **Signal FAIL** : `useEffect` qui fetch des donnees connues au build / au render
  serveur -> waterfall + flash de loading inutile.
- **Source** : [Next.js production-checklist — Data fetching and caching](https://nextjs.org/docs/app/guides/production-checklist#data-fetching-and-caching)

### 1.6 — Request-time APIs sous Suspense

- **Methode** : grep
- **Pattern** :
  ```
  rg -n 'cookies\(\)|headers\(\)|searchParams' src/app/
  ```
- **Attendu** : usage `cookies()`, `headers()`, `searchParams` dans un sous-arbre
  enveloppe dans `<Suspense>` pour eviter d'opt-in toute la page en dynamic.
- **Signal WARN** : appel direct dans le Server Component racine sans Suspense.
- **Source** : [Next.js production-checklist — Routing and rendering](https://nextjs.org/docs/app/guides/production-checklist#routing-and-rendering)

### 1.7 — `<Link>` pour navigation interne

- **Methode** : grep
- **Pattern** :
  ```
  rg -n '<a href="/' src/components/ src/app/
  ```
- **Attendu** : `<Link>` de `next/link` (prefetch automatique) sauf liens externes.
- **Signal WARN** : `<a href="/projets">` interne -> pas de prefetch, hard navigation.
- **Source** : [Next.js — Link component](https://nextjs.org/docs/app/api-reference/components/link)
