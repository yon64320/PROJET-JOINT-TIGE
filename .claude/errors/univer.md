# Erreurs — Univer (tableur)

## DOM résiduel React 19 Strict Mode

- **Symptôme** : Éléments DOM dupliqués dans le tableur après navigation ou hot reload. Le tableur affiche des artéfacts visuels
- **Cause racine** : React 19 Strict Mode dispose le JS (appelle cleanup) mais laisse le DOM résiduel dans le container. Univer recrée ses éléments sans nettoyer les anciens
- **Fix** : `containerRef.current.innerHTML = ''` avant `createUniver()` dans le useEffect
- **Prévention** : Pattern documenté dans le skill univer-patterns
- **Date** : 2026-02-01

## SSR interdit — `document is not defined`

- **Symptôme** : Erreur serveur `ReferenceError: document is not defined` au chargement d'une page avec tableur
- **Cause racine** : Univer manipule le DOM directement. Importé côté serveur par Next.js SSR
- **Fix** : `dynamic(() => import('./UniverSheet'), { ssr: false })` dans le composant parent
- **Prévention** : Règle critique dans le skill — toujours `"use client"` + `ssr: false`
- **Date** : 2026-02-01

## Worker ESM casse l'init

- **Symptôme** : Erreur silencieuse à l'initialisation d'Univer, le tableur ne s'affiche pas
- **Cause racine** : Le `workerURL` ESM non-bundlé n'est pas compatible avec le bundler Next.js
- **Fix** : Ne pas passer `workerURL` dans la config createUniver
- **Prévention** : Documenté dans le skill univer-patterns — "Pas de workerURL"
- **Date** : 2026-02-01

## useRef guard casse les événements

- **Symptôme** : Les événements SheetValueChanged ne se déclenchent plus après un remount en Strict Mode
- **Cause racine** : Un `useRef` guard (`if (initialized.current) return`) empêche la ré-initialisation. En Strict Mode, le premier mount est disposé mais le guard bloque le second
- **Fix** : Supprimer le guard, laisser le pattern cleanup + re-create gérer les remounts
- **Prévention** : Règle critique skill — "Jamais de useRef guard pour empêcher la ré-init"
- **Date** : 2026-02-01

## Édit cellule perdu au changement de vue + filtre dérivé vide (state non-uplifté)

- **Symptôme** : Dans le tableur J&T, taper une valeur (ex. num_rob) puis basculer de vue (Terrain → Robinetterie → Terrain) fait **disparaître la valeur saisie**. F5 la fait réapparaître. Pire : la vue Robinetterie n'affiche pas la nouvelle vanne malgré 2 brides avec le même num_rob. La DB est bien mise à jour côté serveur
- **Cause racine** : Deux bugs combinés. (1) `rows` était traité comme une prop SSR figée dans `JtPageClient` : `useSheetSync` fait fire-and-forget du PATCH sans réconcilier le state React. Le remount via `key={viewMode}` rebuildait le workbook depuis cette prop stale. Les sous-ensembles `robRows = useMemo([rows])` ne se ré-évaluaient jamais → vannes invisibles dans les vues dérivées (Rob / Échaf / Calo). (2) Univer auto-parse les entrées numériques (`"12"` → `number 12`). Le filtre `robRows` exigeait `typeof n === "string"` — donc même avec un state à jour, une valeur numérique aurait été exclue. PostgREST coerce le number en TEXT côté DB d'où "F5 répare"
- **Fix** : (1) Uplifter `rows` en state local dans `JtPageClient` (`useState(initialRows)` + `useEffect([initialRows])` pour resync RSC + callback `onRowChange` propagée à `JtSheet`). Mise à jour optimiste après chaque `trackChange`. (2) Dans `handleCellChange`, normaliser explicitement les valeurs : bool fields → `boolean`, autres → `null | string` via `value === null || value === "" ? null : String(value)`. Le state local mirroir alors le typage DB (TEXT → string)
- **Prévention** : Pour tout composant tableur avec plusieurs vues dérivées d'un même dataset, **toujours uplifter en state local côté parent et propager les édits via callback**, jamais consommer les rows SSR directement. Coercer explicitement les valeurs Univer en types DB (TEXT → string) avant de patcher le state — Univer envoie `string | number | boolean | null` selon le parsing du contenu de la cellule, ce qui casse les filtres `typeof n === "string"`
- **Date** : 2026-05-10
