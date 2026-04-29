# Plan d'audit n°1 — RLS Supabase + usage du service-role

> Ce document est un **prompt autonome** destiné à une nouvelle instance de Claude Code, sans contexte préalable. Tout ce qui est nécessaire à l'exécution de l'audit est embarqué ci-dessous.

---

## Mission confiée à Claude

Tu es chargé de réaliser un **audit de sécurité ciblé sur la couche autorisation** d'une application SaaS Next.js 16 / Supabase. Tu dois :

1. Comprendre le contexte projet (section ci-dessous).
2. Inspecter le schéma SQL et toutes les routes API.
3. Identifier les **risques d'élévation de privilèges, de fuite de données entre tenants et de bypass RLS**.
4. Produire un rapport `docs/audits/findings/rls-{YYYY-MM-DD}.md` avec findings classés par sévérité et patches proposés.

Travaille en **lecture seule sur le code de production**. Les seules écritures autorisées sont :

- le rapport final dans `docs/audits/findings/`,
- éventuellement un fichier de tests Vitest dans `src/lib/__tests__/rls-audit.test.ts` si tu veux prouver une vulnérabilité (à valider avec l'utilisateur avant exécution contre la base distante).

---

## Contexte projet (à lire intégralement)

### Stack

- Next.js 16 (App Router), React 19, TypeScript 6
- Supabase (PostgreSQL + Auth + Storage + RLS)
- Zod 4 pour la validation des inputs
- Pas de couche API externe (toutes les routes sont des `app/api/*/route.ts`)
- Mono-utilisateur en pratique aujourd'hui mais multi-tenant by design (`projects.owner_id`)

### Modèle de sécurité voulu

- Un utilisateur authentifié ne doit voir et modifier que **ses propres projets** et leurs dépendances (ot_items, flanges, archives, sessions terrain, plans).
- Les tables de référence (`bolt_specs`, `dropdown_lists`, `operations_ref`, `column_synonyms`, `import_templates`) sont en lecture ouverte.
- L'isolation est assurée par **RLS** (`owner_id = auth.uid()` ou jointure via `projects`).

### Deux familles de routes API

1. **Routes "standard"** — utilisent `createServerSupabase()` (`src/lib/db/supabase-ssr.ts`) qui lit la session via cookies. RLS appliquée naturellement avec `auth.uid()` correct.
2. **Routes "terrain"** (`src/app/api/terrain/*`) — utilisent `supabaseAdmin` (`src/lib/db/supabase-server.ts`) qui est un client **service-role** qui bypass RLS. La sécurité est censée être assurée par :
   - validation manuelle d'un Bearer token via `getUser(request)` (`src/lib/auth/get-user.ts`),
   - ajout systématique d'un `.eq("owner_id", user.id)` dans les requêtes.

C'est le **point chaud** de l'audit : si une seule route terrain oublie le filtre owner, n'importe quel utilisateur authentifié peut accéder aux données de tous les autres.

### Tables et RLS connues

Schéma canonique : `supabase/migrations/001_schema.sql`. Tables avec RLS activée :

| Table                                                               | Stratégie RLS                                                         |
| ------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `projects`                                                          | `owner_id = auth.uid()` (SELECT/INSERT/UPDATE/DELETE)                 |
| `ot_items`, `flanges`                                               | `project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())` |
| `ot_items_archive`, `flanges_archive`                               | idem via project_id                                                   |
| `field_sessions`                                                    | `owner_id = auth.uid()`                                               |
| `field_session_items`                                               | jointure via `field_sessions.owner_id`                                |
| `equipment_plans`                                                   | jointure via `projects.owner_id`                                      |
| `import_templates`                                                  | lecture/écriture ouvertes (USING true)                                |
| `operations_ref`, `dropdown_lists`, `column_synonyms`, `bolt_specs` | SELECT ouvert                                                         |

### Fonctions RPC à examiner

- `merge_extra_column(p_table, p_id, p_key, p_value)` — utilise `EXECUTE format('UPDATE %I ...', p_table)` avec whitelist `('ot_items', 'flanges')`. Vérifier l'absence d'injection.
- `delete_project_cascade(p_project_id)` — `SECURITY DEFINER`. Pas de check owner dans la fonction (le caller doit vérifier).
- `reimport_archive_lut`, `reimport_archive_jt`, `_archive_flanges`, `_archive_ot_items` — toutes `SECURITY DEFINER`.

### Storage

- Bucket `plans` (privé). Les routes terrain génèrent des `signedUrl` valides 1h.

### Variables d'env attendues

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (jamais exposée client)

---

## Objectifs précis

1. Confirmer que **toutes** les tables hébergeant des données utilisateur ont RLS activée et des policies pour chaque opération nécessaire.
2. Vérifier que **chaque route API** soit utilise `createServerSupabase` (RLS active), soit utilise `supabaseAdmin` AVEC une vérification explicite `owner_id = user.id` avant chaque lecture/mutation.
3. Identifier les RPC `SECURITY DEFINER` qui peuvent être appelées sans contrôle d'accès suffisant côté caller.
4. Vérifier qu'aucune clé service-role n'est exposée côté client (variables `NEXT_PUBLIC_*`, bundles webpack, mauvais imports).
5. Vérifier l'absence d'injections SQL dans les RPC `EXECUTE format()`.
6. Évaluer les **GRANTs** (anon/authenticated/service_role) — confirmer que la défense en profondeur est en place mais ne masque pas une RLS manquante.

---

## Périmètre — fichiers à inspecter exhaustivement

### SQL

- `supabase/migrations/001_schema.sql` (canonique, ~644 lignes)
- `supabase/seed.sql`

### Auth & clients DB

- `src/lib/auth/get-user.ts`
- `src/lib/db/supabase-ssr.ts`
- `src/lib/db/supabase-server.ts`
- `src/lib/db/supabase-browser.ts`
- `src/middleware.ts`

### Routes API (toutes — 14 fichiers)

- `src/app/api/projects/route.ts`
- `src/app/api/projects/[id]/fiche-template/route.ts`
- `src/app/api/ot-items/route.ts`
- `src/app/api/flanges/route.ts`
- `src/app/api/robinetterie/route.ts`
- `src/app/api/import/detect/route.ts`
- `src/app/api/import/confirm/route.ts`
- `src/app/api/export/route.ts`
- `src/app/api/sync/route.ts`
- `src/app/api/pdf/fiches-rob/route.ts`
- `src/app/api/templates/jt/route.ts`
- `src/app/api/terrain/sessions/route.ts`
- `src/app/api/terrain/download/route.ts`
- `src/app/api/terrain/sync/route.ts`
- `src/app/api/terrain/plans/route.ts`

### Helpers à risque

- `src/lib/api/patch-handler.ts` (factorisation des PATCH — vérifier qu'il propage l'auth)
- `src/lib/db/import-lut.ts`, `src/lib/db/import-jt.ts` (chemin import qui touche plusieurs tables)
- `src/lib/db/queries.ts`

### Conventions du projet

- `.claude/rules/api-conventions.md` — règle "client serveur — règle d'or" et exception terrain
- `.claude/rules/db-schema.md` — sections RLS + GRANTs

---

## Méthodologie — 6 phases

### Phase 1 — Cartographie RLS (lecture du SQL)

Pour chaque `CREATE TABLE` du schéma :

1. Note s'il y a un `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
2. Liste les `CREATE POLICY` (SELECT/INSERT/UPDATE/DELETE) avec leur clause `USING` / `WITH CHECK`.
3. Identifie les tables sans policy DELETE/UPDATE (peut être intentionnel pour archives, à confirmer).
4. Vérifie que les colonnes utilisées dans `USING` sont indexées (regarder section INDEXES du schéma).
5. Construis un tableau récapitulatif :

```
| Table | RLS on | SELECT | INSERT | UPDATE | DELETE | Index sur col RLS | Risque |
```

**Red flag** : RLS activée mais policy `USING (true)` sur une table avec données utilisateur → équivalent à pas de RLS.

### Phase 2 — Audit des RPC `SECURITY DEFINER`

Pour chaque fonction marquée `SECURITY DEFINER` (au moins : `delete_project_cascade`, `_archive_flanges`, `_archive_ot_items`, `reimport_archive_lut`, `reimport_archive_jt`) :

1. Vérifie la présence de `SET search_path = public` (sinon : risque escalation via search_path).
2. Cherche les checks d'autorisation **dans la fonction** (idéalement `auth.uid()` comparé à un `owner_id`).
3. Si pas de check dans la fonction, identifie le caller TypeScript et vérifie que LUI fait le check avant d'appeler la RPC.
4. Pour `merge_extra_column` : confirme que la whitelist `IF p_table NOT IN (...)` est exhaustive et que `format('%I')` est bien utilisé (échappement identifiant).

### Phase 3 — Audit des routes "terrain" (priorité 1)

Pour chacune des 4 routes `src/app/api/terrain/*` :

1. La route appelle-t-elle `getUser(request)` ? Que se passe-t-il si `user === null` ?
2. Toute requête vers `field_sessions`, `field_session_items`, `equipment_plans`, `flanges`, `ot_items` inclut-elle un check `eq("owner_id", user.id)` direct ou indirect (via une session déjà filtrée) ?
3. Est-ce qu'on peut **forger un sessionId** appartenant à un autre user et obtenir ses données ?
4. La route `/api/terrain/sync` accepte une liste de `flangeId`. Vérifie que les brides ciblées appartiennent bien à un projet du user (pas seulement check sur `field_sessions`).
5. La route `/api/terrain/plans` (POST upload) — vérifie le check ownership avant écriture Storage.
6. Construis un tableau :

```
| Route | Méthode | getUser ? | Filtre owner_id ? | RPC appelée ? | Risque IDOR |
```

**Test mental obligatoire** : "si l'utilisateur Alice envoie une requête avec son token mais avec un sessionId/flangeId qui appartient à Bob, que se passe-t-il ?"

### Phase 4 — Audit des routes "standard"

Pour chacune des autres routes :

1. Utilise-t-elle `createServerSupabase()` (RLS active) ou `supabaseAdmin` (bypass) ?
2. Si `supabaseAdmin` : pourquoi ? Est-ce justifié ? Filtre owner_id présent ?
3. Est-ce qu'une mutation accepte un `id` arbitraire dans le body (pas dans l'URL) ?
4. Présence d'un `safeParse` Zod en début de handler (cf. `src/lib/validation/schemas.ts`) ?

