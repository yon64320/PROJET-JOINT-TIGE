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

## Import (workflow en 2 étapes)

1. `POST /api/import/detect` — multipart (file + fileType) → retourne le mapping détecté
2. `POST /api/import/confirm` — multipart (file + confirmedMapping JSON + metadata) → exécute l'import

Séparer détection et confirmation : l'utilisateur valide entre les deux.
