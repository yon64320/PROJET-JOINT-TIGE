# LUT — Liste Unifiée de Travaux

## Qu'est-ce que la LUT ?

La LUT est le **fichier mère** de l'arrêt. C'est le référentiel unique qui recense **tous les ordres de travail (OT)** à réaliser. Tout le reste — gammes, J&T, planning, approvisionnement — en découle.

Fichier actuel : `BUTACHIMIE - LUT - 20260303.xlsm`

---

## Structure du fichier

**1 feuille unique : "LUT"**
- 297 lignes de données (rows 5 à 302)
- 37 colonnes (A à AK)
- Chaque ligne = **1 OT**

Un OT représente généralement un équipement (échangeur, colonne, ballon…), mais peut aussi concerner une tuyauterie, une vanne, ou simplement une liste de tâches transverses.

---

## Colonnes détaillées

### Colonnes clés

| Col | Nom | Description |
|-----|-----|-------------|
| **H** | **UNITE** | Zone de l'usine où se situe l'équipement. Valeurs : **BUTADIENE**, **SYNTHESE**, **TF99** (+ BD LOG et LOG, marginaux) |
| **I** | **ITEM** | Numéro d'équipement — **clé primaire** de la LUT. Le préfixe indique la zone : **B** = Butadiène, **S** = Synthèse, **T** = Tank Farm |
| **L** | **TITRE GAMME** | Description des travaux à faire sur l'OT. C'est le résumé opérationnel de ce qui sera exécuté |
| **M** | **FAMILLE ITEM** | Classification de l'OT : **Equipement** / **Intervention** / **NC** (non concerné) / **OTG** (ordre de travail général) / **Robinetterie** / **Tuyauterie** |
| **N** | **TYPE ITEM** | Précision du type d'équipement : Colonne, Filtre, Ballon, Echangeur, Aéro, Capacité, Réacteur, etc. |
| **O** | **TYPE TRAVAUX** | Corps de métier principaux concernés par l'OT. Codes : H0 (échafaudage), K0 (calorifuge), L0 (montage/tuyauterie), N0 (nettoyage HP), T0 (chaudronnerie) |
| **Q** | **TB / TC / TA** | Statut des travaux : **TB** = Travaux de Base (périmètre initial, négocié au forfait), **TC** = Travaux Complémentaires (ajoutés en cours de route, plus chers car hors forfait), **TA** = Travaux Annulés |
| **AB-AH** | **CORPS DE METIER** | 7 colonnes cochées (X) indiquant quels corps interviennent : Échafaudage, Calorifuge, Montage, Métal, Fourniture, Nettoyage, Autres |

### Colonnes secondaires

| Col | Nom | Description |
|-----|-----|-------------|
| C | CHRONO BUTA | Numéro unique attribué par Butachimie aux équipements. Non utilisé par EMIS |
| D | RESPONSABLE Principal | Chef de chantier assigné — sert à la répartition des travaux entre chefs |
| E-F | Resp. secondaire / bis | Idem, pour co-responsabilité |
| G | AMIANTE | Flag amiante — aucun cas sur cet arrêt |
| J | OT | Même équipement mais avec dénomination des circuits (S1-, S2-, etc.) |
| K | LOT | Circuit sur lequel est l'équipement |
| P | REV | Révision courante (A → B → C → D…). S'incrémente à chaque lot de nouveaux/supprimés travaux, environ tous les 1 à 2 mois |
| R | FIESP | Non utilisé sur cet arrêt |
| S | COMMENTAIRES | Remarques libres |

### Colonnes d'heures et planning

| Col | Nom | Description |
|-----|-----|-------------|
| U-W | HEURES | Heures estimées : Montage, Métal, Nettoyage HP |
| Y-Z | DEBUT / FIN | Dates de début et fin planifiées |

### Colonnes de séparation visuelle

| Col | Description |
|-----|-------------|
| A-B | Vides |
| T | Colonne noire — séparateur visuel |
| X | Colonne noire — séparateur visuel |
| AA | Colonne noire — séparateur visuel |

---

## Logique métier

### La LUT comme référentiel central

La LUT est le point de départ de tout le processus de préparation :

```
LUT (tous les OTs)
 ├── Gammes (séquencement phase par phase de chaque OT)
 ├── J&T (toutes les brides touchées par chaque OT)
 ├── Liste de levage (opérations de grue par OT)
 └── Planning (ordonnancement des OTs)
```

### Lien LUT ↔ J&T

La colonne **I (ITEM)** de la LUT est la clé qui permet de retrouver toutes les brides associées dans le fichier J&T. Un même ITEM peut avoir des dizaines de brides répertoriées dans le J&T.

### Les révisions (col P)

Les révisions reflètent l'évolution du périmètre de l'arrêt :
- **Rev A** : périmètre initial validé avec le donneur d'ordres
- **Rev B, C, D…** : ajouts, suppressions, modifications au fil des réunions de préparation
- Fréquence : environ tous les 1 à 2 mois
- La dernière révision fait toujours foi

### TB / TC / TA (col Q)

Cette colonne est stratégique pour le suivi économique :
- **TB (Travaux de Base)** : définis avant l'arrêt, négociés au forfait — coût maîtrisé
- **TC (Travaux Complémentaires)** : ajoutés en cours de route (dernière minute, découverte pendant inspection…) — facturés en plus, donc plus chers pour le donneur d'ordres
- **TA (Travaux Annulés)** : initialement prévus mais retirés du scope

### FAMILLE ITEM (col M)

| Valeur | Signification |
|--------|---------------|
| Equipement | OT portant sur un équipement identifié (échangeur, colonne, ballon…) |
| Intervention | OT portant sur une action spécifique, pas forcément un équipement unique |
| Robinetterie | OT portant sur une ou plusieurs vannes |
| Tuyauterie | OT portant sur des lignes de tuyauterie |
| OTG | Ordre de Travail Général — tâches transverses (logistique, préparation zone…) |
| NC | Non Concerné |

### UNITE (col H)

L'arrêt Butachimie couvre 3 unités principales :
- **BUTADIENE** — unité d'extraction du butadiène (items préfixés B)
- **SYNTHESE** — unité de synthèse chimique (items préfixés S)
- **TF99** — Tank Farm, zone de stockage (items préfixés T)
- BD LOG / LOG — logistique, marginal

---

## Arrêt actuel : Butachimie

- **297 OTs** répartis sur 3 unités
- Fichier : `BUTACHIMIE - LUT - 20260303.xlsm`
- Donneur d'ordres : Butachimie

---

*Document de référence sur la structure et la logique du fichier LUT, à partir de l'analyse du fichier et des explications du préparateur.*
