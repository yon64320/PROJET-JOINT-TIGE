# Erreurs — PWA / Offline (Dexie, Service Worker)

## navigator.serviceWorker.ready hang forever

- **Symptôme** : L'app se bloque indéfiniment en attendant le Service Worker. Aucune erreur visible
- **Cause racine** : `navigator.serviceWorker.ready` ne résout jamais si aucun SW n'est enregistré (ex: dev sans SW, ou navigateur sans support)
- **Fix** : Vérifier `sw?.controller` avant d'attendre `.ready`. Ajouter un timeout ou un fallback
- **Prévention** : Piège documenté dans le skill terrain-offline
- **Date** : 2026-03

## Mutations non-idempotentes

- **Symptôme** : Données dupliquées après sync (ex: une bride apparaît 2 fois après re-sync)
- **Cause racine** : Les mutations offline utilisent INSERT au lieu d'UPSERT. Si le sync est relancé (réseau instable), les mêmes mutations sont re-exécutées
- **Fix** : Utiliser UPSERT (ON CONFLICT) pour toutes les mutations offline
- **Prévention** : Skill terrain-offline — "Les mutations offline doivent être idempotentes"
- **Date** : 2026-03

## Upload PDF sans contentType

- **Symptôme** : Le PDF uploadé via Supabase Storage est servi comme `application/octet-stream`, le navigateur télécharge au lieu d'afficher
- **Cause racine** : L'upload Storage ne spécifie pas `contentType: "application/pdf"`
- **Fix** : Passer `contentType: "application/pdf"` dans les options d'upload
- **Prévention** : Skill terrain-offline — "Ne pas oublier contentType sur les uploads Storage"
- **Date** : 2026-03

## Regex SW matcher testé contre l'URL complète → cache terrain inopérant

- **Symptôme** : Les pages `/terrain/*` ne sont pas cachées par le Service Worker. Offline → échec réseau au lieu de servir le cache
- **Cause racine** : Le matcher Serwist `matcher: /^\/terrain(\/.*)?$/` est testé contre l'URL **complète** (`http://localhost:3000/terrain/abc`), pas le pathname. Le `^\/terrain` ne matche jamais
- **Fix** : Callback qui teste le pathname : `matcher: ({ url }: { url: URL }) => url.pathname.startsWith("/terrain")`
- **Prévention** : Dans Serwist, toujours utiliser un callback `({ url }) => ...` plutôt qu'un regex. Les regex sont testés contre `url.href`, pas `url.pathname`
- **Date** : 2026-04-21

## Middleware auth bloque les pages terrain hors-ligne

- **Symptôme** : Navigation vers `/terrain/*` en mode offline redirige vers `/login`
- **Cause racine** : Le middleware appelle `supabase.auth.getUser()` (appel réseau). Hors-ligne → échec → `user = null` → redirect `/login`. Routes `/terrain` absentes des routes publiques
- **Fix** : Ajouter `pathname.startsWith("/terrain")` aux routes publiques du middleware. Les API routes `/api/terrain/*` gardent leur auth Bearer
- **Prévention** : Toute page conçue pour fonctionner offline doit être dans les routes publiques du middleware
- **Date** : 2026-04-21

## `@serwist/next` incompatible avec Turbopack → `sw.js` jamais généré

- **Symptôme** : Page Chrome dinosaure instantanée en mode avion sur la PWA prod. Aucun cache offline. `GET /sw.js` retourne 404. Le SW n'est jamais enregistré côté navigateur
- **Cause racine** : Next.js 16 utilise Turbopack par défaut pour `next build`. Or `@serwist/next` n'a pas de support Turbopack — son plugin webpack est silencieusement ignoré, le `sw.js` n'est pas écrit dans `public/`. Warning visible uniquement dans les logs build : `[@serwist/next] WARNING: ... doesn't support Turbopack`
- **Fix** : Forcer webpack dans `package.json` → `"build": "next build --webpack"` (et `"dev": "next dev --webpack"` si pas déjà fait)
- **Prévention** : Tant que Serwist ne supporte pas Turbopack (issue github.com/serwist/serwist/issues/54), tous les scripts Next.js (`dev`, `build`, `start` si applicable) doivent forcer `--webpack`. Vérifier après chaque build prod : `ls public/sw.js` doit exister, et `curl https://<domaine>/sw.js` doit retourner 200 + `Content-Type: application/javascript`
- **Date** : 2026-05-06

## Server Component dans root layout casse les RSC payloads offline

- **Symptôme** : Navigation client-side (`router.push`) vers `/terrain/*` échoue offline alors que la page elle-même est `'use client'` et lit IndexedDB
- **Cause racine** : Un Server Component async dans le root layout (ex: `<AdminBadge />` avec `getCurrentUserCached()`) force chaque RSC payload à inclure le rendu du root layout. Ce rendu nécessite un fetch Supabase serveur → impossible offline → la nav échoue
- **Fix** : Convertir le composant en Client Component (`"use client"` + `useEffect` + `createBrowserSupabase()`). Skip explicite via `usePathname()` sur les routes offline (`pathname.startsWith("/terrain")`). Cache l'état dans `localStorage` pour résilience
- **Prévention** : Aucun Server Component du root layout ne doit faire de fetch réseau, sinon il pollue tous les RSC payloads — y compris les routes destinées à fonctionner offline
- **Date** : 2026-05-06

## Première navigation offline = cache miss avec NetworkFirst

- **Symptôme** : Téléchargement de session OK, passage en mode avion, clic sur la session → page blanche / fail. Symptôme disparaît si la route a été visitée online avant le mode avion
- **Cause racine** : `NetworkFirst` ne met en cache que ce qui a transité par le réseau. Une route jamais visitée online n'est jamais en cache. Le `precacheEntries` Serwist ne couvre pas les routes dynamiques (`/terrain/[sessionId]`)
- **Fix** : (1) Stratégie `StaleWhileRevalidate` au lieu de `NetworkFirst` — sert cache instantanément si dispo. (2) Pre-cache déclenché à la fin de `downloadSession()` : `fetch('/terrain/<id>')` + chaque `/terrain/<id>/<otId>` pour forcer le SW à mettre en cache
- **Prévention** : Toute route dynamique destinée à être consultée offline doit être pre-cachée explicitement au moment où on télécharge ses données
- **Date** : 2026-05-06
