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
/terrain                          → liste sessions
/terrain/[sessionId]              → liste OTs avec progression
/terrain/[sessionId]/[otItemId]   → liste brides + statut
/terrain/[sessionId]/[otItemId]/[flangeId] → wizard 13 etapes
/terrain/[sessionId]/[otItemId]/plan       → viewer PDF pinch-zoom
/terrain/[sessionId]/sync         → push mutations vers Supabase
```

## Stack

- **Dexie** (IndexedDB) : `src/lib/offline/db.ts` — tables `sessions`, `flanges`, `mutations`
- **Serwist** (Service Worker) : precache pages terrain + API fallback
- **Manifest PWA** : `public/manifest.json`, icones 192/512px
- **Hooks** : `src/lib/offline/hooks.ts` — `useOfflineSession`, `useFlangeSync`

## Patterns critiques

- Touch targets : 56px min height (gants)
- Font body : 18px min, valeurs numeriques : 24px
- Mutations en file d'attente : chaque edit cree un record dans `mutations`, sync bulk au retour reseau
- `TerrainLayout` : header compact + `OnlineBadge` + nav retour
- Colonnes terrain sur flanges : `calorifuge`, `echafaudage`, `field_status`
- Table `field_sessions` + `field_session_items` : scope quels OTs sont telecharges
- Table `equipment_plans` + bucket Storage `plans` : PDF plans d'equipement
- Table `bolt_specs` : specifications boulonnerie (135 rows RF+RTJ)

## Sync engine (couches)

1. **Manuel** : bouton sync sur `/terrain/[sessionId]/sync`
2. **Auto on reconnect** : `useSyncEngine` detecte passage offline→online, push automatique
3. **AutoSyncToast** : composant toast qui affiche le resultat auto-sync (succes/erreurs, 5s)
4. **Background Sync** : registration `terrain-sync` via Service Worker (Android uniquement, silent fail sur Safari)
5. **beforeunload warning** : `useBeforeUnloadWarning(pendingCount)` empeche fermeture avec mutations non-syncees

Le contexte `SessionProvider` expose : `pendingCount`, `syncing`, `pushSync`, `autoSyncResult`, `clearAutoSyncResult`.

## Wizard de saisie (DataEntryWizard)

- Etapes dynamiques : `echafaudage_dimensions` insere automatiquement apres `echafaudage` quand `echafaudage=true`
- Migration 010 : colonnes `echaf_longueur`, `echaf_largeur`, `echaf_hauteur` (TEXT)
- Keypad value synced avec le champ courant via `STEP_FIELD` map + `useEffect` sur `currentStep`
- Refs (`stepRef`, `stepsRef`, `valuesRef`) pour eviter les closures stales dans les callbacks

## Pieges connus

- Ne pas oublier `contentType: "application/pdf"` sur les uploads Storage
- Valider MIME type + extension sur `/api/terrain/plans`
- Les mutations offline doivent etre idempotentes (UPSERT, pas INSERT)
- Tester en Chrome DevTools mode mobile (l'utilisateur developpe sur ordi)
- `navigator.serviceWorker.ready` peut hang forever si pas de SW enregistre — toujours verifier `sw?.controller` avant
- Les callbacks du wizard utilisent des refs pour eviter les closures stales (steps dynamiques = re-renders frequents)
