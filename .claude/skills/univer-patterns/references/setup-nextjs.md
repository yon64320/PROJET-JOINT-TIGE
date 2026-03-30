# Setup Univer — Next.js 16 + React 19

## Installation

```bash
npm install @univerjs/presets @univerjs/preset-sheets-core @univerjs/preset-sheets-data-validation @univerjs/preset-sheets-conditional-formatting
```

## Architecture des composants

```
src/components/spreadsheet/
├── UniverSheet.tsx        # Composant générique (client, dynamic import)
├── LutSheet.tsx           # Spécialisé LUT : colonnes, validation, formatting
├── JtSheet.tsx            # Spécialisé J&T : triplets, opérations, DELTA
└── index.ts               # Barrel exports
```

## Pattern complet — UniverSheet.tsx

```tsx
"use client"

import { useEffect, useRef, useCallback } from 'react'
import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets'
import type { IWorkbookData } from '@univerjs/presets'
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import { UniverSheetsDataValidationPreset } from '@univerjs/preset-sheets-data-validation'
import { UniverSheetsConditionalFormattingPreset } from '@univerjs/preset-sheets-conditional-formatting'
import UniverPresetSheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US'

// CSS — ordre important : design → ui → presets
import '@univerjs/preset-sheets-core/lib/index.css'
import '@univerjs/preset-sheets-data-validation/lib/index.css'
import '@univerjs/preset-sheets-conditional-formatting/lib/index.css'

interface UniverSheetProps {
  workbookData: IWorkbookData
  onCellChange?: (params: {
    row: number
    col: number
    value: string | number | boolean | null
    sheetId: string
  }) => void
  onReady?: (api: { univerAPI: any }) => void
}

export default function UniverSheet({ workbookData, onCellChange, onReady }: UniverSheetProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const { univerAPI } = createUniver({
      locale: LocaleType.EN_US,
      locales: {
        [LocaleType.EN_US]: mergeLocales(UniverPresetSheetsCoreEnUS),
      },
      presets: [
        UniverSheetsCorePreset({
          container: containerRef.current,
          header: true,
          toolbar: true,
          formulaBar: true,
          contextMenu: true,
        }),
        UniverSheetsDataValidationPreset(),
        UniverSheetsConditionalFormattingPreset(),
      ],
    })

    univerAPI.createWorkbook(workbookData)

    // Callback quand l'instance est prête (pour setup validation/formatting externe)
    onReady?.({ univerAPI })

    // Écoute changements cellules
    const disposable = univerAPI.addEvent(
      univerAPI.Event.SheetValueChanged,
      (params: any) => {
        if (!onCellChange) return
        const { range, newValues } = params
        // Itérer sur les cellules modifiées
        for (let r = 0; r < newValues.length; r++) {
          for (let c = 0; c < newValues[r].length; c++) {
            const cellValue = newValues[r][c]
            onCellChange({
              row: range.startRow + r,
              col: range.startColumn + c,
              value: cellValue?.v ?? null,
              sheetId: params.worksheet?.getSheetId() ?? '',
            })
          }
        }
      }
    )

    return () => {
      disposable.dispose()
      univerAPI.dispose()
    }
  }, []) // Deps vide = init unique

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
```

## Import dynamique (obligatoire)

Dans le composant parent (page ou composant wrapper) :

```tsx
import dynamic from 'next/dynamic'

const UniverSheet = dynamic(
  () => import('@/components/spreadsheet/UniverSheet'),
  { ssr: false, loading: () => <div>Chargement du tableur...</div> }
)
```

## Configuration Next.js

Si des erreurs de transpilation apparaissent, ajouter dans `next.config.ts` :

```ts
const nextConfig = {
  transpilePackages: ['@univerjs/presets'],
  // ... autres configs
}
```

## Piège React 19 / Strict Mode

React 19 en Strict Mode appelle useEffect 2 fois en dev. Univer ne supporte pas d'être initialisé 2 fois sur le même container. Solutions :

1. **useRef guard** (recommandé) :
```tsx
const initialized = useRef(false)
useEffect(() => {
  if (initialized.current) return
  initialized.current = true
  // ... init Univer
}, [])
```

2. Ou désactiver Strict Mode dans `next.config.ts` (non recommandé en dev).
