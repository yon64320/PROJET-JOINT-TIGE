---
globs: "supabase/migrations/**/*.sql"
---

# Conventions schéma DB (Supabase PostgreSQL)

## Types de colonnes

| Donnée                                                                | Type                             | Exemple                      |
| --------------------------------------------------------------------- | -------------------------------- | ---------------------------- |
| Données Excel (DN, PN, NB TIGES, corps*metier*\*, rob, calorifuge...) | `TEXT`                           | Preserve brut Excel          |
| Texte libre                                                           | `TEXT`                           | Pas de VARCHAR               |
| Données flexibles                                                     | `JSONB DEFAULT '{}'`             | extra_columns, cell_metadata |
| Identifiants                                                          | `UUID DEFAULT gen_random_uuid()` | id, project_id               |
| Tables de ref (bolt_specs)                                            | `NUMERIC` / `INTEGER`            | Types forts OK pour ref only |

**Decision TEXT brut** : toutes les colonnes qui viennent de l'import Excel sont `TEXT`. Raison : l'import convertissait silencieusement des valeurs ("CALO" -> null, "X" -> true), ce qui perdait l'info brute. Seule `bolt_specs` garde des types forts car c'est une table de reference, pas de l'import.

## Colonnes GENERATED — pattern RETENU

Le terrain (EMIS) prime toujours sur le client (BUTA) :

```sql
matiere_joint_retenu TEXT GENERATED ALWAYS AS (
  COALESCE(matiere_joint_emis, matiere_joint_buta)
) STORED
```

## Colonnes GENERATED — pattern DELTA

Alerte quand relevé terrain diverge des données client :

```sql
delta_dn BOOLEAN GENERATED ALWAYS AS (
  dn_emis IS NOT NULL AND dn_buta IS NOT NULL
  AND dn_emis IS DISTINCT FROM dn_buta
) STORED
```

Les colonnes GENERATED ne sont jamais modifiables directement — modifier les colonnes sources.

## JSONB extra_columns

Zéro perte de données : les colonnes Excel non-mappées vont dans `extra_columns`.

Mise à jour atomique (pas de read-modify-write) :

```sql
CREATE FUNCTION merge_extra_column(p_table TEXT, p_id UUID, p_key TEXT, p_value TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET extra_columns = extra_columns || jsonb_build_object($1, $2) WHERE id = $3',
    p_table
  ) USING p_key, p_value, p_id;
END;
$$ LANGUAGE plpgsql;
```

## Tables d'archive (ot_items_archive, flanges_archive)

