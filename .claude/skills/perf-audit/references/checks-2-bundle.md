# Section 2 — Bundle & code-splitting

**Niveau** : CRITIQUE
**Cibles** : `next.config.ts`, `src/components/**`, `src/app/**`, `package.json`

## Regles

### 2.1 — Univer charge en dynamic import

- **Methode** : grep
- **Pattern** :
  ```
  rg -n "from ['\"]@univerjs" src/
  rg -n "dynamic\(\(\) => import" src/components/sheets/ src/app/
  ```
- **Attendu** : Univer importe via `dynamic(() => import('...'), { ssr: false })`
  dans le composant racine du tableur.
- **Signal FAIL** : `import { Univer } from '@univerjs/...'` statique en haut
  de fichier d'une page tableur -> Univer (~MB) inclus dans le first-load JS
  meme si l'utilisateur n'ouvre jamais ce tableur.
- **Source** : [Next.js — Lazy loading](https://nextjs.org/docs/app/guides/lazy-loading)

### 2.2 — pdfjs-dist en dynamic import

- **Methode** : grep
- **Pattern** :
  ```
  rg -n "from ['\"]pdfjs-dist" src/
  ```
- **Attendu** : pdfjs-dist charge uniquement dans le viewer plans (`dynamic`).
- **Signal FAIL** : import statique global -> ~500ko inclus partout.
- **Source** : [Next.js — Optimizing large bundles / Heavy client workloads](https://nextjs.org/docs/app/guides/package-bundling#heavy-client-workloads)

### 2.3 — @react-pdf/renderer en dynamic import

- **Methode** : grep
- **Pattern** :
  ```
  rg -n "from ['\"]@react-pdf/renderer" src/
  ```
- **Attendu** : import dynamique uniquement dans la page de generation PDF
  robinetterie. Pas dans un composant generique.
- **Signal FAIL** : import statique partage -> bundle gonfle sur toutes les pages.
- **Source** : [Next.js — Heavy client workloads](https://nextjs.org/docs/app/guides/package-bundling#heavy-client-workloads)

### 2.4 — SheetJS (xlsx) cote serveur uniquement OU dynamic cote client

- **Methode** : grep
- **Pattern** :
  ```
  rg -n "from ['\"]xlsx['\"]" src/
  rg -B 5 "from ['\"]xlsx['\"]" src/ | rg "['\"]use client['\"]"
  ```
- **Attendu** : xlsx importe statiquement uniquement dans des Server Components /
  routes API. Si import dans Client Component : `dynamic` obligatoire.
- **Signal FAIL** : import statique cote client (~600ko parsed).
- **Source** : `.claude/rules/excel-python.md` + [Next.js — Heavy client workloads](https://nextjs.org/docs/app/guides/package-bundling#heavy-client-workloads)

### 2.5 — `experimental.optimizePackageImports`

- **Methode** : Read `next.config.ts`
- **Pattern** :
  ```
  rg -n "optimizePackageImports" next.config.ts
  ```
- **Attendu** : `optimizePackageImports: ['lucide-react', 'date-fns', ...]`
  pour les libs a many exports utilisees dans le projet.
- **Signal WARN** : import barrel `import { Icon1, Icon2 } from 'lucide-react'`
  utilise sans optimizePackageImports -> Next.js inclut tous les icons.
- **Pourquoi** : reduit drastiquement le bundle pour libs d'icons / utils.
- **Source** : [Next.js — optimizePackageImports](https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports)

### 2.6 — `@next/bundle-analyzer` installe

- **Methode** : grep + Read
- **Pattern** :
  ```
  rg -n "@next/bundle-analyzer" package.json next.config.ts
  ```
- **Attendu** : plugin installe + configure conditionnellement (`process.env.ANALYZE`).
- **Signal WARN** : non installe -> impossible de mesurer objectivement le bundle.
- **Fix recommande** :
  ```
  npm install -D @next/bundle-analyzer
  # next.config.ts : const withBundleAnalyzer = require('@next/bundle-analyzer')({ enabled: process.env.ANALYZE === 'true' });
  ANALYZE=true npm run build
  ```
- **Note** : Next.js >= 16.1 propose aussi `npx next experimental-analyze --output`.
- **Source** : [Next.js — Bundle analyzer](https://nextjs.org/docs/app/guides/package-bundling#nextbundle-analyzer-for-webpack)

### 2.7 — Pas d'import barrel non tree-shakable

- **Methode** : grep
- **Pattern** :
  ```
  rg -n "from ['\"]lodash['\"]" src/
  rg -n "import \* as" src/
  ```
- **Attendu** : `import { x } from 'lodash-es/x'` ou `import x from 'lodash/x'` plutot que `from 'lodash'`.
- **Signal WARN** : `import _ from 'lodash'` ou `import * as foo` -> tree-shake casse.
- **Source** : [Next.js — Packages with many exports](https://nextjs.org/docs/app/guides/package-bundling#packages-with-many-exports)

### 2.8 — `serverExternalPackages` pour modules natifs

- **Methode** : Read `next.config.ts` + grep dependencies
- **Pattern** :
  ```
  rg -n "serverExternalPackages" next.config.ts
  rg -n "sharp|pdf-parse|@react-pdf" package.json
  ```
- **Attendu** : modules natifs node lourds (sharp, pdf-parse, etc.) listes dans
  `serverExternalPackages` pour ne pas etre bundles.
- **Signal WARN** : module natif present dans `dependencies` mais absent de
  `serverExternalPackages` -> peut casser ou alourdir le build.
- **Source** : [Next.js — serverExternalPackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages)

### 2.9 — Heavy client workload deplacable au server

- **Methode** : jugement
- **Cibles** : composants client qui font du parsing / rendu lourd dont la sortie est statique
- **Attendu** : si le rendu peut etre fait au build/serveur (markdown, syntax highlight,
  charts statiques), faire en Server Component et envoyer le HTML au client.
- **Signal WARN** : librairie de transformation data->UI dans un Client Component
  qui rend du HTML statique.
- **Source** : [Next.js — Heavy client workloads](https://nextjs.org/docs/app/guides/package-bundling#heavy-client-workloads)
