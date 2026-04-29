# Phase B — Photos terrain (bride / échafaudage / calorifuge)

> Document autonome pour exécution de la Phase B après /clear.
> Phase A (ajout/suppression de brides côté terrain) est **déjà livrée**.

## Contexte

Le préparateur veut prendre 3 types de photos pendant une session terrain :

1. **Photo de la bride** elle-même
2. **Photo de l'échafaudage** (où l'échafaudage doit être monté)
3. **Photo du calorifuge** (le calorifuge à enlever)

Chaque photo est attachée à une bride. Plusieurs photos par type sont possibles
(ex: 2 angles différents pour la bride). Au sync, les fichiers sont uploadés
sur Supabase Storage et l'index est en base.

## Décisions déjà validées

- **Storage** : Supabase Storage (bucket privé `photos`, 3 préfixes), compression
  client à ~300 KB max (WebP quality 70, 1280px max côté).
- **Naming** : `{uuid}.webp` (UUID v4 généré côté client). Pas de séquence dans
  le chemin — le numéro d'ordre (1ère, 2e, 3e prise) est calculé à l'affichage
  via `ROW_NUMBER() OVER (PARTITION BY flange_id, type ORDER BY taken_at)`.
  Élimine race condition et regex de renommage côté serveur. Le nom
  utilisateur (`V401_REP12`) est stocké dans la colonne `display_name` pour
  l'affichage, pas dans le path Storage.
- **DB** : table dédiée `flange_photos` (séparée de `flanges`) avec
  `ON DELETE SET NULL` (pas CASCADE) sur la FK `flange_id` + clé naturelle
  `(item, repere, cote)` stockée pour permettre le re-rattachement après
  ré-import.
- **Sync** : route séparée `POST /api/terrain/photos` (FormData), appelée APRÈS
  la sync des mutations textuelles (sépare le flux, permet l'upload progressif
  photo par photo, pas de base64 dans le JSON sync). Concurrence d'upload
  limitée à 3 (`Promise.allSettled` par batch).
- **Ré-import J&T — re-rattachement automatique + avertissement** :
  - Avant ré-import, route GET de simulation calcule combien de photos vont
    être ré-attachées par clé naturelle vs orphelines.
  - Popup bloquant : "X photos seront ré-attachées, Y resteront orphelines.
    Confirmer ?"
  - Pendant ré-import : `flange_id` des photos passe à `NULL` (FK SET NULL).
  - Après import des nouvelles brides : RPC `reattach_orphan_photos` matche
    par `(project_id, item, repere, cote)` et restaure `flange_id`.
  - Photos sans match dans le nouveau J&T restent orphelines (`flange_id =
NULL`) mais visibles dans une vue "photos orphelines" pour récupération
    manuelle.

## Phase A — Acquis utilisable

Avant de commencer la Phase B, ces éléments existent déjà :

- `OfflineMutation` est un discriminated union `update | create | delete`
  dans `src/lib/offline/db.ts`. Pour ajouter `pendingPhotos`, créer une
  table Dexie séparée — ne pas réutiliser la queue mutations.
- Pattern d'upload Storage rodé dans `src/app/api/terrain/plans/route.ts`
  (FormData, `supabase.storage.from(bucket).upload(path, file)`).
- `FLANGES_ALLOWED` extrait dans `src/lib/db/flanges-allowed.ts`.
- `docs/pivot.md` contient l'historique des décisions — y ajouter une
  entrée datée à la fin de la Phase B.

## Étapes d'implémentation (10 étapes)

### B.1 — Migration DB : table `flange_photos` + RPC

**Stratégie en dev solo** : ajouter le SQL Phase B directement dans le squash
canonique `supabase/migrations/001_schema.sql` (idempotent partout, donc
ré-applicable). Pas de fichier `003_*.sql` séparé — la traçabilité par
fichier dédié n'a de valeur qu'en équipe / multi-environnements.

Le SQL est intégré dans 001 aux sections appropriées :

- FUNCTIONS : ajout de `preview_reattach_photos`, `reattach_orphan_photos`,
  mise à jour de `delete_project_cascade` (DELETE photos avant flanges)
