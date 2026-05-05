# Section 5 — Univer & tableurs lourds

**Niveau** : MEDIUM
**Cibles** : `src/components/sheets/**`, `src/lib/univer/**`

## Regles

### 5.1 — Univer charge en dynamic + `ssr: false`

- **Methode** : grep
- **Pattern** :
  ```
  rg -n "from ['\"]@univerjs" src/components/sheets/ src/lib/univer/
  rg -n "dynamic\(.*univer" src/
  ```
- **Attendu** : composant racine Univer importe via
  `dynamic(() => import('...'), { ssr: false })`. Aucun import statique d'`@univerjs/*`
  hors d'un module charge dynamiquement.
- **Signal FAIL** : import statique direct dans un fichier compile au first-load.
- **Source** : [Next.js — Lazy loading](https://nextjs.org/docs/app/guides/lazy-loading) + `.claude/skills/univer-patterns`

### 5.2 — `workbookData` snapshot taille raisonnable

- **Methode** : jugement
- **Pattern** : grep `workbookData` dans `src/lib/univer/` puis lire les transformations
  qui produisent ce snapshot.
- **Attendu** : on n'envoie pas la totalite des `flanges` dans Univer si la vue
  n'utilise que 10 colonnes -> filtrer / projeter avant de construire le workbookData.
- **Signal WARN** : workbookData construit avec `select("*")` sur grosse table.
- **Source** : `.claude/skills/univer-patterns` (patterns workbookData) + back-audit 6.6 (select cible)

### 5.3 — Conditional formatting / data validation appliques en batch

- **Methode** : grep
- **Pattern** :
  ```
  rg -n 'addConditionalRule|setDataValidation|applyConditionalFormatting' src/lib/univer/
  ```
- **Attendu** : appel unique avec un tableau de regles plutot que boucle
  cellule par cellule.
- **Signal WARN** : `for (cell of cells) addConditionalRule(...)` -> N reflows /
  re-renders Univer.
- **Source** : `.claude/skills/univer-patterns`

### 5.4 — `dispose()` dans cleanup `useEffect`

- **Methode** : grep
- **Pattern** :
  ```
  rg -n -A 8 "createUniver|new Univer" src/components/sheets/ src/lib/univer/ | rg "dispose"
  ```
- **Attendu** : `useEffect(() => { const univer = createUniver(...); return () => univer.dispose(); }, [])`.
- **Signal FAIL** : pas de `dispose()` -> fuite memoire au demontage / hot reload.
- **Source** : `.claude/skills/univer-patterns` (cleanup)

### 5.5 — Auto-save debounce

- **Methode** : grep
- **Pattern** :
  ```
  rg -n "autoSave|onCellChange|onSheetChange" src/components/sheets/ src/lib/univer/
  rg -n "debounce|setTimeout" src/components/sheets/ src/lib/univer/
  ```
- **Attendu** : auto-save batche les modifs avec un debounce (>= 500ms) avant
  d'envoyer a l'API.
- **Signal FAIL** : un appel API par cellule modifiee -> rafale de PATCH +
  contention DB.
- **Source** : `.claude/skills/univer-patterns` (auto-save)

### 5.6 — Pas de re-render Univer sur change irrelevant

- **Methode** : jugement
- **Cibles** : composants React qui hebergent Univer
- **Attendu** : la prop `workbookData` n'est pas reconstruite a chaque render parent
  (utiliser `useMemo` ou state stable). Univer n'est pas remonte a chaque
  changement de filtre / vue : preferer une API Univer pour appliquer la mutation.
- **Signal WARN** : changement de vue J&T qui detruit/recree l'instance Univer
  -> latence + perte d'etat.

### 5.7 — Vue J&T : 7 vues sans charger les 7 simultanement

- **Methode** : grep
- **Pattern** :
  ```
  rg -n "JtViewToggle|currentView" src/components/sheets/ src/app/projets/
  ```
- **Attendu** : seule la vue active est rendue (les 6 autres ne sont pas
  pre-rendues en background).
- **Signal WARN** : composants des 7 vues monte simultanement.
