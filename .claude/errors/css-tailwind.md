# Erreurs — CSS / Tailwind v4

## @keyframes dans @theme → page blanche

- **Symptôme** : Page blanche silencieuse. Aucune erreur console. L'app ne se charge plus du tout
- **Cause racine** : Tailwind v4 ne supporte pas les `@keyframes` imbriqués dans le bloc `@theme`. Le parsing CSS complet échoue silencieusement
- **Fix** : Déplacer les `@keyframes` à la racine du fichier CSS, hors du bloc `@theme`
- **Prévention** : Règle `.claude/rules/tailwind-css.md` avec exemple FAUX/CORRECT
- **Règle promue** : Oui — `.claude/rules/tailwind-css.md`
- **Date** : 2026-02
