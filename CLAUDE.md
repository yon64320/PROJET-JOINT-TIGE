# Projet SaaS — Préparation d'arrêts de maintenance industrielle

## Contexte

**EMIS** (Entretien Maintenance Industrielle et Service), filiale du **Groupe Ponticelli Frères**, siège à Vitrolles (13). Seule entreprise française entièrement dédiée aux **arrêts de maintenance industrielle**. ~200 permanents, ~35M€ CA. Intervient comme sous-traitant sur sites industriels (raffineries, pétrochimie).

Un **arrêt d'unité** (turnaround) = arrêt planifié d'une unité de production pour travaux impossibles en marche. Fréquence : 3-6 ans. Chaque jour d'arrêt coûte des millions → la préparation en amont est critique.

L'utilisateur est **préparateur d'arrêt** : il prépare les dossiers d'exécution (gammes, boulonnerie, levage) pour chaque équipement. **Projet personnel** non validé par la hiérarchie.

## Le projet

**Le problème** : chaque arrêt = galaxie de fichiers Excel interdépendants (LUT, J&T, gammes, fiches rob, APPRO…). Une mise à jour oblige à modifier plusieurs fichiers manuellement → doublons, erreurs, versions incohérentes.

**La solution** : application web avec LUT + J&T comme **source unique de données**. Documents dérivés générés automatiquement. Remplacer Excel à 95%.

| Aspect               | Spécification                                               |
| -------------------- | ----------------------------------------------------------- |
| **Utilisateurs**     | Préparateurs d'arrêt, 10-15 simultanés max                  |
| **Import**           | Fichiers .xlsm existants (LUT, J&T) comme point d'entrée    |
| **Premier livrable** | Fiches robinetterie PDF (modèle dans `data/`)               |
| **Mode hors ligne**  | Nécessaire pour saisie sur site (zones ATEX, pas de réseau) |
| **Phase actuelle**   | **Voir section "Roadmap" ci-dessous**                       |

## Fichiers centraux — concepts clés

Documentation détaillée : [`docs/metier/LUT.md`](docs/metier/LUT.md) et [`docs/metier/J&T.md`](docs/metier/J%26T.md)

- **LUT** : 1 ligne = 1 OT (ordre de travail). Clé primaire : **ITEM**
- **J&T** : 1 ligne = 1 bride touchée sur un OT. Liée à la LUT par **ITEM**
- **Triplet** : EMIS (terrain) / BUTA (client) / RETENU (`COALESCE(emis, buta)`) — le terrain prime toujours
- **DELTA** : alerte quand relevé terrain ≠ données client (DN, PN)
- **OPERATION** : colonne moteur → détermine nb joints, brides, provisoires/définitifs

```
LUT (tous les OTs)
 ├── J&T (brides touchées par OT)
 ├── Gammes (séquencement phase par phase)
 ├── Liste de levage (opérations de grue)
 ├── Fiches robinetterie (premier livrable PDF)
 └── Planning (ordonnancement)
```

## Import adaptatif — décision validée

L'app s'adapte au préparateur, pas l'inverse. Upload → auto-détection en-têtes → fuzzy match via synonymes (`src/lib/excel/synonyms.ts`) → preview mapping → correction utilisateur → import.

Principes : **zéro perte de données** (colonnes inconnues → `extra_columns` JSONB), **fuzzy matching** 3 passes, **templates réutilisables** (premier import ~1-2 min, suivants instantanés).

## Roadmap — mise à jour avril 2026