### Phase 5 — Recherche d'exposition de la service-role key

1. `grep` exhaustif sur la base : `SUPABASE_SERVICE_ROLE_KEY`, `service_role`, `serviceRole`.
2. Vérifie qu'aucun import de `supabase-server.ts` n'est fait depuis un fichier `"use client"` ou `src/components/`.
3. Inspecte `next.config.ts` pour vérifier qu'aucune variable serveur ne fuite via `env:` ou `publicRuntimeConfig`.
4. Inspecte `src/sw.ts` (Service Worker) — interdit absolu d'avoir la service-role key dedans.

### Phase 6 — Test live (optionnel, à valider avec l'utilisateur)

Si l'utilisateur autorise un test contre l'instance Supabase :

1. Crée deux users de test (User A, User B) dans Supabase Auth.
2. User A crée un projet + un OT + une bride + une session terrain.
3. Avec le token de User B, tente :
   - `GET /api/projects` → ne doit voir que ses projets.
   - `GET /api/terrain/download?sessionId=<id session de A>` → doit retourner 404, pas les données.
   - `POST /api/terrain/sync` avec un `flangeId` de A → doit retourner erreur, pas écraser.
   - `PATCH /api/flanges` sur une bride de A → doit refuser via RLS.
4. Documente chaque résultat (ce qui passe et ce qui est bloqué).

