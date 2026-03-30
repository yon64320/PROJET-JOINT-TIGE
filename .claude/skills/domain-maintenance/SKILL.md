---
name: domain-maintenance
description: Logique métier des arrêts de maintenance industrielle EMIS. Utiliser quand on implémente des règles métier, des validations, ou qu'on a besoin de comprendre le vocabulaire (triplet, opérations, familles, DN/PN, TB/TC/TA).
user-invocable: false
---

# Skill : Logique métier — Arrêts de maintenance industrielle

## Concepts fondamentaux

### Le triplet EMIS / BUTA / RETENU
Pattern central du J&T. Pour chaque donnée mesurable :
- **EMIS** = valeur relevée sur le terrain par le préparateur
- **BUTA** = valeur théorique fournie par le donneur d'ordres (client)
- **RETENU** = `COALESCE(EMIS, BUTA)` — **le terrain prime toujours**
- **DELTA** = signal d'alerte quand EMIS ≠ BUTA (uniquement DN et PN)

Triplets dans le J&T : DN, PN, nb tiges, matière tiges, matière joint.

### La colonne OPERATION (colonne moteur)
Colonne X du J&T. Détermine automatiquement via la table de correspondance (feuille "Operations") :
- Nombre de joints pleins (JP = platines)
- Nombre de brides pleines (BP)
- Nombre de joints provisoires
- Nombre de joints définitifs

Voir [table des opérations](references/operations-table.md) pour le détail.

### Familles d'items (col M de la LUT)
- **Equipement** : échangeur, colonne, ballon, aéro, capacité, réacteur, filtre
- **Intervention** : travaux transverses (pas un équipement spécifique)
- **NC** : non-conformité
- **OTG** : ordre de travail général
- **Robinetterie** : vannes, soupapes
- **Tuyauterie** : tuyaux, piquages

### Statut OT (col Q)
- **TB** = Travaux de Base (forfait contractuel)
- **TC** = Travaux Complémentaires (hors forfait, plus cher)
- **TA** = Travaux Annulés

### Types de travaux / Corps de métier (col O)
- **H0** = Montage/Levage
- **K0** = Chaudronnerie/Soudure
- **L0** = Nettoyage industriel
- **N0** = Calorifuge
- **T0** = Tuyauterie

### DN et PN
- **DN** = Diamètre Nominal (en mm)
- **PN** = Pression Nominale (en bar). Équivalences : PN 20 = CL150, PN 50 = CL300, PN 100 = CL600

### Repérage des brides
- **Repère BUTA** (col F) = repère donné par le client
- **Repère EMIS** (col G) = repère terrain quand le client n'est pas assez précis
  - Exemple : une vanne = 2 brides mais 1 seul repère client → EMIS ajoute un suffixe

## Vocabulaire

Voir [glossaire](references/glossaire.md) pour la liste complète.
