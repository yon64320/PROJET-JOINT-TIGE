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

## `xlsx` (SheetJS) 0.18.5 plus maintenu sur npm

- **Symptôme** : `npm audit` rapporte 2 vulns HIGH sur `xlsx` (GHSA-4r6h-8v6p-xvw6 prototype pollution + GHSA-5pgg-2g8v-p4x9 ReDoS). `npm view xlsx version` retourne 0.18.5 inchangé depuis 2022. Aucun fix npm ne sortira
- **Cause racine** : SheetJS a déplacé le développement actif sur leur CDN officiel (`https://cdn.sheetjs.com`). Le miroir npm est figé à 0.18.5. Les CVE restent ouvertes côté npm tandis que les versions CDN (0.20.x+) sont patchées
- **Fix** : 3 voies — (A) accepter le risque + valider strictement MIME/taille à l'upload, (B) migrer vers `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` dans `package.json` (Dependabot ne gère pas les URL non-npm), (C) supprimer `xlsx` au profit de `exceljs` — incompatible si fichiers `.xlsm` (macros, non supporté par exceljs)
- **Prévention** : Surveiller `npm view xlsx version` à chaque audit. Si SheetJS revient sur npm avec un patch sécurité, bumper. Documenter la voie retenue par écrit pour ne pas re-débattre à chaque audit
- **Date** : 2026-04-29

## Format décimal français `"100,5"` parsé en NaN par Number()

- **Symptôme** : `hasDelta("100.5", "100,5")` retourne `false` alors que les valeurs représentent la même chose (faux négatif), OU `hasDelta("100", "200,5")` retourne `false` alors qu'il y a un vrai écart. L'alerte rouge UI ne s'allume pas → le préparateur passe à côté d'une incohérence
- **Cause racine** : `Number("100,5") === NaN`. JavaScript ne parse que le format anglais (point décimal). Si BUTA fournit les nombres en format français (Excel FR par défaut) et EMIS les saisit en format anglais (ou inversement), toute comparaison numérique post-parse échoue silencieusement
- **Fix** : Normaliser avant `Number()` → `Number(String(v).replace(",", "."))`. Pour la cohérence à long terme, normaliser **à l'import** (côté `import-lut.ts` / `import-jt.ts`) plutôt qu'à chaque comparaison côté domain
- **Prévention** : Toute comparaison numérique sur une valeur Excel doit passer par un helper `parseDecimal(v)` qui gère la virgule. Tests à inclure dans toute fonction de comparaison : `("100,5", "100.5")`, `("100", "200,5")`, `(",5", "0.5")`
- **Date** : 2026-04-29
