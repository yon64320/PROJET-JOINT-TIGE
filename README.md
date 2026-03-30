# EMIS — Préparation d'arrêts de maintenance industrielle

Application web SaaS pour centraliser la préparation des arrêts de maintenance chez **EMIS** (filiale Ponticelli Frères).

Remplace la galaxie de fichiers Excel par une **source unique de données** : la LUT et le J&T en base, tout le reste en dérive.

## Stack technique

| Couche | Techno |
|--------|--------|
| Frontend | Next.js 16 (App Router) + React 19 + Tailwind CSS 4 |
| Tableur | Univer (presets) — data validation, conditional formatting |
| Backend | Next.js API Routes |
| Base de données | PostgreSQL via Supabase |
| Import Excel | SheetJS (xlsx) |
| Typage | TypeScript 6 (strict) |

## État d'avancement

### Phase A — Fondations ✅

- [x] Projet Next.js + TypeScript + Supabase initialisé
- [x] Schéma DB : `projects`, `ot_items`, `flanges`, `operations_ref`, `dropdown_lists`
- [x] Tables d'archive : `ot_items_archive`, `flanges_archive`
- [x] Types TypeScript : `OtItem`, `Flange`, `Triplet`, `OperationRef`
- [x] Logique métier : `computeRetenu()`, `hasDelta()`, `parseCorpsDeMetier()`
- [x] Import Excel LUT (.xlsm → DB) avec mapping 37 colonnes
- [x] Import Excel J&T (.xlsm → DB) avec mapping 57 colonnes
- [x] "CALO" et "PAS D'INFO" conservés à l'import (colonnes TEXT)
- [x] Skills Claude Code : `import-excel`, `domain-maintenance`, `generate-pdf`, `univer-patterns`
- [x] Agents Claude Code : `excel-analyst`, `test-runner`

### Phase B — Interface tableur Univer ✅

- [x] Composant `UniverSheet` générique (client, dynamic import, events, cleanup)
- [x] Vue LUT en tableur : 17 colonnes, dropdowns (statut, famille, type), corps de métier en X
- [x] Vue J&T en tableur : 24 colonnes, RETENU auto, DELTA en rouge, colonnes read-only
- [x] API PATCH `/api/ot-items` et `/api/flanges` (whitelist de champs, sauvegarde debounced)
- [x] Page d'import avec workflow guidé (Nouveau / Ré-import)
- [x] Archivage automatique des anciennes données lors du ré-import
- [x] Dashboard projet avec stats (nb OTs, nb brides)
- [x] Design refait : navbar EMIS, cards colorées, stepper d'import, badges

### Phase C — Premier document dérivé (à venir)

- [ ] Analyser le modèle de fiche robinetterie Excel
- [ ] Générer les fiches robinetterie en PDF depuis les données J&T

### Phase D — V2 (plus tard)

- [ ] Mode offline / PWA
- [ ] Gestion des rôles utilisateurs
- [ ] Autres documents dérivés
- [ ] Export Excel

## Structure du projet

```
src/
├── app/
│   ├── page.tsx                          # Redirect → /projets
│   ├── projets/
│   │   ├── page.tsx                      # Liste des projets
│   │   ├── import/page.tsx               # Import LUT + J&T (nouveau ou ré-import)
│   │   └── [id]/
│   │       ├── page.tsx                  # Dashboard projet (stats + liens)
│   │       ├── lut/page.tsx              # Vue tableur LUT
│   │       ├── jt/page.tsx               # Vue tableur J&T
│   │       └── robinetterie/page.tsx     # Fiches robinetterie (à venir)
│   └── api/
│       ├── import/route.ts               # Import/ré-import Excel
│       ├── projects/route.ts             # Liste projets
│       ├── ot-items/route.ts             # CRUD OT items
│       └── flanges/route.ts              # CRUD brides
├── components/spreadsheet/
│   ├── UniverSheet.tsx                   # Composant Univer générique
│   ├── LutSheet.tsx                      # Tableur LUT spécialisé
│   └── JtSheet.tsx                       # Tableur J&T spécialisé
├── lib/
│   ├── db/                               # Supabase client + import DB
│   ├── domain/                           # Logique métier (triplet, delta, opérations)
│   └── excel/                            # Parsers Excel (LUT, J&T)
└── types/                                # Types TypeScript (LUT, J&T, Project)
```

## Lancer le projet

```bash
# Installer les dépendances
npm install

# Configurer Supabase (créer .env.local)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Lancer en dev
npm run dev

# Ouvrir http://localhost:3000
```

## Fichiers Excel sources

Les fichiers `.xlsm` sont dans `data/` (gitignorés car trop lourds) :
- `BUTACHIMIE - LUT- 20260303.xlsm` — 297 OTs, 37 colonnes
- `J&T REV E - 20250209 pour correction.xlsm` — 1536 brides, 57 colonnes
- `GAMMES COMPILEES REV D.xlsm` — Gammes de maintenance
- `FICHES_RELEVES_ROB_20251020 modif cedric.xlsm` — Modèle fiches robinetterie

## Concepts métier clés

| Concept | Explication |
|---------|-------------|
| **LUT** | Liste Unifiée de Travaux — 1 ligne = 1 OT (ordre de travail) |
| **J&T** | Joint & Tige — 1 ligne = 1 bride (joint cassé sur un OT) |
| **Triplet** | EMIS / BUTA / RETENU — le terrain prime toujours |
| **DELTA** | Écart entre valeur EMIS et BUTA → alerte rouge |
| **CALO** | DN non relevable (calorifuge en place) |
| **PAS D'INFO** | Donnée manquante à compléter |
| **TB/TC/TA** | Base / Complémentaire / Annulé |
