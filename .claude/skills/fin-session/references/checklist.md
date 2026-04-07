# Matrice : quels changements impactent quels .md

## Par pattern de fichier modifie

| Glob du diff                                                         | .md a verifier                                                      |
| -------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `supabase/migrations/*`                                              | CLAUDE.md (roadmap, ligne migrations), `.claude/rules/db-schema.md` |
| `src/app/api/**/*.ts`                                                | `.claude/rules/api-conventions.md`                                  |
| `src/lib/excel/*`                                                    | `.claude/skills/import-excel/SKILL.md`                              |
| `src/lib/pdf/*`, `src/components/fiche-rob/*`                        | `.claude/skills/generate-pdf/SKILL.md`                              |
| `src/components/spreadsheet/*`                                       | `.claude/skills/univer-patterns/SKILL.md`                           |
| `src/components/terrain/*`, `src/lib/offline/*`, `src/app/terrain/*` | `.claude/skills/terrain-offline/SKILL.md`                           |
| `src/lib/domain/*`                                                   | `.claude/skills/domain-maintenance/SKILL.md`                        |
| `src/app/**/page.tsx`, `src/app/**/layout.tsx`                       | `.claude/rules/page-layout.md`                                      |
| `*.css`, `tailwind.config.*`                                         | `.claude/rules/tailwind-css.md`                                     |
| Tout fichier significatif                                            | CLAUDE.md (roadmap si feature ajoutee/terminee)                     |

## Par nature du changement

| Type de changement           | Action sur .md                                          |
| ---------------------------- | ------------------------------------------------------- |
| Feature majeure terminee     | CLAUDE.md roadmap : passer le statut a "Done"           |
| Nouvelle table/RPC en base   | `db-schema.md` : ajouter table, contraintes, RPC        |
| Nouveau pattern API          | `api-conventions.md` : documenter le pattern            |
| Bug fixe (piege non-evident) | Enrichir le skill ou la rule du domaine concerne        |
| Decision architecturale      | Creer/mettre a jour un fichier memory (type `project`)  |
| Correction de comportement   | Creer/mettre a jour un fichier memory (type `feedback`) |
| Nouveau domaine technique    | Envisager la creation d'un skill (si rien n'existe)     |

## Fichiers memoire — index

Toujours verifier `MEMORY.md` pour coherence de l'index apres
ajout/modification/suppression d'un fichier memoire.

Emplacement : `~/.claude/projects/C--Users-Yon-Desktop-CLAUDE-CODE-JOINT-TIGE/memory/`
