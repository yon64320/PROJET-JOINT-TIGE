# Projet SaaS — Préparation d'arrêts de maintenance industrielle

## Contexte

**EMIS** (Entretien Maintenance Industrielle et Service), filiale du **Groupe Ponticelli Frères**, siège à Vitrolles (13). Seule entreprise française entièrement dédiée aux **arrêts de maintenance industrielle**. ~200 permanents, ~35M€ CA. Intervient comme sous-traitant sur sites industriels (raffineries, pétrochimie).

Un **arrêt d'unité** (turnaround) = arrêt planifié d'une unité de production pour travaux impossibles en marche. Fréquence : 3-6 ans. Chaque jour d'arrêt coûte des millions → la préparation en amont est critique.

L'utilisateur est **préparateur d'arrêt** : il prépare les dossiers d'exécution (gammes, boulonnerie, levage) pour chaque équipement. **Projet personnel** non validé par la hiérarchie.

## Le projet

**Le problème** : chaque arrêt = galaxie de fichiers Excel interdépendants (LUT, J&T, gammes, fiches rob, APPRO…). Une mise à jour oblige à modifier plusieurs fichiers manuellement → doublons, erreurs, versions incohérentes.

**La solution** : application web avec LUT + J&T comme **source unique de données**. Documents dérivés générés automatiquement. Remplacer Excel à 95%.

| Aspect | Spécification |
|--------|---------------|
| **Utilisateurs** | Préparateurs d'arrêt, 10-15 simultanés max |
| **Import** | Fichiers .xlsm existants (LUT, J&T) comme point d'entrée |
| **Premier livrable** | Fiches robinetterie PDF (modèle dans `data/`) |
| **Mode hors ligne** | Nécessaire pour saisie sur site (zones ATEX, pas de réseau) |
| **Phase actuelle** | **Développement — import adaptatif implémenté, tableurs LUT/J&T fonctionnels** |

## Fichiers centraux — concepts clés

Documentation détaillée : [`docs/metier/LUT.md`](docs/metier/LUT.md) et [`docs/metier/J&T.md`](docs/metier/J%26T.md)

### LUT — Liste Unifiée de Travaux

1 ligne = 1 OT (ordre de travail), généralement 1 équipement. Clé primaire : colonne **ITEM**.
Colonnes importantes : UNITE (zone usine), ITEM, TITRE GAMME, FAMILLE ITEM, TYPE ITEM, TYPE TRAVAUX, TB/TC/TA (statut), 7 colonnes CORPS DE METIER (cochées X).

### J&T — Joint & Tige (suivi boulonnerie)

1 ligne = 1 bride touchée sur un OT. Liée à la LUT par **ITEM**. 5 feuilles dont une feuille principale + tables de référence (Operations, Tiges, Listes déroulantes, APPRO).

**Concepts fondamentaux :**

- **Logique en triplet** : EMIS (relevé terrain) / BUTA (données client) / RETENU (`COALESCE(emis, buta)`) — **le terrain prime toujours**
- **Colonnes DELTA** (DN, PN) = alerte quand relevé terrain ≠ données client
- **Colonne OPERATION** = colonne moteur → détermine automatiquement nb joints pleins, brides pleines, joints provisoires/définitifs via table de correspondance
- **Repérage double** : repère BUTA (client) + repère EMIS (complète quand le client n'est pas assez précis)

```
LUT (tous les OTs)
 ├── J&T (brides touchées par OT)
 ├── Gammes (séquencement phase par phase)
 ├── Liste de levage (opérations de grue)
 ├── Fiches robinetterie (premier livrable PDF)
 └── Planning (ordonnancement)
```

## Commandes

```bash
npm run dev          # Next.js dev server
npm run build        # Build production
npm run lint         # ESLint
npm run type-check   # tsc --noEmit
```

## Stack technique

- **Next.js 16** + **React 19** + **TypeScript 6** + **Tailwind CSS 4**
- **Univer** (tableur) — presets: sheets-core, data-validation, conditional-formatting
- **Supabase** (Postgres) — client `@supabase/supabase-js`
- **SheetJS** (`xlsx`) — parsing Excel côté serveur

## Conventions et gotchas

- Fichiers Excel sources dans `data/`. Lire avec `read_only=True, data_only=True` (openpyxl) ou `xlsx` (SheetJS)
- Encoder UTF-8 pour éviter les erreurs cp1252 sur Windows
- En base : DN/PN sont `NUMERIC`, NB TIGES sont `INTEGER`. Les valeurs textuelles ("CALO", "PAS D'INFO") doivent être filtrées côté parsing avant insertion
- RETENU et DELTA sont `GENERATED ALWAYS AS ... STORED` en base (migration 001)
- Migration 001 = seule migration existante. TODO : migration 002 pour import_templates, column_synonyms, extra_columns JSONB
- Les colonnes numériques peuvent contenir du texte dans Excel → toujours valider/filtrer avant insertion en base

```python
# Pattern openpyxl (scripts Python)
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import openpyxl
wb = openpyxl.load_workbook('data/fichier.xlsm', read_only=True, data_only=True)
```

## Import adaptatif — décision validée

L'app s'adapte au préparateur, pas l'inverse. Chaque préparateur diverge du template de base (colonnes ajoutées, renommées, réordonnées).

**Workflow** : upload → auto-détection en-têtes (scan lignes 0-15) → fuzzy match via synonymes → preview mapping (vert/jaune/gris) → correction utilisateur → import

**Principes** :
- **Zéro perte de données** : colonnes inconnues → `extra_columns` JSONB, affichées en fin de tableur
- **Fuzzy matching** 3 passes via dictionnaire de synonymes (`src/lib/excel/synonyms.ts`)
- **Templates réutilisables** : premier import ~1-2 min (vérifier mapping), suivants instantanés (template sauvé)
- **Code couleur mapping** : vert = haute confiance, jaune = à vérifier, gris = colonne inconnue

**Synonymes** (exemples) :
```
dn_emis:   ["DN", "DN RELEVE", "DN EMIS", "DIAMETRE NOMINAL"]
dn_buta:   ["DN CLIENT", "DN BUTA", "DN DONNEES BUTA"]
operation: ["OPERATION", "TYPE OPERATION", "OP"]
item:      ["ITEM", "NOM", "REPERE", "TAG", "N° EQUIPEMENT"]
```

## Enrichissement des skills

Les skills dans `.claude/skills/` capturent les patterns du projet. **Les mettre à jour proactivement** quand une tâche révèle un nouveau pattern, piège, ou convention. Ne pas attendre qu'on le demande.

| Skill | Domaine |
|-------|---------|
| `import-excel` | Parsing Excel, mapping colonnes, synonymes, templates |
| `domain-maintenance` | Logique métier, vocabulaire, règles de calcul |
| `generate-pdf` | Templates PDF, mise en page, données affichées |
| `univer-patterns` | Intégration Univer, workbookData, events, validation |
| `supabase-postgres-best-practices` | Optimisation requêtes, schéma, performance DB |
