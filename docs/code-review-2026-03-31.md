# Code Review — Commit `3c64391`
**Date** : 2026-03-31
**Scope** : Import adaptatif + bouton sauvegarde explicite
**Outil** : skill `code-review-expert`
**Reviewer** : Claude Code (Sonnet 4.6)

---

## Résumé

**Fichiers analysés** : 35 fichiers, ~3848 insertions / 587 suppressions
**Verdict global** : REQUEST_CHANGES

Ce commit introduit l'architecture d'import adaptatif (détection automatique des en-têtes, fuzzy matching, templates réutilisables, colonnes extra en JSONB). Le travail est solide dans l'ensemble, mais deux bugs fonctionnels (P1) bloquent des features clés, et plusieurs points P2 méritent d'être adressés.

---

## Findings

### P0 — Critical
*(aucun)*

---

### P1 — High (à fixer avant merge / dès que possible)

#### 1. Race condition JSONB — `flanges/route.ts` & `ot-items/route.ts`

**Fichiers** : `src/app/api/flanges/route.ts:34-44` et `src/app/api/ot-items/route.ts:34-44`

**Problème** : le pattern read-modify-write pour les colonnes extra :
```ts
const { data: current } = await supabase.from("flanges").select("extra_columns").eq("id", id).single();
const extraCols = (current?.extra_columns as Record<string, unknown>) ?? {};
extraCols[extra_field] = value;
await supabase.from("flanges").update({ extra_columns: extraCols }).eq("id", id)
```
Deux requêtes simultanées lisent le même `extra_columns`, fusionnent chacune de leur côté, et la deuxième écrase la première. Perte silencieuse de données en édition concurrente.

**Fix** : merge atomique via l'opérateur JSONB Postgres :
```sql
UPDATE flanges
SET extra_columns = extra_columns || jsonb_build_object($key, $value)
WHERE id = $id
```
Ou via une fonction RPC Supabase `merge_extra_column`.

---

#### 2. Synonym learning jamais déclenché — `confirm/route.ts`

**Fichier** : `src/app/api/import/confirm/route.ts:54-66`

**Problème** :
```ts
const excelHeader = mapping.extraColumns.find((ec) => ec.index === colIndex)?.header;
if (!excelHeader) continue; // ← toujours undefined !
```
`mapping.extraColumns` contient les colonnes **non mappées** (inconnues). Les colonnes mappées ne s'y trouvent jamais. `learnSynonym` ne s'exécute donc jamais — le système d'apprentissage automatique des synonymes est cassé depuis le premier import.

**Fix** : reconstruire un index inverse `colIndex → excelHeader` depuis les en-têtes détectés (passés dans `mapping` ou reconstitués), pas depuis `extraColumns`.

---

### P2 — Medium (à corriger dans ce sprint ou ticket de suivi)

#### 3. Fingerprint template incorrect — `confirm/route.ts:81-83`

```ts
const fingerprint = computeFingerprint(
  Object.values(mapping.columnMap).map(String) // → ["0", "1", "4", "7"…] (indices !)
);
```
`computeFingerprint` reçoit des indices numériques au lieu des en-têtes Excel. Le fingerprint sera `"0|1|14|4|7|..."` — inutilisable pour retrouver un template futur. Utiliser le `fingerprint` déjà calculé et envoyé par le frontend via `formData.get("fingerprint")`.

---

#### 4. Pas de limite de taille fichier — `confirm/route.ts:41`

`await file.arrayBuffer()` charge tout en RAM sans vérification préalable. Un fichier malformé ou volumineux pourrait saturer la mémoire.

**Fix** :
```ts
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
if (file.size > MAX_SIZE) {
  return NextResponse.json({ error: "Fichier trop volumineux (max 50 MB)" }, { status: 413 });
}
```

---

#### 5. `getStr` / `getBool` dupliqués et incohérents