| Feature                        | Statut    | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Import adaptatif (LUT + J&T)   | Done      | Auto-detect, fuzzy match, templates réutilisables, extra_columns JSONB                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Tableur LUT (Univer)           | Done      | Édition inline, sauvegarde, extra columns en fin de grille                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Tableur J&T (Univer)           | Done      | 7 vues (4 tableur + 3 dérivées), auto-save, couleurs par vue/equipement, 55 colonnes (extension BUTA/EMIS sur dimension_tige, face_bride, rondelle, nb_joints_prov/def)                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Tableur Robinetterie           | Done      | Filtre `num_rob` non vide. Appariement implicite : 2 brides du même OT partageant le même N° ROB = 1 vanne ADM/REF                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Fiches robinetterie PDF        | Done      | Template builder, preview, download batch, React-PDF                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Migrations DB (squash)         | Done      | 001_schema.sql + 002_security_fixes.sql + 003_phase_b_photos.sql + 004_admin.sql + 005_plans_storage_bucket.sql + 006_back_audit_fixes.sql + seed.sql. 14 tables, 6 RPC (`merge_extra_column`, `delete_project_cascade`, `reimport_archive_lut`, `reimport_archive_jt`, `preview_reattach_photos`, `reattach_orphan_photos`) avec checks `auth.uid()` internes, RLS stricte par owner, FK `ON DELETE CASCADE/SET NULL` explicites, TEXT brut pour données Excel. Pipeline Supabase CLI (`db push`).                                                                                                         |
| Session terrain hors-ligne     | Done      | PWA mobile-first, wizard saisie, IndexedDB, sync auto, bolt_specs, sélection champs, filtres OT                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Photos terrain (Phase B)       | Done      | Bucket Storage privé `photos`, table `flange_photos` (FK SET NULL + clé naturelle), compression WebP client, IndexedDB v4 (`pendingPhotos`), 3 steps wizard, re-rattachement orphelines au ré-import J&T                                                                                                                                                                                                                                                                                                                                                                                                    |
| Plans d'équipement             | Done      | Bucket Storage privé `plans` (50 Mo, MIME PDF strict), upload par dossier (webkitdirectory) avec matching auto ITEM ↔ sous-dossier, fallback "projet général" (`ot_item_id IS NULL`), écrasement déterministe, viewer hors-ligne (pdfjs-dist) avec sélecteur multi-plan                                                                                                                                                                                                                                                                                                                                     |
| Gammes → LUT (web + script)    | Done      | Page `/projets/[id]/import-gammes` (wizard 3 étapes : upload → mapping/sélection EMIS → confirmation). **Deux modes** déterminés serveur : `build` (projet vide → import DB + téléchargement .xlsx) / `export` (LUT existante → téléchargement .xlsx **uniquement**, DB non touchée). La LUT existante est préservée pour ne pas écraser les champs saisis manuellement (FAMILLE, TYPE, REV, statut). Modules partagés `src/lib/import/gammes/` réutilisés par le script CLI `scripts/gammes-to-lut.ts`. Items NC = `type_travaux = "NC"`. Doc : `.claude/skills/import-excel/references/gammes-mapping.md` |
| Gammes (séquencement)          | A faire   | Tableur d'édition des phases, dépend du script Gammes→LUT                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Planning (ordonnancement)      | A faire   | Dépend des gammes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Liste de levage                | A faire   |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Mode super-user (admin)        | Done      | Table `profiles(is_admin)` + helper `is_admin()` + policies enrichies + bandeau UI. Promotion hors-app via SQL service-role uniquement. Doc : `docs/admin-mode.md`                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Audit back-end + durcissements | Done      | Skill `back-audit` (9 sections / 3 niveaux de criticité). Score baseline 9.0. Migration `006_back_audit_fixes.sql` : FK ON DELETE CASCADE/SET NULL explicites + bucket photos `allowed_mime_types`. Helper `serverError` centralisé (`src/lib/api/errors.ts`). Pagination `.range()` sur `flanges` et `ot-items`.                                                                                                                                                                                                                                                                                           |
| Collab multi-utilisateur       | Plus tard | Vraie gestion de rôles (project_members + invitations) — pas nécessaire V1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

## Écosystème .claude/ — évolution continue

Les fichiers `.claude/` sont **vivants** : ils évoluent avec le projet. Habitudes à maintenir :

### Skills (`skills/`)

Les skills capturent les patterns du projet. **Les mettre à jour proactivement** quand une tâche révèle un nouveau pattern, piège, ou convention.

| Skill                              | Domaine                                               |
| ---------------------------------- | ----------------------------------------------------- |
| `import-excel`                     | Parsing Excel, mapping colonnes, synonymes, templates |
| `domain-maintenance`               | Logique métier, vocabulaire, règles de calcul         |
| `generate-pdf`                     | Templates PDF, mise en page, données affichées        |
| `univer-patterns`                  | Intégration Univer, workbookData, events, validation  |
| `supabase-postgres-best-practices` | Optimisation requêtes, schéma, performance DB         |
| `terrain-offline`                  | PWA, Dexie, Service Worker, sync, wizard terrain      |
| `back-audit`                       | Audit back-end (sécurité, RLS, validation, schéma)    |
| `perf-audit`                       | Audit performance full-stack (RSC, DB, Univer, PWA)   |
| `zod-v4`                           | Patterns Zod v4 (tiers, anivar/zod-skill, MIT)        |
| `react-best-practices`             | Perf React/Next.js (tiers, Vercel, MIT)               |

### Errors (`errors/`)

Référentiel d'erreurs classées par domaine. Enrichi via le skill `catalog-error` après chaque bug fix. Index dans `.claude/errors/INDEX.md`.

### Rules (`rules/`)

Chaque rule a un `globs` pour ne charger que quand c'est pertinent. **Créer une nouvelle rule** quand un pattern se répète 3+ fois dans le code.

### Memory

Réservée aux **décisions** et **préférences utilisateur** — pas aux faits dérivables du code ou des fichiers Excel.

### Quand mettre à jour quoi

| Événement                                          | Action                                                                                                             |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Feature majeure terminée                           | Mettre à jour la Roadmap ci-dessus                                                                                 |
| **Bug fixé**                                       | **Documenter le piège dans la rule ou le skill concerné** (pas un nouveau fichier — enrichir l'existant)           |
| Nouveau pattern découvert                          | Enrichir le skill concerné                                                                                         |
| Convention répétée 3+ fois                         | Créer une rule dans `.claude/rules/`                                                                               |
| Décision architecturale importante                 | Sauver en mémoire (type `project`)                                                                                 |
| Correction de comportement Claude                  | Sauver en mémoire (type `feedback`)                                                                                |
| Refactor / cascade / migration / pivot stratégique | Voir [`.claude/rules/process.md`](.claude/rules/process.md) — énoncer le modèle mental dans le chat avant d'éditer |
| Audit mensuel                                      | Vérifier cohérence rules/skills/mémoire vs code réel                                                               |

**Règle d'or pour les pièges** : se demander "c'est un problème de quoi ?" (Univer ? Tailwind ? Import ? DB ?) et l'ajouter dans le skill ou la rule correspondante. Ne jamais créer un fichier par section de l'appli — les problèmes sont liés à une techno ou un concept, pas à une page.
