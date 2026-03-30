# J&T — Joint & Tige

## Qu'est-ce que le J&T ?

Le J&T est le fichier de suivi de **toutes les brides touchées** pendant l'arrêt. Pour chaque bride déconnectée ou reconnectée, il recense les spécifications de boulonnerie (tiges filetées) et de joints nécessaires.

Fichier actuel : `J&T REV E - 20250209 pour correction.xlsm`

---

## Structure du fichier

**5 feuilles**, dont la feuille principale **"J&T"** :
- ~1 542 lignes de données (rows 8 à 1549)
- 77 colonnes (A à BY), mais **seules A à BH sont utiles** — tout ce qui est à partir de BI est ignoré
- Chaque ligne = **1 bride touchée** sur un OT
- En-têtes multi-niveaux : row 5 (groupes), row 6 (catégories), row 7 (noms de colonnes)

---

## Colonnes détaillées — Feuille "J&T"

### Identification (A-E)

| Col | Nom | Description |
|-----|-----|-------------|
| A | ID UBLEAM | Identifiant pour logiciel Ubleam (QR codes utilisés en interne). À voir plus tard |
| B | NOM | Nom de l'équipement — même que la colonne ITEM de la LUT |
| C | ZONE | Zone de l'usine — même que la colonne UNITE de la LUT |
| D | FAMILLE TRAVAUX | Classification — même que la colonne FAMILLE ITEM de la LUT |
| E | TYPE | Type d'équipement — même que la colonne TYPE ITEM de la LUT |

### Repérage des brides (F-I)

| Col | Nom | Description |
|-----|-----|-------------|
| **F** | **REPERE BUTA** | Repère de la bride sur les plans et schémas Butachimie. C'est le repère client qui identifie la bride en question |
| **G** | **REPERE EMIS** | Sous-dénomination ajoutée par EMIS quand le repère client n'est pas assez précis. Ex : une vanne a 2 côtés (admission/refoulement) → le client met 1 repère, EMIS en crée 2 pour avoir **1 ligne par joint cassé** |
| H | REPERE UBLEAM | Lien avec ID Ubleam pour le logiciel. À voir plus tard |
| I | COMMENTAIRE | Précisions, notamment quand EMIS ajoute des repères — pour clarifier de quelle bride on parle |

### Colonnes J à P — Non utilisées actuellement

Colonnes conservées car utiles sur d'autres chantiers. Seront potentiellement implémentées plus tard dans le projet.

### Dimensions de bride — DN (Q-S)

| Col | Nom | Description |
|-----|-----|-------------|
| **Q** | **DN** | Diamètre Nominal de la bride — **relevé sur site** par le préparateur |
| R | DN DONNEES BUTA | DN théorique selon la base de données Butachimie (données papier) |
| S | DELTA DN | Écart entre le relevé terrain (Q) et les données client (R). Permet de détecter les incohérences |

### Dimensions de bride — PN (T-V)

| Col | Nom | Description |
|-----|-----|-------------|
| **T** | **PN** | Pression Nominale de la bride — **relevé sur site**. Valeurs courantes : 20, 50, 100 (correspondant aux classes 150, 300, 600) |
| U | PN DONNEES BUTA | PN théorique selon Butachimie |
| V | DELTA PN | Écart entre relevé terrain et données client |

**Correspondance PN ↔ Classe :**

| PN | Classe ASME |
|----|-------------|
| 20 | 150 |
| 50 | 300 |
| 100 | 600 |

### Séparateur (W)

Colonne vide pour aérer le tableau.

### Opérations (X-Y)

| Col | Nom | Description |
|-----|-----|-------------|
| **X** | **OPERATION** | Type d'opération à réaliser sur la bride. **Colonne moteur** : elle détermine automatiquement le nombre de joints provisoires, définitifs, joints pleins et brides pleines nécessaires |
| Y | BARRETTE | Non utilisé sur cet arrêt. Conservé pour d'autres chantiers |

#### Types d'opérations (col X)

| Opération | Signification |
|-----------|---------------|
| **DECONNEXION / RECONNEXION** | On déconnecte la bride puis on la reconnecte. Nécessite uniquement un joint définitif |
| **DECONNEXION / RECONNEXION + BP** | Idem + pose d'une **Bride Pleine** (blind flange) pour isoler. Nécessite un joint provisoire puis un joint définitif |
| **BP EP** | Bride Pleine d'Épreuve — pour test de pression ou test d'étanchéité |
| **BRIDE FINE** | Pose d'une bride fine |
| **BP CHIM** | Bride pleine pour nettoyage chimique |
| **POSE DEPOSE JP** | Pose/dépose d'un **Joint Plein** (platine) — pour le platinage d'un équipement |
| **DEPOSE REPOSE DOME/BOITE** | Dépose/repose d'un dôme (réacteur/capacité) ou d'une boîte de distribution (échangeur) |

**Logique clé :** La colonne X pilote un **tableau de correspondance** qui détermine automatiquement pour chaque opération :
- Le nombre de joints pleins (platines)
- Le nombre de brides pleines
- Le nombre de joints provisoires
- Le nombre de joints définitifs

### Matériel de platinage et blindage (Z-AG)

