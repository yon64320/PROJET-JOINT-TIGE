# Univer — Format workbookData, setValue/getValues, Events

## Format IWorkbookData

Structure complète pour initialiser un workbook :

```typescript
const workbookData: IWorkbookData = {
  id: 'workbook-lut',
  name: 'LUT Butachimie',
  appVersion: '0.10.2',
  locale: LocaleType.EN_US,
  styles: {
    'header': { ff: 'Arial', fs: 11, bl: true, bg: { rgb: '#D9E1F2' } },
    'cancelled': { bg: { rgb: '#D3D3D3' }, cl: { rgb: '#808080' } },
    'delta-alert': { bg: { rgb: '#FFC7CE' }, cl: { rgb: '#9C0006' } },
  },
  sheetOrder: ['sheet-1'],
  sheets: {
    'sheet-1': {
      id: 'sheet-1',
      name: 'LUT',
      rowCount: 300,
      columnCount: 20,
      defaultColumnWidth: 120,
      defaultRowHeight: 24,
      // Colonnes avec largeurs spécifiques
      columnData: {
        0: { w: 100 },   // UNITE
        1: { w: 120 },   // ITEM
        4: { w: 300 },   // TITRE GAMME (large)
      },
      // Geler la première ligne (en-têtes)
      freeze: {
        startRow: 1,
        startColumn: 0,
        ySplit: 1,
        xSplit: 0,
      },
      // Données : matrice sparse row → col → cellData
      cellData: {
        0: {  // Ligne 0 = en-têtes
          0: { v: 'UNITE', s: 'header' },
          1: { v: 'ITEM', s: 'header' },
          2: { v: 'OT', s: 'header' },
        },
        1: {  // Ligne 1 = premier OT
          0: { v: 'BUTADIENE' },
          1: { v: 'B-E101' },
          2: { v: '1001' },
        },
      },
    },
  },
}
```

## Format ICellData

Chaque cellule est un objet avec ces propriétés :

```typescript
interface ICellData {
  v?: string | number | boolean   // Valeur affichée
  t?: CellValueType               // Type : 1=string, 2=number, 3=boolean, 4=force text
  f?: string                      // Formule (ex: '=SUM(A1:B1)')
  s?: string | IStyleData         // ID style global ou style inline
  p?: IDocumentData               // Rich text
  custom?: Record<string, any>    // Métadonnées custom (ex: dbId, fieldName)
}
```

**Astuce métier** : Utiliser `custom` pour stocker l'ID DB et le nom du champ :
```typescript
{ v: 'BUTADIENE', custom: { dbId: 'uuid-123', field: 'unite' } }
```

## Construire cellData depuis un tableau d'objets

Pattern pour transformer `OtItem[]` → cellData Univer :

```typescript
function buildCellData(headers: string[], rows: Record<string, any>[]): Record<number, Record<number, ICellData>> {
  const cellData: Record<number, Record<number, ICellData>> = {}

  // En-têtes (ligne 0)
  cellData[0] = {}
  headers.forEach((h, col) => {
    cellData[0][col] = { v: h, s: 'header' }
  })

  // Données (lignes 1+)
  rows.forEach((row, rowIdx) => {
    cellData[rowIdx + 1] = {}
    headers.forEach((h, col) => {
      const fieldName = headerToField[h] // mapping en-tête → champ DB
      cellData[rowIdx + 1][col] = {
        v: row[fieldName] ?? '',
        custom: { dbId: row.id, field: fieldName },
      }
    })
  })

  return cellData
}
```

## API setValue / getValues

### Écrire des valeurs

```typescript
const fWorkbook = univerAPI.getActiveWorkbook()
const fWorksheet = fWorkbook.getActiveSheet()

// Valeur unique sur une cellule
fWorksheet.getRange('A1').setValue('Hello')

// Tableau 2D sur une plage
fWorksheet.getRange('A1:C2').setValues([
  ['A1', 'B1', 'C1'],
  ['A2', 'B2', 'C2'],
])

// Objet sparse (comme cellData)
fWorksheet.getRange('A1:C2').setValues({
  0: { 0: 'A1', 2: 'C1' },  // B1 non touché
  1: { 1: 'B2' },            // A2, C2 non touchés
})
```

