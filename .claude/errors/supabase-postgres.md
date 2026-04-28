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

## Client anonyme dans Server Component → RLS bloque les lignes

- **Symptôme** : Le compteur de sessions terrain affiche toujours 0 sur la page hub projet, alors que des sessions existent en base
- **Cause racine** : Le Server Component utilisait `supabase` de `@/lib/db/supabase` (client anonyme `createClient(url, anonKey)` sans contexte auth). Les policies RLS owner-only (`owner_id = auth.uid()`) évaluent `auth.uid()` à `NULL` → toutes les lignes bloquées
- **Fix** : Remplacer par `createServerSupabase()` de `@/lib/db/supabase-ssr` qui crée un client SSR avec cookies → `auth.uid()` résolu correctement
- **Prévention** : Dans un Server Component, **toujours** utiliser `createServerSupabase()`. Réserver `supabase` (anon) aux scripts/seeds sans RLS
- **Date** : 2026-04-21

## Filtre de statut trop restrictif sur le compteur de sessions

- **Symptôme** : Le compteur de sessions terrain reste à 0 après download+sync d'une session
- **Cause racine** : La requête count filtre `.in("status", ["preparing", "active"])`, excluant `synced` et `syncing`. Après le cycle complet, le statut passe à `synced` → invisible
- **Fix** : Supprimer le filtre de statut — compter toutes les sessions du projet
- **Prévention** : Quand on ajoute un filtre sur un compteur, vérifier que tous les états du cycle de vie sont couverts
- **Date** : 2026-04-21

## RPC `INSERT INTO archive SELECT t.*` → décalage de colonnes

- **Symptôme** : Avertissement à l'archivage `Archive J&T: column "archived_at" is of type timestamp with time zone but expression is of type uuid`. Le ré-import termine mais aucune ligne n'est archivée (compteur "archivées" = 0)
- **Cause racine** : Les RPCs `reimport_archive_lut/jt` faisaient `INSERT INTO flanges_archive SELECT f.*, now(), 'reimport_jt' FROM flanges f`. PostgreSQL aligne les colonnes par **position**, pas par nom. Or `flanges_archive` met `archive_id, archived_at, archived_reason` en tête de table, ET intercale les colonnes GENERATED (`delta_*`, `*_retenu`) au milieu — alors que `flanges` les a à la fin. Résultat : `f.id` (UUID) tombe sur `archived_at` (timestamptz) → mismatch de type
- **Fix** : Listes de colonnes **explicites** dans `INSERT INTO ... (col1, col2, ...) SELECT col1, col2, ... FROM ...`. Helpers internes `_archive_flanges()` et `_archive_ot_items()` factorisent. Cast `delta_dn::text`/`delta_pn::text` (BOOLEAN dans source, TEXT dans archive)
- **Prévention** : **Jamais de `SELECT *` ou `t.*` dans un INSERT vers une table miroir avec colonnes additionnelles ou réordonnées**. Toujours énumérer les colonnes des deux côtés. Vérifier visuellement l'alignement source ↔ destination quand les schémas évoluent
- **Date** : 2026-04-28
