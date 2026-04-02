# EMIS — Préparation d'arrêts de maintenance industrielle

Application web pour préparer les arrêts de maintenance sur sites industriels (raffineries, pétrochimie). Remplace les fichiers Excel interdépendants par une **source unique de données** avec documents dérivés générés automatiquement.

## Stack technique

| Technologie          | Rôle                                                           |
| -------------------- | -------------------------------------------------------------- |
| **Next.js 16**       | Framework fullstack (App Router, Server Components)            |
| **React 19**         | UI                                                             |
| **TypeScript 6**     | Typage strict                                                  |
| **Tailwind CSS 4**   | Styles utilitaires                                             |
| **Univer**           | Tableur intégré (formules, validation, formatage conditionnel) |
| **Supabase**         | Base de données PostgreSQL + Auth + Row Level Security         |
| **SheetJS (xlsx)**   | Parsing des fichiers Excel côté serveur                        |
| **ExcelJS**          | Extraction métadonnées cellules (couleurs de fond)             |
| **Zod**              | Validation des inputs API                                      |
| **Vitest**           | Tests unitaires                                                |
| **Prettier + Husky** | Formatage automatique au commit                                |

## Prérequis

- **Node.js 22+** et **npm**
- Un projet **Supabase** (gratuit)
- Git

## Installation

```bash
git clone https://github.com/yon64320/PROJET-JOINT-TIGE.git
cd PROJET-JOINT-TIGE
npm install
```

Créer `.env.local` à la racine (voir `.env.local.example`) :

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SKIP_AUTH=true
```

Appliquer les migrations SQL dans l'ordre via le dashboard Supabase :

- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_merge_extra_column_rpc.sql`
- `supabase/migrations/003_fiche_rob_template.sql`
- `supabase/migrations/004_flanges_responsable.sql`
- `supabase/migrations/005_rls.sql`

## Scripts

| Commande               | Description                              |
| ---------------------- | ---------------------------------------- |
| `npm run dev`          | Serveur de développement (port 3000)     |
| `npm run build`        | Build de production                      |
| `npm run lint`         | Linting ESLint (via Next.js)             |
| `npm run type-check`   | Vérification TypeScript (`tsc --noEmit`) |
| `npm run test`         | Tests unitaires (Vitest)                 |
| `npm run test:watch`   | Tests en mode watch                      |
| `npm run format`       | Formater le code avec Prettier           |
| `npm run format:check` | Vérifier le formatage                    |

## Structure du projet

```
src/
├── app/                        # Next.js App Router
│   ├── api/                    # Routes API
│   │   ├── flanges/            # CRUD brides (J&T)
│   │   ├── ot-items/           # CRUD ordres de travail (LUT)
│   │   ├── import/             # Import Excel (detect + confirm)
│   │   ├── pdf/                # Génération PDF
│   │   ├── projects/           # Gestion projets
│   │   └── robinetterie/       # Vue robinetterie
│   ├── login/                  # Page de connexion
│   └── projets/                # Pages projet
│       ├── [id]/lut/           # Tableur LUT
│       ├── [id]/jt/            # Tableur J&T
│       ├── [id]/robinetterie/  # Tableur + fiches robinetterie
│       └── import/             # Import de fichiers Excel
├── components/
│   ├── spreadsheet/            # Composants tableur (Univer)
│   │   ├── LutSheet.tsx        # Tableur LUT
│   │   ├── JtSheet.tsx         # Tableur J&T
│   │   ├── RobSheet.tsx        # Tableur Robinetterie
│   │   ├── SaveBar.tsx         # Barre de sauvegarde partagée
│   │   └── sheet-styles.ts     # Utilitaires styles partagés
│   ├── import/                 # UI d'import (mapping preview)
│   └── fiche-rob/              # Composants fiche robinetterie
├── hooks/
│   └── useSheetSync.ts         # Hook de synchronisation tableur ↔ API
├── lib/
│   ├── api/                    # Handlers API partagés
│   │   └── patch-handler.ts    # PATCH générique (whitelist + RPC)
│   ├── auth/                   # Authentification
│   │   └── get-user.ts         # Extraction user depuis JWT
│   ├── db/                     # Couche base de données
│   │   ├── supabase.ts         # Client navigateur (anon key)
│   │   ├── supabase-server.ts  # Client serveur (service role)
│   │   ├── import-lut.ts       # Import LUT en DB
│   │   ├── import-jt.ts        # Import J&T en DB
│   │   └── utils.ts            # Helpers extraction (getStr, getBool, etc.)
│   ├── domain/                 # Logique métier
│   │   ├── jt.ts               # computeRetenu, hasDelta
│   │   ├── lut.ts              # parseCorpsDeMetier
│   │   └── fiche-rob-fields.ts # Registre champs fiche rob
│   ├── excel/                  # Parsing Excel
│   │   ├── detect-columns.ts   # Auto-détection en-têtes + fuzzy match
│   │   ├── generic-parser.ts   # Parser adaptatif
│   │   └── synonyms.ts         # Dictionnaire de synonymes
│   ├── pdf/                    # Génération PDF
│   └── validation/             # Schémas Zod
│       └── schemas.ts          # PatchBody, ConfirmedMapping, etc.
├── types/                      # Interfaces TypeScript
│   ├── lut.ts                  # OtItem, CorpsDeMetier
│   ├── jt.ts                   # Flange, OperationRef
│   └── rob.ts                  # RobFlangeRow
└── middleware.ts               # Auth middleware (JWT sur /api/*)
```

## Workflow d'import

1. **Uploader** un fichier Excel (.xlsx ou .xlsm) — LUT d'abord, puis J&T
2. **Auto-détection** des en-têtes : scan des lignes 0-15, fuzzy matching via synonymes
3. **Preview du mapping** : vert = confiance haute, jaune = à vérifier, gris = colonne inconnue
4. **Confirmer** : l'import parse le fichier et insère en base
5. Les colonnes inconnues sont préservées dans `extra_columns` (JSONB) — zéro perte de données

## Concepts métier clés

- **LUT** (Liste Unifiée de Travaux) : 1 ligne = 1 OT (ordre de travail)
- **J&T** (Joint & Tige) : 1 ligne = 1 bride touchée, liée à un OT via ITEM
- **Triplet EMIS/BUTA/RETENU** : EMIS = relevé terrain, BUTA = données client, RETENU = `COALESCE(emis, buta)` — le terrain prime toujours
- **DELTA** : alerte quand relevé ≠ client (DN ou PN différents)

## Tests

93 tests couvrant :

- Helpers d'extraction DB (`getStr`, `getBool`, `getNumeric`, `getInteger`)
- Détection colonnes Excel (normalisation, fuzzy match, fingerprint)
- Parser générique (mapping, extra columns, filtres null)
- Logique métier (`computeRetenu`, `hasDelta`, `parseCorpsDeMetier`)
- Validation templates robinetterie
- Schémas Zod (inputs valides/invalides)

## CI/CD

GitHub Actions exécute sur chaque push/PR :
`format:check` → `lint` → `type-check` → `test` → `build`
