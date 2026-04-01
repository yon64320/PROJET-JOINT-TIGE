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
  const onCellChangeRef = useRef(onCellChange)
  onCellChangeRef.current = onCellChange

  useEffect(() => {
    if (!containerRef.current) return
    // Nettoyer le DOM résiduel (React 19 Strict Mode dispose le JS mais laisse le DOM)
    containerRef.current.innerHTML = ''

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
          // NE PAS utiliser workerURL — le worker ESM non-bundlé casse l'init
        }),
        UniverSheetsDataValidationPreset(),
        UniverSheetsConditionalFormattingPreset(),
      ],
    })

    univerAPI.createWorkbook(workbookData)

    // Callback quand l'instance est prête (pour setup validation/formatting externe)
    onReady?.({ univerAPI })

    // Écoute changements cellules via effectedRanges API
    const disposable = univerAPI.addEvent(
      univerAPI.Event.SheetValueChanged,
      (params: any) => {
        const cb = onCellChangeRef.current
        if (!cb) return
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
              // getValues() retourne des primitives, mais guard contre les objets cellule
              const cellValue = raw !== null && typeof raw === 'object' && 'v' in raw
                ? raw.v : raw
              cb({
                row: startRow + r,
                col: startCol + c,
                value: (cellValue ?? null) as string | number | boolean | null,
                sheetId: '',
              })
            }
          }
        }
      }
    )

    return () => {
      disposable.dispose()
      univerAPI.dispose()
    }
  }, []) // Deps vide — cleanup + re-create gère Strict Mode

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

React 19 Strict Mode (activé par défaut dans Next.js 16 en dev) exécute `useEffect` deux fois : mount → cleanup → remount.

**Le piège** : `univerAPI.dispose()` détruit le système d'événements JS mais laisse le DOM d'Univer dans le container. Si on empêche la ré-init (avec un `useRef` guard), le tableur s'affiche (DOM résiduel) mais les événements sont morts → `SheetValueChanged` ne se déclenche jamais.

**Solution correcte** — laisser le cleanup/re-create se faire naturellement :
```tsx
useEffect(() => {
  if (!containerRef.current) return
  // Nettoyer le DOM résiduel laissé par dispose()
  containerRef.current.innerHTML = ''

  const { univerAPI } = createUniver({ /* ... */ })
  univerAPI.createWorkbook(workbookData)

  return () => {
    disposable.dispose()
    univerAPI.dispose()
  }
}, [])
```

**Ne JAMAIS utiliser un `useRef` guard** :
```tsx
// ❌ BUG — le système d'événements est mort après le 2e mount
const initialized = useRef(false)
useEffect(() => {
  if (initialized.current) return  // ← SKIP la ré-init = événements morts
  initialized.current = true
  // ...
}, [])
```

**Ne JAMAIS utiliser `workerURL`** dans `UniverSheetsCorePreset` — le worker ESM non-bundlé casse l'init dans Next.js.
