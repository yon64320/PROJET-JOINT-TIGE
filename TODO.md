# TODO — Projet EMIS

## En cours

- [ ] Créer un skill `roadmap-update` — permet de mettre à jour le plan général (roadmap CLAUDE.md) quand on veut ajouter de nouvelles idées ou fonctionnalités. Le skill doit lire la roadmap actuelle, proposer où insérer la nouvelle entrée, et mettre à jour le tableau automatiquement.

## Prochaines étapes

- [ ] Mode hors ligne — Service Worker + sync (priorité haute, nécessaire terrain ATEX)
- [ ] Gammes — nouveau tableur, règles métier séquencement phase par phase
- [ ] Planning / ordonnancement — dépend des gammes
- [ ] Liste de levage — opérations de grue

## Plus tard

- [ ] Gestion de rôles (pas nécessaire V1)

## Fait

- [x] Import adaptatif (LUT + J&T) — auto-detect, fuzzy match, templates réutilisables
- [x] Tableur LUT (Univer) — édition inline, sauvegarde, extra columns
- [x] Tableur J&T (Univer) — colonnes GENERATED (RETENU/DELTA)
- [x] Tableur Robinetterie — filtre rob=true, vue dédiée
- [x] Fiches robinetterie PDF — template builder, preview, download batch
- [x] Migrations DB (001-004) — schema, RPC, template, responsable+rob
- [x] Sécurité — token Supabase retiré de .mcp.json → .env.local
