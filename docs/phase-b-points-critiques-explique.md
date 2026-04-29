# Phase B — Les 6 points critiques expliqués simplement

> Document compagnon de `phase-b-photos-terrain.md`. Vulgarise chaque point bloquant pour décision avant implémentation.

---

## Point #1 — Le ré-import J&T détruit toutes les photos terrain

### Ce qui se passe

1. Lundi matin : tu importes le J&T du client → 1500 brides en base
2. Lundi après-midi : tu vas sur site → 50 photos prises
3. Lundi soir : retour wifi → les photos partent dans Storage, indexées en base
4. Mardi : le client t'envoie une **version mise à jour** du J&T
5. Tu cliques "ré-importer"

### Pourquoi ça casse

Le ré-import fait ça :

```
1. Archive les anciennes brides (copie dans flanges_archive)
2. SUPPRIME les anciennes brides de la table flanges
3. Importe les nouvelles (nouveaux UUID)
```

Chaque photo est rattachée à une bride par son **UUID**. La règle DB dit "si tu supprimes une bride, supprime aussi ses photos" (`ON DELETE CASCADE`). Résultat : **50 photos détruites en cascade**, aucune confirmation.

### Pourquoi c'est grave

- Une journée terrain = des heures de marche en zone ATEX
- Le site est peut-être à 500 km
- L'utilisateur n'a **aucune indication** que ses photos vont disparaître
- Le ré-import est **fréquent** (le client renvoie souvent des versions corrigées)

### Les 3 options

| Option                   | Comment                                                | Avantage                           | Inconvénient                           |
| ------------------------ | ------------------------------------------------------ | ---------------------------------- | -------------------------------------- |
| **A. Avertissement**     | Popup avant ré-import : "50 photos seront supprimées"  | Simple                             | Erreur humaine possible                |
| **B. Re-rattachement**   | Si même clé naturelle `(item, repere)`, transfert auto | Aucune perte sur brides conservées | Brides supprimées perdent leurs photos |
| **C. Lien vers archive** | Les photos suivent `flanges_archive`                   | Aucune perte jamais                | Storage qui gonfle, photos zombies     |

**Recommandation** : **B + A combinés** — auto-rattachement quand possible, popup pour celles qui partent.

---

## Point #2 — Course aux numéros : deux photos peuvent crasher l'upload

### Ce qui se passe

Le doc veut numéroter les photos `1, 2, 3...` par bride. Pour la photo n+1, on fait :

```
1. Demande au serveur : "C'est quoi le plus grand numéro existant ?" → réponse : 3
2. On enregistre la nouvelle avec le numéro 4
```

### Pourquoi ça casse

Imagine que tu prennes **2 photos en même temps** (sync auto qui upload en parallèle, ou deux téléphones connectés à ton compte) :

```
Photo A : "Plus grand numéro ?" → 3 → veut être 4
Photo B : "Plus grand numéro ?" → 3 → veut être 4
Photo A : INSERT seq=4 → OK
Photo B : INSERT seq=4 → CRASH (doublon, contrainte UNIQUE violée)
```

C'est ce qu'on appelle une **race condition** : deux opérations qui courent et trébuchent l'une sur l'autre.

En plus, le code essaie de "renommer" le fichier au passage avec une regex `_\d+\.webp$` — si le fichier n'est pas du WebP (jpeg/png aussi autorisés), la regex ne matche pas et le nom devient bizarre.

### Pourquoi c'est grave

- Tu prends 50 photos, une seule plante → frustration
- Le bug n'apparaît que sous charge → invisible en dev, visible en prod
- La regex est un patch fragile qui ajoute de la dette technique

### La solution simple

**Abandonner le numéro de séquence dans le nom de fichier**. Utiliser un UUID :

```
Avant : brides/abc-123/V401_REP12_4.webp
Après : brides/abc-123/8f3d-1a2b.webp
```

Le numéro d'ordre (1er, 2e, 3e photo) est calculé **à l'affichage** par une requête SQL (`ROW_NUMBER() OVER (PARTITION BY flange_id, type ORDER BY taken_at)`). C'est une vue dérivée, pas une donnée stockée.

**Bénéfice** : plus de race condition, plus de regex, plus de simple. Le nom utilisateur peut être affiché séparément ("Photo bride V401 REP12 — 3e prise").

---

## Point #3 — Les photos prises sur des brides nouvelles n'arrivent jamais