- TABLES : nouvelle table `flange_photos` après `flanges_archive`
- INDEXES : 4 index dédiés (flange, project, orphan, natural)
- RLS : 4 policies (select/insert/update/delete) via project_id dénormalisé
- STORAGE : `INSERT INTO storage.buckets` pour le bucket `photos`

Application :

```bash
SUPABASE_ACCESS_TOKEN=sbp_xxx npx supabase db push
```

Le push applique uniquement les nouveautés grâce aux `IF NOT EXISTS` /
`CREATE OR REPLACE`. Pour repartir d'une base propre (sans données de test) :

```bash
SUPABASE_ACCESS_TOKEN=sbp_xxx npx supabase db reset --linked
```

```sql
CREATE TABLE IF NOT EXISTS flange_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- FK SET NULL pour permettre le re-rattachement après ré-import J&T
  flange_id UUID REFERENCES flanges(id) ON DELETE SET NULL,
  -- project_id dénormalisé : permet RLS + scope sans JOIN, et reste valide
  -- même si flange_id devient NULL pendant un ré-import
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('bride', 'echafaudage', 'calorifuge')),
  -- Clé naturelle capturée au moment de la prise pour re-rattachement
  natural_item TEXT NOT NULL,
  natural_repere TEXT,
  natural_cote TEXT,
  storage_path TEXT NOT NULL UNIQUE,
  display_name TEXT,                    -- "V401_REP12" pour affichage user
  size_bytes INTEGER,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flange_photos_flange ON flange_photos(flange_id)
  WHERE flange_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_flange_photos_project ON flange_photos(project_id);
CREATE INDEX IF NOT EXISTS idx_flange_photos_orphan ON flange_photos(project_id)
  WHERE flange_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_flange_photos_natural
  ON flange_photos(project_id, natural_item, natural_repere, type);

-- RLS : owner direct via project_id dénormalisé (plus simple, fonctionne aussi
-- pour les orphelines flange_id = NULL)
ALTER TABLE flange_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "flange_photos_owner_all" ON flange_photos;
CREATE POLICY "flange_photos_owner_all" ON flange_photos
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

GRANT ALL ON flange_photos TO anon, authenticated, service_role;
```

**Mettre à jour `delete_project_cascade`** — ajouter avant la suppression
des `flanges` (CASCADE via `project_id` le ferait, mais explicite = traçable
et garde la trace dans la transaction unique) :

```sql
DELETE FROM flange_photos WHERE project_id = p_project_id;
```

**Nouvelle RPC `reattach_orphan_photos`** — appelée après ré-import J&T pour
restaurer les `flange_id` par clé naturelle :

```sql
CREATE OR REPLACE FUNCTION reattach_orphan_photos(p_project_id UUID)
RETURNS TABLE (reattached INTEGER, orphaned INTEGER) AS $$
DECLARE r INTEGER; o INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM projects WHERE id = p_project_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Projet introuvable ou acces refuse';
  END IF;

  -- Re-rattachement par (item, repere) — match unique au sein du projet
  WITH matched AS (
    UPDATE flange_photos fp
    SET flange_id = f.id
    FROM flanges f
    JOIN ot_items ot ON f.ot_item_id = ot.id
    WHERE fp.project_id = p_project_id
      AND fp.flange_id IS NULL
      AND ot.project_id = p_project_id
      AND ot.item = fp.natural_item
      AND f.repere IS NOT DISTINCT FROM fp.natural_repere
    RETURNING fp.id
  )
  SELECT COUNT(*) INTO r FROM matched;

  SELECT COUNT(*) INTO o FROM flange_photos
  WHERE project_id = p_project_id AND flange_id IS NULL;

  RETURN QUERY SELECT r, o;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION reattach_orphan_photos(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION reattach_orphan_photos(UUID) TO authenticated;
```

**RPC de simulation `preview_reattach_photos`** — pour le popup d'avertissement
avant ré-import (compte sans modifier) :

