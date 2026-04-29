# TODO — Projet EMIS

## En cours

- [ ] Créer un skill `roadmap-update` — permet de mettre à jour le plan général (roadmap CLAUDE.md) quand on veut ajouter de nouvelles idées ou fonctionnalités. Le skill doit lire la roadmap actuelle, proposer où insérer la nouvelle entrée, et mettre à jour le tableau automatiquement.

## Dette sécurité (audit 2026-04-29)

- [ ] **xlsx 0.18.5** — vulns HIGH (prototype pollution + ReDoS) sans fix npm. Voie A retenue (statu quo + validation strict MIME/taille déjà en place dans `import/confirm`). À basculer voie B (CDN SheetJS `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`) avant la première démo externe / passage multi-user.
- [ ] **Bump Univer 0.19 → 0.21.1** — résout 12+ vulns transitives. Risque pré-1.0 → tester LUT, J&T (7 vues), Robinetterie en local après bump.
- [ ] **eslint-config-next en flat config** — ajouter `eslint-config-next/core-web-vitals` à `eslint.config.js` pour récupérer les checks Next/react-hooks/jsx-a11y. Va générer un déluge de warnings à fixer en parallèle.
- [ ] **Bascule routes terrain sur `createServerSupabase`** — préférer cookies + RLS au pattern `Bearer + service-role + check manuel` (fragile, oubli = breach). Garder service-role uniquement pour seed/jobs admin.
- [ ] **Suite tests d'isolation cross-user** — Vitest avec 2 users Supabase Auth seedés, parcours "Alice → données de Bob". ~10 tests pour HIGH-01 à HIGH-06.
- [ ] **HIGH-11 — Compléter feuille Operations Excel** : 6 opérations utilisées dans le J&T mais absentes (`DEPOSE BOUCHON`, `DEPOSE REPOSE BUSE`, `OUVERTURE + POSER COBRA`, `POSE/DEPOSE JP AVEC BRIDE ENTRE`, `POSER BOUCHON NPT`, `DECONNEXION/RECONNEXION + JL`). Soft warning à l'import affiche désormais ces opérations hors enum (`unknownOperations` dans la response). Quand les vraies quantités sont connues, ajouter dans `OPERATIONS_TABLE` (`src/lib/domain/operations.ts`).

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
- [x] Tableur Robinetterie — filtre `num_rob` non vide, appariement implicite par `(ot_item_id, num_rob)`
- [x] Fiches robinetterie PDF — template builder, preview, download batch
- [x] Migrations DB squashées — `001_schema.sql` + `002_security_fixes.sql` + `seed.sql`, pipeline Supabase CLI
- [x] Sécurité — token Supabase retiré de .mcp.json → .env.local
