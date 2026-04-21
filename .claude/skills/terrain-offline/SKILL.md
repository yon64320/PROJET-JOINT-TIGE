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

- **Dexie** (IndexedDB) : `src/lib/offline/db.ts` — tables `sessions`, `flanges`, `mutations`
- **Serwist** (Service Worker) : precache pages terrain + API fallback
- **Manifest PWA** : `public/manifest.json`, icones 192/512px, `start_url: /projets`
- **Hooks** : `src/lib/offline/hooks.ts` — `useOfflineSession`, `useFlangeSync`

## Patterns critiques

- Touch targets : 56px min height (gants)
- Font body : 18px min, valeurs numeriques : 24px
- Mutations en file d'attente : chaque edit cree un record dans `mutations`, sync bulk au retour reseau
- `TerrainLayout` : header compact + `OnlineBadge` + nav retour
- Colonnes terrain sur flanges : `calorifuge`, `echafaudage`, `field_status`
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

- `CaloShortcutStep`, `DnPnStep`, `PredictedNumericStep`, `FaceBrideStep`, `MatiereJointStep`, `BigToggleStep`, `EchafaudageDimensionsStep`, `CommentairesStep`, `RecapStep`
- `types.ts` — `Step` (union des ids), `WizardValues` (valeurs collectees)
- `useWizardNavigation.ts` — hook partage pour next/prev/skip avec gestion des branches conditionnelles (echafaudage, calo shortcut)
- `RecapRow.tsx` — ligne editable reutilisee par `RecapStep`

Ajouter un nouveau champ = creer un step dans `wizard-steps/`, l'ajouter a `TERRAIN_FIELDS`, mapper dans `STEP_FIELD` et la sequence par defaut du wizard.

## Pieges connus

- Ne pas oublier `contentType: "application/pdf"` sur les uploads Storage
- Valider MIME type + extension sur `/api/terrain/plans`
- Les mutations offline doivent etre idempotentes (UPSERT, pas INSERT)
- Tester en Chrome DevTools mode mobile (l'utilisateur developpe sur ordi)
- `navigator.serviceWorker.ready` peut hang forever si pas de SW enregistre — toujours verifier `sw?.controller` avant
- Les callbacks du wizard utilisent des refs pour eviter les closures stales (steps dynamiques = re-renders frequents)