---

## Checklist détaillée (cocher chaque point)

### RLS schéma

- [ ] Toutes les tables `public.*` ont `ENABLE ROW LEVEL SECURITY`
- [ ] Aucune table avec données utilisateur n'a une policy `USING (true)` permissive
- [ ] Les jointures de policies (`project_id IN (SELECT ...)`) utilisent des colonnes indexées
- [ ] Les tables `_archive` ont une policy DELETE absente ou volontairement restreinte
- [ ] Les GRANTs en fin de fichier ne donnent pas de droits à `anon` qui rendraient une faille RLS exploitable

### RPC

- [ ] Toutes les `SECURITY DEFINER` ont `SET search_path = public`
- [ ] `merge_extra_column` whitelist exhaustive et utilisation correcte de `format('%I')`
- [ ] `delete_project_cascade` n'est appelée qu'après check owner côté caller
- [ ] `_archive_*` ne peuvent pas être appelées depuis le client (réservées RPC internes)

### Routes API

- [ ] Chaque route a un `getUser` ou `createServerSupabase + getUser` au début
- [ ] Chaque mutation valide le payload via Zod `safeParse` + `flattenError`
- [ ] Les routes terrain ajoutent systématiquement le filtre owner
- [ ] Aucune route ne renvoie des données d'un autre user via un id forgé (test IDOR)
- [ ] Les routes upload (plans) vérifient taille + MIME

