# Section 3 — RLS & Intégrité Postgres

**Niveau** : CRITIQUE
**Cibles** : `supabase/migrations/*.sql`

## Règles

### 3.1 — RLS activée sur toutes les tables `public`

- **Méthode** : grep
- **Pattern** :
  ```
  rg -n 'CREATE TABLE.*public\.|CREATE TABLE IF NOT EXISTS' supabase/migrations/
  rg -n 'ENABLE ROW LEVEL SECURITY' supabase/migrations/
  ```
- **Attendu** : chaque `CREATE TABLE public.X` est suivi d'un
  `ALTER TABLE public.X ENABLE ROW LEVEL SECURITY` dans la même migration ou plus tard.
- **Signal FAIL** : table `public` sans RLS → exposée par PostgREST.
- **Exception** : `bolt_specs` (table de référence read-only) — autorisée.

### 3.2 — Au moins une policy par table avec RLS

- **Méthode** : grep + jugement
- **Pattern** :
  ```
  rg -n 'CREATE POLICY' supabase/migrations/
  ```
- **Attendu** : pour chaque table avec RLS, au moins une policy `SELECT` et
  une `INSERT/UPDATE/DELETE` (ou `ALL`) selon usage.
- **Signal FAIL** : table avec RLS et 0 policy → tout est bloqué (anti-pattern :
  tout passe en service_role, RLS inutile).

### 3.3 — Policies via `auth.uid()` ou `is_admin()`

- **Méthode** : grep
- **Pattern** :
  ```
  rg -n 'auth\.jwt\(\)' supabase/migrations/
  rg -n 'user_metadata|app_metadata' supabase/migrations/
  ```
- **Attendu** : policies basées sur `auth.uid()` ou `is_admin()` uniquement.
  `auth.jwt()` peut être OK pour `app_metadata` (modifié par admin) mais JAMAIS
  `user_metadata` (modifié par l'utilisateur lui-même = privilege escalation).
- **Signal FAIL** : policy lisant `user_metadata`.

### 3.4 — GRANT + RLS systématiquement

- **Méthode** : grep
- **Pattern** :
  ```
  rg -n 'GRANT (USAGE|ALL) ON' supabase/migrations/
  rg -n 'ALTER DEFAULT PRIVILEGES' supabase/migrations/
  ```
- **Attendu** : `GRANT ... TO anon, authenticated, service_role` pour
  `SCHEMA public` + `TABLES` + `SEQUENCES` + `FUNCTIONS`.
- **Signal FAIL** : policies définies mais pas de GRANT → erreur silencieuse
  `permission denied for table` malgré la RLS.

### 3.5 — RPC SECURITY DEFINER : check ownership

- **Méthode** : grep + Read
- **Pattern** :
  ```
  rg -n 'SECURITY DEFINER' supabase/migrations/
  ```
  Pour chaque match : Read la fonction et vérifier la présence d'un check
  `owner_id = auth.uid()` ou `is_admin()` en début, sinon `RAISE EXCEPTION`.
- **Attendu** : toute RPC `SECURITY DEFINER` qui touche `projects` (ou descendant)
  vérifie l'ownership.
- **Signal FAIL** : RPC SECURITY DEFINER sans check → privilege escalation.
- **Fix type** :
  ```sql
  IF NOT EXISTS (
    SELECT 1 FROM projects
    WHERE id = p_project_id AND (owner_id = auth.uid() OR is_admin())
  ) THEN
    RAISE EXCEPTION 'Projet introuvable ou accès refusé';
  END IF;
  ```

### 3.6 — Helpers internes : EXECUTE révoqué

- **Méthode** : grep
- **Pattern** :
  ```
  rg -n 'CREATE.*FUNCTION.*_archive|CREATE.*FUNCTION public\._' supabase/migrations/
  rg -n 'REVOKE EXECUTE' supabase/migrations/
  ```
- **Attendu** : helpers privés (préfixe `_`) ont leur EXECUTE révoqué de
  `anon, authenticated`.
- **Signal FAIL** : helper `_archive_*` ou `_internal_*` callable directement
  par les rôles publics.

### 3.7 — Index sur colonnes RLS

- **Méthode** : grep + jugement
- **Pattern** :
  ```
  rg -n 'auth\.uid\(\)' supabase/migrations/
  ```
  Pour chaque table dont la policy filtre sur `owner_id`, `project_id`, `user_id` :
  vérifier qu'un index `CREATE INDEX ... ON table(colonne)` existe.
- **Attendu** : index présent → policy en O(log n) au lieu de full scan.
- **Signal WARN** : pas d'index → perf dégradée à mesure que les données grossissent.

### 3.8 — Pas de table publique sans RLS

- **Méthode** : Read en live (si MCP supabase disponible) `mcp__supabase__list_tables`
  et croiser avec `pg_class.relrowsecurity`.
- **Attendu** : toutes les tables `public` ont `relrowsecurity = true` (sauf `bolt_specs`).
- **Signal FAIL** : table dans le schéma exposé sans RLS active.
