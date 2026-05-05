# Mode super-user (admin global)

Un compte avec `profiles.is_admin = true` débloque l'accès à **toutes les données** de l'application, sans modification du modèle multi-tenant existant.

## Architecture

- Table `public.profiles(id, is_admin)` créée par `supabase/migrations/004_admin.sql`.
- Helper SQL `is_admin()` `STABLE SECURITY DEFINER` lit `profiles` en bypassant la RLS (évite la récursion).
- Toutes les policies RLS owner-only sont enrichies de `OR is_admin()`.
- Les RPCs `SECURITY DEFINER` (`delete_project_cascade`, `reimport_archive_lut/jt`) refont un check `(owner OR is_admin)` côté serveur — défense en profondeur.
- Les routes terrain qui utilisent `supabaseAdmin` (service-role bypass RLS) ont chacune un `checkIsAdmin()` côté code TS qui rend conditionnel le filtre `owner_id`.
- Trigger `handle_new_user` crée automatiquement un profil `is_admin = false` à chaque création de compte.

## Promotion / dépromotion

**Aucune UI, aucun endpoint applicatif.** La seule porte d'entrée est SQL externe :

- SQL Editor du dashboard Supabase
- Management API avec un `SUPABASE_ACCESS_TOKEN` valide

```sql
-- Promouvoir
UPDATE profiles SET is_admin = true WHERE id = '<user-uuid>';

-- Dépromouvoir
UPDATE profiles SET is_admin = false WHERE id = '<user-uuid>';
```

Effet **immédiat** à la requête suivante (les policies relisent `profiles` à chaque check via `is_admin()`).

Pour récupérer un UUID :

```sql
SELECT id, email FROM auth.users WHERE email = 'addresse@example.com';
```

## Compte actuellement admin

| Email                | UUID                                   | Promu le   |
| -------------------- | -------------------------------------- | ---------- |
| `yon64320@gmail.com` | `81a9b9f5-d610-45cb-98cb-655a6393b743` | 2026-04-30 |

## Capabilities débloquées

- Voir **tous les projets** sur `/projets` avec un badge `Owner: ...` sur les projets non-owned.
- Lire/modifier `ot_items`, `flanges` de n'importe quel projet via les tableurs LUT/J&T/Rob.
- Lire les **archives** `ot_items_archive` et `flanges_archive` de tous les projets → restauration possible après ré-import accidentel.
- Accéder aux **sessions terrain** de n'importe quel utilisateur (download / sync / suppression).
- Télécharger les **plans PDF** stockés dans le bucket `plans` de tous les projets.
- Télécharger les **photos terrain** (signed URL 15 min) de n'importe quelle bride.
- Lancer `delete_project_cascade` sur n'importe quel projet.
- Lancer `reimport_archive_lut/jt` sur n'importe quel projet.

## Capabilities non débloquées

- Modifier `auth.users` (mot de passe, email d'autres comptes) — réservé au dashboard Supabase.
- Voir les logs Supabase ou les métriques.
- Bypass des limites de rate Supabase.
- Promouvoir d'autres comptes en admin (passe par SQL externe).

## Sécurité — règle absolue

La table `profiles` n'a **aucune** policy `INSERT/UPDATE/DELETE` accessible aux rôles `authenticated` ou `anon`. Seul `service_role` peut écrire. Ne **jamais** ajouter d'endpoint applicatif pour modifier `is_admin` — toute UI de promotion ouvrirait un trou critique.

Indicateur visuel : un petit badge orange `admin` est affiché en bas à droite (fixed) sur toutes les pages quand le compte connecté a `is_admin = true`. Si tu veux temporairement tester l'app comme un user normal, fais un `UPDATE` SQL pour passer à `false`, puis remets à `true` quand tu as fini.

## Vérification end-to-end

```sql
-- 1. Statut actuel
SELECT id, is_admin FROM profiles WHERE id = '<user-uuid>';

-- 2. is_admin() retourne bien true (en se connectant comme yon)
SELECT is_admin();
```

Tests applicatifs :

1. Bandeau orange visible en haut de `/projets`
2. Liste projets contient les projets d'autres comptes (badge `Owner: ...`)
3. `/projets/<id-d-un-autre-compte>` accessible sans 403
4. Édition cellule J&T sur un projet tiers → sauvegarde réussie
5. `/terrain` liste les sessions de tous les comptes

## Fichiers liés

- Migration : `supabase/migrations/004_admin.sql`
- Helper TS : `src/lib/auth/permissions.ts`
- Helper SSR cached : `src/lib/db/queries.ts` → `getCurrentUserCached`
- Bandeau UI : `src/components/AdminBadge.tsx`
- Tests : `src/lib/auth/__tests__/permissions.test.ts`
- Règle : `.claude/rules/db-schema.md` → section "Admin global"
