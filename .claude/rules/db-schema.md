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

- `import_templates` — fingerprint + column_mapping JSONB. Lecture ouverte, écriture par owner.
- `column_synonyms` — UNIQUE(file_type, db_field, synonym). Même pattern RLS.
- `projects.last_import_template_id` → FK vers import_templates(id) ON DELETE SET NULL.

## RPC — transactions atomiques

Deux patterns distincts :

```sql
-- 1. Mise à jour JSONB atomique (merge_extra_column)
merge_extra_column(p_table, p_id, p_key, p_value)

-- 2. Transaction multi-UPDATE (pair_flanges) — SECURITY DEFINER
pair_flanges(p_flange_a, p_flange_b, p_pair_id, p_side_a, p_side_b)
-- Met à jour 2 flanges dans la même transaction, pas de rollback manuel.
```

## Tables terrain

- `bolt_specs` — référence boulonnerie (135 rows RF+RTJ). `UNIQUE(face_type, dn, pn)`. Read-only pour tous. Types forts (NUMERIC/INTEGER)
- `field_sessions` — sessions de saisie terrain. Statuts : `preparing`, `active`, `syncing`, `synced`. Owner-only RLS. Colonne `selected_fields TEXT[]` (NULL = tous les champs)
- `field_session_items` — scope quels OTs sont dans une session. PK composite `(session_id, ot_item_id)`
- `equipment_plans` — PDF plans d'équipement. Bucket Storage `plans` (privé)
- Colonnes terrain sur `flanges` : `calorifuge`, `echafaudage`, `field_status` (TEXT)
- Colonnes échafaudage : `echaf_longueur`, `echaf_largeur`, `echaf_hauteur` TEXT (aussi sur `flanges_archive`)
- Colonnes tige unique `dimension_tige_emis` / `dimension_tige_buta` TEXT (+ `dimension_tige_retenu` GENERATED COALESCE) — fusion des anciens `diametre_tige`/`longueur_tige`/`designation_tige`. Texte libre type "M16 x 70". Le wizard terrain saisit en bloc dans `dimension_tige_emis`.
- Pattern BUTA/EMIS étendu à : `nb_joints_prov_*`, `nb_joints_def_*`, `rondelle_*`, `face_bride_*` — chacun avec `_emis` (terrain), `_buta` (client) et `_retenu` GENERATED COALESCE. Avant : 1 colonne neutre. Maintenant : 2 colonnes saisissables + 1 retenu read-only.
- `cle` reste une colonne unique (saisie terrain uniquement, conventionnellement EMIS) — pas de doublon BUTA.

## Nommage

- Tables : snake_case pluriel → `ot_items`, `flanges`, `dropdown_lists`, `import_templates`, `field_sessions`, `bolt_specs`
- Tables d'archive : `{table}_archive` → `ot_items_archive`, `flanges_archive`
- Colonnes : snake_case → `dn_emis`, `matiere_joint_buta`
- Suffixes métier : `_emis` (terrain), `_buta` (client), `_retenu` (COALESCE)
- RPC : verbe_objet → `merge_extra_column`, `pair_flanges`
- Migrations : squashées dans `001_schema.sql` + `seed.sql`

## Contraintes

- `UNIQUE(project_id, item)` sur ot_items — un seul OT par ITEM par projet
- `UNIQUE(file_type, db_field, synonym)` sur column_synonyms
- `REFERENCES ot_items(id)` sur flanges.ot_item_id — intégrité référentielle
- Toujours `IF NOT EXISTS` quand possible pour l'idempotence

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
