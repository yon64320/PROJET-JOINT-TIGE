# Erreurs — Univer (tableur)

## DOM résiduel React 19 Strict Mode

- **Symptôme** : Éléments DOM dupliqués dans le tableur après navigation ou hot reload. Le tableur affiche des artéfacts visuels
- **Cause racine** : React 19 Strict Mode dispose le JS (appelle cleanup) mais laisse le DOM résiduel dans le container. Univer recrée ses éléments sans nettoyer les anciens
- **Fix** : `containerRef.current.innerHTML = ''` avant `createUniver()` dans le useEffect
- **Prévention** : Pattern documenté dans le skill univer-patterns
- **Date** : 2026-02

## SSR interdit — `document is not defined`

- **Symptôme** : Erreur serveur `ReferenceError: document is not defined` au chargement d'une page avec tableur
- **Cause racine** : Univer manipule le DOM directement. Importé côté serveur par Next.js SSR
- **Fix** : `dynamic(() => import('./UniverSheet'), { ssr: false })` dans le composant parent
- **Prévention** : Règle critique dans le skill — toujours `"use client"` + `ssr: false`
- **Date** : 2026-02

## Worker ESM casse l'init

- **Symptôme** : Erreur silencieuse à l'initialisation d'Univer, le tableur ne s'affiche pas
- **Cause racine** : Le `workerURL` ESM non-bundlé n'est pas compatible avec le bundler Next.js
- **Fix** : Ne pas passer `workerURL` dans la config createUniver
- **Prévention** : Documenté dans le skill univer-patterns — "Pas de workerURL"
- **Date** : 2026-02

## useRef guard casse les événements

- **Symptôme** : Les événements SheetValueChanged ne se déclenchent plus après un remount en Strict Mode
- **Cause racine** : Un `useRef` guard (`if (initialized.current) return`) empêche la ré-initialisation. En Strict Mode, le premier mount est disposé mais le guard bloque le second
- **Fix** : Supprimer le guard, laisser le pattern cleanup + re-create gérer les remounts
- **Prévention** : Règle critique skill — "Jamais de useRef guard pour empêcher la ré-init"
- **Date** : 2026-02
