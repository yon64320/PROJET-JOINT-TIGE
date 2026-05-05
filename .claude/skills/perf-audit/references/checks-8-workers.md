# Section 8 — Workers & heavy parsing

**Niveau** : MINOR
**Cibles** : `src/lib/excel/**`, `src/lib/pdf/**`, imports lourds (`xlsx`, `pdfjs-dist`, `@react-pdf/renderer`)

## Regles

### 8.1 — SheetJS parse en Web Worker pour fichiers > 5 Mo

- **Methode** : grep + jugement
- **Pattern** :
  ```
  rg -n "from ['\"]xlsx['\"]" src/components/ src/app/
  rg -n "Worker\(|new Worker" src/
  ```
- **Attendu** : import volumineux (LUT/J&T 50k+ rows) parse dans un Web Worker
  pour ne pas bloquer le main thread.
- **Signal WARN** : parse SheetJS dans `useEffect` cote main thread -> UI freeze
  pendant plusieurs secondes pour gros fichiers.
- **Note** : tolerable si seul l'utilisateur l'attend devant un loader explicite,
  WARN sinon.
- **Source** : [web.dev — Web workers](https://web.dev/learn/performance)

### 8.2 — `pdf.worker.min.mjs` versionne dans `public/`

- **Methode** : Read + grep
- **Pattern** :
  ```
  ls public/pdf.worker*
  rg -n "pdfjs.GlobalWorkerOptions|workerSrc" src/
  ```
- **Attendu** : fichier worker copie dans `public/` + `workerSrc` pointe vers
  l'asset local. Version doit matcher `pdfjs-dist` dans `package.json`.
- **Signal FAIL** :
  - Worker absent -> pdfjs charge en main thread -> freeze.
  - Version desync -> erreurs aleatoires de parsing PDF.
- **Source** : [pdfjs-dist README](https://www.npmjs.com/package/pdfjs-dist) (skill `terrain-offline`)

### 8.3 — React-PDF : pas de spawn de N renders simultanes

- **Methode** : grep
- **Pattern** :
  ```
  rg -n "renderToStream|pdf\(\)\.toBlob|<PDFDownloadLink" src/components/ src/lib/
  ```
- **Attendu** : pour batch download (fiches robinetterie multiples), serialiser
  les renders ou limiter la concurrence (ex. p-limit / pool de 3).
- **Signal WARN** : `Promise.all(items.map(item => renderPdf(item)))` sur 50+ items
  -> consommation memoire qui crash le navigateur.
- **Source** : [react-pdf — Performance](https://react-pdf.org/) (skill `generate-pdf`)

### 8.4 — Image compression photos terrain dans Web Worker (optionnel)

- **Methode** : grep
- **Pattern** :
  ```
  rg -n "compressImage|toBlob|encode" src/lib/offline/ src/components/terrain/
  ```
- **Attendu** : si la conversion WebP est faite en boucle pour 10+ photos,
  preferer un Worker pour ne pas bloquer la prise de photo suivante.
- **Signal WARN** : compression bloquante pendant > 1s sur main thread.
- **Source** : [web.dev — Web workers concrete use case](https://web.dev/learn/performance)