### Ce qui se passe

Sur le terrain, en hors-ligne, tu peux **créer une nouvelle bride** (pas dans le J&T initial). Cette bride reçoit un UUID temporaire local : `temp_a7b3...` (préfixe `temp_`).

Tu prends une photo dessus → la photo référence `temp_a7b3...`.

Au sync :

1. Les **mutations textuelles** sont envoyées → le serveur crée la bride avec un vrai UUID `f829...`
2. L'app remplace `temp_a7b3...` par `f829...` dans la table locale `flanges`
3. Les **photos pendantes** sont uploadées → mais elles référencent encore `temp_a7b3...` → **le serveur ne trouve pas la bride** → upload refusé

### Pourquoi c'est grave

- C'est exactement le scénario typique : ajout de bride manquante + photo de cette bride
- L'utilisateur voit "sync OK" pour le texte, et la photo se retrouve bloquée localement
- Le doc original dit lui-même "À gérer" (ligne 372) — autrement dit : **TODO non résolu sur le chemin critique**

### La solution

Quand le sync texte réussit et qu'une bride passe de `temp_xxx` à `serverId`, l'app doit faire **deux** updates en local, pas un :

```
1. flanges : remplace temp_xxx par serverId (déjà fait)
2. pendingPhotos : remplace temp_xxx par serverId (à ajouter) ← MANQUE
```

Les deux updates dans la **même transaction Dexie** (sinon on peut crasher entre les deux et avoir des photos avec une référence morte).

---

## Point #4 — N'importe quel utilisateur connecté peut voir les photos des autres

### Ce qui se passe