### Service-role

- [ ] Pas de référence à `SUPABASE_SERVICE_ROLE_KEY` en dehors de `src/lib/db/supabase-server.ts` et des routes serveur
- [ ] Pas d'import de `supabase-server.ts` depuis du code client
- [ ] La clé n'apparaît pas dans le bundle client (vérification `npm run build` + `grep` dans `.next/static`)
- [ ] `.env.local` est gitignore (vérifier `.gitignore`)

### Storage

- [ ] Bucket `plans` est privé (pas public)
- [ ] Les `signedUrl` ont une durée raisonnable (≤ 1h)
- [ ] Les uploads vérifient ownership avant insertion `equipment_plans`

---

## Format du livrable

Crée `docs/audits/findings/rls-{YYYY-MM-DD}.md` avec cette structure :

```markdown
# Audit RLS Supabase — {date}

## Résumé exécutif

- **Findings critiques** : N
- **Findings élevés** : N
- **Findings moyens** : N
- **Findings informatifs** : N
- **Verdict global** : (vert / jaune / rouge)

## Findings détaillés

### F-001 — [Titre court] — Sévérité : Critique

**Localisation** : `src/app/api/.../route.ts:42`

**Description**
Une à trois phrases.

**Reproduction (si applicable)**
Étapes ou requête curl pour déclencher.

**Impact**
Données exfiltrables, mutation non autorisée, etc.

**Patch suggéré**
Code diff ou pseudocode.

**Tests à ajouter**
Liste de cas Vitest / Playwright.

---

### F-002 — ...
```

### Échelle de sévérité

- **Critique** : exploitabilité avec un user authentifié quelconque, lecture/mutation de données d'autres users.
- **Élevée** : nécessite condition particulière (timing, data shape) mais reste réaliste.
- **Moyenne** : défense en profondeur manquante, exploitabilité indirecte.
- **Informative** : pratique non recommandée, dette technique sécurité.

---

## Critères d'acceptation de l'audit

L'audit est considéré complet quand :

1. Les 17 routes API ont chacune une ligne dans le tableau récap.
2. Toutes les tables `public.*` du schéma ont une ligne dans le tableau RLS.
3. Toutes les RPC `SECURITY DEFINER` ont été passées en revue.
4. Le rapport contient au moins un finding par catégorie identifiée OU mentionne explicitement "rien à signaler" avec justification.
5. Pour chaque finding critique/élevé, un patch est proposé et un test de non-régression est suggéré.

---

## Contraintes de comportement

- **Lecture seule sur le code de production**. Tu n'édites que le rapport et éventuellement un fichier de test.
- **Pas d'exécution contre la base distante sans autorisation explicite** de l'utilisateur. Demande avant d'utiliser le MCP Supabase.
- **Pas d'invention** : si tu n'es pas sûr d'un comportement, ouvre le fichier et lis-le. Si vraiment pas clair, marque comme "à vérifier avec l'utilisateur" plutôt que d'affirmer.
- **Énonce ton modèle mental** avant de plonger : ce que tu crois sur l'archi, ce que tu vas regarder en premier, l'hypothèse la plus risquée.

---

## Sources de référence

- [Supabase — Row Level Security docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase RLS Best Practices for Multi-Tenant Apps](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)
- [Supabase Security Best Practices 2026](https://supaexplorer.com/guides/supabase-security-best-practices)
- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [Why service_role bypasses RLS](https://supabase.com/docs/guides/troubleshooting/why-is-my-service-role-key-client-getting-rls-errors-or-not-returning-data-7_1K9z)
- [OWASP — IDOR (Insecure Direct Object References)](https://owasp.org/www-community/attacks/Insecure_Direct_Object_References)
