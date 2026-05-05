# Section 2 — Validation des entrées

**Niveau** : CRITIQUE
**Cibles** : `src/app/api/**/*.ts`, `src/lib/validation/schemas.ts`, Server Actions
si présentes (`src/app/**/actions.ts`)

## Règles

### 2.1 — safeParse + flattenError obligatoire

- **Méthode** : grep
- **Pattern** :
  ```
  rg -n '\.parse\(' src/app/api/
  rg -n 'safeParse\(' src/app/api/
  ```
- **Attendu** : 0 occurrence de `.parse(` dans `src/app/api/`. Toute route POST/PATCH/DELETE
  utilise `Schema.safeParse(raw)` + `z.flattenError(parsed.error)`.
- **Signal FAIL** : `.parse(` présent (throw non géré → 500 au lieu de 400 structuré).
- **Fix** :
  ```ts
  const parsed = MySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload invalide", details: z.flattenError(parsed.error) },
      { status: 400 },
    );
  }
  ```

### 2.2 — Schémas centralisés

- **Méthode** : grep + jugement
- **Pattern** :
  ```
  rg -n 'z\.object\(|z\.strictObject\(' src/app/api/
  ```
- **Attendu** : 0 (ou très peu) — les schémas vivent dans `src/lib/validation/schemas.ts`.
- **Signal WARN** : schéma défini inline dans une route (acceptable pour cas trivial,
  WARN si > 3 lignes ou réutilisable).

### 2.3 — z.strictObject sur payloads externes

- **Méthode** : grep + jugement
- **Pattern** :
  ```
  rg -n 'z\.object\(' src/lib/validation/schemas.ts
  ```
- **Attendu** : `z.strictObject({...})` ou `z.object({...}).strict()` pour tout
  schéma de payload externe (POST/PATCH body).
- **Signal WARN** : `z.object()` non-strict sur payload externe → champs inconnus
  silencieusement ignorés (risque mass assignment).

### 2.4 — Upload : size + MIME stricts

- **Méthode** : grep + jugement
- **Cibles** : routes faisant `request.formData()` ou recevant `File`
- **Pattern** :
  ```
  rg -n 'formData|request\.body' src/app/api/
  ```
  Pour chaque route : vérifier la présence de check `file.size > LIMIT` ET
  `file.type === "<mime>"`.
- **Attendu** : double check (taille avec `413` + MIME exact, pas extension).
- **Signal FAIL** : check size manquant (DOS), ou check uniquement sur extension
  (contournable trivialement).
- **Fix** :
  ```ts
  if (file.size > 50 * 1024 * 1024)
    return NextResponse.json({ error: "Fichier trop volumineux" }, { status: 413 });
  if (file.type !== "application/pdf")
    return NextResponse.json({ error: "Type non accepté" }, { status: 400 });
  ```

### 2.5 — PATCH whitelist EDITABLE

- **Méthode** : grep + jugement
- **Cibles** : routes `PATCH` qui modifient des lignes
- **Pattern** :
  ```
  rg -n 'export async function PATCH' src/app/api/
  ```
  Pour chaque : vérifier la présence d'un `Set<string>` ou whitelist explicite.
- **Attendu** : `EDITABLE.has(field)` ou whitelist équivalente, exclusion explicite
  des colonnes `GENERATED` (`delta_*`, `*_retenu`).
- **Signal FAIL** : champ accepté sans filtre (mass assignment), ou colonne GENERATED
  acceptée (échec PG silencieux).

### 2.6 — Pas de mass assignment

- **Méthode** : grep + jugement
- **Pattern** :
  ```
  rg -n '\.update\(payload\)|\.update\(body\)|\.update\(parsed\.data\)' src/app/api/
  ```
- **Attendu** : 0 résultat — toujours un objet construit explicitement
  `{ champ1: payload.champ1, ... }` ou via whitelist.
- **Signal FAIL** : tout match → l'utilisateur peut écrire `owner_id`, `is_admin`,
  `created_at` etc.

### 2.7 — Server Actions validées

- **Méthode** : grep
- **Pattern** :
  ```
  rg -ln '"use server"' src/
  ```
- **Attendu** : si Server Actions présentes, chaque action commence par
  `Schema.safeParse(...)`, même protection que les routes API.
- **Signal FAIL** : action server qui consomme `FormData` ou `args` sans validation Zod.
