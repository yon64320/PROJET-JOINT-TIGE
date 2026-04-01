# Rob — Relevé Robinetterie

## Qu'est-ce que le Relevé Rob ?

Le Relevé Rob est le fichier de suivi de **toute la robinetterie nécessitant un traitement spécifique** pendant l'arrêt. Seules les vannes dans l'un de ces trois cas de figure sont répertoriées :

1. **Échange standard** — on remplace la vanne par une neuve
2. **Dépose repose révision** — on dépose la vanne, on l'envoie en atelier pour révision, puis on la repose
3. **Dépose repose sans révision** — on dépose la vanne pour que l'inspection la contrôle sur place, puis on la repose

Les vannes simplement déposées et reposées (sans échange ni révision ni inspection) ne figurent pas dans ce fichier.

Fichier actuel : `FICHES_RELEVES_ROB_20251020 modif cedric.xlsm`

---

## Deux types de robinetterie

| Type | Description | Exemple |
|------|-------------|---------|
| **Équipement** | La vanne est rattachée à l'OT d'un équipement. Elle apparaît sur l'ordre de travail de l'équipement parent | Deux soupapes en haut d'une colonne → notées sur l'OT de la colonne |
| **Vanne** | L'OT est dédié uniquement à la vanne | Un OT ne contient que le changement ou la révision de cette vanne |

La colonne **GAMME** (H) distingue ces deux cas : `gamme équipement` ou `gamme vanne`.

---

## Structure du fichier

**5 feuilles :**

| Feuille | Contenu |
|---------|---------|
| **DONNEES ROB** | Feuille principale — 178 vannes, 85 colonnes |
| TABLEAU POIDS | Table de référence : poids des vannes en fonction du DN, PN et type |
| FICHE INTERVENTION | Template des fiches de robinetterie (premier livrable PDF à générer automatiquement) |
| TRAME FEB | Trame des Fiches d'Expression du Besoin |
| APPRO | Hors périmètre |

### Feuille DONNEES ROB

- Ligne 2 : titre
- Lignes 3-4 : compteurs d'avancement (formules automatiques)
- Ligne 5 : **en-têtes de groupes** (3 blocs)
- Ligne 6 : **en-têtes de colonnes**
- **Ligne 7 : début des données** → 178 lignes

---

## Colonnes détaillées — Feuille DONNEES ROB

### Identification et contexte (A-N)

| Col | Nom | Description |
|-----|-----|-------------|
| A | RESPONSABLE | Chef de chantier assigné à la vanne |
| **B** | **NUMERO CLIENT** | Clé de ligne — nom de l'OT + repère de la vanne. Format : `S1-B5103-VMA` |
| D | COMMENTAIRE | Remarques libres |
| **E** | **Repère REF** | Repère du côté refoulement de la vanne sur les plans client |
| **F** | **Repère ADM** | Repère du côté admission de la vanne sur les plans client |
| **G** | **POSTE TECHNIQUE** | Numéro de l'ordre de travail |
| **H** | **GAMME** | `gamme équipement` ou `gamme vanne` — détermine le type de robinetterie |
| I | TYPE OT | Non utilisé actuellement |
| **J** | **CIRCUIT** | Circuit sur lequel se trouve la vanne — important pour les consignations |
| **K** | **TYPE** | Type de robinetterie : **Vanne manuelle**, **Soupape**, **Vanne automatique**, **Clapet**, **Autre** |
| L | ZONES BUTA | Sous-zone définie par le client. Non importante pour le projet |
| **M** | **ZONE** | Zone où se situe l'équipement |
| **N** | **EQPT A PROXIMITE** | Équipement à proximité — sert au repérage terrain pour localiser la vanne |

> Colonne C (CORRESPONDANCE EASY) : spécifique au projet actuel, non prise en compte.

### Travaux et suivi (O-R)

| Col | Nom | Description |
|-----|-----|-------------|
| **O** | **TRAVAUX** | Type d'intervention : **Échange standard** / **Dépose repose révision** / **Dépose repose sans révision** |
| **P** | **TRANSPORT** | Vers quel atelier/lieu la vanne est transportée |
| **Q** | **SCOPE BASE / TC** | Statut : **TB** (travaux de base), **TC** (travaux complémentaires), **TA** (travaux annulés — conservés pour traçabilité) |
| R | REV | Révision à laquelle la vanne est apparue dans le périmètre |

### Photos et repérage (S-U)

| Col | Nom | Description |
|-----|-----|-------------|
| S | Ref Photo | Photo de la vanne elle-même |
| T | Repérage Plot plan PID | Screenshot du PID montrant l'implantation de la vanne |
| U | Repérage Plot plan Equipement | Photo de l'implantation sur le plan d'implantation |

Ces trois colonnes contiennent des noms de fichiers photos des png dans le dossier conetnant toutes les photos

### Dimensions et caractéristiques (V-Z)

| Col | Nom | Description |
|-----|-----|-------------|
| V | POIDS | Poids de la vanne |
| W | ENCOMBREMENT | Largeur de la vanne — pour vérifier que la neuve rentre entre les deux brides en cas d'échange standard|
| X | HAUTEUR | Hauteur à laquelle se trouve la vanne (accessibilité) |
| Y | CODE DN PN | Non utilisé |
| Z | RONDELLES | Si on met des rondelles ou non |