```sql
CREATE OR REPLACE FUNCTION preview_reattach_photos(p_project_id UUID, p_new_items TEXT[])
RETURNS TABLE (will_reattach INTEGER, will_orphan INTEGER) AS $$
DECLARE r INTEGER; o INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM projects WHERE id = p_project_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Projet introuvable ou acces refuse';
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE natural_item = ANY(p_new_items)),
    COUNT(*) FILTER (WHERE NOT (natural_item = ANY(p_new_items)))
  INTO r, o
  FROM flange_photos
  WHERE project_id = p_project_id;

  RETURN QUERY SELECT r, o;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION preview_reattach_photos(UUID, TEXT[]) TO authenticated;
```

### B.2 — Bucket Supabase Storage `photos`

Créer le bucket via le Dashboard Supabase (UI) ou via le SQL `INSERT INTO
storage.buckets` dans `003_flange_photos.sql`. Configuration :

- **Privé** (pas d'accès public)
- `file_size_limit = 5MB` (marge × 10 sur les photos compressées)
- 3 préfixes par convention : `brides/`, `echafaudage/`, `calorifuge/`

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('photos', 'photos', false, 5242880)
ON CONFLICT (id) DO NOTHING;
```

**Policy Storage : aucun accès direct authenticated/anon — uniquement
`service_role`**. Les utilisateurs passent toujours par l'API qui génère
des signed URLs courtes (15 min). Cela ferme la faille où un utilisateur
authentifié pourrait télécharger les photos d'un autre projet via le client
Supabase direct.

```sql
-- Pas de policy pour anon/authenticated → pas d'accès direct au bucket
-- service_role ignore RLS → l'API serveur (supabaseAdmin) garde l'accès complet
DROP POLICY IF EXISTS "photos_owner_select" ON storage.objects;
DROP POLICY IF EXISTS "photos_authenticated_select" ON storage.objects;
```

Toutes les routes qui exposent une photo (`GET /api/terrain/photos?flangeId=...`)
génèrent une signed URL via `supabaseAdmin.storage.from('photos').createSignedUrl(path, 900)`
après vérification d'ownership côté code.

### B.3 — Compression client (`src/lib/offline/photo-compression.ts`)

Nouveau helper. Utiliser `createImageBitmap` + `OffscreenCanvas` pour traiter
hors du thread principal.

```ts
const TARGET_MAX_BYTES = 500_000; // 500 KB hard cap
const TARGET_DIMENSION = 1280; // largeur ou hauteur max

export async function compressPhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  // Guard upscale : si l'image est déjà plus petite que la cible, on garde
  // ses dimensions natives (sinon on créerait un fichier plus lourd qu'à
  // l'origine en agrandissant artificiellement).
  const longest = Math.max(bitmap.width, bitmap.height);
  let w: number, h: number;
  if (longest <= TARGET_DIMENSION) {
    w = bitmap.width;
    h = bitmap.height;
  } else {
    const ratio = bitmap.width / bitmap.height;
    w = bitmap.width > bitmap.height ? TARGET_DIMENSION : Math.round(TARGET_DIMENSION * ratio);
    h = bitmap.width > bitmap.height ? Math.round(TARGET_DIMENSION / ratio) : TARGET_DIMENSION;
  }

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context indisponible");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  let blob = await canvas.convertToBlob({ type: "image/webp", quality: 0.7 });
  if (blob.size > TARGET_MAX_BYTES) {
    blob = await canvas.convertToBlob({ type: "image/webp", quality: 0.5 });
  }
  return blob;
}
```

Fallback Safari iOS (pas d'`OffscreenCanvas`) : utiliser un `<canvas>` DOM
classique. À gérer si l'utilisateur signale une régression.

### B.4 — IndexedDB : table `pendingPhotos` + helpers

Étendre `src/lib/offline/db.ts` avec une nouvelle table Dexie v4.

```ts
export interface PendingPhoto {
  id: string; // crypto.randomUUID() — devient le storage path basename
  session_id: string;
  flange_id: string; // peut être un temp_<uuid> si bride locale
  type: "bride" | "echafaudage" | "calorifuge";
  blob: Blob; // photo compressée WebP
  display_name: string; // "V401_REP12" pour affichage user
  natural_item: string; // clé naturelle capturée à la prise
  natural_repere: string | null;
  natural_cote: string | null;
  size_bytes: number;
  taken_at: string; // ISO 8601
  uploaded: boolean; // flag idempotence
}

