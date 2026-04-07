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

## RPC transactionnelle (pair_flanges)

Quand 2+ UPDATEs doivent être atomiques, utiliser une RPC SECURITY DEFINER :

```ts
await supabase.rpc("pair_flanges", {
  p_flange_a: flangeIdA,
  p_flange_b: flangeIdB,
  p_pair_id: pairId,
  p_side_a: "ADM",
  p_side_b: "REF",
});
```

Pas de rollback manuel côté JS — la transaction PG gère tout.

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

- `POST /api/terrain/sessions` — créer session, `GET` lister les sessions
- `GET /api/terrain/download?sessionId=...` — télécharger les données terrain (OTs + flanges + bolt_specs + dropdowns)
- `POST /api/terrain/sync` — push des mutations offline vers Supabase (upsert idempotent)
- `POST /api/terrain/plans` — upload PDF plan d'équipement, `GET` lister les plans

Pattern commun : token Bearer dans header Authorization, validé via `supabase.auth.getUser(token)`.