Le bucket Storage `photos` est **privé** (pas d'accès public direct). La règle de lecture proposée dit :

> "Tout utilisateur authentifié peut lire le bucket"

Avec le commentaire : "On vérifiera l'ownership dans l'API qui génère les signed URLs".

### Pourquoi ça casse

Cette règle est trop large. Imagine que demain un autre préparateur s'inscrit à l'app. Il a un compte authentifié. Avec un client Supabase configuré côté browser (clé anon publique, qu'on retrouve dans le code source du site), il peut faire :

```js
supabase.storage.from("photos").list("brides/projet-X-id/");
supabase.storage.from("photos").download("brides/projet-X-id/photo.webp");
```

→ Il télécharge les photos de **ton projet à toi**, sans passer par l'API.

La sécurité dépend du fait que personne n'utilise jamais le client Supabase en direct. C'est une hypothèse fragile (un dev futur, un copier-coller, un bug).

### Pourquoi c'est grave

- Photos de site industriel = potentiellement sensibles (équipements client, schémas d'implantation)
- EMIS travaille pour des raffineries / pétrochimie → confidentialité contractuelle
- C'est une faille **silencieuse** : pas d'erreur, juste des données accessibles

### La solution

Restreindre la policy au propriétaire via le préfixe du chemin :

```sql
CREATE POLICY "photos_owner_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'photos'
    AND (storage.foldername(name))[2]::uuid IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );
```

(Le 2e segment du chemin `brides/<project_id>/file.webp` = `<project_id>` → check direct.)

**Ou plus simple** : ne donner SELECT qu'à `service_role`, et **toujours** passer par l'API qui génère des signed URLs courtes (5-15 min). Le client n'a jamais l'accès direct au bucket.

---

## Point #5 — Fichier orphelin si la base lâche après l'upload

### Ce qui se passe

L'API d'upload fait deux étapes :

```
1. Upload du fichier dans Storage → OK (fichier de 300 KB sur disque Supabase)
2. INSERT en base "photo X est à tel chemin" → ÉCHEC (timeout, contrainte, bug...)
3. Retourne erreur 500 au client
```

Le client reçoit une erreur → réessaie → l'étape 1 ré-uploade un nouveau fichier → l'étape 2 réussit cette fois.

### Pourquoi ça casse

Le **premier fichier de l'étape 1 reste sur Storage**, sans index en base, **pour toujours**. C'est un fichier orphelin.

Ça paraît anodin, mais :

- Multiplie sur des semaines de prod → des centaines de fichiers fantômes
- Tu paies pour ce stockage chez Supabase
- Aucun moyen simple de les retrouver (ils ne sont liés à rien)
- Au moment où tu approches le quota, t'as 30% de Mo "perdus"

### Pourquoi c'est grave

- Pas un crash visible, donc personne ne le voit
- Coût qui s'accumule en silence
- Faut écrire un script de nettoyage plus tard pour les retrouver

### La solution

Si l'INSERT échoue, supprimer le fichier qu'on vient d'uploader :

```ts
const { error: insertErr } = await supabase.from("flange_photos").insert(...);
if (insertErr) {
  await supabase.storage.from("photos").remove([storagePath]); // ← rollback
  return NextResponse.json({ error: insertErr.message }, { status: 500 });
}
```

Une ligne. Ça évite des heures de debug 6 mois plus tard.

---

## Point #6 — La migration passe par une porte dérobée au lieu du pipeline officiel

### Ce qui se passe

Le projet a un **pipeline officiel** pour appliquer des changements de schéma DB :

```bash
# 1. Tu écris le SQL dans supabase/migrations/00X_xxx.sql
# 2. Tu lances :
supabase db push
# 3. Le serveur applique ce qui manque, version par version
```

C'est traçable : `supabase migration list` te dit exactement où tu en es.

Le doc Phase B dit (ligne 49) :

> "Appliquer via Management API (curl + SUPABASE_ACCESS_TOKEN)"

Et ensuite :

> "ET mettre à jour `supabase/migrations/001_schema.sql`" (le squash canonique)

### Pourquoi ça casse

Tu envoies du SQL **directement** au serveur Supabase via curl. Ça marche, mais :

1. **Le pipeline ne sait pas que t'as fait ça**. `supabase migration list` montre 001 + 002 sur le serveur, mais il y a en réalité des objets en plus que personne n'a tracé
2. **Modifier le squash 001** veut dire que si quelqu'un démarre une nouvelle base à zéro, il a la table photos. Mais une base déjà en prod avec 001+002 appliqués n'a **rien à appliquer** (le squash est `IF NOT EXISTS`, donc skip)
3. Donc en prod, la table existe parce que tu l'as poussée par curl. Si tu désinstalles et re-push avec le pipeline propre, tu redécouvres la table, sans changement
4. Mais **un autre dev** qui clone le repo et fait `supabase db reset` n'aura pas le même état que toi → drift silencieux
5. Pas de rollback possible (le pipeline ne sait pas annuler ce qu'il n'a pas appliqué)

### Pourquoi c'est grave

- Court terme : ça marche, t'as ta table
- Moyen terme : drift entre `supabase/migrations/`, l'état réel de la prod, et l'état d'une base fraîche → bugs reproductibles uniquement dans certains environnements
- Long terme : impossible de retrouver l'historique propre du schéma → audits, rollbacks, debug très lents

### La solution

Créer un fichier **`supabase/migrations/003_flange_photos.sql`** avec :

- `CREATE TABLE IF NOT EXISTS flange_photos (...)`
- `CREATE POLICY` (idempotent : `DROP POLICY IF EXISTS` puis `CREATE`)
- `GRANT ALL ON flange_photos TO ...`
- `CREATE OR REPLACE FUNCTION delete_project_cascade(...)` (la version mise à jour)

Puis :

```bash
SUPABASE_ACCESS_TOKEN=sbp_xxx npx supabase db push
```

Une seule commande, 100% traçable, reproductible, pas de curl. C'est exactement le workflow décrit dans `.claude/rules/api-conventions.md`.

---

## Récap pour décision

| #   | Point                       | Décision attendue                                           | Effort             |
| --- | --------------------------- | ----------------------------------------------------------- | ------------------ |
| 1   | Photos perdues au ré-import | **Métier** : choisir A / B / C / B+A                        | Moyen (B+A)        |
| 2   | Race condition sequence     | **Technique** : passer aux UUID dans path                   | Faible (simplifie) |
| 3   | Mapping temp→serverId       | **Technique** : update Dexie atomique                       | Faible             |
| 4   | RLS Storage trop large      | **Sécurité** : restreindre par préfixe ou service_role-only | Faible             |
| 5   | Fichiers orphelins          | **Code** : ajouter rollback Storage                         | Très faible        |
| 6   | Migration hors pipeline     | **Process** : créer 003.sql + db push                       | Très faible        |

**Le seul point qui demande ton arbitrage métier est le #1.** Les 5 autres sont des choix techniques pour lesquels je peux proposer la version "propre" par défaut.

Veux-tu qu'on règle d'abord le #1, puis je mets à jour le doc Phase B avec les corrections des 5 autres ?
