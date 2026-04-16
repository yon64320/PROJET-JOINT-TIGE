# Index des erreurs connues

Référentiel diagnostique du projet EMIS. Chaque fichier couvre un domaine technique.
Quand tu rencontres un problème, cherche les mots-clés ici pour trouver le bon fichier.

Après chaque bug fix, cataloguer l'erreur via `/catalog-error`.

## Fichiers référentiels

| Fichier                                      | Domaine                           | Mots-clés                                                         |
| -------------------------------------------- | --------------------------------- | ----------------------------------------------------------------- |
| [excel-sheetjs.md](excel-sheetjs.md)         | Parsing Excel, SheetJS, import    | formules cached, feuilles fantômes, encoding, !ref, sheet_to_json |
| [univer.md](univer.md)                       | Tableur Univer, React integration | DOM résiduel, dispose, strict mode, SSR, workbookData, events     |
| [supabase-postgres.md](supabase-postgres.md) | Base de données, Supabase         | GENERATED, RLS, migration, JSONB, extra_columns, TEXT brut        |
| [css-tailwind.md](css-tailwind.md)           | Tailwind v4, CSS                  | page blanche, @theme, @keyframes, parsing CSS                     |
| [nextjs-react.md](nextjs-react.md)           | Next.js, React 19, API routes     | hydration, SSR, middleware, dynamic import, fetch                 |
| [pwa-offline.md](pwa-offline.md)             | PWA, Dexie, Service Worker, sync  | IndexedDB, mutations, sync, navigator, SW hang                    |
| [browser-env.md](browser-env.md)             | Navigateur, OS, environnement     | CORS, MIME type, cp1252, UTF-8, Chrome, Windows                   |

## Lookup rapide par symptôme

| Symptôme                                          | Fichier              | Section                                                          |
| ------------------------------------------------- | -------------------- | ---------------------------------------------------------------- |
| Page blanche silencieuse après modif CSS          | css-tailwind.md      | @keyframes dans @theme                                           |
| Import J&T produit trop de lignes                 | excel-sheetjs.md     | Feuilles fantômes / formules cached                              |
| `cannot UPDATE a GENERATED column`                | supabase-postgres.md | Colonnes GENERATED immutables                                    |
| Fichier .xlsm rejeté par le navigateur            | browser-env.md       | MIME type case-insensitive                                       |
| Tableur Univer duplique les DOM elements          | univer.md            | DOM résiduel React 19 Strict Mode                                |
| `document is not defined` avec Univer             | univer.md            | SSR interdit — dynamic import                                    |
| SW ready hang forever                             | pwa-offline.md       | navigator.serviceWorker.ready sans SW                            |
| Encoding cp1252 / caractères cassés               | browser-env.md       | UTF-8 obligatoire Windows                                        |
| Feature absente malgré fichiers créés, page stale | nextjs-react.md      | Feature incomplète : nouveaux fichiers sans adaptation composant |
