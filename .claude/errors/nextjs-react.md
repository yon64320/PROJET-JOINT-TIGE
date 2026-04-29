# Erreurs — Next.js / React 19

## Hydration mismatch avec rendu conditionnel SSR

- **Symptôme** : Warning React `Text content did not match` ou `Hydration failed because the server rendered HTML didn't match the client`
- **Cause racine** : Un composant rend du contenu différent côté serveur et côté client (ex: `typeof window !== 'undefined'` dans le JSX, ou `Date.now()`)
- **Fix** : Déplacer la logique conditionnelle dans un `useEffect`, ou utiliser `dynamic(..., { ssr: false })` pour les composants qui dépendent du navigateur
- **Prévention** : Ne jamais conditionner le rendu JSX sur `window` ou `navigator` directement
- **Date** : 2026-02

## CSS imports dans layout.tsx (SSR)

- **Symptôme** : Erreur de build ou styles manquants pour les composants Univer
- **Cause racine** : Les CSS d'Univer importés dans un layout SSR cassent le build car ils référencent des API navigateur
- **Fix** : Importer les CSS dans le composant client (`UniverSheet.tsx`), pas dans le layout
- **Prévention** : Skill univer-patterns — "CSS imports dans le composant client"
- **Date** : 2026-02

## Feature incomplète : nouveaux fichiers sans adaptation du composant existant → page silencieusement stale

- **Symptôme** : L'utilisateur ne voit pas la nouvelle feature (ex: onglets de vues J&T) alors que les fichiers existent. Aucun message d'erreur visible dans le navigateur. Le site affiche l'ancienne version de la page.
- **Cause racine** : 3 nouveaux fichiers créés (`JtPageClient.tsx`, `JtViewToggle.tsx`, `jt-views.ts`) mais le composant consommateur (`JtSheet.tsx`) n'a pas été adapté pour accepter les nouvelles props (`viewMode`, `visibleColumns`). TypeScript refuse de compiler la page → Next.js en dev sert la dernière version compilée valide → l'utilisateur voit l'ancienne page sans les onglets.
- **Fix** : Adapter le composant existant (`JtSheet.tsx`) pour accepter et utiliser les nouvelles props. Toujours modifier les consommateurs en même temps que les producteurs.
- **Prévention** : Quand on crée de nouveaux fichiers qui passent des props à un composant existant, **toujours adapter le composant existant dans la même session**. Lancer `npx tsc --noEmit` après chaque groupe de fichiers liés pour détecter les incompatibilités immédiatement. Ne jamais considérer une feature "livrée" si le type-check échoue.
- **Date** : 2026-04-16

## `<button>` imbriqué dans `<button>` → hydration error

- **Symptôme** : Console React `<button> cannot contain a nested <button>. This will cause a hydration error.` Typiquement sur une carte cliquable (ex: `BrideCard`) qui contient un bouton d'action secondaire (reset, delete, édit).
- **Cause racine** : HTML interdit d'imbriquer des éléments interactifs (button, a, input). React 19 remonte la violation en hydration error. `e.stopPropagation()` sur le bouton interne masque le bug fonctionnellement mais ne résout pas la structure DOM.
- **Fix** : Sortir le bouton interne du parent cliquable. Pattern : wrapper `<div className="relative">`, carte `<button>` ne contenant que du texte/icônes, bouton d'action en **sibling** positionné en `absolute` par-dessus la carte.
- **Prévention** : Ne jamais imbriquer 2 éléments interactifs. Si l'UX demande une carte cliquable avec une action secondaire, utiliser des siblings positionnés (absolute) plutôt qu'un parent-enfant.
- **Date** : 2026-04-21

## Webpack "Jest worker encountered N child process exceptions, exceeding retry limit"

- **Symptôme** : Runtime Error en page Next.js dev : `Jest worker encountered 2 child process exceptions, exceeding retry limit`. La page ne charge plus, le serveur dev tourne toujours mais Webpack abandonne la compilation
- **Cause racine** : Webpack utilise des workers (process Node enfants via `jest-worker`) pour transformer les fichiers en parallèle. Un worker plante 2 fois de suite sur le même fichier → Webpack abandonne. Causes typiques par ordre de probabilité ici : (1) **cache `.next/` corrompu** après un `git checkout` massif ou un revert (notre cas — revert de la traduction EN→FR a laissé des entrées de cache pointant vers du code disparu), (2) **OOM** sur un worker pendant la compilation d'une page lourde (ex: J&T + Univer), (3) erreur de syntaxe non récupérable
- **Fix** : Stop dev server, `trash .next`, `npm run dev`. Cache propre = compilation propre
- **Prévention** : Après un `git checkout`/`git stash pop`/revert massif, vider `.next/` proactivement avant de relancer. Si l'erreur revient régulièrement sur la même page lourde sans changement git, c'est plutôt OOM → envisager `next dev --turbopack` (moins gourmand) ou augmenter la RAM dispo
- **Date** : 2026-04-28

## `next lint` retiré dans Next 16 → CI rouge silencieux

