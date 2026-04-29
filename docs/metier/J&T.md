# J&T — Joint & Tige

## Qu'est-ce que le J&T ?

Le J&T est le fichier de suivi de **toutes les brides touchées** pendant l'arrêt. Pour chaque bride déconnectée ou reconnectée, il recense les spécifications de boulonnerie (tiges filetées) et de joints nécessaires.

Fichier actuel : `J&T REV E - 20250209 pour correction.xlsm`

---

## Structure du fichier

**4 feuilles**, dont la feuille principale **"J&T"** :

- ~1 542 lignes de données
- 1 ligne = 1 bride touchée sur un OT
- En-têtes sur 2 niveaux :
  - **Ligne 2** : 5 grandes catégories (cellules fusionnées)
  - **Ligne 3** : noms de colonnes
- Colonnes séparatrices vides (`Colonne1`, `Colonne2`, `Colonne3`) pour aérer entre catégories — à ignorer à l'import

---

## Les 5 catégories

La feuille J&T est organisée en 5 grands blocs visibles en ligne 2 :

| Catégorie              | Rôle                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------- |
| **CARACTERISTIQUES**   | Identité du repère + dimensions relevées (DN, PN)                                  |
| **TRAVAUX + MATERIEL** | Côté EMIS — opération à réaliser, joints/brides pleines, matériel, sécurité        |
| **JOINTS ET TIGES**    | Côté EMIS — boulonnerie et joint de la bride (relevé terrain)                      |
| **DIVERS**             | Identifiants externes + alertes (Ubleam, amiante/plomb, robinetterie, échaf, calo) |
| **DONNEES CLIENT**     | Vue miroir BUTA — ce que le client a en base (théorique)                           |

---

## CARACTERISTIQUES

Identification de la bride et dimensions relevées sur site.

| Nom de colonne      | Description                                                                                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **N°ITEM**          | Numéro d'équipement — clé de liaison avec la LUT                                                                                                                      |
| **ZONE**            | Unité (ex: BUTADIENE, SYNTHESE)                                                                                                                                       |
| **FAMILLE TRAVAUX** | Catégorie de travaux (APPAREIL, ROBINETTERIE, TUYAUTERIE, …)                                                                                                          |
| **TYPE ITEM**       | Sous-type (ECHANGEUR, BALLON, VANNE AUTO, FILTRE, …)                                                                                                                  |
| **REPERE CLIENT**   | Repère officiel de la bride sur les plans Butachimie                                                                                                                  |
| **REPERE EMIS**     | Sous-repère ajouté par EMIS quand le repère client n'est pas assez précis (ex : 1 vanne = 2 brides → 2 sous-repères)                                                  |
| **Com. Repere**     | Commentaire de précision quand EMIS ajoute des sous-repères                                                                                                           |
| **DN**              | Diamètre Nominal **relevé sur site**. Sa valeur jumelle côté client est `DN CLIENT` (catégorie DONNEES CLIENT)                                                        |
| **PN**              | Pression Nominale **relevée sur site**. Sa valeur jumelle côté client est `PN CLIENT`. Valeurs courantes : 20, 50, 100 (correspondant aux classes ASME 150, 300, 600) |

**Correspondance PN ↔ Classe ASME**

| PN  | Classe ASME |
| --- | ----------- |
| 20  | 150         |
| 50  | 300         |
| 100 | 600         |

> Les colonnes **DELTA DN** et **DELTA PN** ne sont plus présentes dans le fichier Excel — elles sont calculées automatiquement en base (colonnes `GENERATED`) à partir de DN/PN EMIS et DN/PN CLIENT.

---

## TRAVAUX + MATERIEL

Tout ce qui concerne **l'intervention planifiée par EMIS** sur la bride.