// Dans TerrainDB.constructor — index composite [flange_id+type] requis pour
// les lookups efficaces de la galerie thumbnail
this.version(4).stores({
  sessions: "id, project_id",
  otItems: "id, session_id",
  flanges: "id, session_id, ot_item_id, field_status",
  mutations: "++id, session_id, flange_id, synced",
  plans: "id, session_id, ot_item_id",
  boltSpecs: "id, [face_type+dn+pn]",
  dropdownLists: "id, category",
  pendingPhotos: "id, session_id, flange_id, type, uploaded, [flange_id+type]",
});
```

Helper dans `src/lib/offline/hooks.ts` (pas de calcul de sequence — l'ordre
d'affichage est dérivé à la lecture par `taken_at`) :

```ts
export async function addPendingPhoto(
  sessionId: string,
  flangeId: string,
  type: "bride" | "echafaudage" | "calorifuge",
  blob: Blob,
  flangeName: string | null,
  flangeRepere: string | null,
  naturalItem: string,
  naturalCote: string | null,
): Promise<string> {
  const cleanName = (flangeName ?? "X").replace(/[^A-Za-z0-9_-]/g, "");
  const cleanRepere = (flangeRepere ?? "").replace(/[^A-Za-z0-9_-]/g, "");
  const displayName = `${cleanName}_${cleanRepere}`;

  const photoId = crypto.randomUUID(); // utilisé comme basename storage path
  await offlineDb.pendingPhotos.add({
    id: photoId,
    session_id: sessionId,
    flange_id: flangeId,
    type,
    blob,
    display_name: displayName,
    natural_item: naturalItem,
    natural_repere: flangeRepere,
    natural_cote: naturalCote,
    size_bytes: blob.size,
    taken_at: new Date().toISOString(),
    uploaded: false,
  });
  return photoId;
}
```

### B.5 — Composant capture (`src/components/terrain/PhotoCapture.tsx`)

Mobile-first, 56px touch targets minimum.

```tsx
interface Props {
  type: "bride" | "echafaudage" | "calorifuge";
  flangeId: string;
  flangeName: string | null;
  flangeRepere: string | null;
  sessionId: string;
  onCaptured: () => void;
}

