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
