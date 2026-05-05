# Section 4 — Atomicité & Transactions

**Niveau** : CRITIQUE
**Cibles** : `src/app/api/**/*.ts`, `src/lib/db/**/*.ts`, `supabase/migrations/*.sql`

## Règles

### 4.1 — Cascades multi-tables via RPC

- **Méthode** : grep + jugement
- **Pattern** :
  ```
  rg -n '\.from\(.+\)\.delete\(\)' src/app/api/ src/lib/db/
  ```
  Pour chaque route DELETE qui supprime dans plusieurs tables, vérifier qu'elle
  appelle une RPC unique au lieu de chaîner des `.delete()` JS.
- **Attendu** : `supabase.rpc("delete_project_cascade", { p_project_id })` etc.
- **Signal FAIL** : boucle JS de plusieurs `.delete()` (ex. supprimer flanges,
  ot_items, projects séparément) → état intermédiaire visible si erreur ou concurrence.
- **Fix** : créer une RPC `SECURITY DEFINER` qui enchaîne les DELETE en une
  seule transaction PG, et l'appeler côté JS.

### 4.2 — JSONB extra_columns via merge_extra_column

- **Méthode** : grep
- **Pattern** :
  ```
  rg -n 'extra_columns' src/app/api/
  ```
  Pour chaque match : vérifier qu'il s'agit d'un appel à
  `supabase.rpc("merge_extra_column", ...)` et non d'un read-modify-write.
- **Attendu** : RPC atomique (un seul UPDATE PG avec opérateur `||`).
- **Signal FAIL** : pattern `select extra_columns → spread JS → update extra_columns`
  → race condition (deux saves concurrents écrasent l'un l'autre).
- **Exemple FAIL** :
  ```ts
  // ❌ FAIL — read-modify-write non atomique
  const { data } = await supabase.from("ot_items").select("extra_columns").eq("id", id).single();
  const merged = { ...data.extra_columns, [key]: value };
  await supabase.from("ot_items").update({ extra_columns: merged }).eq("id", id);
  ```
- **Fix** :
  ```ts
  await supabase.rpc("merge_extra_column", {
    p_table: "ot_items",
    p_id: id,
    p_key: key,
    p_value: value,
  });
  ```

### 4.3 — Storage upload + DB INSERT : rollback

- **Méthode** : grep + jugement
- **Cibles** : routes uploadant dans Storage ET insérant en DB
- **Pattern** :
  ```
  rg -n 'storage\.from\(.+\)\.upload' src/app/api/
  ```
  Pour chaque match : vérifier qu'en cas d'échec INSERT DB, le fichier Storage
  est supprimé (`storage.remove([path])`).
- **Attendu** : check `.error` post-INSERT avec rollback Storage.
- **Signal FAIL** : INSERT DB échoue silencieusement → fichier orphelin dans
  Storage qui ne sera jamais référencé ni nettoyé.
- **Fix** :
  ```ts
  const { error: dbErr } = await supabaseAdmin.from("flange_photos").insert(row);
  if (dbErr) {
    await supabaseAdmin.storage.from("photos").remove([path]);
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }
  ```

### 4.4 — Multi-UPDATE/DELETE atomicité

- **Méthode** : jugement
- **Pattern** :
  ```
  rg -n 'await supabase' src/app/api/ -A 1 | rg -B 1 'await supabase'
  ```
  Pour chaque route : compter les `update`/`delete`/`insert` consécutifs.
  Si > 2 opérations interdépendantes → suspect.
- **Attendu** : opérations multi-tables interdépendantes passent par RPC.
- **Signal WARN** : 3+ writes consécutifs en JS → si l'une échoue, état partiel.
- **Critère de décision** : si un échec partiel laisse les données dans un état
  invalide pour le métier → RPC obligatoire. Si chaque write est indépendant
  (logs, audit) → JS acceptable.