// Input file masqué + bouton custom déclenchant le click
// <input type="file" accept="image/*" capture="environment" />
// onChange : compress → preview → confirmation → addPendingPhoto
```

États :

- Preview de la photo via `URL.createObjectURL(blob)` — **toujours appeler
  `URL.revokeObjectURL(url)` dans le cleanup de `useEffect` et au reset**
  (sinon fuite mémoire en cas d'usage prolongé hors-ligne avec 50+ photos)
- Bouton "Confirmer" → `addPendingPhoto(...)` puis `onCaptured()`
- Bouton "Reprendre" → revoke l'URL puis reset l'état preview

```tsx
useEffect(() => {
  if (!previewBlob) return;
  const url = URL.createObjectURL(previewBlob);
  setPreviewUrl(url);
  return () => URL.revokeObjectURL(url);
}, [previewBlob]);
```

### B.6 — Intégration UI dans le wizard

Ajouter 3 nouveaux steps `wizard-steps/PhotoStep.tsx` (ou un seul step
paramétrable par `type`). À insérer dans la séquence `STEP_FIELD` après
les steps existants pertinents :

- Photo bride : juste après les caractéristiques de la bride
- Photo échafaudage : conditionnel — uniquement si `echafaudage` est
  renseignée et non vide (`echafaudage IS NOT NULL AND echafaudage <> ''`).
  La colonne est `TEXT` (pas `BOOLEAN`) — le test "truthy" doit refléter
  la sémantique métier : tout texte non-vide = échafaudage requis. Si une
  enum se met en place plus tard (`oui`/`non`/`incertain`), adapter la
  condition ici.
- Photo calorifuge : même logique sur `calorifuge` (TEXT non vide).

Le step affiche :

- Une grille de thumbnails (`pendingPhotos` filtrées par `flange_id` + `type`)
- Un bouton « + Prendre une photo » qui ouvre `PhotoCapture`
- Une croix sur chaque thumbnail pour supprimer (efface l'entrée
  `pendingPhotos` côté local — si déjà uploadée, marquer pour delete au
  prochain sync).

### B.7 — Route API `POST /api/terrain/photos` (upload)

Pattern FormData, copié de `src/app/api/terrain/plans/route.ts`. Nouveau
fichier `src/app/api/terrain/photos/route.ts`.

**Changements clés vs draft initial** :

- MIME restreint à `image/webp` uniquement (la compression côté client sort
  toujours du WebP). Élimine le bug regex sur `.jpg`/`.png`.
- `photoId` (UUID v4) reçu du client → utilisé directement comme basename
  du storage path. Plus de regex de renommage, plus de race condition.
- Pas de paramètre `sequence` — l'ordre est dérivé à la lecture.
- Rollback Storage si l'INSERT DB échoue (sinon fichier orphelin).

```ts
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const VALID_TYPES = new Set(["bride", "echafaudage", "calorifuge"]);
const FOLDER_MAP: Record<string, string> = {
  bride: "brides",
  echafaudage: "echafaudage",
  calorifuge: "calorifuge",
};

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const photoId = formData.get("photoId") as string | null;
  const flangeId = formData.get("flangeId") as string | null;
  const type = formData.get("type") as string | null;
  const displayName = (formData.get("displayName") as string | null) ?? null;
  const naturalItem = formData.get("naturalItem") as string | null;
  const naturalRepere = (formData.get("naturalRepere") as string | null) ?? null;
  const naturalCote = (formData.get("naturalCote") as string | null) ?? null;
  const takenAt = formData.get("takenAt") as string | null;

  if (!file || !photoId || !flangeId || !type || !naturalItem || !takenAt) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Fichier trop volumineux" }, { status: 413 });
  }
  if (file.type !== "image/webp") {
    return NextResponse.json({ error: "Seul WebP est accepté" }, { status: 400 });
  }
  if (!VALID_TYPES.has(type)) {
    return NextResponse.json({ error: "Type photo invalide" }, { status: 400 });
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(photoId)) {
    return NextResponse.json({ error: "photoId invalide" }, { status: 400 });
  }

  // Vérifier ownership : la bride appartient à l'utilisateur
  const { data: flange } = await supabaseAdmin
    .from("flanges")
    .select("id, project_id, projects!inner(owner_id)")
    .eq("id", flangeId)
    .maybeSingle();
  // @ts-expect-error projects relation typing
  if (!flange || flange.projects.owner_id !== user.id) {
    return NextResponse.json({ error: "Bride introuvable" }, { status: 404 });
  }

  // Path déterministe basé sur l'UUID — pas de regex, pas de race
  const storagePath = `${FOLDER_MAP[type]}/${flange.project_id}/${photoId}.webp`;

  const { error: uploadErr } = await supabaseAdmin.storage
    .from("photos")
    .upload(storagePath, file, { contentType: "image/webp", upsert: false });
  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  const { data: row, error: insertErr } = await supabaseAdmin
    .from("flange_photos")
    .insert({
      id: photoId, // mêmes UUID local + serveur
      flange_id: flangeId,
      project_id: flange.project_id,
      type,
      natural_item: naturalItem,
      natural_repere: naturalRepere,
      natural_cote: naturalCote,
      storage_path: storagePath,
      display_name: displayName,
      size_bytes: file.size,
      taken_at: takenAt,
    })
    .select("id, storage_path, taken_at")
    .single();

  // Rollback Storage si l'INSERT échoue → évite les fichiers orphelins
  if (insertErr) {
    await supabaseAdmin.storage.from("photos").remove([storagePath]);
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ id: row.id, storagePath: row.storage_path });
}
```

Aussi ajouter un `GET` qui retourne les signed URLs pour une bride donnée
(pour l'affichage dans le tableur desktop). TTL 15 min (cohérent avec le
choix RLS service_role-only — accès toujours via signed URL fraîche).
L'ordre d'affichage est calculé ici via `ROW_NUMBER`/`taken_at`.

```ts
// GET /api/terrain/photos?flangeId=...&type=bride
// → { photos: [{ id, ordinal, signedUrl, takenAt, displayName }] }
const { data } = await supabaseAdmin
  .from("flange_photos")
  .select("id, storage_path, taken_at, display_name")
  .eq("flange_id", flangeId)
  .eq("type", type)
  .order("taken_at", { ascending: true });

