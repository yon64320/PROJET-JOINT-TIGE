---
name: univer-patterns
description: Patterns d'intégration Univer dans Next.js 16 + React 19. Setup, workbookData, events, data validation, conditional formatting, cleanup. Use when creating or modifying spreadsheet components.
---

# Univer Patterns — Next.js 16 + React 19

## Quick Start

```bash
npm install @univerjs/presets @univerjs/preset-sheets-core @univerjs/preset-sheets-data-validation @univerjs/preset-sheets-conditional-formatting
```

## Composant React — Pattern de base

```tsx
"use client"

import { useEffect, useRef } from 'react'
import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets'
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import { UniverSheetsDataValidationPreset } from '@univerjs/preset-sheets-data-validation'
import { UniverSheetsConditionalFormattingPreset } from '@univerjs/preset-sheets-conditional-formatting'
import UniverPresetSheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US'

import '@univerjs/preset-sheets-core/lib/index.css'
import '@univerjs/preset-sheets-data-validation/lib/index.css'
import '@univerjs/preset-sheets-conditional-formatting/lib/index.css'

export default function UniverSheet({ workbookData, onCellChange }) {
  const containerRef = useRef<HTMLDivElement>(null)

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
        UniverSheetsCorePreset({ container: containerRef.current }),
        UniverSheetsDataValidationPreset(),
        UniverSheetsConditionalFormattingPreset(),
      ],
    })

    univerAPI.createWorkbook(workbookData)

    // Écoute des changements via effectedRanges
    const disposable = univerAPI.addEvent(
      univerAPI.Event.SheetValueChanged,
      (params) => {
        if (!onCellChange) return
        const { effectedRanges } = params
        if (!effectedRanges) return
        for (const fRange of effectedRanges) {
          const values = fRange.getValues()
          if (!values) continue
          for (let r = 0; r < values.length; r++) {
            for (let c = 0; c < (values[r]?.length ?? 0); c++) {
              const raw = values[r][c]
              const cellValue = raw !== null && typeof raw === 'object' && 'v' in raw
                ? raw.v : raw
              onCellChange({
                row: fRange.getRow() + r,
                col: fRange.getColumn() + c,
                value: cellValue ?? null,
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
  }, []) // [] = une seule init, cleanup + re-create gère Strict Mode

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
```

**Import dynamique Next.js (obligatoire — Univer manipule le DOM) :**

```tsx
import dynamic from 'next/dynamic'
const UniverSheet = dynamic(() => import('./UniverSheet'), { ssr: false })
```

## Règles critiques

1. **Toujours `"use client"`** — Univer ne fonctionne pas côté serveur
2. **Toujours `ssr: false`** dans `next/dynamic` — sinon erreur `document is not defined`
3. **Toujours `univerAPI.dispose()`** dans le cleanup useEffect — sinon fuite mémoire
4. **`useEffect(…, [])` avec deps vide** — init unique, cleanup + re-create gère Strict Mode
5. **`containerRef.current.innerHTML = ''`** avant `createUniver()` — nettoie le DOM résiduel après dispose
6. **Jamais de `useRef` guard** pour empêcher la ré-init — ça casse le système d'événements en Strict Mode
7. **Pas de `workerURL`** — le worker ESM non-bundlé casse l'init dans Next.js
8. **CSS imports dans le composant client** — pas dans layout.tsx (SSR)

## Ressources détaillées

- [references/setup-nextjs.md](references/setup-nextjs.md) — Pattern complet Next.js 16 + React 19
- [references/data-events.md](references/data-events.md) — Format workbookData, setValue/getValues, events
- [references/validation-formatting.md](references/validation-formatting.md) — Dropdowns, data validation, conditional formatting
