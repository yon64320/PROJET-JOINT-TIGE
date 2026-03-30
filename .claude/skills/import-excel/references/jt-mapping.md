# Mapping J&T — Colonnes Excel → Champs DB

Fichier source : `data/J&T REV E - 20250209 pour correction.xlsm`
Table cible : `flanges`

## Feuille principale (données brides)

| Col Excel | Nom Excel | Champ DB | Type | Notes |
|-----------|-----------|----------|------|-------|
| A | ID UBLEAM | id_ubleam | TEXT | Identifiant Ubleam |
| B | NOM | nom | TEXT | Lien LUT via ITEM |
| C | ZONE | zone | TEXT | |
| D | FAMILLE | famille_travaux | TEXT | |
| E | TYPE | type | TEXT | |
| F | REPERE BUTA | repere_buta | TEXT | Repère client |
| G | REPERE EMIS | repere_emis | TEXT | Complément terrain |
| H | REPERE UBLEAM | repere_ubleam | TEXT | |
| I | COMMENTAIRE | commentaire_repere | TEXT | |
| J-P | — | — | — | Non utilisées, ignorées |
| Q | DN EMIS | dn_emis | NUMERIC | Triplet DN |
| R | DN BUTA | dn_buta | NUMERIC | |
| S | DELTA DN | delta_dn | BOOLEAN | Calculé (generated column) |
| T | PN EMIS | pn_emis | NUMERIC | Triplet PN. 20=CL150, 50=CL300, 100=CL600 |
| U | PN BUTA | pn_buta | NUMERIC | |
| V | DELTA PN | delta_pn | BOOLEAN | Calculé |
| X | OPERATION | operation | TEXT | **Colonne moteur** |
| Y | BARRETTE | barrette | TEXT | |
| Z | NB JP EMIS | nb_jp_emis | INTEGER | Joints pleins (platines) |
| AA | NB JP BUTA | nb_jp_buta | INTEGER | |
| AB | NB BP EMIS | nb_bp_emis | INTEGER | Brides pleines |
| AC | NB BP BUTA | nb_bp_buta | INTEGER | |
| AD | MATERIEL EMIS | materiel_emis | TEXT | |
| AE | MATERIEL BUTA | materiel_buta | TEXT | |
| AF | MATERIEL ADF | materiel_adf | TEXT | |
| AG | CLE | cle | TEXT | |
| AI | NB TIGES EMIS | nb_tiges_emis | INTEGER | Triplet tiges quantité |
| AJ | NB TIGES BUTA | nb_tiges_buta | INTEGER | |
| AK | NB TIGES RETENU | nb_tiges_retenu | INTEGER | Calculé (generated) |
| AL | MAT TIGES EMIS | matiere_tiges_emis | TEXT | Triplet tiges matière |
| AM | MAT TIGES BUTA | matiere_tiges_buta | TEXT | |
| AN | MAT TIGES RETENU | matiere_tiges_retenu | TEXT | Calculé (generated) |
| AR | DIAMETRE TIGE | diametre_tige | NUMERIC | |
| AV | LONGUEUR TIGE | longueur_tige | NUMERIC | |
| AW+ | NB JOINTS PROV | nb_joints_prov | INTEGER | Piloté par col X |
| — | NB JOINTS DEF | nb_joints_def | INTEGER | Piloté par col X |
| BA | MAT JOINT EMIS | matiere_joint_emis | TEXT | Triplet joint matière |
| BB | MAT JOINT BUTA | matiere_joint_buta | TEXT | |
| BC | MAT JOINT RETENU | matiere_joint_retenu | TEXT | Calculé (generated) |
| BD | RONDELLE | rondelle | TEXT | |
| BE | FACE DE BRIDE | face_bride | TEXT | |
| BF-BG | COMMENTAIRES | commentaires | TEXT | |

## Feuilles de référence

| Feuille | Table DB | Usage |
|---------|----------|-------|
| Operations (31 rows) | operations_ref | Correspondance opération → nb joints/brides |
| LISTES DEROULANTES (17 rows) | dropdown_lists | Listes de validation |
| Tiges (113 rows) | — | Table DN/PN → specs tiges (à importer en référence) |
| APPRO (2915 rows) | — | Vue approvisionnement (générée, pas importée) |

## Règle triplet

Pour chaque triplet (EMIS/BUTA/RETENU) :
- RETENU = COALESCE(EMIS, BUTA) — le terrain prime toujours
- Les colonnes RETENU sont des `GENERATED ALWAYS AS` en PostgreSQL
