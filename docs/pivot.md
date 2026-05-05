# Pivot — historique des décisions

Timeline des décisions et revirements marquants du projet. Ordre antichronologique (le plus récent en haut).

Format d'entrée :

```
## YYYY-MM-DD — Titre court

**Décision** : ce qui a été acté.
**Justification** : pourquoi (incident, contrainte, préférence utilisateur).
**Avant/après** : si revirement, ce qui a changé.
```

---

## 2026-05-05 — Import Gammes → LUT : deux modes (build / export) selon état du projet

**Décision** : La page `/projets/[id]/import-gammes` (wizard 3 étapes : upload → mapping/sélection EMIS → confirmation) détermine **côté serveur** un des deux modes selon que la LUT du projet est vide ou non :

- `build` (projet sans LUT) : agrège phases du fichier Gammes Compilées par ITEM → INSERT batch en `ot_items` (items sans corps EMIS = `type_travaux = "NC"`) + génère le `.xlsx` LUT.
- `export` (LUT existante) : génère uniquement le `.xlsx` (DB **non touchée**).

Modules partagés `src/lib/import/gammes/` (parse-gammes, aggregate-items, write-lut) réutilisés par le script CLI `scripts/gammes-to-lut.ts`. Skill `import-excel` enrichi avec `references/gammes-mapping.md`. Schémas Zod : `GammesMappingSchema`, `GammesConfirmBodySchema`.

**Justification** : Une LUT en cours de préparation contient des champs saisis manuellement (FAMILLE, TYPE, REV, statut, etc.) qui ne sont **pas** dans le fichier Gammes Compilées source. Un re-import `build` aurait écrasé ces champs et perdu le travail du préparateur. Le mode `export` permet de re-générer un `.xlsx` propre à partir des Gammes (pour partage / archivage) sans impacter la base. Le choix entre les deux est automatique (état du projet) plutôt que demandé à l'utilisateur — élimine une question piège.

**Avant/après** : Avant, pas d'import Gammes côté web (uniquement script CLI `scripts/gammes-to-lut.ts`). Maintenant, wizard web + script CLI partagent les mêmes modules `src/lib/import/gammes/`. La logique métier (`type_travaux = "NC"` pour items sans corps EMIS) est dans le module agrégation, donc cohérente entre les deux entrées.

---

## 2026-05-04 — Audit perf 9 fixes CRITIQUE + archivage audits + skill `fin-conversation`

**Décision** : Trois changements structurants appliqués en une session :

