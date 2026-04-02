---
globs: "supabase/migrations/**/*.sql"
---

# Conventions schéma DB (Supabase PostgreSQL)

## Types de colonnes

| Donnée                          | Type                             | Exemple                      |
| ------------------------------- | -------------------------------- | ---------------------------- |
| DN, PN (diamètres, pressions)   | `NUMERIC`                        | 1.5, 150                     |
| Compteurs (NB TIGES, NB JOINTS) | `INTEGER`                        | 4, 12                        |
| Texte libre                     | `TEXT`                           | Pas de VARCHAR               |
| Booléens                        | `BOOLEAN DEFAULT FALSE`          | corps*metier*\*, rob         |
| Données flexibles               | `JSONB DEFAULT '{}'`             | extra_columns, cell_metadata |
| Identifiants                    | `UUID DEFAULT gen_random_uuid()` | id, project_id               |

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

## Nommage

- Tables : snake_case pluriel → `ot_items`, `flanges`, `dropdown_lists`
- Colonnes : snake_case → `dn_emis`, `matiere_joint_buta`
- Suffixes métier : `_emis` (terrain), `_buta` (client), `_retenu` (COALESCE)
- RPC : verbe_objet → `merge_extra_column`
- Migrations : `NNN_description.sql` → `001_initial_schema.sql`

## Contraintes

- `UNIQUE(project_id, item)` sur ot_items — un seul OT par ITEM par projet
- `REFERENCES ot_items(id)` sur flanges.ot_item_id — intégrité référentielle
- Toujours `IF NOT EXISTS` quand possible pour l'idempotence
