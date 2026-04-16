# Erreurs — Supabase / PostgreSQL

## Colonnes GENERATED immutables

- **Symptôme** : `ERROR: column "delta_dn" can only be updated to DEFAULT` ou `cannot INSERT into a generated column`
- **Cause racine** : Les colonnes `GENERATED ALWAYS AS ... STORED` (delta_dn, delta_pn, \*\_retenu) ne peuvent pas être écrites directement. Le code tente un UPDATE/INSERT sur une colonne GENERATED
- **Fix** : Modifier les colonnes sources (ex: `dn_emis`, `dn_buta`), pas les colonnes GENERATED. Exclure les GENERATED du whitelist EDITABLE dans les routes PATCH
- **Prévention** : Règle dans api-conventions.md — whitelist EDITABLE exclut toujours les GENERATED
- **Date** : 2026-02

## Read-modify-write sur JSONB extra_columns

- **Symptôme** : Perte de données dans `extra_columns` — des clés disparaissent quand deux modifications arrivent en parallèle
- **Cause racine** : Pattern `SELECT extra_columns → modifier en JS → UPDATE` crée une race condition. Le second UPDATE écrase le premier
- **Fix** : Utiliser la RPC `merge_extra_column` qui fait un `||` atomique côté Postgres
- **Prévention** : Règle dans api-conventions.md — toujours RPC atomique pour JSONB
- **Date** : 2026-03

## Colonnes GENERATED dans les tables archive

- **Symptôme** : Erreur à l'archivage `INSERT INTO ... SELECT * FROM` échoue si la table archive a des colonnes GENERATED
- **Cause racine** : On ne peut pas insérer dans une colonne GENERATED, même via INSERT...SELECT
- **Fix** : Les tables archive ont des colonnes normales (pas GENERATED) — la valeur est figée au moment de l'archivage
- **Prévention** : Documenté dans db-schema.md — tables archive sans contrainte GENERATED
- **Date** : 2026-03