| Nom de colonne          | Description                                                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **OPERATION EMIS**      | Type d'opération à réaliser. **Colonne moteur** : pilote en cascade le nombre de joints pleins, brides pleines, joints provisoires et joints définitifs |
| **NB JP EMIS**          | Nombre de Joints Pleins (platines) à poser                                                                                                              |
| **NB BP EMIS**          | Nombre de Brides Pleines (blind flanges) à installer                                                                                                    |
| **NB JT PROV**          | Nombre de joints provisoires (pour la phase platinage)                                                                                                  |
| **NB JT DEF**           | Nombre de joints définitifs (pour la reconnexion finale)                                                                                                |
| **MATERIEL SPECIFIQUE** | Matériel particulier nécessaire en plus du standard                                                                                                     |
| **SECURITE**            | Contrainte de sécurité matière — ex : **ADF** (matériel Anti-Déflagrant en bronze) pour zones ATEX                                                      |
| **CLE**                 | Taille de clé nécessaire au boulonnage, déterminée par le DN                                                                                            |

### Types d'opérations (colonne OPERATION EMIS)

| Opération                        | Signification                                                                                         |
| -------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **DECONNEXION/RECONNEXION**      | On déconnecte la bride puis on la reconnecte. Nécessite uniquement un joint définitif                 |
| **DECONNEXION/RECONNEXION + BP** | Idem + pose d'une **Bride Pleine** pour isoler. Nécessite un joint provisoire puis un joint définitif |
| **BP EP**                        | Bride Pleine d'Épreuve — pour test de pression / étanchéité                                           |
| **BRIDE FINE**                   | Pose d'une bride fine                                                                                 |
| **BP CHIM**                      | Bride pleine pour nettoyage chimique                                                                  |
| **POSE/DEPOSE JP**               | Pose/dépose d'un Joint Plein (platine) — pour le platinage d'un équipement                            |
| **DEPOSE/REPOSE DOME/BOITE**     | Dépose/repose d'un dôme (réacteur/capacité) ou d'une boîte de distribution (échangeur)                |

**Logique colonne moteur :** la valeur de `OPERATION EMIS` détermine automatiquement, via la table de correspondance (feuille **Operations**) :

- le nombre de joints pleins (platines)
- le nombre de brides pleines
- le nombre de joints provisoires
- le nombre de joints définitifs

---

## JOINTS ET TIGES

Côté **EMIS** — relevé terrain de la boulonnerie et du joint montés sur la bride.

| Nom de colonne    | Description                                                                             |
| ----------------- | --------------------------------------------------------------------------------------- |
| **NB TIGES**      | Nombre de tiges filetées de la bride                                                    |
| **TIGES**         | Dimension de la tige en texte libre, ex : `M14 x 80`, `M16 x 100` (filetage × longueur) |
| **MAT TIGES**     | Matière des tiges (ex : `B7`)                                                           |
| **MAT JT**        | Matière du joint (ex : `SIG/V2J`)                                                       |
| **RONDELLES**     | Présence de rondelles (`oui`/`non`)                                                     |
| **FACE DE BRIDE** | Type de face : `RF` (Raised Face), `RTJ` (Ring Type Joint), simple/double emboîtement   |

> La colonne **TIGES** est un texte libre unique (filetage + longueur dans la même cellule). C'est ce que le préparateur saisit aussi sur le terrain via la PWA, dans `dimension_tige_emis`.

---

## DIVERS

Identifiants externes et alertes opérationnelles indépendantes de la bride elle-même.

