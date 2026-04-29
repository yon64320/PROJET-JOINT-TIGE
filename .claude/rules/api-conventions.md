---
globs: "src/app/api/**/*.ts"
---

# Conventions API routes

## Format de réponse

```ts
// Succès
return NextResponse.json(data);

// Erreur
return NextResponse.json({ error: "Message clair" }, { status: 400 });
```

## Validation payload (Zod v4 — safeParse + flattenError)

Tous les POST/PATCH/DELETE utilisent `safeParse` + `z.flattenError` — pas de `try/catch ZodError`. Les schémas sont centralisés dans `src/lib/validation/schemas.ts` (via `z.strictObject` pour refuser les champs inconnus) et les types dérivés via `z.infer` sont exportés.

```ts
import { z } from "zod";
import { CreateFieldSessionBodySchema } from "@/lib/validation/schemas";

const raw = await request.json();
const parsed = CreateFieldSessionBodySchema.safeParse(raw);
if (!parsed.success) {
  return NextResponse.json(
    { error: "Payload invalide", details: z.flattenError(parsed.error) },
    { status: 400 },
  );
}
const { projectId, name, otItemIds, selectedFields } = parsed.data;
```

Regle : jamais `.parse()` dans une route (throws), toujours `.safeParse()`. Pas de `try/catch` autour de la validation — retourner un 400 structure avec `flattenError` pour que le client affiche `fieldErrors`.

## PATCH — champs éditables

Chaque route PATCH déclare un whitelist de champs modifiables. Les colonnes GENERATED (delta_dn, delta_pn, \*\_retenu) sont toujours exclues.

```ts
const EDITABLE = new Set(["commentaires", "responsable", ...]);
if (!EDITABLE.has(field) && !isExtraColumn) {
  return NextResponse.json({ error: "Champ non modifiable" }, { status: 400 });
}
```

## PATCH — extra_columns JSONB

Utiliser la RPC atomique, jamais de read-modify-write :

```ts
await supabase.rpc("merge_extra_column", {
  p_table: "ot_items", // ou "flanges"
  p_id: rowId,
  p_key: fieldName,
  p_value: value,
});
```

## Pagination (GET avec beaucoup de lignes)

```ts
const PAGE_SIZE = 1000;
let from = 0;
while (true) {
  const { data } = await supabase
    .from("table")
    .select("*")
    .order("colonne", { ascending: true })
    .range(from, from + PAGE_SIZE - 1);
  if (!data || data.length === 0) break;
  allRows.push(...data);
  if (data.length < PAGE_SIZE) break;
  from += PAGE_SIZE;
}
```

Toujours `.order()` pour des résultats stables entre les pages.

## Parallelisation et batch queries

Pour les routes qui fetch plusieurs ressources independantes : `Promise.all` (ex. `terrain/download` fetch session + session_items + bolt_specs + dropdowns en parallele).

Pour les boucles qui font un `.single()` par element : remplacer par une clause `IN` + Map de lookup (ex. `terrain/sync` fetch toutes les brides concernees en 1 requete au lieu de N).

```ts
// AVANT — N requetes serie
for (const mut of mutations) {
  const { data } = await supabase.from("flanges").select("*").eq("id", mut.flangeId).single();
  // ...
}

// APRES — 1 requete + Map
const ids = Array.from(new Set(mutations.map((m) => m.flangeId)));
const { data: rows } = await supabase.from("flanges").select("*").in("id", ids);
const byId = new Map(rows?.map((r) => [r.id, r]));
for (const mut of mutations) {
  const current = byId.get(mut.flangeId);
  // ...
}
```

## RPC transactionnelle (SECURITY DEFINER)

Quand un effet doit traverser plusieurs tables (DELETE en cascade, INSERT...SELECT + DELETE) sans laisser d'état intermédiaire visible, utiliser une RPC PostgreSQL `SECURITY DEFINER`. Exemple : `delete_project_cascade` enchaîne 7 DELETE en transaction unique.

```ts
const { error } = await supabase.rpc("delete_project_cascade", {
  p_project_id: projectId,
});
if (error) return NextResponse.json({ error: error.message }, { status: 500 });
```

Pas de rollback manuel côté JS — la transaction PG gère tout. Depuis l'audit 2026-04-29 (migration `002_security_fixes.sql`), les RPC `SECURITY DEFINER` qui touchent un projet vérifient elles-mêmes `owner_id = auth.uid()` et lèvent une exception sinon. Garder malgré tout la vérif `owner_id = user.id` côté route (defense en profondeur + erreur 403 plus claire que 500 RPC).

