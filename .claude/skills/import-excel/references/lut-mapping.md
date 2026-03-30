# Mapping LUT — Colonnes Excel → Champs DB

Fichier source : `data/BUTACHIMIE - LUT- 20260303.xlsm`
Table cible : `ot_items`

| Col Excel | Nom Excel | Champ DB | Type | Notes |
|-----------|-----------|----------|------|-------|
| A | N° LIGNE | numero_ligne | INTEGER | Numéro séquentiel |
| B | N° OT | ot | TEXT | Identifiant OT |
| C | LOT | lot | TEXT | |
| H | UNITE | unite | TEXT | BUTADIENE, SYNTHESE, TF99 |
| I | ITEM | item | TEXT NOT NULL | **Clé métier** — unique par projet |
| L | TITRE GAMME | titre_gamme | TEXT | Description des travaux |
| M | FAMILLE ITEM | famille_item | TEXT | Equipement, Intervention, NC, OTG, Robinetterie, Tuyauterie |
| N | TYPE ITEM | type_item | TEXT | Colonne, Filtre, Ballon, Echangeur, Aéro, Capacité, Réacteur... |
| O | TYPE TRAVAUX | type_travaux | TEXT | H0, K0, L0, N0, T0 |
| Q | TB/TC/TA | statut | TEXT | TB=Base, TC=Complémentaire, TA=Annulé |
| AB | ECHAF | corps_metier_echaf | BOOLEAN | "X" = true |
| AC | CALO | corps_metier_calo | BOOLEAN | "X" = true |
| AD | MONTAGE | corps_metier_montage | BOOLEAN | "X" = true |
| AE | METAL | corps_metier_metal | BOOLEAN | "X" = true |
| AF | FOURNITURE | corps_metier_fourniture | BOOLEAN | "X" = true |
| AG | NETTOYAGE | corps_metier_nettoyage | BOOLEAN | "X" = true |
| AH | AUTRES | corps_metier_autres | BOOLEAN | "X" = true |
| AI | REVISION | revision | TEXT | |
| AK | COMMENTAIRES | commentaires | TEXT | |

## Colonnes ignorées (non stockées en DB)

- D-G : colonnes intermédiaires (pas d'info utile)
- J-K : réservées
- P : réservée
- R-AA : colonnes de calcul / heures / effectifs (Phase B)
