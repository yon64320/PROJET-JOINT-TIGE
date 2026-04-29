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

## RPC `SECURITY DEFINER` exécutable cross-tenant sans check ownership

- **Symptôme** : Tout user authentifié peut invoquer directement `POST /rest/v1/rpc/<fn>` avec un `p_project_id` arbitraire et **détruire** les données d'un autre tenant (delete*project_cascade, reimport_archive*\*). Aucune erreur côté Supabase, l'opération réussit
- **Cause racine** : Une fonction `SECURITY DEFINER` s'exécute avec les droits du créateur (postgres) → bypass RLS du caller. Combinée à `GRANT ALL ON ALL FUNCTIONS … TO authenticated`, l'API REST Supabase l'expose à tous. Si la fonction ne contient pas de check `auth.uid()` interne, l'isolation est brisée
- **Fix** : Vérification d'ownership en début de chaque RPC destructrice : `IF NOT EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND owner_id = auth.uid()) THEN RAISE EXCEPTION 'Accès refusé'; END IF;`. Optionnellement, `REVOKE EXECUTE FROM authenticated` sur les helpers internes (`_archive_*`)
- **Prévention** : Toute RPC `SECURITY DEFINER` qui touche des tables tenant doit faire un `auth.uid()` check explicite OU avoir son `EXECUTE` revoke à `authenticated`. Le `GRANT ALL ON ALL FUNCTIONS` posé en fin de schéma (db-schema.md) ouvre la porte par défaut — ne pas s'y fier
- **Date** : 2026-04-29

## Service-role bypass RLS sans check ownership manuel → IDOR

- **Symptôme** : Routes `/api/terrain/*` qui acceptent un `projectId`/`flangeId`/`otItemId` du payload et l'utilisent dans une requête sans vérifier qu'il appartient au user. Lecture, mutation ou destruction silencieuses de ressources d'un autre tenant
- **Cause racine** : `supabaseAdmin` (`SUPABASE_SERVICE_ROLE_KEY`) **bypass intégralement** la RLS. La sécurité repose entièrement sur des `eq("owner_id", user.id)` côté code TS. Oubli ou check incomplet (ex: vérifier `sessionId.owner_id` mais pas que `flangeId.ot_item_id ∈ session_items`) = breach
- **Fix** : Pour chaque ressource du payload, vérifier qu'elle appartient (directement ou transitivement) au user **avant** toute écriture. Pattern : `SELECT id FROM projects WHERE id = $1 AND owner_id = auth.uid()` puis `IN`-filter sur les ressources enfants
- **Prévention** : Préférer `createServerSupabase()` (cookies + RLS) à `supabaseAdmin` partout où la PWA/client peut envoyer le cookie de session. Réserver le service-role aux jobs admin/seed/cross-tenant légitimes. Quand service-role est obligatoire : **checklist "ownership de chaque ressource du payload, pas seulement de la première"** documentée dans api-conventions.md
- **Date** : 2026-04-29

## RLS policy `USING(true)` ou `WITH CHECK(true)` sur table partagée

- **Symptôme** : Tout user authentifié peut INSERT/UPDATE des lignes d'autres users sur une table "partagée" (ex: `import_templates`, `column_synonyms`). Lecture ouverte intentionnelle, écriture ouverte par accident → corruption silencieuse cross-tenant
- **Cause racine** : Pour une table conçue comme partagée en lecture (templates réutilisables, synonymes appris), il est tentant de mettre `SELECT USING (true)` puis de copier le pattern sur INSERT/UPDATE. L'écriture devient alors un vecteur de social engineering : un attaquant modifie un template/synonyme de la victime, qui s'en sert sans s'en rendre compte
- **Fix** : Ajouter `owner_id UUID REFERENCES auth.users(id)`, backfill, restreindre INSERT/UPDATE par `owner_id = auth.uid()`. Garder SELECT ouvert si le partage est voulu. Alternative : interdire l'UPDATE complètement et forcer la création de nouvelles versions
- **Prévention** : `USING(true)` ne s'applique **qu'à SELECT**. Pour INSERT/UPDATE/DELETE, toujours filtrer par `owner_id = auth.uid()` (ou équivalent transitif via `project_id IN ...`). Audit : grep `WITH CHECK (true)` dans les migrations
- **Date** : 2026-04-29
