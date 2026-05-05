# Section 1 — Auth & Authorization

**Niveau** : CRITIQUE
**Cibles** : `src/app/api/**/*.ts`, `src/lib/auth/**`, `src/lib/db/supabase-*.ts`,
`next.config.ts`, `package.json`, `src/middleware.ts` (si présent)

## Règles

### 1.1 — Auth check sur toutes les routes mutantes

- **Méthode** : grep + jugement
- **Cibles** : `src/app/api/**/*.ts` exportant `POST | PATCH | PUT | DELETE`
- **Pattern** :
  ```
  rg -l 'export async function (POST|PATCH|PUT|DELETE)' src/app/api/
  ```
  Pour chaque match : vérifier la présence de `supabase.auth.getUser()` ou
  validation Bearer (`request.headers.get('authorization')`) AVANT toute opération DB.
- **Attendu** : check user en début, retour 401 si `!user`.
- **Signal FAIL** : route mutante sans `auth.getUser()` ni validation Bearer, ou
  check placé après une opération DB.
- **Exception** : routes publiques explicitement documentées (ex. `/api/import/detect`
  si désiré) — doit être commenté `// public: ...` en tête.
- **Fix** :
  ```ts
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  ```

### 1.2 — Service-role guard owner_id ou checkIsAdmin

- **Méthode** : grep + jugement
- **Cibles** : routes utilisant `supabaseAdmin`
- **Pattern** :
  ```
  rg -l 'supabaseAdmin' src/app/api/
  ```
  Pour chaque fichier : vérifier qu'il existe un `eq("owner_id", user.id)` OU un
  `checkIsAdmin()` qui rend ce filtre conditionnel.
- **Attendu** : ownership vérifiée explicitement (RLS bypassée).
- **Signal FAIL** : `supabaseAdmin.from("projects")` sans filtre `owner_id` ni
  `checkIsAdmin()`.
- **Fix** :
  ```ts
  const isAdmin = await checkIsAdmin(supabase, user.id);
  const q = supabaseAdmin.from("projects").select().eq("id", projectId);
  if (!isAdmin) q.eq("owner_id", user.id);
  ```

### 1.3 — Scope de supabaseAdmin

- **Méthode** : grep
- **Pattern** :
  ```
  rg -l 'supabaseAdmin|SUPABASE_SERVICE_ROLE_KEY' src/
  ```
- **Attendu** : usages uniquement dans `src/lib/db/`, `src/app/api/terrain/**`,
  ou routes documentées (plans, photos serveur-side).
- **Signal FAIL** : import dans `src/components/**`, `src/hooks/**`, ou tout fichier
  avec `"use client"`.

### 1.4 — Validation Bearer routes terrain

- **Méthode** : grep + jugement
- **Cibles** : `src/app/api/terrain/**/*.ts`
- **Pattern attendu** :
  ```ts
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Token manquant" }, { status: 401 });
  const {
    data: { user },
  } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Token invalide" }, { status: 401 });
  ```
- **Signal FAIL** : route terrain sans extraction/validation Bearer, ou qui
  utilise `createServerSupabase()` (incompatible mobile offline → cookies absents).

### 1.5 — Pas de service_role côté client

- **Méthode** : grep strict
- **Pattern** :
  ```
  rg -l '"use client"' src/ | xargs rg -l 'SUPABASE_SERVICE_ROLE_KEY|supabaseAdmin'
  ```
- **Attendu** : 0 résultat.
- **Signal FAIL** : tout match — fuite critique de la clé service-role.

### 1.6 — Cookies session SameSite

- **Méthode** : Read `next.config.ts` + `src/lib/db/supabase-ssr.ts`
- **Attendu** : `SameSite=Lax` ou `SameSite=Strict` (par défaut Supabase SSR helper OK).
- **Signal FAIL** : `SameSite=None` sans `Secure`, ou désactivation explicite.

### 1.7 — Next.js >= 15.2.3 (CVE-2025-29927)

- **Méthode** : Read `package.json` → champ `dependencies.next`
- **Attendu** : `next >= 15.2.3` (ou >= 14.2.25 / 13.5.9 / 12.3.5 selon major).
- **Signal FAIL** : version vulnérable au middleware bypass.

### 1.8 — Pas de RLS triviale

- **Méthode** : grep dans migrations
- **Pattern** :
  ```
  rg 'USING\s*\(\s*true\s*\)|USING\s*\(\s*auth\.uid\(\)\s*OR\s*true\s*\)' supabase/migrations/
  ```
- **Attendu** : 0 résultat.
- **Signal FAIL** : policy `USING (true)` ou condition triviale équivalente
  (= RLS désactivée de facto).