const photos = await Promise.all(
  (data ?? []).map(async (p, idx) => {
    const { data: signed } = await supabaseAdmin.storage
      .from("photos")
      .createSignedUrl(p.storage_path, 900);
    return {
      id: p.id,
      ordinal: idx + 1, // dérivé, pas stocké
      signedUrl: signed?.signedUrl,
      takenAt: p.taken_at,
      displayName: p.display_name,
    };
  }),
);
```

### B.8 — Sync client (upload différé) + remap temp\_ → serverId

**Modification critique de `pushMutations`** : quand un `create` réussit
côté serveur, l'app doit faire **deux** updates en local, dans la **même
transaction Dexie** :

1. `flanges.id` : remplacer `temp_xxx` par le `serverId` (déjà fait)
2. `pendingPhotos.flange_id` : remplacer `temp_xxx` par `serverId` partout
   où il référence cette bride (NOUVEAU)

```ts
// src/lib/offline/sync.ts — extrait pushMutations, après création réussie
await offlineDb.transaction("rw", [offlineDb.flanges, offlineDb.pendingPhotos], async () => {
  await offlineDb.flanges.delete(tempId);
  await offlineDb.flanges.add({ ...flangeData, id: serverId });

  // Remap des photos pendantes liées à cette bride locale
  await offlineDb.pendingPhotos.where("flange_id").equals(tempId).modify({ flange_id: serverId });
});
```

Ainsi `pushPendingPhotos` n'a **jamais** à gérer le mapping — au moment où
elle s'exécute, toutes les photos pointent déjà vers des serverIds valides
(ou vers des temp\_ qui n'ont pas pu être synchronisés, qu'on skippe).

**Fonction `pushPendingPhotos`** — appelée APRÈS `pushMutations`, avec
concurrence limitée à 3 (4G + UX) :

```ts
const UPLOAD_CONCURRENCY = 3;

export async function pushPendingPhotos(
  sessionId: string,
  token: string,
): Promise<{
  uploaded: string[];
  errors: { photoId: string; error: string }[];
}> {
  const pending = await offlineDb.pendingPhotos
    .where({ session_id: sessionId, uploaded: false })
    .toArray();

  const uploaded: string[] = [];
  const errors: { photoId: string; error: string }[] = [];

  // Skip les photos qui pointent encore vers une bride locale temp_ —
  // signifie que pushMutations a échoué pour cette bride
  const ready = pending.filter((p) => !p.flange_id.startsWith("temp_"));
  for (const p of pending) {
    if (p.flange_id.startsWith("temp_")) {
      errors.push({ photoId: p.id, error: "Bride non synchronisée" });
    }
  }

  // Upload par batch de UPLOAD_CONCURRENCY (Promise.allSettled — un échec
  // n'arrête pas les autres)
  for (let i = 0; i < ready.length; i += UPLOAD_CONCURRENCY) {
    const batch = ready.slice(i, i + UPLOAD_CONCURRENCY);
    const results = await Promise.allSettled(batch.map((p) => uploadOne(p, token)));
    results.forEach((r, idx) => {
      const photo = batch[idx];
      if (r.status === "fulfilled") uploaded.push(photo.id);
      else errors.push({ photoId: photo.id, error: String(r.reason) });
    });
  }

  return { uploaded, errors };
}