| Nom de colonne      | Description                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **ID UBLEAM**       | Identifiant Ubleam (système de tag NFC/QR pour l'identification terrain). Numérique                                |
| **AMIANTE / PLOMB** | Alerte présence amiante ou plomb — contrainte sécurité majeure (mode opératoire spécifique)                        |
| **N° ROB**          | Numéro de fiche robinetterie associée. Permet de relier la bride à une vanne référencée dans la liste robinetterie |
| **ECHAF**           | Indique si un échafaudage est nécessaire pour accéder à la bride                                                   |
| **CALO**            | Indique si un calorifuge est en place et doit être déposé/reposé                                                   |

> `ECHAF`, `CALO` et `AMIANTE / PLOMB` viennent maintenant directement de l'import J&T ; auparavant ils étaient saisis uniquement côté terrain.

---

## DONNEES CLIENT

Vue miroir presque complète de tout ce que le client (BUTA) a en base. Elle reproduit la plupart des champs EMIS — la donnée terrain (EMIS) prime toujours sur la théorie (BUTA) via le triplet RETENU.

| Nom de colonne           | Champ EMIS correspondant                                                |
| ------------------------ | ----------------------------------------------------------------------- |
| **DN CLIENT**            | DN                                                                      |
| **PN CLIENT**            | PN                                                                      |
| **OPERATION client**     | OPERATION EMIS                                                          |
| **NB PLAT. CLIENT**      | NB JP EMIS (platines = joints pleins)                                   |
| **Nb BP CLIENT**         | NB BP EMIS                                                              |
| **NB JOINT PROV CLIENT** | NB JT PROV                                                              |
| **NB JOINT DEF CLIENT**  | NB JT DEF                                                               |
| **NB TIGES CLIENT**      | NB TIGES                                                                |
| **DIM. TIGES CLIENT**    | TIGES                                                                   |
| **MAT TIGE CLIENT**      | MAT TIGES                                                               |
| **MATIERE JOINT CLIENT** | MAT JT                                                                  |
| **RONDELLES CLIENT**     | RONDELLES                                                               |
| **FACE DE BRIDE CLIENT** | FACE DE BRIDE                                                           |
| **Sécurité CLIENT**      | SECURITE                                                                |
| **SAP CLIENT**           | Référence article dans le système SAP du client (pas d'équivalent EMIS) |

---

## La logique en triplet : EMIS / CLIENT / RETENU

C'est le principe fondamental du J&T. Pour chaque donnée mesurable, on stocke :

```
1. EMIS    → ce que le préparateur a relevé sur site (terrain)
2. CLIENT  → ce que le donneur d'ordres a dans sa base (théorie BUTA)
3. RETENU  → formule : COALESCE(EMIS, CLIENT) — le terrain prime toujours
```

**Le terrain prime toujours sur le papier.** Quand le préparateur a pu aller voir la bride en vrai, sa donnée est prioritaire. Si la bride n'a pas pu être relevée (accès impossible, calorifuge en place…), on se fie aux données client.

Les colonnes **DELTA** (DN et PN) sont calculées automatiquement en base : elles s'allument quand EMIS ≠ CLIENT — signal d'alerte pour vérification.

**Triplets actifs** : DN, PN, NB JP, NB BP, NB JT PROV, NB JT DEF, NB TIGES, TIGES (dimension), MAT TIGES, MAT JT, RONDELLES, FACE DE BRIDE, OPERATION, SECURITE.

---

## OPERATION EMIS — la colonne moteur

`OPERATION EMIS` est la colonne la plus structurante du J&T. Elle détermine en cascade le matériel attendu :

```
OPERATION EMIS
 ├── NB JP EMIS (joints pleins / platines)
 ├── NB BP EMIS (brides pleines)
 ├── NB JT PROV (joints provisoires)
 └── NB JT DEF (joints définitifs)
```

Ce calcul est piloté par la feuille **Operations** (31 lignes) qui sert de table de correspondance `opération → quantités attendues`.

---

## Le repérage des brides : CLIENT vs EMIS

Le **REPERE CLIENT** est le repère officiel du donneur d'ordres, visible sur ses plans P&ID et isométriques.

Le **REPERE EMIS** est un complément ajouté par le préparateur quand le repère client est insuffisant. Cas typique : une vanne n'a qu'un seul repère client, mais casser l'étanchéité d'une vanne implique **deux brides** (admission et refoulement). EMIS crée donc 2 lignes avec 2 sous-repères.

**Règle : 1 ligne = 1 joint cassé.**

---

## Feuilles de référence

| Feuille                | Rôle                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------- |
| **J&T**                | Feuille principale — 1 ligne = 1 bride touchée                                      |
| **Tiges**              | Table DN/PN → specs tiges (diamètre, longueur, quantité, clé) pour brides RF et RTJ |
| **LISTES DEROULANTES** | Listes de validation : zones, familles, types, opérations                           |
| **Operations**         | Table de correspondance : type d'opération → nb joints/brides attendus              |

---

_Document de référence sur la structure et la logique du fichier J&T, à partir de l'analyse du fichier `J&T REV E - 20250209 pour correction.xlsm` et des explications du préparateur._
