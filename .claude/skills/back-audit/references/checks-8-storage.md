# Section 8 — Storage & fichiers

**Niveau** : MEDIUM
**Cibles** : routes upload/download (`src/app/api/**/{photos,plans,download,upload}/**`),
migrations `supabase/migrations/*.sql` (création de buckets)

## Règles

### 8.1 — Buckets privés par défaut

- **Méthode** : grep
- **Pattern** :
  ```
  rg -n "storage\.createBucket|insert.*into storage\.buckets" supabase/migrations/
  rg -n "public[\"']?\s*[:=]\s*true" supabase/migrations/
  ```
- **Attendu** : tous les buckets créés avec `public = false` (ou pas de mention,
  défaut Supabase = privé).
- **Signal FAIL** : bucket `public = true` non documenté → exposition directe par URL.
- **Exception** : si bucket explicitement public (logo, assets), commenté en SQL.

### 8.2 — Limite size côté bucket ET route

- **Méthode** : grep
- **Pattern** :
  ```
  rg -n "file_size_limit|fileSizeLimit" supabase/migrations/
  rg -n "file\.size\s*>" src/app/api/
  ```
- **Attendu** : double check — bucket configuré avec `file_size_limit` ET route
  vérifie `file.size > LIMIT` avant upload.
- **Signal FAIL** : limite uniquement côté bucket (erreur Supabase brute renvoyée
  au client) ou uniquement côté route (bucket accepte tout via signed URL).

### 8.3 — MIME whitelist stricte

- **Méthode** : grep
- **Pattern** :
  ```
  rg -n "allowed_mime_types|allowedMimeTypes" supabase/migrations/
  rg -n "file\.type\s*===" src/app/api/
  ```
- **Attendu** : bucket avec `allowed_mime_types` (ex. `["application/pdf"]`,
  `["image/webp"]`) ET route vérifie `file.type === "<mime>"`.
- **Signal FAIL** : MIME `*/*` autorisé, ou check uniquement sur extension
  (contournable trivialement avec un fichier renommé).

### 8.4 — Signed URL TTL court

- **Méthode** : grep
- **Pattern** :
  ```
  rg -n "createSignedUrl" src/app/api/
  ```
- **Attendu** : TTL ≤ 15 minutes (900 s) pour photos terrain, ≤ 1h pour plans
  consultés en session active.
- **Signal WARN** : `createSignedUrl(path, 86400)` (24h) ou plus → fenêtre d'exposition
  trop large si l'URL est interceptée.

### 8.5 — Path conventions

- **Méthode** : grep + jugement
- **Pattern** :
  ```
  rg -n "storage\.from.*\.upload" src/app/api/
  ```
  Pour chaque upload, vérifier que le path commence par un identifiant scoping
  (project_id, user_id) et pas par un input utilisateur direct.
- **Attendu** : `<project_id>/<sub>/<filename>` — ne dépend pas d'un nom utilisateur brut.
- **Signal FAIL** : path = `${userInput}/${file.name}` → path traversal possible
  si l'input n'est pas validé (ex. `../../../`).

### 8.6 — Cleanup orphelins

- **Méthode** : Read migrations + jugement
- **Attendu** :
  - FK `flange_id` en `ON DELETE SET NULL` (re-rattachement après ré-import)
  - Suppression Storage cohérente avec suppression DB (rollback ou cascade explicite)
  - Job/RPC pour purger les orphelins anciens (> X jours sans rattachement)
- **Signal WARN** : pas de stratégie de cleanup → bucket grossit indéfiniment,
  surcoût Storage à long terme.
