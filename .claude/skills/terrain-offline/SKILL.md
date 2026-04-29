---
name: terrain-offline
description: PWA mobile-first pour saisie terrain hors-ligne (zones ATEX). Utiliser quand on travaille sur les routes /terrain/*, IndexedDB (Dexie), Service Worker (Serwist), sync mutations, wizard de saisie, ou le viewer PDF plans.
user-invocable: false
allowed-tools: Read, Bash, Grep, Glob, Edit, Write
---

# Skill : Terrain hors-ligne (PWA)

Saisie J&T sur site industriel sans réseau. Mobile-first, gros boutons (gants), IndexedDB pour persistence locale.

## Architecture

```
/terrain?projectId=xxx            → liste sessions (scopé par projet)
/terrain/[sessionId]              → liste OTs avec progression
/terrain/[sessionId]/[otItemId]   → liste brides + statut
/terrain/[sessionId]/[otItemId]/[flangeId] → wizard N etapes (selon selected_fields)
/terrain/[sessionId]/[otItemId]/plan       → viewer PDF pinch-zoom
/terrain/[sessionId]/sync         → push mutations vers Supabase
```

## Stack

- **Dexie** (IndexedDB) : `src/lib/offline/db.ts` — tables `sessions`, `flanges`, `mutations`, `pendingPhotos`. Schéma v4 : table `pendingPhotos` ajoutée (Phase B, photos terrain). Mutations restent un **discriminated union** `update | create | delete` avec rétro-compat des entrées legacy sans `type`.
- **Serwist** (Service Worker) : precache pages terrain + API fallback
- **Manifest PWA** : `public/manifest.json`, icones 192/512px, `start_url: /projets`
- **Hooks** : `src/lib/offline/hooks.ts` — `useOfflineSession`, `useOfflineMutate`, `usePendingPhotos`, helpers `addLocalFlange` / `deleteLocalFlange` / `addPendingPhoto` / `deletePendingPhoto`

## Patterns critiques

- Touch targets : 56px min height (gants)
- Font body : 18px min, valeurs numeriques : 24px
- Mutations en file d'attente : chaque edit cree un record dans `mutations`, sync bulk au retour reseau
- `TerrainLayout` : header compact + `OnlineBadge` + nav retour
- Colonnes terrain sur flanges : `calorifuge`, `echafaudage`, `field_status` (TEXT)
- Colonnes BUTA/EMIS étendues : `dimension_tige_*`, `face_bride_*`, `rondelle_*`, `nb_joints_prov_*`, `nb_joints_def_*` — chacune `_emis` (terrain) + `_buta` (client) + `_retenu` GENERATED COALESCE. Le wizard saisit côté `_emis` uniquement.
- `dimension_tige_emis` est un TEXT libre (ex. "M16 x 70") qui remplace l'ancien `_designation_tige` (virtual concat de `diametre_tige` x `longueur_tige`)
- **Champs terrain** : `src/lib/terrain/fields.ts` — registre `TERRAIN_FIELDS` (key + label), type `TerrainFieldKey`, constante `ALL_FIELD_KEYS`
- Table `field_sessions` + `field_session_items` : scope quels OTs sont telecharges. Colonne `selected_fields TEXT[]` (NULL = tous)
- Table `equipment_plans` + bucket Storage `plans` : PDF plans d'equipement
- Table `bolt_specs` : specifications boulonnerie (135 rows RF+RTJ)

## Creation de session

- Sessions scopees par projet : `/terrain?projectId=xxx` (redirection vers `/projets` si absent)
- Modal `CreateSessionModal` : nom session + selection OTs + selection champs + filtres
- Filtres OTs : recherche texte (item), chips famille_item (primaire), chips type_item (secondaire, scope par famille)
- Selection/deselection par lot : "Tout selectionner" agit sur les items filtres (visibles), pas sur tous
- Selection champs : panneau depliable "Donnees a relever", picker base sur `TERRAIN_FIELDS`
- `selectedFields: null` envoye a l'API si tous les champs sont selectionnes (economie de stockage)
- Validation API : `ALL_FIELD_KEYS` importe cote serveur pour valider les cles envoyees

## Sync engine (couches)

1. **Manuel** : bouton sync sur `/terrain/[sessionId]/sync`
2. **Auto on reconnect** : `useSyncEngine` detecte passage offline→online, push automatique
3. **AutoSyncToast** : composant toast qui affiche le resultat auto-sync (succes/erreurs, 5s)
4. **Background Sync** : registration `terrain-sync` via Service Worker (Android uniquement, silent fail sur Safari)
5. **beforeunload warning** : `useBeforeUnloadWarning(pendingCount)` empeche fermeture avec mutations non-syncees

Le contexte `SessionProvider` expose : `pendingCount`, `syncing`, `pushSync`, `autoSyncResult`, `clearAutoSyncResult`.

## Wizard de saisie (DataEntryWizard)

- Etapes dynamiques filtrables : `selected_fields` (TEXT[] sur field_sessions, migration 011) permet de personnaliser les champs affiches par session. NULL = tous les champs
- Registre des champs : `src/lib/terrain/fields.ts` — type `TerrainFieldKey`, constante `TERRAIN_FIELDS` (label + key), `ALL_FIELD_KEYS`
- `echafaudage_dimensions` insere automatiquement apres `echafaudage` quand `echafaudage=true` (meme si filtre actif, il suit sa step parente)
- Migration 010 : colonnes `echaf_longueur`, `echaf_largeur`, `echaf_hauteur` (TEXT)
- Keypad value synced avec le champ courant via `STEP_FIELD` map + `useEffect` sur `currentStep`
- Refs (`stepRef`, `stepsRef`, `valuesRef`) pour eviter les closures stales dans les callbacks
- Le contexte `useSessionContext()` fournit `session.selected_fields` au wizard

## Decomposition du wizard (wizard-steps/)

`DataEntryWizard.tsx` reste le conteneur d'etat et de navigation ; chaque step est un composant dedie dans `src/components/terrain/wizard-steps/` :

- `CaloShortcutStep`, `DnPnStep`, `PredictedNumericStep`, `DimensionTigeStep`, `FaceBrideStep`, `MatiereJointStep`, `BigToggleStep`, `EchafaudageDimensionsStep`, `CommentairesStep`, `PhotoStep`, `RecapStep`
- `DimensionTigeStep` propose une suggestion (`predictedDesignation`) issue des données BUTA + un input texte libre. Saisie en bloc → `dimension_tige_emis`
- `types.ts` — `Step` (union des ids), `WizardValues` (valeurs collectees)
- `useWizardNavigation.ts` — hook partage pour next/prev/skip avec gestion des branches conditionnelles (echafaudage, calo shortcut)
- `RecapRow.tsx` — ligne editable reutilisee par `RecapStep`

Ajouter un nouveau champ = creer un step dans `wizard-steps/`, l'ajouter a `TERRAIN_FIELDS`, mapper dans `STEP_FIELD` et la sequence par defaut du wizard.

## Ajout / suppression de bride en session

Sur `/terrain/[sessionId]/[otItemId]` (liste de brides d'un OT), deux actions disponibles :

- **Bouton « + Ajouter une bride »** en bas de la liste → `addLocalFlange(sessionId, otItemId)` génère un id local `temp_<uuid>`, crée la bride dans IndexedDB et pousse une mutation `type: "create"` dans la queue. L'utilisateur est redirigé vers le wizard de saisie standard. Au sync, le serveur INSERT en base et renvoie le mapping `tempId → serverId` (utilisé par `pushMutations` dans `sync.ts` pour rebrancher les mutations update suivantes).
- **Bouton corbeille sur chaque carte** → `deleteLocalFlange(flangeId)`. Pour une bride à id `temp_<uuid>` (créée localement, pas encore synchro), retrait pur du store + de la queue (annulation). Pour une bride existante, marquage `_deleted=true` (masquée en UI via `useOfflineFlanges`) + mutation `type: "delete"` poussée. Au sync, DELETE en base.

Ordre côté `/api/terrain/sync` : **CREATE → UPDATE → DELETE** dans la même requête. Le mapping `tempId → serverId` est résolu au passage pour les UPDATEs qui pointent vers une bride fraîchement créée.

Routes API : `POST /api/flanges` (création standalone, hors session — desktop), `DELETE /api/flanges`. Ces routes utilisent la même whitelist `FLANGES_ALLOWED` (`src/lib/db/flanges-allowed.ts`).

## Photos terrain (flange_photos)

3 types par bride : `bride`, `echafaudage`, `calorifuge`. Pipeline : compression WebP client (`photo-compression.ts`) → IndexedDB `pendingPhotos` (Dexie v4) → upload via `pushPendingPhotos` après `pushMutations`.

Patterns critiques à respecter au moindre changement :

- Garder la FK `flange_photos.flange_id REFERENCES flanges(id) ON DELETE SET NULL` (jamais CASCADE). Au ré-import J&T, les photos passent en orphelines puis sont re-rattachées par RPC `reattach_orphan_photos` matchant `(natural_item, natural_repere)`. Capturer ces deux champs au moment de la prise.
- Dénormaliser `project_id` sur `flange_photos` : la RLS s'applique sans JOIN et les orphelines (`flange_id IS NULL`) restent visibles côté owner.
- Utiliser un UUID v4 comme basename du `storage_path` (`{folder}/{project_id}/{uuid}.webp`). Le numéro d'affichage se dérive via `ROW_NUMBER() OVER (PARTITION BY flange_id, type ORDER BY taken_at)` à la lecture — jamais stocké.
- Côté API, accepter uniquement `image/webp` (la compression client sort toujours du WebP).
- Sur erreur d'INSERT après upload Storage : appeler `storage.remove([path])` avant le 500. Sinon orphelin permanent.
- Bucket `photos` privé, accessible uniquement par `service_role`. Le client passe par `GET /api/terrain/photos` qui génère une signed URL 15 min après check ownership.
- Quand `pushMutations` reçoit `created: { tempId, serverId }`, remapper `flanges` ET `pendingPhotos.flange_id` dans une **seule transaction Dexie**. Sans cela, une photo prise sur une bride locale pointe encore vers `temp_xxx` à l'upload et échoue.
- Index Dexie composite obligatoire : `pendingPhotos: "id, ..., [flange_id+type]"`. Sinon les lookups `PhotoStep` scannent toute la table.

Workflow ré-import : appeler `POST /api/import/jt-reimport-preview` avant `confirm` pour afficher le popup avec `will_reattach` / `will_orphan`. `reimportJtToDb` appelle `reattach_orphan_photos` après l'INSERT et retourne les compteurs.

Capacité : Pro Supabase 100 GB ≈ 70 projets à 1.35 GB/projet (3 photos × 1500 brides × 300 KB). Surveiller : `SELECT project_id, count(*), pg_size_pretty(sum(size_bytes)) FROM flange_photos GROUP BY project_id`.

## Pieges connus

- Ne pas oublier `contentType: "application/pdf"` sur les uploads Storage
- Valider MIME type + extension sur `/api/terrain/plans`
- Les mutations offline doivent etre idempotentes (UPSERT, pas INSERT)
- Tester en Chrome DevTools mode mobile (l'utilisateur developpe sur ordi)
- `navigator.serviceWorker.ready` peut hang forever si pas de SW enregistre — toujours verifier `sw?.controller` avant
- Les callbacks du wizard utilisent des refs pour eviter les closures stales (steps dynamiques = re-renders frequents)