async function uploadOne(photo: PendingPhoto, token: string): Promise<void> {
  const fd = new FormData();
  fd.append("file", photo.blob, `${photo.id}.webp`);
  fd.append("photoId", photo.id);
  fd.append("flangeId", photo.flange_id);
  fd.append("type", photo.type);
  fd.append("displayName", photo.display_name);
  fd.append("naturalItem", photo.natural_item);
  if (photo.natural_repere) fd.append("naturalRepere", photo.natural_repere);
  if (photo.natural_cote) fd.append("naturalCote", photo.natural_cote);
  fd.append("takenAt", photo.taken_at);

  const res = await fetch("/api/terrain/photos", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  await offlineDb.pendingPhotos.update(photo.id, { uploaded: true });
}
```

Mise à jour de `useSyncEngine` (`src/lib/offline/hooks.ts`) pour appeler
les deux fonctions séquentiellement (`pushMutations` → `pushPendingPhotos`)
et fusionner les résultats dans le statut affiché.

### B.9 — Workflow ré-import J&T avec re-rattachement photos

Modifier `reimportJtToDb()` (`src/lib/db/import-jt.ts`) et le UI déclencheur
(`/api/import/confirm` côté JT) pour :

1. **Avant** d'archiver les anciennes brides : appeler `preview_reattach_photos`
   avec la liste des `item` du nouveau J&T pour calculer le bilan attendu.
2. **Si `will_orphan > 0`** : popup bloquant dans le UI :
   > "Le ré-import va supprimer X brides du J&T courant. Y photos seront
   > ré-attachées automatiquement aux nouvelles brides correspondantes,
   > Z photos resteront orphelines (brides non présentes dans le nouveau
   > J&T). Confirmer le ré-import ?"
3. **Si confirmé** : exécuter le ré-import normal — la FK `ON DELETE SET NULL`
   fait que les `flange_id` des photos passent à `NULL` au lieu d'être
   cascade-deleted.
4. **Après** insertion des nouvelles brides : appeler `reattach_orphan_photos(p_project_id)`
   qui matche par `(natural_item, natural_repere)` et restaure les `flange_id`.
5. Afficher le bilan final : "Y photos ré-attachées, Z orphelines".

```ts
// src/lib/db/import-jt.ts — pseudo
const newItems = parsedRows.map((r) => r.item);
const { data: preview } = await supabase.rpc("preview_reattach_photos", {
  p_project_id: projectId,
  p_new_items: newItems,
});

if (preview.will_orphan > 0 && !confirmed) {
  return {
    needsConfirm: true,
    willReattach: preview.will_reattach,
    willOrphan: preview.will_orphan,
  };
}

// ... archivage + delete + insert nouvelles brides (FK SET NULL préserve les photos)

const { data: result } = await supabase.rpc("reattach_orphan_photos", {
  p_project_id: projectId,
});
return { ok: true, reattached: result.reattached, orphaned: result.orphaned };
```

Les photos orphelines (`flange_id = NULL`) sont accessibles via une vue
admin "Photos orphelines" (sortie de scope V1 — affichage simple en lecture
seule, l'utilisateur peut les redownloader manuellement).

### B.10 — Affichage dans le tableur desktop (optionnel — peut être Phase C)

Vue Robinetterie / Échafaudage / Calorifuge : ajouter une colonne thumbnail
qui affiche une icône appareil photo si au moins une photo existe pour cette
bride+type. Clic → modal lightbox avec les signed URLs.

API GET pour récupérer les signed URLs :

```
GET /api/terrain/photos?flangeId=...&type=bride
→ { photos: [{ id, ordinal, signedUrl, takenAt, displayName }] }
// ordinal dérivé via index dans le tableau (ROW_NUMBER côté SQL ou côté JS)
```

## Vérification

1. Migration appliquée via le pipeline standard :
   ```bash
   SUPABASE_ACCESS_TOKEN=sbp_xxx npx supabase migration list
   # attendu : 003_flange_photos en applied
   ```
   ```sql
   SELECT count(*) FROM information_schema.tables WHERE table_name = 'flange_photos';
   -- attendu : 1
   ```
2. Bucket existe et est privé :
   ```sql
   SELECT id, public FROM storage.buckets WHERE id = 'photos';
   -- attendu : ('photos', false)
   ```
3. RLS Storage : pas de policy SELECT pour anon/authenticated :
   ```sql
   SELECT policyname FROM pg_policies
   WHERE tablename = 'objects' AND schemaname = 'storage'
     AND qual LIKE '%photos%';
   -- attendu : aucune ligne (seul service_role accède au bucket)
   ```
4. `npx tsc --noEmit && npx vitest run && npx eslint src` — 0 nouvelle erreur.
5. Test mobile end-to-end :
   - Ouvrir une session terrain hors-ligne.
   - Aller sur une bride → wizard → step photo bride → prendre 2 photos.
   - Vérifier dans Chrome DevTools → IndexedDB → `pendingPhotos` : 2 entrées
     avec `id` UUID, `display_name` rempli, `natural_item` capturé.
   - Repasser online → sync.
   - Vérifier dans Supabase Storage : 2 fichiers `photos/brides/<projectId>/<uuid>.webp`.
   - Vérifier en DB : 2 lignes dans `flange_photos` avec `taken_at` distincts.
   - L'ordinal d'affichage (1, 2) doit être dérivé via `ROW_NUMBER` à la lecture.
6. Test compression : photos < 500 KB. Photos déjà petites (<1280px) doivent
   garder leurs dimensions natives (pas d'upscale).
7. Test concurrence : prendre 5 photos sur la même bride en rapide succession,
   puis sync → les 5 doivent passer sans erreur de contrainte UNIQUE
   (puisqu'on a supprimé `UNIQUE (flange_id, type, sequence)`).
8. Test ré-import avec re-rattachement :
   - Importer J&T → 100 brides.
   - Prendre 10 photos terrain, sync.
   - Modifier le J&T : supprimer 2 brides existantes, ajouter 1 nouvelle.
   - Lancer ré-import → popup affiche "8 ré-attachées, 2 orphelines".
   - Confirmer → vérifier en DB :
     ```sql
     SELECT count(*) FILTER (WHERE flange_id IS NOT NULL) AS reattached,
            count(*) FILTER (WHERE flange_id IS NULL) AS orphan
     FROM flange_photos WHERE project_id = '...';
     -- attendu : reattached=8, orphan=2
     ```
9. Test temp\_ → serverId mapping :
   - Hors-ligne : créer une nouvelle bride dans le wizard, prendre 1 photo dessus.
   - Vérifier IndexedDB : `pendingPhotos[0].flange_id` commence par `temp_`.
   - Repasser online → sync.
   - Vérifier IndexedDB après sync : `pendingPhotos[0].flange_id` est un UUID
     standard (pas `temp_`), `uploaded = true`.
   - Vérifier en DB : photo présente avec le bon `flange_id`.
10. Test rollback orphan : injecter une erreur côté `flange_photos.insert`
    (ex. via violation contrainte temporaire) → vérifier que le fichier est
    bien supprimé du Storage (pas d'orphelin).

## Documentation à mettre à jour

- `docs/pivot.md` — entrée datée (storage choisi, justification, table créée).
- `.claude/skills/terrain-offline/SKILL.md` — section « Photos terrain »
  (décrire la stack capture + compression + upload différé).
- `.claude/rules/db-schema.md` — section `flange_photos` (colonnes, RLS, FK).
- `CLAUDE.md` — Roadmap : ajouter ligne « Photos terrain : Done ».

## Hors-scope

- Édition de photos depuis le tableur desktop (suppression, légende).
- Compression vidéo (pas demandé).
- Annotations sur photo (flèches, cercles).
- OCR/lecture automatique de tag.
- Bascule Cloudflare R2 — déclenchée seulement si dépassement quota Pro.
- Vue UI dédiée pour les photos orphelines après ré-import (en V1, simple
  requête SQL admin — UI à itérer si la fonctionnalité est utilisée
  fréquemment).
- Cleanup automatique du Storage pour les photos orphelines anciennes
  (script manuel ponctuel suffit pour V1).

## Surveillance long-terme

Calcul à 300 KB/photo, 3 photos/bride, 1500 brides/projet :

- ~1.35 GB par projet
- Free Supabase (1 GB) : insuffisant → **Pro nécessaire**
- Pro Supabase ($25/mois, 100 GB) : ~70 projets — suffisant à moyen terme

Mettre en place une requête mensuelle (`db-inspector`) pour suivre la
consommation :

```sql
-- project_id est dénormalisé sur flange_photos → pas besoin de JOIN
SELECT
  project_id,
  count(*) AS nb_photos,
  count(*) FILTER (WHERE flange_id IS NULL) AS nb_orphelines,
  pg_size_pretty(sum(size_bytes)) AS taille_totale
FROM flange_photos
GROUP BY project_id
ORDER BY sum(size_bytes) DESC;
```

Alerte > 80% du quota Pro (80 GB) → préparer la bascule R2 (Phase C).
