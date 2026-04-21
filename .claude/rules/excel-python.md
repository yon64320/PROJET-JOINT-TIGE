---
globs: ["data/**", "src/lib/excel/**", "*.py", "scripts/**"]
---

# Conventions Excel & Python

## Fichiers Excel sources

Fichiers `.xlsm` dans `data/`. Deux modes de lecture :

- **SheetJS** (`xlsx`) — côté serveur Node.js, utilisé pour l'import
- **openpyxl** — scripts Python d'analyse/exploration

## Pattern openpyxl (scripts Python)

```python
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import openpyxl
wb = openpyxl.load_workbook('data/fichier.xlsm', read_only=True, data_only=True)
```

- Toujours `read_only=True, data_only=True` pour les fichiers sources
- Toujours encoder UTF-8 (`TextIOWrapper`) pour éviter les erreurs cp1252 sur Windows

## Colonnes Excel → DB

Toutes les colonnes de données Excel sont stockées en `TEXT` brut en base (voir rule `db-schema.md`). Pas de conversion de type à l'insertion — conversion côté UI si nécessaire.
