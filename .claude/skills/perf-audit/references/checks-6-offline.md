# Section 6 — Offline & PWA

**Niveau** : MEDIUM
**Cibles** : `src/lib/offline/**`, `public/sw.js`, `src/app/api/terrain/**`, `src/app/terrain/**`

## Regles

### 6.1 — Compound indexes Dexie sur queries frequentes

- **Methode** : Read `src/lib/offline/db.ts`
- **Pattern** :
  ```
  rg -n "stores|version\(" src/lib/offline/db.ts
  ```
- **Attendu** : indexes composites sur queries repetees (ex.
  `'[sessionId+otItemId]'`, `'[projectId+naturalItem+naturalRepere]'`).
- **Signal WARN** : table avec une seule cle primaire alors que le code filtre
  sur 2+ colonnes -> Dexie scan complet.
- **Source** : [Dexie — Indexes](https://dexie.org/docs/API-Reference#quick-reference) (skill `terrain-offline`)

### 6.2 — Taille IndexedDB par session limitee

- **Methode** : jugement + `--measure`
- **Cibles** : `POST /api/terrain/download` (payload telecharge)
- **Attendu** : payload session terrain optimise (selectionner uniquement les
  champs necessaires via `selectedFields` + brides du scope).
- **Signal WARN** : telechargement complet sans filtrage cote serveur ->
  IndexedDB > 50 Mo sur mobile -> OOM probable.
- **Mesure recommandee** (en chat) : `navigator.storage.estimate()` cote client.
- **Source** : `.claude/skills/terrain-offline`

### 6.3 — Service Worker (Serwist) : strategies de cache adaptees

- **Methode** : Read `public/sw.js` ou `src/app/sw.ts`
- **Attendu** :
  - Assets statiques (`/_next/static/**`) : `CacheFirst` avec expiration longue.
  - API GET terrain : `NetworkFirst` (offline fallback) ou `StaleWhileRevalidate`.
  - API POST/PATCH : pas de cache (passer au reseau, mettre en queue offline).
- **Signal FAIL** :
  - Strategie `CacheFirst` sur API mutante -> donnees rances en lecture.
  - Pas de SW sur la PWA -> aucun support offline.
- **Source** : [web.dev — Service worker precaching](https://web.dev/learn/performance) + `.claude/skills/terrain-offline`

### 6.4 — Compression photos WebP cote client confirmee

- **Methode** : grep
- **Pattern** :
  ```
  rg -n "image/webp|toBlob|encode\(" src/lib/offline/ src/components/terrain/
  ```
- **Attendu** : photos converties en WebP avec qualite 0.8-0.85 avant upload.
- **Signal FAIL** : upload PNG/JPEG brut -> bande passante terrain (4G faible)
  - storage Supabase plein.
- **Source** : `.claude/skills/terrain-offline` (Phase B photos)

### 6.5 — Queue `pendingPhotos` purgee apres sync

- **Methode** : grep
- **Pattern** :
  ```
  rg -n "pendingPhotos|deletePhoto|clearQueue" src/lib/offline/
  ```
- **Attendu** : entree IndexedDB `pendingPhotos` supprimee une fois uploadee
  avec succes.
- **Signal FAIL** : queue accumule indefiniment -> IndexedDB plein.
- **Source** : `.claude/skills/terrain-offline`

### 6.6 — Sync mutations avec ordre stable (CREATE -> UPDATE -> DELETE)

- **Methode** : Read `src/app/api/terrain/sync/route.ts`
- **Attendu** : ordre traite en batch + idempotent. Les CREATE retournent un
  mapping `tempId -> serverId` pour les UPDATE/DELETE qui suivent.
- **Signal WARN** : ordre non garanti -> conflit FK / 404.
- **Source** : `.claude/rules/api-conventions.md`

### 6.7 — Pas de fetch reseau bloquant pour ouvrir une page terrain offline

- **Methode** : grep
- **Pattern** :
  ```
  rg -n "fetch\(" src/app/terrain/ | rg -v "use client"
  ```
- **Attendu** : pages `/terrain/*` lisent IndexedDB en priorite, le reseau est
  un "nice to have" via SW.
- **Signal FAIL** : page terrain bloquee sur fetch reseau -> inutilisable hors
  ligne (zone ATEX, pas de signal).
- **Source** : `.claude/skills/terrain-offline`
