# Erreurs — CSS / Tailwind v4

## @keyframes dans @theme → page blanche

- **Symptôme** : Page blanche silencieuse. Aucune erreur console. L'app ne se charge plus du tout
- **Cause racine** : Tailwind v4 ne supporte pas les `@keyframes` imbriqués dans le bloc `@theme`. Le parsing CSS complet échoue silencieusement
- **Fix** : Déplacer les `@keyframes` à la racine du fichier CSS, hors du bloc `@theme`
- **Prévention** : Règle `.claude/rules/tailwind-css.md` avec exemple FAUX/CORRECT
- **Règle promue** : Oui — `.claude/rules/tailwind-css.md`
- **Date** : 2026-02-01

## Tableur Univer écran blanc — `flex-1` sans flex parent (Fragment React)

- **Symptôme** : Le tableur Robinetterie affiche la toolbar Univer, la barre de formule (avec la cellule A1 contenant "POSTE TECHNIQUE"), l'onglet "Robinetterie" en bas, **mais la grille de cellules est complètement vide visuellement** — pas d'en-tête, pas de lignes. Aucune erreur console. La vue Terrain dans le même parent fonctionne normalement
- **Cause racine** : `RobinerieView` retournait un **Fragment** avec deux divs siblings (toggle bar + `<div className="flex-1 min-h-0">` contenant `<RobSheet>`). Son parent dans `JtPageClient` (`<div className="flex-1 min-h-0">`) **n'est pas un flex container** — juste un block avec `flex-1`. Du coup le `flex-1` sur le div interne n'a aucun effet → hauteur = 0 → Univer rend dans un canvas de 0px (les données sont là, mais invisibles). Pourquoi JtSheet marche dans le même parent : il définit `style={{ height: "100%" }}` inline qui résout via la hauteur héritée, contournant la dépendance flex
- **Fix** : Wrapper interne dans `RobinerieView` — remplacer le `<>...</>` par `<div className="flex flex-col w-full h-full">...</div>`. Le composant devient auto-suffisant en flex column, son enfant `flex-1` opère correctement
- **Prévention** : Tout composant qui retourne un Fragment avec un enfant `flex-1` doit garantir que **son parent est un flex container** — sinon le `flex-1` est mort code et le child a hauteur 0. Préférer wrapper la racine du composant dans un `<div className="flex flex-col h-full">` pour rendre l'auto-suffisant en sizing, plutôt que de dépendre du contexte parent. Vaut particulièrement pour les composants qui hébergent un canvas (Univer, Monaco, charts) où une hauteur 0 = invisible silencieux
- **Date** : 2026-05-10
