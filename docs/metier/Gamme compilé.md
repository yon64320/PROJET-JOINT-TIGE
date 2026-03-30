# Source de données : `GAMMES COMPILEES REV D.xlsm`

Fichier principal contenant toutes les gammes compilées pour l'arrêt. 278 OTs, 2794 phases, 242 équipements.

## Feuille principale : `OTs` (en-tête : ligne 5, données : ligne 7+)

| Colonne | Champ | Description |
|---------|-------|-------------|
| **A** | Item (Equipement) | Identifiant unique de l'équipement (ex: `B4702`, `S1128`, `T5389`) |
| **B** | N° OT (Zone) | Section + équipement au format `Sx-EQUIPEMENT` (ex: `S1-B4702` = section 1) |
| **C** | N° phase | Ordre séquentiel des taches sur un OT, multiples de 10 (10, 20, 30...) |
| **D** | Rev OT | Révision du document de travail : A, B, C, D... Chaque révision modifie les travaux à réaliser |
| **E** | Corps de métier | Code du métier exécutant la tache (voir liste ci-dessous) |
| **F** | Rev phase | Révision de la phase individuelle |
| **G** | ENCL | Non utilisé / ignoré |
| **H** | Nb pers | Nombre de personnes requises pour la tache |
| **I** | Nb heures | Nombre d'heures estimées pour la tache |
| **J** | Libellé OT | Titre global des travaux sur l'équipement (identique pour toutes les phases d'un meme OT) |
| **K** | Titre de la phase | Titre court de la tache (la ligne) |
| **L** | Détail de la phase | Description détaillée de la tache (instructions, schémas, précautions) |
| **M** | Sécurité | Consignes sécurité (ex: `ARI + T35 + PRESENCE FAB OBLIGATOIRE`) |
| **N-S** | AP1/AP2/AP3 | Autorisations préalables (Type + N°) : `P` = permis, `F` = feu, `GRU` = grutage |
| **T** | Note 4/870 | Référence documentaire associée |
| **U** | Préparateur | Nom du préparateur ayant rédigé la gamme |
| **V-W** | Signatures fin | Signatures de fin de travaux |
| **X** | Levage | Indique si un levage est nécessaire (855 phases concernées) |

## Feuille `Liste des OTs`

Vue récapitulative : 278 OTs avec unité, libellé, nb de phases, préparateur, schéma TI, approbations et validations. Unités : SYNTHESE (179), TF99 (52), BUTADIENE (34), LOGISTIQUE (12), TF90 (1).

## Feuille `OTs_Extract`

Liste des 242 équipements avec les corps de métier associés.

## Autres feuilles

- `Matrice STAND-DIM`, `Matrice 2` : matrices de correspondance standards/dimensions
- `Standards TF`, `Dimensions TF` : données techniques de référence

## Corps de métier

### EMIS (travaux exécutés par notre entreprise)

| Code | Métier | Phases |
|------|--------|--------|
| **L0** | Tuyauterie — fabrication, assemblage, pose/dépose de tuyauteries industrielles | 456 |
| **K0** | Calorifuge — dépose/repose d'isolation thermique sur tuyauteries et équipements | 324 |
| **H0** | Echafaudage — montage/démontage des structures d'accès en hauteur | 213 |
| **T0** | Chaudronnerie — travaux sur appareils à pression, colonnes, capacités, échangeurs | 97 |
| **N0** | Nettoyage — nettoyage industriel haute pression (NHP) | 89 |

### Autres intervenants (hors périmètre EMIS)

| Code | Métier | Phases |
|------|--------|--------|
| R70 | Instrumentation | 230 |
| MAD | Mise à disposition par l'exploitant (consignation, drainage, purge) | 221 |
| E7, E2, E8 | Electricité | 305 |
| C7, C6, C8 | Contrôle / Inspection (CND, requalification) | 202 |
| MFA | Fabrication | 140 |
| L1 | Tuyauterie spécialisée (autre prestataire) | 77 |
| M7, M3-M9 | Mécanique (machines tournantes, vannes) | ~100 |
| IO6, IU6, IX6, IE6 | Instrumentation spécialisée | ~109 |

### Séquencement type d'un OT

H0 échafaudage → K0 dépose calo → MAD consignation → C7 inspection → L0/T0 travaux mécaniques → C7 contrôle post-travaux → K0 repose calo → H0 démontage échafaudage

## Structure des données - Logique métier

- **1 OT = 1 équipement** : un Ordre de Travail regroupe toutes les taches sur un équipement
- **1 phase = 1 tache** : chaque ligne est une tache élémentaire
- **L'ordre des phases est chronologique** : phase 10 → 20 → 30, etc.
- **Plusieurs corps de métier sur un meme OT** : les taches se succèdent entre métiers
- **Les révisions** (A → B → C → D) tracent l'évolution des gammes ; la dernière est en vigueur
- **Charge de travail** = `Nb pers × Nb heures` par phase
