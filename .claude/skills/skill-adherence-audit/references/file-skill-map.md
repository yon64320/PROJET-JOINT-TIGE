# Table de correspondance fichiers → skills/rules

Utilisee en Phase 1 pour mapper les fichiers modifies vers les skills et rules pertinents.
Mettre a jour cette table quand un nouveau skill ou une nouvelle rule est ajoutee au projet.

## Skills

| Glob pattern                                                            | Skill              |
| ----------------------------------------------------------------------- | ------------------ |
| `src/app/terrain/**`, `src/components/terrain/**`, `src/lib/offline/**` | terrain-offline    |
| `src/lib/excel/**`, `src/app/api/import/**`, `src/lib/db/import-*.ts`   | import-excel       |
| `src/components/fiche-rob/**`, `src/lib/pdf/**`, `src/app/api/pdf/**`   | generate-pdf       |
| `src/components/spreadsheet/**`, `*Sheet.tsx`                           | univer-patterns    |
| `**/domain/**`, `**/validation/**`                                      | domain-maintenance |

## Rules

| Glob pattern                                                            | Rule            |
| ----------------------------------------------------------------------- | --------------- |
| `supabase/migrations/**`                                                | db-schema       |
| `src/app/api/**`                                                        | api-conventions |
| `src/app/*/page.tsx`, `src/components/*Layout*`, `src/app/*/layout.tsx` | page-layout     |
| `src/app/globals.css`, `tailwind.config*`, `postcss.config*`            | tailwind-css    |

## Notes

- Un fichier peut matcher plusieurs skills/rules (ex: `src/app/api/terrain/sync/route.ts` → terrain-offline + api-conventions)
- Les fichiers qui ne matchent aucun pattern sont ignores dans l'audit
- Les migrations matchent db-schema, mais aussi le skill du domaine concerne si le nom de migration est explicite (ex: `006_offline_sessions.sql` → terrain-offline + db-schema)