| Col | Nom | Description |
|-----|-----|-------------|
| Z | NB JOINTS PLEINS EMIS | Nombre de platines à poser — côté EMIS |
| AA | NB JOINTS PLEINS BUTA | Idem — données client |
| AB | NB BRIDES PLEINES EMIS | Nombre de brides pleines à installer — côté EMIS |
| AC | NB BRIDES PLEINES BUTA | Idem — données client |
| AD | MATERIEL EMIS | Récap matériel : joints pleins + brides pleines + matériel spécifique éventuel |
| AE | MATERIEL BUTA | Récap matériel prévu par le client |
| AF | MATERIEL ADF | Matériel Anti-Déflagrant (en bronze). Précise si du matériel bronze est nécessaire |
| AG | CLE | Taille de clé nécessaire, déterminée par le DN |

### Tiges — Quantité (AI-AK)

Logique en **triplet** : relevé EMIS / données BUTA / valeur retenue.

| Col | Nom | Description |
|-----|-----|-------------|
| AI | NB TIGES (EMIS) | Nombre de tiges filetées **relevé sur site** par le préparateur |
| AJ | NB TIGES DONNEES BUTA | Nombre de tiges théorique selon la base de données Butachimie |
| AK | NB TIGES RETENU | **Formule** : si EMIS a relevé quelque chose → prendre EMIS ; sinon → prendre BUTA. Priorité au terrain |

### Tiges — Matière (AL-AN)

Même logique en triplet.

| Col | Nom | Description |
|-----|-----|-------------|
| AL | MATIERE TIGES (EMIS) | Matière relevée sur site |
| AM | MATIERE TIGES BUTA | Matière selon base de données client |
| AN | MATIERE TIGES RETENU | Formule : EMIS si dispo, sinon BUTA |

### Tiges — Dimensions (AR-AV)

Colonnes redondantes avec les colonnes tiges précédentes. Précisent le **diamètre** et la **longueur** de la tige.

### Joints — Quantité provisoire/définitif (AW+)

**Piloté par la colonne X (opérations).**

La logique :
- **Déconnexion/reconnexion simple** → 1 joint définitif seulement
- **Déconnexion/reconnexion + BP** → 1 joint provisoire (pour la phase platinage) + 1 joint définitif (pour la reconnexion finale)

Le nombre de joints provisoires et définitifs est automatiquement calculé à partir du type d'opération via le tableau de correspondance (feuille "Operations").

### Joints — Matière (BA-BC)

Même logique en triplet.

| Col | Nom | Description |
|-----|-----|-------------|
| BA | MATIERE JOINT (EMIS) | Matière relevée sur site |
| BB | MATIERE JOINT BUTA | Matière selon base de données client |
| BC | MATIERE JOINT RETENU | Formule : EMIS si dispo, sinon BUTA |

### Compléments (BD-BG)

| Col | Nom | Description |
|-----|-----|-------------|
| BD | RONDELLE | S'il faut des rondelles ou non |
| BE | FACE DE BRIDE | Type de face : simple emboîtement, double emboîtement, faces RF (Raised Face) |
| BF-BG | COMMENTAIRES | Remarques complémentaires |

### Colonnes BI+ — Non utilisées

Tout ce qui est après BH est ignoré.

---

## La logique en triplet : EMIS / BUTA / RETENU

C'est le principe fondamental du J&T. Pour chaque donnée dimensionnelle ou matière :

```
1. EMIS    → ce que le préparateur a relevé sur site (terrain)
2. BUTA    → ce que le donneur d'ordres a dans sa base de données (théorie)
3. RETENU  → formule : SI emis a une valeur ALORS emis SINON buta
```

**Le terrain prime toujours sur le papier.** Quand le préparateur a pu aller voir la bride en vrai, sa donnée est prioritaire. Si la bride n'a pas pu être relevée (accès impossible, calorifuge en place…), on se fie aux données client.

Les colonnes **DELTA** (DN et PN) permettent de détecter les écarts entre terrain et théorie — signal d'alerte pour vérification.

---

## La colonne OPERATION comme colonne moteur

La colonne X est la colonne la plus structurante du J&T. Elle détermine en cascade :

```
OPERATION (col X)
 ├── NB joints pleins (platines)
 ├── NB brides pleines
 ├── NB joints provisoires
 └── NB joints définitifs
```

Ce calcul est piloté par la feuille **"Operations"** (31 lignes) qui sert de table de correspondance.

---

## Le repérage des brides : BUTA vs EMIS

Le repère **BUTA** (col F) est le repère officiel du client, visible sur ses plans P&ID et isométriques.

Le repère **EMIS** (col G) est un complément ajouté par le préparateur quand le repère client est insuffisant. Cas typique : une vanne n'a qu'un seul repère client, mais casser l'étanchéité d'une vanne implique **deux brides** (admission et refoulement). EMIS crée donc 2 lignes avec 2 sous-repères.

**Règle : 1 ligne = 1 joint cassé.**

---

## Feuilles de référence

| Feuille | Lignes | Rôle |
|---------|--------|------|
| **APPRO** | 2 915 | Vue approvisionnement : item, OT, repère, opérations, joints, boulons, statut |
| **Tiges** | 113 | Table DN/PN → specs tiges (diamètre, longueur, quantité, clé) pour brides RF et RTJ |
| **LISTES DEROULANTES** | 17 | Listes de validation : zones, familles, types |
| **Operations** | 31 | **Table de correspondance** : type d'opération → nb joints/brides attendus |

---

*Document de référence sur la structure et la logique du fichier J&T, à partir de l'analyse du fichier et des explications du préparateur.*