### Lire des valeurs

```typescript
// Tableau 2D
const values = fWorksheet.getRange('A1:C10').getValues()
// → [['UNITE', 'ITEM', 'OT'], ['BUTADIENE', 'B-E101', '1001'], ...]

// Valeur unique (coin haut-gauche)
const val = fWorksheet.getRange('A1').getValue()

// Valeurs formatées (tel qu'affiché)
const display = fWorksheet.getRange('A1:C10').getDisplayValues()

// Données complètes (ICellData avec styles, formules, custom)
const cellData = fWorksheet.getRange('A1').getCellData(0, 0)
```

## Events — Écoute des changements

### SheetValueChanged (principal)

L'API utilise `effectedRanges` — un tableau de `FRange` avec des méthodes `getRow()`, `getColumn()`, `getValues()`.

> **Attention** : `getValues()` retourne des primitives (string/number/boolean), mais peut aussi retourner des objets `{ v: ... }` dans certains cas. Toujours utiliser une extraction défensive.

```typescript
const disposable = univerAPI.addEvent(
  univerAPI.Event.SheetValueChanged,
  (params) => {
    const { effectedRanges } = params
    if (!effectedRanges) return
    for (const fRange of effectedRanges) {
      const startRow = fRange.getRow()
      const startCol = fRange.getColumn()
      const values = fRange.getValues()
      if (!values) continue
      for (let r = 0; r < values.length; r++) {
        for (let c = 0; c < (values[r]?.length ?? 0); c++) {
          const raw = values[r][c]
          // Extraction défensive : primitive ou objet { v: ... }
          const cellValue = raw !== null && typeof raw === 'object' && 'v' in raw
            ? (raw as { v: unknown }).v : raw
          console.log(`[${startRow + r}, ${startCol + c}] = ${cellValue}`)
        }
      }
    }
  }
)
```

### Autres events utiles

```typescript
// Avant début d'édition — bloquer certaines cellules
// params contient { row, column, cancel? } — mettre cancel = true pour empêcher l'édition
univerAPI.addEvent(univerAPI.Event.BeforeSheetEditStart, (params) => {
  const p = params as { row: number; column: number; cancel?: boolean }
  // Ex: bloquer la ligne d'en-tête
  if (p.row === 0) {
    p.cancel = true
  }
  // Ex: bloquer des colonnes en lecture seule
  const readOnlyCols = [18, 21] // colonnes RETENU
  if (readOnlyCols.includes(p.column)) {
    p.cancel = true
  }
})

// Fin d'édition
univerAPI.addEvent(univerAPI.Event.SheetEditEnded, (params) => {
  // Déclencher sauvegarde après validation
})
```

## Debounce des sauvegardes

Pattern pour éviter un appel API à chaque frappe :

```typescript
import { useRef, useCallback } from 'react'

function useDebouncedSave(saveFn: (changes: Map<string, any>) => void, delay = 500) {
  const pendingChanges = useRef(new Map<string, any>())
  const timer = useRef<NodeJS.Timeout>()

  const queueChange = useCallback((key: string, value: any) => {
    pendingChanges.current.set(key, value)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      saveFn(new Map(pendingChanges.current))
      pendingChanges.current.clear()
    }, delay)
  }, [saveFn, delay])

  return queueChange
}

// Usage :
const queueChange = useDebouncedSave(async (changes) => {
  await fetch('/api/ot-items', {
    method: 'PATCH',
    body: JSON.stringify(Object.fromEntries(changes)),
  })
})

// Dans onCellChange :
onCellChange={(params) => {
  const key = `${params.row}-${params.col}`
  queueChange(key, { id: dbId, field: fieldName, value: params.value })
}}
```
