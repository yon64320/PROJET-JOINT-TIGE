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

| Symptôme                                                                     | Fichier              | Section                                                             |
| ---------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------- |
| Page blanche silencieuse après modif CSS                                     | css-tailwind.md      | @keyframes dans @theme                                              |
| Import J&T produit trop de lignes                                            | excel-sheetjs.md     | Feuilles fantômes / formules cached                                 |
| `cannot UPDATE a GENERATED column`                                           | supabase-postgres.md | Colonnes GENERATED immutables                                       |
| Fichier .xlsm rejeté par le navigateur                                       | browser-env.md       | MIME type case-insensitive                                          |
| Tableur Univer duplique les DOM elements                                     | univer.md            | DOM résiduel React 19 Strict Mode                                   |
| `document is not defined` avec Univer                                        | univer.md            | SSR interdit — dynamic import                                       |
| SW ready hang forever                                                        | pwa-offline.md       | navigator.serviceWorker.ready sans SW                               |
| Encoding cp1252 / caractères cassés                                          | browser-env.md       | UTF-8 obligatoire Windows                                           |
| Feature absente malgré fichiers créés, page stale                            | nextjs-react.md      | Feature incomplète : nouveaux fichiers sans adaptation composant    |
| Compteur toujours 0 malgré données en base                                   | supabase-postgres.md | Client anonyme dans Server Component → RLS bloque les lignes        |
| Compteur sessions 0 après sync                                               | supabase-postgres.md | Filtre de statut trop restrictif sur le compteur de sessions        |
| Pages terrain non cachées par SW, offline échoue                             | pwa-offline.md       | Regex SW matcher testé contre l'URL complète                        |
| Redirect /login en mode offline sur /terrain                                 | pwa-offline.md       | Middleware auth bloque les pages terrain hors-ligne                 |
| `<button> cannot contain a nested <button>`                                  | nextjs-react.md      | `<button>` imbriqué dans `<button>` → hydration error               |
| `column "archived_at" is of type timestamp ... is of type uuid`              | supabase-postgres.md | RPC `INSERT INTO archive SELECT t.*` → décalage de colonnes         |
| `Jest worker encountered N child process exceptions, exceeding retry limit`  | nextjs-react.md      | Webpack workers crash, cache `.next/` corrompu après revert massif  |
| RPC `delete_project_cascade` ou `reimport_archive_*` exécutable cross-tenant | supabase-postgres.md | RPC `SECURITY DEFINER` exécutable cross-tenant sans check ownership |
| Routes terrain (service-role) lisent/mutent données d'un autre user          | supabase-postgres.md | Service-role bypass RLS sans check ownership manuel → IDOR          |
| Tout user authentifié peut UPDATE `import_templates` / `column_synonyms`     | supabase-postgres.md | RLS policy `USING(true)` ou `WITH CHECK(true)` sur table partagée   |
| `Invalid project directory provided, no such directory: …\lint`              | nextjs-react.md      | `next lint` retiré dans Next 16 → CI rouge silencieux               |
| Build Next 16 warning sur `src/middleware.ts`                                | nextjs-react.md      | `middleware` deprecated → `proxy` (Next 16)                         |
| Règles ESLint Next/react-hooks ne s'appliquent pas malgré `.eslintrc.json`   | nextjs-react.md      | Coexistence `.eslintrc.json` + `eslint.config.js` (mort code)       |
| Upload PDF/fichier sans limite taille / path traversal `file.name`           | nextjs-react.md      | API upload sans validation taille/MIME + path traversal `file.name` |
| Effacement cellule EMIS perd la valeur BUTA de fallback                      | nextjs-react.md      | `??` ne traite pas la chaîne vide comme nullish → fallback perdu    |
| `npm audit` HIGH sur `xlsx`, pas de fix dispo                                | excel-sheetjs.md     | `xlsx` (SheetJS) 0.18.5 plus maintenu sur npm                       |
| Delta DN/PN raté quand BUTA est en format `"100,5"`                          | excel-sheetjs.md     | Format décimal français `"100,5"` parsé en NaN par Number()         |
