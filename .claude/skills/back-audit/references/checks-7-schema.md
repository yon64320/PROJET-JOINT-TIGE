# Section 7 — Schéma DB & migrations

**Niveau** : MEDIUM
**Cibles** : `supabase/migrations/*.sql`

## Règles

### 7.1 — TEXT brut pour colonnes Excel

- **Méthode** : grep
- **Pattern** :
  ```
  rg -n 'CREATE TABLE.*(ot_items|flanges)' -A 200 supabase/migrations/001_*.sql
  ```
  Vérifier que les colonnes issues de l'import Excel (DN, PN, NB TIGES, corps*metier*_,
  matiere\__, calorifuge, échafaudage, dimension*tige*\*, num_rob, etc.) sont en `TEXT`.
- **Attendu** : `TEXT` brut, pas de cast (`NUMERIC` / `INTEGER` / `BOOLEAN`) sur ces colonnes.
- **Signal FAIL** : colonne Excel typée → perte d'info au cast (`"X"` → `null`,
  `"CALO"` → `null`).
- **Exception** : `bolt_specs` (table de référence, types forts OK).

### 7.2 — Colonnes GENERATED hors UPDATE

- **Méthode** : grep + jugement
- **Pattern** :
  ```
  rg -n 'GENERATED ALWAYS AS' supabase/migrations/
  ```
  Lister les colonnes générées (`*_retenu`, `delta_*`).
  Puis dans `src/app/api/` :
  ```
  rg -n 'EDITABLE.*=.*new Set' src/app/api/
  ```
  Vérifier qu'aucune des colonnes GENERATED n'est dans un Set EDITABLE.
- **Attendu** : 0 occurrence d'une colonne GENERATED dans une whitelist d'UPDATE.
- **Signal FAIL** : tentative d'UPDATE sur colonne GENERATED → erreur PG, route casse.

### 7.3 — Migrations idempotentes

- **Méthode** : grep
- **Pattern** :
  ```
  rg -n 'CREATE TABLE [^I]' supabase/migrations/      # sans IF NOT EXISTS
  rg -n 'CREATE INDEX [^C]' supabase/migrations/      # sans IF NOT EXISTS / CONCURRENTLY
  rg -n 'CREATE FUNCTION' supabase/migrations/        # sans OR REPLACE
  rg -n 'CREATE POLICY' supabase/migrations/          # vérifier DROP POLICY IF EXISTS avant
  ```
- **Attendu** :
  - `CREATE TABLE IF NOT EXISTS`
  - `CREATE OR REPLACE FUNCTION`
  - `DROP POLICY IF EXISTS ...; CREATE POLICY ...`
  - `CREATE INDEX IF NOT EXISTS` (ou `CONCURRENTLY` en prod)
- **Signal FAIL** : statement non-idempotent → `supabase db push` re-jouée échoue.

### 7.4 — FK avec ON DELETE explicite

- **Méthode** : grep
- **Pattern** :
  ```
  rg -n 'REFERENCES' supabase/migrations/ | rg -v 'ON DELETE'
  ```
- **Attendu** : 0 résultat — chaque FK déclare `ON DELETE CASCADE`,
  `ON DELETE SET NULL`, ou `ON DELETE RESTRICT` (par défaut PG = `NO ACTION` = piège).
- **Signal WARN** : FK sans `ON DELETE` → comportement par défaut implicite.

### 7.5 — UNIQUE sur clés naturelles

- **Méthode** : Read schéma + jugement
- **Attendu** : `UNIQUE(project_id, item)` sur `ot_items`,
  `UNIQUE(file_type, db_field, synonym)` sur `column_synonyms`, etc.
- **Signal FAIL** : table dont l'identité métier est une clé naturelle, sans contrainte
  UNIQUE → doublons silencieux, requêtes ambiguës.

### 7.6 — Migration squashée safe

- **Méthode** : Read séquentielle des migrations + jugement
- **Attendu** : si `001_schema.sql` est un squash, il doit être strictement plus
  permissif que la somme des migrations historiques (pas de DROP/ALTER destructifs
  qui casseraient un projet déjà migré).
- **Signal WARN** : `DROP TABLE ... CASCADE` sans `IF EXISTS` dans une migration squash.

### 7.7 — Nommage cohérent

- **Méthode** : grep + jugement
- **Pattern** :
  ```
  rg -n 'CREATE TABLE [a-zA-Z_]+' supabase/migrations/
  ```
- **Attendu** :
  - Tables : `snake_case` pluriel (`ot_items`, `flanges`, `equipment_plans`)
  - Colonnes : `snake_case`
  - Suffixes métier : `_emis`, `_buta`, `_retenu` cohérents
  - RPC : `verbe_objet` (`merge_extra_column`, `delete_project_cascade`)
- **Signal WARN** : table singulière (`flange` au lieu de `flanges`), camelCase,
  ou suffixe inattendu (`_terrain` au lieu de `_emis`).