### Matériel Admission (AA-AX) — doublon J&T

En-tête groupe ligne 5 : **MATERIEL ADMISSION**

Structure en triplets identique au J&T : BUTA (données client) / RELEVE (relevé terrain) / colonne sans suffixe (valeur retenue).

| Cols | Triplet | Contenu |
|------|---------|---------|
| AA-AC | DIAM ADM | Diamètre admission |
| AD-AF | SERIE ADM | Série (PN) admission |
| AG-AI | MATIERE JOINT ADM | Matière du joint admission |
| AJ-AL | TYPE JOINT ADM | Type de joint admission |
| AM-AO | NB TIGES ADM | Nombre de tiges admission |
| AP-AR | BOULONNERIE ADM | Boulonnerie admission |
| AS-AU | MATIERE BOULON ADM | Matière boulonnerie admission |
| AV | OBTURATION JP ADM | Joint provisoire admission |
| AW | OBTURATION BP ADM | Bride pleine admission |
| **AX** | **JL** | **Joint à lunettes — seule colonne utile à conserver** |

> **Tout ce bloc est en doublon avec le J&T** sauf la colonne **JL (AX)**. À terme, ces données seront importées depuis le J&T plutôt que saisies ici.

### Matériel Refoulement (AY-BU) — doublon J&T

En-tête groupe ligne 5 : **MATERIEL REFOULEMENT**

Même structure en triplets que l'admission, côté refoulement :

| Cols | Triplet | Contenu |
|------|---------|---------|
| AY-BA | DIAM REF | Diamètre refoulement |
| BB-BD | SERIE REF | Série (PN) refoulement |
| BE-BG | MATIERE JOINT REF | Matière du joint refoulement |
| BH-BJ | TYPE JOINT REF | Type de joint refoulement |
| BK-BM | NB TIGES REF | Nombre de tiges refoulement |
| BN-BP | BOULONNERIE REF | Boulonnerie refoulement |
| BQ-BS | MATIERE BOULON REF | Matière boulonnerie refoulement |
| BT | OBTURATION JP REF | Joint provisoire refoulement |
| BU | OBTURATION BP REF | Bride pleine refoulement |

> **Tout ce bloc est en doublon avec le J&T.** Aucune colonne spécifique à conserver.

### Sécurité (BV-BW)

| Col | Nom | Description |
|-----|-----|-------------|
| BV | CMR | Produits CMR (Cancérogènes, Mutagènes, Reprotoxiques) |
| BW | AMIANTE / PLOMB | Présence d'amiante ou de plomb |

### Manutention et logistique (BX-CE)

| Col | Nom | Description |
|-----|-----|-------------|
| **BX** | **LEVAGE** | Comment lever la vanne (type de moyen de levage) |
| **BY** | **POTENCE** | Si une potence (bras de levage fixe) est nécessaire |
| **BZ** | **SUPPORT DE LIGNE** | Si un support temporaire est nécessaire pour maintenir la ligne quand la vanne est retirée |
| **CA** | **ECHAF** | Si un échafaudage est nécessaire pour accéder à la vanne |
| CB | ECHAF COMMUN | Non utilisé |
| **CC** | **CALO/FRIGO** | Si la vanne est calorifugée (isolation thermique) ou frigorifugée (isolation froid) |
| CD | TRACAGE | Présence de traçage électrique. Utilisé sur certains projets |
| CE | MODOP SPECIFIQUE A FAIRE | Si un mode opératoire spécifique est requis |

> Colonne CF (ADR FAITE) : spécifique au projet actuel, non prise en compte.

---

## Liens avec les autres fichiers

```
LUT (référentiel OTs)
 └── Rob (vannes nécessitant traitement spécifique)
      ├── Lien via POSTE TECHNIQUE (G) = ITEM de la LUT
      ├── J&T fournit les données brides (triplets ADM/REF) → doublon à éliminer
      └── FICHE INTERVENTION = livrable PDF à générer automatiquement
```

### Colonnes partagées avec la LUT

| Rob | LUT | Correspondance |
|-----|-----|----------------|
| POSTE TECHNIQUE (G) | ITEM (I) | Numéro d'OT |
| ZONE (M) | UNITE (H) | Zone usine |
| SCOPE BASE / TC (Q) | TB / TC / TA (Q) | Statut des travaux |
| RESPONSABLE (A) | RESPONSABLE Principal (D) | Chef de chantier |

### Données à récupérer depuis le J&T

Toutes les colonnes des blocs MATERIEL ADMISSION (AA-AW) et MATERIEL REFOULEMENT (AY-BU) sont des doublons du J&T. Dans l'application, ces données seront alimentées depuis le J&T. Seule la colonne **JL — Joint à lunettes (AX)** est propre au Rob et doit être conservée.

---

## Feuilles secondaires

### TABLEAU POIDS
Table de référence donnant le poids des vannes en fonction du DN, PN et type de vanne. 68 lignes, 8 colonnes. Utile pour pré-remplir la colonne POIDS (V) lors de la saisie.

### FICHE INTERVENTION
Template de la fiche de robinetterie — **premier livrable PDF** du projet. Ce template sera utilisé comme modèle pour la génération automatique des fiches à partir des données DONNEES ROB + J&T.

### TRAME FEB
Trame des Fiches d'Expression du Besoin. Document annexe pour l'approvisionnement.
