# Univer — Data Validation, Dropdowns & Conditional Formatting

## Data Validation — Dropdowns

### Setup (via preset)

```typescript
import { UniverSheetsDataValidationPreset } from '@univerjs/preset-sheets-data-validation'

// Dans createUniver() presets :
UniverSheetsDataValidationPreset({
  showEditOnDropdown: true,
  showSearchOnDropdown: true,
})
```

### Créer un dropdown sur une plage

```typescript
const fWorkbook = univerAPI.getActiveWorkbook()
const fWorksheet = fWorkbook.getActiveSheet()

// Dropdown statut TB/TC/TA sur colonne Q (index 16), lignes 1-297
const statusRange = fWorksheet.getRange(1, 16, 297, 1) // startRow, startCol, numRows, numCols

const statusRule = univerAPI.newDataValidation()
  .requireValueInList(['TB', 'TC', 'TA'])
  .setAllowBlank(true)
  .build()

statusRange.setDataValidation(statusRule)
```

### Dropdown depuis une liste dynamique

```typescript
// Familles d'items depuis la base
const familles = ['Equipement', 'Intervention', 'NC', 'OTG', 'Robinetterie', 'Tuyauterie']

const familleRange = fWorksheet.getRange(1, 12, 297, 1) // col M = index 12
const familleRule = univerAPI.newDataValidation()
  .requireValueInList(familles)
  .setAllowBlank(false)
  .build()

familleRange.setDataValidation(familleRule)
```

### Autres types de validation

```typescript
// Nombre entre min et max (ex: DN)
univerAPI.newDataValidation()
  .requireNumberBetween(15, 1500)
  .build()

// Texte non vide
univerAPI.newDataValidation()
  .requireTextLength(1, 255)
  .build()
```

### Supprimer la validation

```typescript
fWorksheet.getRange('A1:A100').setDataValidation(null)
```

## Conditional Formatting

### Setup (via preset)

```typescript
import { UniverSheetsConditionalFormattingPreset } from '@univerjs/preset-sheets-conditional-formatting'

// Dans createUniver() presets :
UniverSheetsConditionalFormattingPreset()
```

### Lignes annulées (TA) en gris — Pattern LUT

```typescript
const fWorksheet = fWorkbook.getActiveSheet()

// Colonne STATUT = index 16 (Q), on applique sur toute la ligne
// Approche : conditional formatting avec formule sur chaque ligne
const dataRange = fWorksheet.getRange(1, 0, 297, 20) // toutes les colonnes de données

const taRule = univerAPI.newConditionalFormattingRule()
  .whenFormula('=$Q2="TA"') // $ fixe la colonne Q, la ligne est relative
  .setBackground('#D3D3D3')
  .setFontColor('#808080')
  .build()

dataRange.addConditionalFormattingRule(taRule)
```

### DELTA en rouge — Pattern J&T

```typescript
// DELTA DN (col S, index 18) — rouge si non vide / true
const deltaDnRange = fWorksheet.getRange(1, 18, 1500, 1)

const deltaRule = univerAPI.newConditionalFormattingRule()
  .whenCellNotEmpty()
  .setBackground('#FFC7CE')
  .setFontColor('#9C0006')
  .build()

deltaDnRange.addConditionalFormattingRule(deltaRule)

// Même chose pour DELTA PN (col V, index 21)
const deltaPnRange = fWorksheet.getRange(1, 21, 1500, 1)
deltaPnRange.addConditionalFormattingRule(deltaRule) // réutilisable
```

### Cellules RETENU — Fond bleu clair (lecture seule visuelle)

```typescript
const retenuCols = [18, 21, 42, 45] // colonnes RETENU dans J&T
retenuCols.forEach(col => {
  const range = fWorksheet.getRange(1, col, 1500, 1)
  const readOnlyStyle = univerAPI.newConditionalFormattingRule()
    .whenCellNotEmpty()
    .setBackground('#E8F0FE') // bleu très clair
    .build()
  range.addConditionalFormattingRule(readOnlyStyle)
})
```

### Gestion des règles existantes

```typescript
// Lister toutes les règles
const rules = fWorksheet.getConditionalFormattingRules()

// Supprimer une règle spécifique
fWorksheet.deleteConditionalFormattingRule(ruleId)

// Supprimer toutes les règles
fWorksheet.clearConditionalFormatRules()
```

## Colonnes en lecture seule

Univer n'a pas de "read-only" natif par cellule. Pattern recommandé :

```typescript
// Intercepter l'édition et bloquer certaines colonnes
univerAPI.addEvent(univerAPI.Event.BeforeSheetEditStart, (params) => {
  const col = params.range.startColumn
  const readOnlyCols = [18, 21, 42, 45] // colonnes RETENU
  if (readOnlyCols.includes(col) && params.range.startRow > 0) {
    return false // Bloque l'édition
  }
})
```

## Pattern complet — Setup validation + formatting après init

```typescript
function setupSheetRules(univerAPI: any, config: {
  dropdowns: Array<{ col: number, values: string[], rowCount: number }>,
  readOnlyCols: number[],
  conditionalRules: Array<{ range: [number, number, number, number], formula: string, bg: string, color: string }>,
}) {
  const fWorkbook = univerAPI.getActiveWorkbook()
  const fWorksheet = fWorkbook.getActiveSheet()

  // Dropdowns
  config.dropdowns.forEach(({ col, values, rowCount }) => {
    const range = fWorksheet.getRange(1, col, rowCount, 1)
    const rule = univerAPI.newDataValidation()
      .requireValueInList(values)
      .setAllowBlank(true)
      .build()
    range.setDataValidation(rule)
  })

  // Conditional formatting
  config.conditionalRules.forEach(({ range: [r, c, rows, cols], formula, bg, color }) => {
    const fRange = fWorksheet.getRange(r, c, rows, cols)
    const rule = univerAPI.newConditionalFormattingRule()
      .whenFormula(formula)
      .setBackground(bg)
      .setFontColor(color)
      .build()
    fRange.addConditionalFormattingRule(rule)
  })

  // Read-only columns
  if (config.readOnlyCols.length > 0) {
    univerAPI.addEvent(univerAPI.Event.BeforeSheetEditStart, (params: any) => {
      const col = params.range.startColumn
      if (config.readOnlyCols.includes(col) && params.range.startRow > 0) {
        return false
      }
    })
  }
}
```

## Dimensions colonnes et lignes gelées

```typescript
const fWorksheet = fWorkbook.getActiveSheet()

// Largeur colonnes individuelles
fWorksheet.setColumnWidth(0, 100)   // UNITE
fWorksheet.setColumnWidth(1, 120)   // ITEM
fWorksheet.setColumnWidth(4, 350)   // TITRE GAMME

// Largeur batch
fWorksheet.setColumnWidths(5, 7, 80) // 7 colonnes corps de métier à 80px

// Hauteur lignes
fWorksheet.setRowHeight(0, 30)       // En-tête plus haute
fWorksheet.setRowHeights(1, 297, 24) // Données à 24px

// Geler en-têtes
fWorksheet.setFrozenRows(1)    // Première ligne gelée
fWorksheet.setFrozenColumns(2) // UNITE + ITEM gelés au scroll horizontal
```