Snapshots avant ré-import. Les colonnes GENERATED deviennent des colonnes normales (valeur figée au moment de l'archivage). Pas de contrainte UNIQUE — plusieurs versions d'un même ITEM possible.

```sql
-- Archiver avant de supprimer/réimporter
INSERT INTO ot_items_archive SELECT *, now(), 'reimport' FROM ot_items WHERE project_id = $1;
DELETE FROM ot_items WHERE project_id = $1;
```

## Import templates & synonymes appris

- `import_templates` — fingerprint + column_mapping JSONB. **Owner-only** : SELECT/INSERT/UPDATE filtrés par `owner_id = auth.uid() OR is_admin()` (migration `007_user_scoped_templates.sql`). Pas de partage entre users — chaque préparateur a son propre référentiel.
- `column_synonyms` — UNIQUE(file_type, db_field, synonym). **Lecture ouverte** (synonymes transverses Excel→DB type `"DN PN" → "dn"`), insertion ouverte aux authentifiés.
- `projects.last_import_template_id` → FK vers import_templates(id) ON DELETE SET NULL. Référence cassée silencieusement si le template appartient à un autre user (RLS bloque la lecture) — acceptable, on ne préfille simplement pas le mapping au prochain import.

## RPC — transactions atomiques

Quatre patterns distincts :

```sql
-- 1. Mise à jour JSONB atomique générique (merge_extra_column)
merge_extra_column(p_table, p_id, p_key, p_value)

-- 1bis. Mise à jour JSONB ciblée (flanges.echaf_feb) — SECURITY DEFINER
merge_echaf_feb(p_flange_id UUID, p_key TEXT, p_value JSONB)
-- Check ownership via JOIN flanges → ot_items → projects → auth.uid().
-- Appelée par handlePatch quand le body contient `feb_field`.

-- 2. Cascade transactionnelle (delete_project_cascade, reimport_archive_*) — SECURITY DEFINER
delete_project_cascade(p_project_id)
reimport_archive_lut(p_project_id)
reimport_archive_jt(p_project_id)
-- Suppriment / archivent dans une transaction unique, pas de rollback manuel JS.

-- 3. Re-rattachement photos orphelines (Phase B) — SECURITY DEFINER
preview_reattach_photos(p_project_id, p_new_items TEXT[])  -- compteur popup avant ré-import
reattach_orphan_photos(p_project_id)                       -- match (natural_item, natural_repere)
-- Appelée par reimportJtToDb après re-INSERT des flanges. Photos avec flange_id IS NULL
-- ré-acquièrent leur FK quand un nouveau flange a la même clé naturelle.
```

**Defense en profondeur (audit 2026-04-29, migration `002_security_fixes.sql`)** : chaque RPC `SECURITY DEFINER` qui touche un projet vérifie `owner_id = auth.uid()` en début de fonction et lève une exception sinon. Pattern obligatoire pour toute nouvelle RPC destructrice :

```sql
CREATE OR REPLACE FUNCTION ma_rpc(p_project_id UUID) RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM projects WHERE id = p_project_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Projet introuvable ou acces refuse';
  END IF;
  -- ... corps
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

Les helpers internes (`_archive_flanges`, `_archive_ot_items`) ont leur EXECUTE révoqué de `anon` / `authenticated` — invocables uniquement depuis les RPC parent.

## Tables terrain

- `bolt_specs` — référence boulonnerie (135 rows RF+RTJ). `UNIQUE(face_type, dn, pn)`. Read-only pour tous. Types forts (NUMERIC/INTEGER)
- `field_sessions` — sessions de saisie terrain. Statuts : `preparing`, `active`, `syncing`, `synced`. Owner-only RLS. Colonne `selected_fields TEXT[]` (NULL = tous les champs)
- `field_session_items` — scope quels OTs sont dans une session. PK composite `(session_id, ot_item_id)`
- `equipment_plans` — PDF plans d'équipement. `ot_item_id` peut être `NULL` (plan "projet général" visible sur tous les OTs en session terrain). Bucket Storage privé `plans` (50 Mo, MIME `application/pdf` strict, créé par `005_plans_storage_bucket.sql`). Index `idx_equipment_plans_natural (project_id, ot_item_id, filename) WHERE ot_item_id IS NOT NULL` pour l'écrasement déterministe + index complémentaire `idx_equipment_plans_general` pour les plans `ot_item_id IS NULL`.
- `flange_photos` — photos terrain (3 types : `bride`, `echafaudage`, `calorifuge`). FK `flange_id` en `ON DELETE SET NULL` (re-rattachement après ré-import). `project_id` dénormalisé pour RLS sans JOIN. Clé naturelle capturée à la prise : `natural_item`, `natural_repere`, `natural_cote`. Bucket Storage privé `photos` (5 Mo, signed URLs 15 min). Index composite `(project_id, natural_item, natural_repere, type)` + index partiel `(project_id) WHERE flange_id IS NULL` pour orphelines.
- Colonnes terrain sur `flanges` : `calorifuge`, `echafaudage`, `field_status` (TEXT)
- Colonnes échafaudage : `echaf_longueur`, `echaf_largeur`, `echaf_hauteur` TEXT (aussi sur `flanges_archive`)
- Colonne `echaf_feb` JSONB (`flanges` + `flanges_archive`, migration `008_echafaudage_feb.sql`) — FEB (Fiche d'Expression du Besoin) Échafaudage. ~25 sous-clés typées via `EchafFebSchema` (Zod) : `feb_number`, `feb_date`, `societe_echafaudeur`, `types[]`, `options[]`, `nb_planchers`, `hauteurs_planchers_supp[]`, `nb_acces`, `travaux[]`, `contraintes[]`, `descriptif`, `prescriptions`, `entreprises[]`, `cmu_classe3`, `date_montage`, `date_depose`… Édition cellule par cellule via la RPC `merge_echaf_feb` (jamais de read-modify-write côté client/route).
- Colonnes tige unique `dimension_tige_emis` / `dimension_tige_buta` TEXT (+ `dimension_tige_retenu` GENERATED COALESCE) — fusion des anciens `diametre_tige`/`longueur_tige`/`designation_tige`. Texte libre type "M16 x 70". Le wizard terrain saisit en bloc dans `dimension_tige_emis`.
- Pattern BUTA/EMIS étendu à : `nb_joints_prov_*`, `nb_joints_def_*`, `rondelle_*`, `face_bride_*` — chacun avec `_emis` (terrain), `_buta` (client) et `_retenu` GENERATED COALESCE. Avant : 1 colonne neutre. Maintenant : 2 colonnes saisissables + 1 retenu read-only.
- `cle` reste une colonne unique (saisie terrain uniquement, conventionnellement EMIS) — pas de doublon BUTA.

## Robinetterie — appariement implicite par `(ot_item_id, num_rob)`

`flanges.num_rob` (TEXT) remplace l'ancien boolean `rob`. Au sein d'un même OT, deux brides partageant le même `num_rob` forment une vanne (paire ADM/REF). `rob_side` reste comme propriété par bride pour distinguer ADM et REF — peut être nul si l'utilisateur ne l'a pas renseigné.

- Filtre vue Robinetterie : `WHERE num_rob IS NOT NULL AND num_rob <> ''`
- Index : `idx_flanges_num_rob ON flanges(project_id, ot_item_id, num_rob) WHERE num_rob IS NOT NULL`
- Plus de colonne `rob_pair_id` ni de RPC `pair_flanges` — l'appariement manuel a été supprimé. La logique de groupement vit dans `src/lib/domain/valve-pairs.ts` (`groupIntoValves`).

## Nouveaux champs J&T (4 colonnes TEXT)

Ajoutés sur `flanges` ET `flanges_archive`, sans triplet (pas de `_retenu` ni de DELTA) :

- `amiante_plomb` — alerte sécurité matière dangereuse (catégorie DIVERS)
- `operation_buta` — opération côté client (vue miroir d'`operation`, sans triplet pour l'instant)
- `securite_buta` — sécurité côté client (vue miroir de `materiel_adf`)
- `sap_buta` — référence article SAP du client

## Nommage

- Tables : snake_case pluriel → `ot_items`, `flanges`, `dropdown_lists`, `import_templates`, `field_sessions`, `bolt_specs`
- Tables d'archive : `{table}_archive` → `ot_items_archive`, `flanges_archive`
- Colonnes : snake_case → `dn_emis`, `matiere_joint_buta`
- Suffixes métier : `_emis` (terrain), `_buta` (client), `_retenu` (COALESCE)
- RPC : verbe_objet → `merge_extra_column`, `merge_echaf_feb`, `delete_project_cascade`, `reimport_archive_lut`, `reimport_archive_jt`, `preview_reattach_photos`, `reattach_orphan_photos`
- Migrations : `001_schema.sql` (squash) + `002_security_fixes.sql` (audit RLS) + `003_phase_b_photos.sql` (flange_photos + RPC re-rattachement) + `004_admin.sql` (mode super-user) + `005_plans_storage_bucket.sql` (bucket plans + indexes naturels) + `006_back_audit_fixes.sql` (FK ON DELETE explicites + bucket photos `allowed_mime_types`) + `007_user_scoped_templates.sql` (SELECT scopé owner sur import_templates) + `008_echafaudage_feb.sql` (colonne JSONB `echaf_feb` + RPC `merge_echaf_feb`) + `seed.sql`

## Contraintes

- `UNIQUE(project_id, item)` sur ot_items — un seul OT par ITEM par projet
- `UNIQUE(file_type, db_field, synonym)` sur column_synonyms
- `REFERENCES ot_items(id)` sur flanges.ot_item_id — intégrité référentielle
- Toujours `IF NOT EXISTS` quand possible pour l'idempotence

## FK ON DELETE (migration `006_back_audit_fixes.sql`)

Tout ce qui est scopé par `project_id` ou `ot_item_id` est `ON DELETE CASCADE` (cohérent avec ce que `delete_project_cascade` fait déjà explicitement). Deux exceptions :

- `equipment_plans.ot_item_id ON DELETE SET NULL` — préserve le plan en "projet général" si l'OT cible est supprimé.
- `flange_photos.flange_id ON DELETE SET NULL` — re-rattachement après ré-import J&T (Phase B).
- `projects.owner_id ON DELETE SET NULL` — préserve les projets si l'utilisateur est supprimé (admin peut récupérer ; à différencier d'un opt-out GDPR explicite).

Toute nouvelle FK référençant `projects(id)` ou `ot_items(id)` doit être explicitement `ON DELETE CASCADE` sauf cas métier opposé documenté.

## Admin global (table `profiles`)

Un super-user a `profiles.is_admin = true` et débloque l'accès à **toutes les données** sans modification du modèle multi-tenant. Migration : `supabase/migrations/004_admin.sql`.

- Table : `public.profiles(id, is_admin, created_at)` — `id` FK vers `auth.users(id)`.
- Helper SQL : `is_admin()` `STABLE SECURITY DEFINER` lit `profiles` en bypassant la RLS (évite la récursion).
- Trigger `handle_new_user` insère un profil `is_admin = false` à chaque inscription.
- Toutes les policies owner-only sont enrichies de `OR is_admin()` — y compris `import_templates` (depuis migration `007_user_scoped_templates.sql`).
- Les RPCs `SECURITY DEFINER` (`delete_project_cascade`, `reimport_archive_*`) refont un check `(owner OR is_admin)` côté serveur.

**Règle absolue — promotion hors-app uniquement** : la table `profiles` n'a **aucune** policy `INSERT/UPDATE/DELETE` pour `authenticated`/`anon`. Seul `service_role` peut écrire (SQL Editor du dashboard ou Management API). Ne **jamais** ajouter d'endpoint applicatif `/api/admin/promote` ou similaire — ce serait un trou critique.

```sql
-- Promotion / dépromotion (à exécuter en service-role)
UPDATE profiles SET is_admin = true  WHERE id = '<user-uuid>';
UPDATE profiles SET is_admin = false WHERE id = '<user-uuid>';
```

Les routes API utilisant `supabaseAdmin` (RLS bypass) doivent appeler `checkIsAdmin()` côté code TS pour rendre conditionnel le filtre `eq("owner_id", user.id)` — sinon l'admin reste bloqué dans ces routes. Helper : `src/lib/auth/permissions.ts`.

Indicateur visuel : `src/components/AdminBadge.tsx` (Server Component dans le layout root) affiche un petit badge orange fixed en bas à droite quand l'user connecté est admin.

Doc complète : `docs/admin-mode.md`.

## RLS + GRANTs — toujours les deux

Une policy RLS sans GRANT renvoie `permission denied for table X` : Postgres rejette l'accès **avant** d'évaluer la RLS. Tout schéma squashé doit donc inclure les GRANTs aux rôles Supabase, en complément des `CREATE POLICY`.

```sql
-- À placer après tous les CREATE POLICY, en fin de schéma
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES    IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
```

La sécurité reste assurée par les policies (`owner_id = auth.uid()`). Le GRANT ouvre la porte, la policy filtre les lignes — les deux sont nécessaires.

Vérification rapide après application :

```sql
SELECT grantee, COUNT(*) FROM information_schema.role_table_grants
WHERE table_schema = 'public' GROUP BY grantee;
-- attendu : anon, authenticated, service_role, postgres
```