1. **Audit perf complet** (skill `perf-audit --full`) → score baseline 6.8/10 → 9 violations CRITIQUE corrigées : `createSignedUrls` batch (terrain photos + plans), `count: "estimated"` au lieu de `"exact"` (4 hub projet) + `.limit(1)` (3 checks d'existence), `terrain/sync` DELETE batch (`.in()` select + `.delete().in()`), `<a href>` → `<Link>` (8 fichiers), `@next/bundle-analyzer` installé + `experimental.optimizePackageImports` sur les presets Univer. Score post-fix attendu ~9/10. Commit `e618fa9` poussé sur main, ancien `92ff25f` sauvegardé dans la branche `backup-main-2026-05-04`.

2. **Architecture documentaire en 3 zones** :
   - `docs/pivot.md` → décisions & revirements (timeline antichronologique)
   - `docs/audits/findings/<nom>-<YYYY-MM-DD>.md` → snapshots datés versionnés Git
   - `memory/project_*.md` → synthèses vivantes Claude (référence pour comparer audits suivants)

   Skills `back-audit` et `perf-audit` modifiés pour archiver **systématiquement** un snapshot daté + maj de l'index `docs/audits/README.md` à chaque exécution. Skill `fin-session` enrichi pour vérifier la cohérence snapshot ↔ memory.

3. **Skill `fin-conversation`** créé pour audit avant `/clear`, distinct de `fin-session` (git-based) : se base sur la conversation entière, applique un **filtre de pertinence strict**, **auto-applique** les modifs sur documentation passive (CLAUDE.md, rules, memory, pivot, errors, audits index), et ne demande validation explicite que pour les modifications de `.claude/skills/**` et `.claude/agents/**` (qui altèrent le comportement runtime de Claude).

**Justification** : Les audits étaient jusqu'ici uniquement en mémoire Claude (synthèses) — donc invisibles hors-Claude (le préparateur ne pouvait pas relire ses propres audits sur GitHub). L'archivage daté dans `docs/audits/findings/` rend les rapports versionnés, partageables, comparables. Le skill `fin-conversation` complète `fin-session` pour les fins de conversation où aucun commit n'a encore été fait — utile pour capturer les décisions purement conversationnelles avant `/clear`.

**Avant/après** : Avant, audits en `memory/` uniquement, `<a href>` mélangé avec `<Link>`, `count: "exact"` partout, signed URLs en boucle, 1 seul skill de fin (`fin-session` git-only). Après, double sauvegarde audits (snapshot + memory + index), navigation full-`<Link>`, count adapté à l'usage, signed URLs batch, 2 skills de fin spécialisés.

---

## 2026-05-04 — Audit back-end : durcissements FK + helper `serverError` + skill `back-audit`

**Décision** : Création du skill `back-audit` (9 sections / 3 niveaux de criticité, scorecard pondéré) et application des corrections issues du premier passage. Migration `006_back_audit_fixes.sql` durcit 9 FK avec `ON DELETE CASCADE` explicite (ce qui était jusque-là implicite ou absent côté `001_schema.sql`) — `equipment_plans.ot_item_id` reste `SET NULL` (pattern "projet général"), `flange_photos.flange_id` reste `SET NULL` (re-rattachement après ré-import), `projects.owner_id` passe en `SET NULL` (préservation des projets si user supprimé). Le bucket `photos` reçoit `allowed_mime_types = ARRAY['image/webp']` en defense en profondeur (le check côté API reste). Côté code : helper `serverError(ctx, error)` centralisé dans `src/lib/api/errors.ts` (log + réponse 500 générique, plus de leak de structure interne) déployé sur 14 routes. Pagination `.range()` ajoutée sur `/api/flanges` et `/api/ot-items` (Supabase tronquait silencieusement à 1000 lignes au-delà). Ajout du skill `perf-audit` en parallèle pour couvrir le volet performance.

**Justification** : Audit interne post-Phase B qui a révélé que certaines FK reposaient sur le comportement par défaut Postgres (NO ACTION) — un `DELETE` direct sur `projects` (hors RPC `delete_project_cascade`) aurait échoué par contrainte d'intégrité, mais surtout, en cas de bug futur dans le code de cascade, les données auraient pu rester partiellement orphelines. Les FK explicites alignent le schéma sur ce que la RPC fait déjà. Le helper `serverError` répond à un constat répété dans le diff : chaque route renvoyait `error.message` brut au client (leak potentiel de structure DB).

**Avant/après** : Avant, FK implicites + chaque route construisait sa réponse 500 à la main. Maintenant, FK explicites + `serverError("[METHOD /api/path]", error)` une-ligne. Score baseline back-audit : 9.0.

---

## 2026-05-01 — Plans d'équipement : upload par dossier + bucket storage migré

**Décision** : Migration `005_plans_storage_bucket.sql` qui crée formellement le bucket privé `plans` (50 Mo, MIME `application/pdf` strict) en code versionné, et ajoute deux index naturels (`idx_equipment_plans_natural` partiel `WHERE ot_item_id IS NOT NULL` + `idx_equipment_plans_general`) pour l'écrasement déterministe. Nouvelle page `/projets/[id]/plans` (Server Component + `PlansClient` côté client) qui upload des PDF via `<input type="file" webkitdirectory>` : matching auto par 1er segment de chemin → ITEM (réutilise `normalizeHeader` + `levenshtein` exposés depuis `detect-columns.ts`, ratio strict > 0.85), récap éditable avec dropdown ITEM ou option "Projet général", upload séquentiel. La route `POST /api/terrain/plans` accepte désormais `otItemId` null/absent → plan "projet général" (visible sur tous les OTs en session). Si même `(project_id, ot_item_id, filename)` existe → l'ancien (storage + DB) est supprimé avant l'INSERT du nouveau. Côté offline (`OfflinePlan.ot_item_id: string | null`), le viewer charge `ot_item_id === otItemId || ot_item_id === null` ; null n'étant pas indexé en Dexie, filtrage en JS post-`.toArray()`.

**Justification** : Le bucket `plans` était jusque-là créé à la main dans le dashboard Supabase Studio — le squash `001_schema.sql` mentionnait la table `equipment_plans` mais pas le bucket, ce qui cassait toute restauration sur un nouvel environnement. La migration le rend reproductible. Côté UX, l'upload manuel un-par-un n'était pas viable pour un préparateur qui peut avoir 50-150 plans pour un arrêt ; l'upload par dossier avec matching auto est une fonctionnalité demandée par l'utilisateur préparateur EMIS pour ne plus avoir à associer chaque PDF individuellement à son OT. Le concept "projet général" couvre les plans qui ne sont pas spécifiques à un équipement (plan d'ensemble de l'unité, schémas généraux).

**Avant/après** : Avant, page `/plans` inexistante côté préparation, bucket créé à la main, `OfflinePlan.ot_item_id: string` (NOT NULL côté types client), route API rejetait `otItemId` absent. Maintenant, page de staging avec récap, bucket versionné, `ot_item_id` nullable côté DB et types, écrasement déterministe.

---

## 2026-04-30 — Mode super-user (admin global) sans gestion de rôles

**Décision** : Ajout d'un flag `profiles.is_admin` (table `profiles` créée par migration `004_admin.sql`) qui débloque l'accès à toutes les données de l'application sans modifier le modèle multi-tenant existant. Helper SQL `is_admin()` `STABLE SECURITY DEFINER`. Toutes les policies RLS owner-only enrichies de `OR is_admin()`. RPCs `SECURITY DEFINER` enrichies du même check `(owner OR is_admin)`. Les routes `supabaseAdmin` appellent `checkIsAdmin()` côté TS pour rendre conditionnel le filtre `eq("owner_id", user.id)`. Promotion **uniquement** via SQL service-role (SQL Editor dashboard ou Management API) — aucun endpoint applicatif. Bandeau UI fixed bottom-right (`AdminBadge.tsx`).

**Justification** : L'utilisateur (préparateur EMIS) a besoin d'accéder aux projets et archives de tous les comptes pour assistance et restauration après ré-import accidentel, sans pour autant déployer une vraie gestion de rôles (project_members + invitations + UI admin), considérée comme prématurée pour la V1. Un flag binaire suffit pour ce besoin opérationnel.

**Avant/après** : Avant, ligne roadmap "Gestion de rôles | Plus tard | Pas nécessaire V1". Maintenant, deux lignes : "Mode super-user (admin) | Done" et "Collab multi-utilisateur | Plus tard". Risque accepté : pas de UI de promotion = obligation de passer par SQL externe (fait partie de la sécurité, voir `.claude/rules/db-schema.md` § "Admin global").

---

## 2026-04-29 — Audit sécurité RLS : checks `auth.uid()` dans les RPC `SECURITY DEFINER`

**Décision** : Nouvelle migration `002_security_fixes.sql` qui patche les 3 RPC destructrices (`delete_project_cascade`, `reimport_archive_lut`, `reimport_archive_jt`) avec un check `owner_id = auth.uid()` en début de fonction. Helpers internes (`_archive_flanges`, `_archive_ot_items`) voient leur EXECUTE révoqué de `anon` / `authenticated`. `merge_extra_column` valide la table cible et signale les no-op silencieux. `import_templates` gagne `owner_id` + policies INSERT/UPDATE durcies.

**Justification** : Audit RLS du 2026-04-29 (HIGH-01) a identifié que tout user authentifié pouvait invoquer `POST /rest/v1/rpc/delete_project_cascade` avec un `project_id` arbitraire et détruire le projet d'un autre tenant — la RPC n'avait aucun check d'ownership et `SECURITY DEFINER` court-circuite la RLS.

**Avant/après** : Avant, les RPC s'appuyaient uniquement sur la vérif `owner_id = user.id` côté route API. Maintenant, double vérification : route ET RPC. Les routes API gardent leur check ownership pour retourner un 403 propre plutôt qu'une exception PG en 500.

---

## 2026-04-29 — Next 16 : `src/middleware.ts` → `src/proxy.ts`

**Décision** : Rename du fichier `src/middleware.ts` en `src/proxy.ts`. Fonction `middleware()` renommée en `proxy()`. API et logique inchangées (auth Supabase via cookies SSR).

**Justification** : Next 16 a renommé la convention `middleware` → `proxy` ([doc officielle](https://nextjs.org/docs/messages/middleware-to-proxy)). L'ancien fichier déclenchait un warning au build qui sera une erreur dans une version future.

**Avant/après** : Pas de changement fonctionnel. Toutes les références code (`/api/terrain/*` exclu via test pathname, etc.) restent identiques.

---

## 2026-04-29 — Sessions terrain : ajout/suppression de brides côté préparateur

**Décision** : Le préparateur peut ajouter ou supprimer une bride pendant une session terrain. Ces opérations sont mises en file d'attente IndexedDB (mutations `type: "create"` / `"delete"`) et appliquées en base au sync via `/api/terrain/sync` étendu (CRÉATE → UPDATE → DELETE dans cet ordre).

**Justification** : Sur le terrain, le préparateur peut découvrir une bride manquante ou en trop sur l'équipement (relevé Excel imparfait). Sans ce mécanisme, il aurait dû annoter et corriger plus tard côté desktop, perdant la traçabilité au moment de la saisie.

**Avant/après** : Avant, la session était figée — seules les modifications (UPDATE) étaient possibles. Maintenant, la queue de mutations est un **discriminated union** `update | create | delete`. Les brides créées hors-ligne ont un id local `temp_<uuid>` remplacé par l'UUID Postgres au sync (mapping renvoyé par le serveur).

---

## 2026-04-30 — Phase B photos terrain : déployée (commit 92ff25f)

**Décision** : Implémentation effective du stockage photos terrain. Migration `003_phase_b_photos.sql` ajoute la table `flange_photos` (FK `flange_id ON DELETE SET NULL` pour permettre re-rattachement après ré-import J&T), `project_id` dénormalisé pour RLS sans JOIN, clé naturelle `(natural_item, natural_repere, natural_cote)` capturée à la prise. Bucket Storage privé `photos` (5 Mo, signed URLs 15 min). RPC `preview_reattach_photos` (popup compteur avant ré-import) + `reattach_orphan_photos` (re-match par clé naturelle après ré-import). IndexedDB v4 ajoute la table `pendingPhotos` avec index composite `[flange_id+type]`. 3 steps wizard conditionnels (`PhotoStep` × bride/échaf/calo). Compression WebP client (1280px, q=70, hard cap 500 KB, fallback Safari iOS). Pipeline sync : `pushMutations` puis `pushPendingPhotos` (Promise.allSettled, concurrence 3). Rollback Storage si INSERT DB échoue.

**Justification** : Le pattern Storage est déjà rodé pour le bucket `plans`. Le tier Pro Supabase ($25/mois, 100 GB) couvre ~70 projets à 1.35 GB/projet (3 photos × 1500 brides × 300 KB cible). Cloudflare R2 envisagé puis écarté — surdimensionné pour la phase actuelle. La FK `SET NULL` (vs `CASCADE`) est le choix critique : un ré-import J&T détache temporairement les photos sans les détruire, puis `reattach_orphan_photos` les rattache au nouveau `flange_id` partageant la même clé naturelle.

**Avant/après** : Avant, entrée pivot (2026-04-29) marquée "planifié" — schéma et bucket non créés. Maintenant, déployé : migration 003 appliquée, route `/api/terrain/photos` (POST upload + GET signed URLs), route `/api/import/jt-reimport-preview` ajoutée pour le popup avant ré-import.

---

## 2026-04-29 — Tableur Terrain/EMIS : 29 colonnes en dur miroir Excel

**Décision** : La vue **Terrain / EMIS** du tableur J&T expose exactement 29 colonnes dans l'ordre Excel (CARACTERISTIQUES + TRAVAUX + MATERIEL + JOINTS ET TIGES + DIVERS, côté EMIS), suivies de `COMMENTAIRES` puis des `extra_columns`. Libellés affichés sans suffixe `EMIS` (`OPERATION`, `NB JP`, etc.).

**Justification** : Le préparateur passe de l'Excel au tableur web — la correspondance 1:1 des libellés/ordre réduit la charge cognitive. La vue **Complète** garde les libellés courts compacts pour le pouvoir desktop.

**Avant/après** : Avant, la vue Terrain filtrait `JT_COLUMNS` via une liste `terrain.fields[]`. Maintenant, une constante dédiée `JT_TERRAIN_COLUMNS` (dans `JtSheet.tsx`) figea l'ordre et les libellés. `field_status` retiré de cette vue (toujours accessible via Complète + PWA wizard).

---

## 2026-04-29 — Robinetterie : appariement implicite `(ot_item_id, num_rob)`

**Décision** : Suppression du système d'appariement manuel (`rob_pair_id`, RPC `pair_flanges`, `PairingModal`, routes `/api/flanges/pair[/auto]`). Le boolean `rob` devient `num_rob TEXT`. Deux brides du même OT partageant le même `num_rob` forment automatiquement une vanne ADM/REF. `rob_side` reste pour distinguer les côtés.

**Justification** : L'appariement manuel doublonnait la donnée métier — le préparateur connaît déjà le numéro de fiche robinetterie (Excel `N° ROB`). Un système implicite supprime la divergence possible entre N° ROB et pair_id, et élimine ~150 lignes de code (modale, RPC, schémas Zod, routes).

**Avant/après** : Avant, `rob` boolean + `rob_pair_id` UUID + `rob_side` ADM/REF, appariement manuel via UI. Maintenant, `num_rob` TEXT + `rob_side`, appariement dérivé de `(ot_item_id, num_rob)` dans `groupIntoValves`. Pas de backfill (info historique perdue, accepté).

---

## 2026-04-29 — Refonte mapping import J&T : libellés Excel verbatim + 5 nouveaux champs DB

**Décision** : Les 43 champs canoniques de l'import J&T affichent leurs **libellés Excel verbatim** (incluant casse/accents/ponctuation : `N°ITEM`, `OPERATION EMIS`, `Sécurité CLIENT`). Synonymes reconstruits depuis zéro à partir du fichier Excel actuel. Cinq nouveaux champs DB : `amiante_plomb`, `num_rob`, `operation_buta`, `securite_buta`, `sap_buta`.

**Justification** : L'utilisateur veut une correspondance directe entre l'Excel qu'il connaît et la liste de mapping. La rétro-compat des templates est volontairement abandonnée — un nouvel import requiert un nouveau mapping. Les 5 nouveaux champs sont ajoutés en colonnes DB plutôt qu'en `extra_columns` JSONB pour permettre les requêtes structurées (vue Robinetterie, alerte amiante).

**Avant/après** : Avant, les libellés du mapping étaient des labels UI courts (`Item`, `DN EMIS`). Maintenant, ils sont strictement les en-têtes Excel. Les 5 nouveaux champs ajoutés via migration ALTER TABLE.
