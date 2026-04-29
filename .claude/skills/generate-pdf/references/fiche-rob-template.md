# Template — Fiche relevé robinetterie

Source : `data/FICHES_RELEVES_ROB_20251020 modif cedric.xlsm`

> **TODO** : Analyser le fichier Excel modèle en détail pour documenter la structure exacte.
> Utiliser l'agent excel-analyst pour extraire la mise en page.

## Structure attendue (basée sur le fichier Excel)

### En-tête

- Logo EMIS (optionnel)
- Titre : "FICHE RELEVÉ ROBINETTERIE"
- Projet / Client / Unité
- ITEM et nom de l'équipement
- Date / Révision

### Corps — Tableau des brides

Pour chaque bride de l'équipement :

| Colonne         | Source                     |
| --------------- | -------------------------- |
| Repère          | repere_buta ou repere_emis |
| DN              | dn retenu                  |
| PN              | pn retenu                  |
| Opération       | operation                  |
| Nb tiges        | nb_tiges retenu            |
| Matière tiges   | matiere_tiges retenu       |
| Dimensions tige | dimension_tige_retenu      |
| Matière joint   | matiere_joint_retenu       |
| Nb joints prov  | nb_joints_prov_retenu      |
| Nb joints déf   | nb_joints_def_retenu       |
| Face bride      | face_bride_retenu          |
| Rondelle        | rondelle_retenu            |
| Commentaires    | commentaires               |

### Pied de page

- Préparateur / Vérificateur
- Date
- Révision

## Alertes visuelles

- **DELTA DN** ou **DELTA PN** → cellule en rouge
- **Valeur manquante** sur champ obligatoire → cellule en orange
