# Audit back-end EMIS — 2026-05-04 (premier passage, mode `--full`)

> Premier audit complet via le skill `back-audit` (9 sections / 3 niveaux de criticité).
> Branche `main`, commit `b1691d5` au moment du scan.
> **Score global pondéré : 9.0 / 10**

---

## Scorecard par section

| #   | Section                  | Niveau   | Score   |
| --- | ------------------------ | -------- | ------- |
| 1   | Auth & Authorization     | CRITIQUE | 8.8/10  |
| 2   | Validation entrées       | CRITIQUE | 10.0/10 |
| 3   | RLS & Postgres           | CRITIQUE | 10.0/10 |
| 4   | Atomicité & transactions | CRITIQUE | 10.0/10 |
| 5   | Architecture couches     | MEDIUM   | 9.0/10  |
| 6   | Performance & requêtes   | MEDIUM   | 7.5/10  |
| 7   | Schéma & migrations      | MEDIUM   | 8.6/10  |
| 8   | Storage & fichiers       | MEDIUM   | 7.5/10  |
| 9   | Erreurs & observabilité  | MINOR    | 6.5/10  |

## Forces relevées

- Auth check systématique sur 15+ routes mutantes ; helper `checkIsAdmin()` propre.
- Zod `safeParse` + `strictObject` partout, schémas centralisés `src/lib/validation/schemas.ts`.
- RLS activée sur les **16 tables** `public`, GRANTs systématiques aux 3 rôles, indexes RLS complets.
- 8 RPC `SECURITY DEFINER` toutes avec check ownership (`002_security_fixes.sql` + `004_admin.sql`).
- Helpers internes (`_archive_flanges`, `_archive_ot_items`) ont `EXECUTE` révoqué de `anon` / `authenticated`.
- Cascade projet via RPC atomique `delete_project_cascade` (incluant `flange_photos`).
- Storage rollback explicite côté API : `terrain/photos/route.ts:103`, `terrain/plans/route.ts:113`.
- Pas de service-role côté client (45 fichiers `"use client"` scannés, 0 leak).

## Faiblesses prioritaires (top 5 à corriger)

1. **MEDIUM** — ~20 routes leakent `error.message` brut Postgres dans les 500 (info disclosure).
2. **MEDIUM** — ~9 FK sans `ON DELETE` explicite dans `001_schema.sql` (`project_id`, `ot_item_id`, `owner_id`).
3. **MEDIUM** — bucket `photos` sans `allowed_mime_types` côté Storage (defense en profondeur).
4. **MEDIUM** — `.limit(5000)` au lieu de pagination dans `/api/flanges` et `/api/ot-items` (Supabase tronque silencieusement à 1000).
5. **MINOR** — `console.error()` manquant avant la majorité des 500 (debug prod difficile).

## Note process

Régression détectée dans `003_phase_b_photos.sql:132-144` : `delete_project_cascade` redéfinie sans le check ownership, **corrigée par `004_admin.sql:197-219`**. Risque récurrent : toute migration future qui touche cette RPC doit reproduire le check. À surveiller.

---

## Corrections appliquées (commit `e618fa9`, 2026-05-04)

Migration **`006_back_audit_fixes.sql`** :

- 9 FK durcies avec `ON DELETE CASCADE` explicite (et `SET NULL` ciblé : `equipment_plans.ot_item_id` pour le pattern "projet général", `flange_photos.flange_id` pour le re-rattachement post-ré-import, `projects.owner_id` pour la préservation des projets si user supprimé).
- Bucket `photos` reçoit `allowed_mime_types = ARRAY['image/webp']`.

Code applicatif :

- Helper **`serverError(ctx, error)`** centralisé dans `src/lib/api/errors.ts` (log côté serveur + réponse 500 générique). Déployé sur 14 routes — plus de leak `error.message`.
- Pagination `.range()` ajoutée sur `/api/flanges` et `/api/ot-items` (boucle PAGE_SIZE=1000 + `.order()` stable).

## Items hors scope du fix

- `console.error()` systématique avant 500 → couvert par `serverError` (le helper log déjà). Considéré résolu.
- Section 9 (observabilité) reste à 6.5/10 : pas de monitoring/alerting externe (Sentry, Logtail). Décision projet, pas de fix prévu V1.

## Comparaison vs audits précédents

Pas de baseline comparable. Les audits 2026-04-29 (`docs/audits/findings/synthese-2026-04-29.md`) couvraient des angles différents (RLS, correctness domain, CI, deps) et avaient été corrigés par les migrations `002_security_fixes.sql` + commits associés (cf. `docs/pivot.md` 2026-04-29).

## Source mémoire Claude

Synthèse vivante : `memory/project_back_audit.md` (référence pour les audits futurs).
