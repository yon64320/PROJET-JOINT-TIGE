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

- **LUT** (Liste Unifiée de Travaux) : 1 feuille, ~300 lignes, 37 colonnes (A-AK)
- **J&T** (Joint & Tige) : 5 feuilles, ~1500 brides, colonnes A-BH

## Workflow

1. Identifier le type de fichier ($0 ou auto-détection via les en-têtes)
2. Parser avec SheetJS (côté client) ou openpyxl (scripts Python)
3. Mapper les colonnes vers les types TypeScript / champs DB
4. Valider les données (types, contraintes, cohérence)
5. Insérer en base via l'API

## Mappings

Consulter les fichiers de référence pour les mappings détaillés :
- [LUT mapping](references/lut-mapping.md) — colonnes A-AK vers champs `ot_items`
- [J&T mapping](references/jt-mapping.md) — colonnes A-BH vers champs `flanges`

## Conventions

- Utiliser `read_only=True, data_only=True` pour openpyxl
- Encoder en UTF-8 : `sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')`
- Les fichiers Excel sources sont dans `data/`
- SheetJS Community Edition (Apache-2.0) pour le côté client
- Ignorer les macros VBA — seules les données comptent
