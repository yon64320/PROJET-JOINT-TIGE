# Table de correspondance Opérations

Source : feuille "Operations" du fichier `data/J&T REV E - 20250209 pour correction.xlsm`

Cette table sera extraite du fichier Excel lors de l'implémentation.
Chaque type d'opération détermine automatiquement :

| Champ | Description |
|-------|-------------|
| nb_jp | Nombre de joints pleins (platines) |
| nb_bp | Nombre de brides pleines |
| nb_joints_prov | Nombre de joints provisoires nécessaires |
| nb_joints_def | Nombre de joints définitifs nécessaires |

## Principe

Quand le préparateur sélectionne une opération (col X), les quantités de joints et brides se remplissent automatiquement. C'est le moteur du fichier J&T.

## Exemples courants d'opérations

- Ouverture simple → 1 joint provisoire, 1 joint définitif
- Ouverture avec platinage → joints + platines
- Remplacement de joint → 1 joint définitif uniquement
- etc.

> **TODO** : Extraire les 31 lignes exactes de la feuille Operations via l'agent excel-analyst.
