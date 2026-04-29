# Mapping J&T — En-têtes Excel → Champs DB

Fichier source : `data/J&T REV E - 20250209 pour correction.xlsm`
Table cible : `flanges`

L'import est **adaptatif** : la position des colonnes peut bouger d'un arrêt à l'autre. Le mapping s'appuie sur le **nom des en-têtes** (ligne 3) et sur les **synonymes** déclarés dans `src/lib/excel/synonyms.ts`. Les colonnes séparatrices vides (`Colonne1`, `Colonne2`, `Colonne3`) et les en-têtes inconnus sont ignorés ou stockés en `extra_columns` JSONB.

---

## Les 5 catégories (ligne 2 de la feuille J&T)

| Catégorie Excel        | Contenu                                                                      |
| ---------------------- | ---------------------------------------------------------------------------- |
| **CARACTERISTIQUES**   | Identité du repère + DN/PN relevés EMIS                                      |
| **TRAVAUX + MATERIEL** | Côté EMIS — opération, joints/brides pleines, matériel, sécurité             |
| **JOINTS ET TIGES**    | Côté EMIS — boulonnerie/joint relevés sur la bride                           |
| **DIVERS**             | Identifiants externes + alertes (Ubleam, amiante, robinetterie, échaf, calo) |
| **DONNEES CLIENT**     | Vue miroir BUTA                                                              |

---

## CARACTERISTIQUES

| En-tête Excel   | Champ DB           | Type | Notes                                                  |
| --------------- | ------------------ | ---- | ------------------------------------------------------ |
| N°ITEM          | nom                | TEXT | Lien LUT via ITEM                                      |
| ZONE            | zone               | TEXT |                                                        |
| FAMILLE TRAVAUX | famille_travaux    | TEXT |                                                        |
| TYPE ITEM       | type               | TEXT |                                                        |
| REPERE CLIENT   | repere_buta        | TEXT | Repère officiel donneur d'ordres                       |
| REPERE EMIS     | repere_emis        | TEXT | Sous-repère ajouté par EMIS                            |
| Com. Repere     | commentaire_repere | TEXT | Précision sur les sous-repères                         |
| DN              | dn_emis            | TEXT | Triplet DN (EMIS)                                      |
| PN              | pn_emis            | TEXT | Triplet PN (EMIS). 20 = CL150, 50 = CL300, 100 = CL600 |

> `delta_dn` et `delta_pn` ne sont pas dans le fichier — colonnes DB `GENERATED` calculées automatiquement.

---

## TRAVAUX + MATERIEL

Tout est côté **EMIS** (intervention planifiée).

| En-tête Excel       | Champ DB            | Type | Notes                                        |
| ------------------- | ------------------- | ---- | -------------------------------------------- |
| OPERATION EMIS      | operation           | TEXT | **Colonne moteur**                           |
| NB JP EMIS          | nb_jp_emis          | TEXT | Joints pleins (platines)                     |
| NB BP EMIS          | nb_bp_emis          | TEXT | Brides pleines                               |
| NB JT PROV          | nb_joints_prov_emis | TEXT | Joints provisoires                           |
| NB JT DEF           | nb_joints_def_emis  | TEXT | Joints définitifs                            |
| MATERIEL SPECIFIQUE | materiel_emis       | TEXT | Matériel particulier en plus du standard     |
| SECURITE            | materiel_adf        | TEXT | Anti-Déflagrant (bronze) ou autre contrainte |
| CLE                 | cle                 | TEXT | Taille de clé (déterminée par le DN)         |

---

## JOINTS ET TIGES

Côté **EMIS** — relevé terrain.

| En-tête Excel | Champ DB            | Type | Notes                        |
| ------------- | ------------------- | ---- | ---------------------------- |
| NB TIGES      | nb_tiges_emis       | TEXT | Triplet quantité tiges       |
| TIGES         | dimension_tige_emis | TEXT | Texte libre, ex : `M14 x 80` |
| MAT TIGES     | matiere_tiges_emis  | TEXT | Triplet matière tiges        |
| MAT JT        | matiere_joint_emis  | TEXT | Triplet matière joint        |
| RONDELLES     | rondelle_emis       | TEXT | `oui`/`non`                  |
| FACE DE BRIDE | face_bride_emis     | TEXT | RF, RTJ, etc.                |

---

## DIVERS

