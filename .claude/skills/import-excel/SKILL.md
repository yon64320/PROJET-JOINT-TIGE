---
name: import-excel
description: Parse et importer les fichiers Excel EMIS (LUT, J&T) dans la base de données. Utiliser quand on travaille sur l'import de fichiers .xlsm, le mapping colonnes Excel vers champs DB, ou le parsing SheetJS.
user-invocable: true
allowed-tools: Read, Bash, Grep, Glob, Edit, Write
argument-hint: "[lut|jt|auto] [filepath]"
---

# Skill : Import Excel EMIS

Tu importes des fichiers Excel (.xlsm) de maintenance industrielle dans l'application EMIS.

## Fichiers supportés

- **LUT** (Liste Unifiée de Travaux) : 1 feuille, ~300 lignes, ~37 colonnes
- **J&T** (Joint & Tige) : 4 feuilles, ~1500 brides, en-têtes en ligne 3, organisés en 5 catégories visibles en ligne 2 (CARACTERISTIQUES, TRAVAUX + MATERIEL, JOINTS ET TIGES, DIVERS, DONNEES CLIENT)

## Workflow

1. Identifier le type de fichier ($0 ou auto-détection via les en-têtes)
2. Parser avec SheetJS (côté client) ou openpyxl (scripts Python)
3. Mapper les en-têtes vers les champs DB via les synonymes (`src/lib/excel/synonyms.ts`)
4. Valider les données (types, contraintes, cohérence)
5. Insérer en base via l'API

## Mappings

Consulter les fichiers de référence pour les mappings détaillés :

- [LUT mapping](references/lut-mapping.md) — vers champs `ot_items`
- [J&T mapping](references/jt-mapping.md) — vers champs `flanges` (groupé par catégorie Excel)

## Conventions

- Utiliser `read_only=True, data_only=True` pour openpyxl
- Encoder en UTF-8 : `sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')`
- Les fichiers Excel sources sont dans `data/`
- SheetJS Community Edition (Apache-2.0) pour le côté client
- Ignorer les macros VBA — seules les données comptent

## Labels et groupes de champs

`src/lib/excel/synonyms.ts` exporte :

- `JT_FIELD_LABELS` — labels lisibles pour chaque champ DB J&T (affichage UI uniquement, les noms DB internes ne changent pas)
- `JT_FIELD_GROUPS` — groupement des champs par catégorie (Identification, Repères, Opération, DN/PN, Données client, Données EMIS, Boulonnerie, Joints, Divers)

Le composant `MappingPreview` utilise ces groupes pour afficher le mapping par catégorie (J&T) au lieu d'une liste plate (LUT). Architecture field-centric : l'etat est `Record<dbField, excelIndex | null>` (champ DB vers colonne Excel), pas l'inverse. Les colonnes Excel non-mappees apparaissent en section "Extra" en bas.