- **Symptôme** : `npm run lint` renvoie `Invalid project directory provided, no such directory: …\lint`. Le workflow GitHub Actions échoue à chaque push depuis l'upgrade Next 16, mais l'erreur ressemble à un problème de chemin
- **Cause racine** : `next lint` était déprécié depuis Next 15 et a été **retiré** dans Next 16. La CLI Next interprète maintenant `lint` comme un argument positionnel (= directory) → erreur de chemin trompeuse. Les scripts `package.json` historiques `"lint": "next lint"` cassent silencieusement
- **Fix** : Remplacer par un appel direct à ESLint avec la flat config : `"lint": "eslint \"src/**/*.{ts,tsx,js,jsx}\""`. Vérifier que `eslint.config.js` charge bien `eslint-config-next` en mode flat (sinon les checks `next/core-web-vitals`, react-hooks, a11y sont perdus)
- **Prévention** : À chaque upgrade Next majeur, lire les release notes "Removed APIs" et tester `npm run lint` + `npm run build` localement avant de merger l'upgrade
- **Date** : 2026-04-29

## `middleware` deprecated → `proxy` (Next 16)

- **Symptôme** : Warning au build Next 16 sur `src/middleware.ts`. Le code fonctionne encore mais l'avertissement annonce une suppression future
- **Cause racine** : Next 16 a renommé la convention `middleware` → `proxy` ([doc](https://nextjs.org/docs/messages/middleware-to-proxy)). L'ancien fichier est encore supporté mais émet un warning
- **Fix** : `git mv src/middleware.ts src/proxy.ts` puis adapter les imports si d'autres fichiers font référence au nom `middleware`. Pas de changement d'API
- **Prévention** : À chaque release notes Next majeur, faire la chasse aux deprecated avant qu'ils deviennent breaking
- **Date** : 2026-04-29

## Coexistence `.eslintrc.json` + `eslint.config.js` (mort code trompeur)

- **Symptôme** : Les règles ESLint attendues ne s'appliquent pas (`next/core-web-vitals`, `react-hooks`, etc.). Aucune erreur au lancement, juste l'absence de checks. Le `.eslintrc.json` à la racine semble pourtant correct
- **Cause racine** : ESLint 9 en mode flat config (`eslint.config.js`) **ignore** les `.eslintrc.*` legacy par défaut, sauf si `ESLINT_USE_FLAT_CONFIG=false`. Le fichier legacy devient mort code mais induit en erreur le mainteneur qui croit que ses règles s'appliquent
- **Fix** : Supprimer `.eslintrc.json`. Étendre `eslint.config.js` avec `eslint-config-next` en flat-compat (Next 16+ fournit la version flat-compatible)
- **Prévention** : Lors d'une migration ESLint 8 → 9, supprimer immédiatement le fichier legacy. Une seule source de config, jamais deux
- **Date** : 2026-04-29

## API upload sans validation taille/MIME + path traversal `file.name`

- **Symptôme** : Route `POST /api/.../plans` (ou tout endpoint upload) accepte n'importe quel fichier de n'importe quelle taille. Le `storagePath` reflète `file.name` brut → `../../autre-dossier/foo.pdf` crée des hiérarchies parasites dans le bucket Storage
- **Cause racine** : Pattern naïf `storagePath = ${prefix}/${Date.now()}_${file.name}`. `file.name` provient du client → non sanitizé. Pas de check `file.size` (DoS) ni `file.type` (upload exécutable déguisé). `Date.now()` n'est pas une garantie d'unicité sous concurrence
- **Fix** : Toujours dans cet ordre : (1) `if (file.size > MAX) return 413` (2) `if (file.type !== "application/pdf") return 400` (3) check ownership de `projectId`/`otItemId` (4) `safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100)` avant interpolation dans le path
- **Prévention** : Règle `api-conventions.md` "Validation upload fichier" — toute route upload doit valider taille + MIME + sanitize file name. Modèle de référence : `/api/import/confirm` (déjà conforme). Audit régulier : grep `formData.get("file")` et vérifier les 4 checks
- **Date** : 2026-04-29

## `??` ne traite pas la chaîne vide comme nullish → fallback perdu

- **Symptôme** : `computeRetenu("", "BUTA")` retourne `""` au lieu de `"BUTA"`. Quand l'utilisateur efface une cellule EMIS dans le tableur, il **perd la valeur BUTA de fallback**, alors que le pattern RETENU est censé être COALESCE
- **Cause racine** : L'opérateur TypeScript `??` (nullish coalescing) ne traite que `null` et `undefined` comme nullish. La chaîne vide `""` et les whitespaces (`"   "`) sont considérés comme des **valeurs**. Si le tableur Univer envoie `""` au lieu de `null` à l'effacement (cas non garanti par contrat), l'écrasement BUTA n'a plus lieu. Cohérent avec le `COALESCE` SQL côté DB (idem) → bug en miroir des deux côtés
- **Fix** : Pour les fonctions de fallback type RETENU, utiliser `emis?.trim() || buta` plutôt que `emis ?? buta`. L'opérateur `||` traite `""` comme falsy. Trade-off : `"0"` et `"false"` deviennent aussi falsy — acceptable pour des champs texte, à vérifier au cas par cas
- **Prévention** : Pour toute "valeur de fallback côté UI éditable", se demander quel signal l'éditeur envoie en cas d'effacement (`null` vs `""`). Tester explicitement les cas `""`, `"   "`, `null`, `undefined` dans les unit tests
- **Date** : 2026-04-29