## Validation upload fichier

Toujours valider taille + type MIME en plus de l'extension :

```ts
if (file.size > 50 * 1024 * 1024) {
  return NextResponse.json({ error: "Fichier trop volumineux (max 50 Mo)" }, { status: 413 });
}
if (file.type !== "application/pdf") {
  return NextResponse.json({ error: "Type de fichier non accepté" }, { status: 400 });
}
```

## Import (workflow en 2 étapes)

1. `POST /api/import/detect` — multipart (file + fileType) → retourne le mapping détecté + template suggéré
2. `POST /api/import/confirm` — multipart (file + confirmedMapping JSON + metadata) → archive les anciennes lignes, exécute l'import, sauvegarde le template

Séparer détection et confirmation : l'utilisateur valide entre les deux.

## Terrain API (routes offline/sync)

Routes dédiées à la PWA terrain, regroupées sous `/api/terrain/` :

- `POST /api/terrain/sessions` — créer session (`projectId`, `name`, `otItemIds`, `selectedFields?`), `GET` lister les sessions
- `GET /api/terrain/download?sessionId=...` — télécharger les données terrain (OTs + flanges + bolt_specs + dropdowns)
- `POST /api/terrain/sync` — push des mutations offline vers Supabase (upsert idempotent)
- `POST /api/terrain/plans` — upload PDF plan d'équipement, `GET` lister les plans

Pattern commun : token Bearer dans header Authorization, validé via `supabase.auth.getUser(token)`.

## Suppression projet (DELETE)

`DELETE /api/projects?id=...` — supprime un projet via la RPC atomique `delete_project_cascade(p_project_id UUID)` (SECURITY DEFINER). Vérifie ownership (`owner_id = user.id`) côté code avant l'appel. La RPC supprime dans une transaction unique : `field_sessions` (CASCADE → `field_session_items`) → `equipment_plans` → `flanges_archive` → `flanges` → `ot_items_archive` → `ot_items` → `projects`. Les `import_templates` ne sont pas liés à un projet (réutilisables via `header_fingerprint`) et restent intacts.

## Ré-import LUT/J&T (archive + delete)

Avant un ré-import, l'archivage des anciennes lignes passe par RPCs SECURITY DEFINER :

- `reimport_archive_lut(p_project_id UUID) RETURNS INTEGER` — archive `flanges` + `ot_items`, puis supprime, retourne le total archivé.
- `reimport_archive_jt(p_project_id UUID) RETURNS INTEGER` — archive `flanges`, puis supprime, retourne le total archivé.

Appelées depuis `reimportLutToDb()` / `reimportJtToDb()` (lib/db/import-\*.ts). Pas de cascade JS — la transaction PG garantit l'atomicité.

## Client Supabase serveur — règle d'or

**Toutes les routes API serveur utilisent `createServerSupabase()` depuis `@/lib/db/supabase-ssr`** (lit la session via cookies, RLS appliquée avec `auth.uid()` correct). Vérification explicite `user.id` au début de chaque handler :

```ts
import { createServerSupabase } from "@/lib/db/supabase-ssr";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  // ...
}
```

Exception : routes terrain (`/api/terrain/*`) qui valident le token Bearer manuellement et utilisent `supabaseAdmin` (service-role, bypass RLS) — lecture/mutation côté preparator, sécurité assurée par la vérif `owner_id = user.id` côté code.

Le client anon singleton (ancien `src/lib/db/supabase.ts`) a été supprimé. Côté browser, utiliser `supabase-browser.ts` (client public RLS-aware via cookies).

## Pipeline migration Supabase

Les migrations DB sont versionnées dans `supabase/migrations/` (canonique : `001_schema.sql`). Pour appliquer à la base live :

```bash
SUPABASE_ACCESS_TOKEN=sbp_xxx npx supabase link --project-ref <ref>   # une fois
SUPABASE_ACCESS_TOKEN=sbp_xxx npx supabase migration list             # voir drift
SUPABASE_ACCESS_TOKEN=sbp_xxx npx supabase db push                    # applique migrations en attente
```

Le squash est `CREATE OR REPLACE` / `IF NOT EXISTS` partout → idempotent.

## Templates Excel (routes GET)

Routes qui génèrent des fichiers Excel téléchargeables via SheetJS :

- `GET /api/templates/jt` — template J&T vierge (.xlsx) avec 2 feuilles (Données + Guide), colonnes pré-définies, exemples

Pattern : construire le workbook en mémoire avec `XLSX.utils`, retourner un `NextResponse` avec le buffer et les headers Content-Type + Content-Disposition.
