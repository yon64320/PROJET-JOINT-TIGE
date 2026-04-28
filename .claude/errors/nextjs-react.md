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
