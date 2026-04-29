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

## 2026-04-29 — Storage photos terrain : Supabase Storage avec compression client (Phase B, planifié)

**Décision** : Photos terrain (bride, échafaudage, calorifuge) stockées sur Supabase Storage (bucket `photos`, 3 préfixes), avec compression côté navigateur ciblant ~300 KB par photo (WebP quality 70, 1280px max côté).

**Justification** : Le pattern Storage est déjà rodé pour le bucket `plans`. Le tier Pro Supabase ($25/mois, 100 GB) couvre ~70 projets. Cloudflare R2 (envisagé) est moins cher long-terme mais surdimensionné pour la phase actuelle.

**Avant/après** : Pas d'historique — première itération photos.

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
