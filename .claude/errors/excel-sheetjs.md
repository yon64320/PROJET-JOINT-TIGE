# Erreurs — Excel / SheetJS

## Feuilles fantômes / formules cached

- **Symptôme** : Import J&T produit ~4.5x trop de lignes (ex: 7150 au lieu de 1600). Un équipement apparaît 5x ou 10x
- **Cause racine** : Le fichier Excel contient des formules avec des valeurs cached au-delà des données réelles. SheetJS lit les valeurs cached (`data_only`), pas les formules recalculées. Le `!ref` du worksheet inclut ces lignes fantômes. Si la colonne PK (nom) a des valeurs non-vides dans ces lignes, elles sont importées
- **Fix** : Sélection intelligente de feuille (`selectBestSheet`) + comptage `validDataRows` affiché à l'utilisateur + propagation `sheetName` dans tout le pipeline. Le facteur non-entier (4.47x) exclut un double-import
- **Prévention** : Toujours afficher le compteur de lignes dans MappingPreview. Si le compte semble anormal, l'utilisateur peut changer de feuille
- **Date** : 2026-04-15

## Encoding UTF-8 sur Windows

- **Symptôme** : Caractères accentués cassés dans les données importées (cp1252 vs UTF-8)
- **Cause racine** : Windows utilise cp1252 par défaut, pas UTF-8. Les fichiers Excel EMIS contiennent du français (accents, cédilles)
- **Fix** : Toujours forcer UTF-8. En Python : `sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')`. En JS/SheetJS : pas de problème (ArrayBuffer)
- **Prévention** : Documenter le pattern dans le skill import-excel
- **Date** : 2026-02

## getStr() seul helper d'extraction

- **Symptôme** : Conversions de type échouent ou données tronquées à l'import
- **Cause racine** : Anciens helpers (`getBool`, `getNumeric`, `getInteger`) appliquaient des conversions prématurées. Les fichiers Excel contiennent des formats hétérogènes (ex: DN = "150" ou "150/200")
- **Fix** : Tout stocker en TEXT brut. Seul `getStr()` dans `utils.ts`. Les conversions se font à l'affichage, pas à l'import
- **Prévention** : Règle dans CLAUDE.md — toutes les colonnes données Excel sont TEXT
- **Date** : 2026-03
