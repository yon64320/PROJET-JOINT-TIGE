# Erreurs — Navigateur / Environnement

## MIME type case-insensitive (.xlsm rejeté)

- **Symptôme** : Le navigateur rejette un fichier .xlsm valide à l'upload. Erreur "Type de fichier non supporté"
- **Cause racine** : Le MIME type envoyé par le navigateur peut varier en casse (ex: `Application/Vnd.Ms-Excel...`). La validation comparait en case-sensitive
- **Fix** : Comparer les MIME types en `.toLowerCase()`. Fonction `isAllowedExcelMime()` dans `schemas.ts`
- **Prévention** : Toujours normaliser en lowercase avant comparaison de MIME types
- **Date** : 2026-04

## Encoding cp1252 / caractères français cassés

- **Symptôme** : Accents et caractères spéciaux affichés comme `Ã©`, `Ã¨` ou `?`
- **Cause racine** : Windows utilise cp1252 par défaut pour stdout. Les scripts Python sans encodage explicite produisent du cp1252 au lieu d'UTF-8
- **Fix** : Python — `sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')`. JS/Node — pas de problème natif
- **Prévention** : Pattern documenté dans CLAUDE.md et le skill import-excel
- **Date** : 2026-02