`getStr` est copié-collé à l'identique dans `import-lut.ts` et `import-jt.ts`. `getBool` dans `import-lut.ts` utilise `v === true || v === "X"` alors que le champ `rob` dans `import-jt.ts` fait `["OUI", "X", "O"].includes(...)`. Deux conventions différentes pour des types similaires.

**Fix** : extraire dans `src/lib/db/utils.ts` un `getStr` et `getBool` commun avec logique unifiée.

---

#### 6. Détection ligne d'en-tête : exact match seulement — `detect-columns.ts:100-120`

`detectHeaderRow` ne fait que du matching exact. Si un fichier a des en-têtes légèrement différents des synonymes builtin, la mauvaise ligne peut être choisie. Pourtant `matchColumns` implémente 3 passes de fuzzy matching.

**Fix** : réutiliser `matchColumns` pour scorer chaque ligne candidate dans `detectHeaderRow`.

---

#### 7. SRP violation : `confirm/route.ts` fait tout

Un seul handler gère : parsing multipart, parsing Excel, extraction metadata, apprentissage synonymes, sauvegarde template, import LUT, import JT, mise à jour projet (~180 lignes de logique métier dans une route).

**Fix (non urgent)** : extraire un `ImportOrchestrator` service qui orchestre ces étapes. La route ne fait que parser la request et retourner la réponse.

---

### P3 — Low (optionnel)

#### 8. Levenshtein O(m×n) en phase 3 — `detect-columns.ts:187-209`

Pour 77 colonnes J&T × N synonymes, la phase 3 est quadratique. Rapide en pratique (strings courtes) mais à noter pour maintenabilité future.

---

#### 9. Désynchronisation silencieuse rows/metadata — `confirm/route.ts:48-50`

```ts
rows.forEach((row, i) => { row.cell_metadata = metadata[i] ?? {}; });
```
Si `extractCellMetadata` retourne moins de lignes, l'assignation est silencieuse. Ajouter un `console.warn` si `metadata.length !== rows.length`.

---

#### 10. Double entrée Map item/lowercase — `import-jt.ts:70-71`

```ts
map.set(ot.item, ot.id);
map.set(ot.item.trim().toLowerCase(), ot.id);
```
Si `ot.item` est déjà normalisé, la seconde entrée écrase la première inutilement. Mineur mais potentielle source de confusion.

---

## Plan de suppression

| Code | Statut | Action recommandée |
|------|--------|--------------------|
| Route `/api/import` (ancienne) | Potentiellement orpheline — remplacée par `/api/import/confirm` + `/api/import/detect` | Vérifier les références, supprimer si inutilisée |
| État `result` dans `import/page.tsx` | Déjà remplacé par `lutResult`/`jtResult` dans ce commit | ✓ Fait |

---

## Suggestions additionnelles

- Le `limit(10000)` (augmenté depuis 5000) est un bon fix conservatoire. À surveiller si le projet grossit — prévoir pagination ou streaming pour les très gros arrêts.
- La logique de matching flexible `itemMap.get(nom) ?? itemMap.get(nom.trim().toLowerCase())` est bien. Attention : si le `set` double (lignes 70-71) est correct, le `??` ne sera jamais activé car les deux clés pointent toujours vers le même id.
- Le fuzzy matching Levenshtein avec seuil `ratio > 0.7` est bien calibré pour du header Excel industriel — bon choix.

---

## Comptage final

| Sévérité | Nb | Description |
|----------|----|-------------|
| P0 | 0 | — |
| P1 | 2 | Race condition JSONB, synonym learning cassé |
| P2 | 5 | Fingerprint incorrect, taille fichier, duplication getStr, détection header, SRP |
| P3 | 3 | Levenshtein perf, metadata silencieux, double map |

**Priorité immédiate** : corriger P1 #2 (synonym learning) qui bloque une feature annoncée, et P1 #1 (race condition) qui peut causer perte de données.