| En-tête Excel   | Champ DB      | Type | Notes                                                                                                                                                        |
| --------------- | ------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ID UBLEAM       | id_ubleam     | TEXT | Identifiant Ubleam (peut être numérique)                                                                                                                     |
| AMIANTE / PLOMB | amiante_plomb | TEXT | Alerte sécurité matière dangereuse                                                                                                                           |
| N° ROB          | num_rob       | TEXT | Numéro de fiche robinetterie. Remplace le boolean `rob`. Au sein d'un même item, deux brides partageant le même `num_rob` forment une vanne (paire ADM/REF). |
| ECHAF           | echafaudage   | TEXT | Échafaudage requis                                                                                                                                           |
| CALO            | calorifuge    | TEXT | Calorifuge à déposer/reposer                                                                                                                                 |

---

## DONNEES CLIENT

Vue miroir BUTA — la plupart des champs EMIS ont leur jumeau client.

| En-tête Excel        | Champ DB            | Type | Notes                                                                    |
| -------------------- | ------------------- | ---- | ------------------------------------------------------------------------ |
| DN CLIENT            | dn_buta             | TEXT |                                                                          |
| PN CLIENT            | pn_buta             | TEXT |                                                                          |
| OPERATION client     | operation_buta      | TEXT | Vue miroir BUTA d'`operation` (pas de triplet RETENU pour l'instant)     |
| NB PLAT. CLIENT      | nb_jp_buta          | TEXT | Platines = joints pleins                                                 |
| Nb BP CLIENT         | nb_bp_buta          | TEXT |                                                                          |
| NB JOINT PROV CLIENT | nb_joints_prov_buta | TEXT |                                                                          |
| NB JOINT DEF CLIENT  | nb_joints_def_buta  | TEXT |                                                                          |
| NB TIGES CLIENT      | nb_tiges_buta       | TEXT |                                                                          |
| DIM. TIGES CLIENT    | dimension_tige_buta | TEXT |                                                                          |
| MAT TIGE CLIENT      | matiere_tiges_buta  | TEXT |                                                                          |
| MATIERE JOINT CLIENT | matiere_joint_buta  | TEXT |                                                                          |
| RONDELLES CLIENT     | rondelle_buta       | TEXT |                                                                          |
| FACE DE BRIDE CLIENT | face_bride_buta     | TEXT |                                                                          |
| Sécurité CLIENT      | securite_buta       | TEXT | Vue miroir BUTA de `materiel_adf` (pas de triplet RETENU pour l'instant) |
| SAP CLIENT           | sap_buta            | TEXT | Référence article SAP côté client                                        |

---

## Champs RETENU (générés en base)

Colonnes DB `GENERATED ALWAYS AS COALESCE(*_emis, *_buta) STORED` — non importées, non éditables :

`dn_retenu`, `pn_retenu`, `nb_jp_retenu`, `nb_bp_retenu`, `nb_tiges_retenu`, `matiere_tiges_retenu`, `dimension_tige_retenu`, `nb_joints_prov_retenu`, `nb_joints_def_retenu`, `matiere_joint_retenu`, `rondelle_retenu`, `face_bride_retenu`, `delta_dn`, `delta_pn`.

---

## Feuilles de référence

| Feuille                    | Table DB       | Usage                                                                               |
| -------------------------- | -------------- | ----------------------------------------------------------------------------------- |
| **Operations** (31 lignes) | operations_ref | Correspondance opération → nb joints/brides attendus                                |
| **LISTES DEROULANTES**     | dropdown_lists | Listes de validation (zones, familles, types)                                       |
| **Tiges** (~113 lignes)    | bolt_specs     | Table DN/PN → specs tiges (diamètre, longueur, quantité, clé) pour brides RF et RTJ |

---

## Règle triplet

Pour chaque triplet EMIS / CLIENT / RETENU :

- **EMIS** = relevé terrain (saisi à l'import ou via la PWA terrain)
- **CLIENT** = théorie BUTA (importée du J&T, colonnes `… CLIENT`)
- **RETENU** = `COALESCE(EMIS, CLIENT)` — le terrain prime toujours, généré en base

---

## Notes import

- Les en-têtes sont en **ligne 3** (la ligne 2 contient les catégories fusionnées, à ignorer pour le mapping).
- Les colonnes séparatrices (`Colonne1`, `Colonne2`, `Colonne3`) sont vides et inutilisées.
- Tous les champs DB issus de l'import sont en `TEXT` brut — pas de conversion à l'insertion (voir `.claude/rules/db-schema.md`).
- Les en-têtes inconnus partent en `extra_columns` JSONB pour zéro perte de données.
