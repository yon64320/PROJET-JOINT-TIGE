# Projet SaaS — Préparation d'arrêts de maintenance industrielle

## Contexte entreprise

**EMIS** (Entretien Maintenance Industrielle et Service), filiale du **Groupe Ponticelli Frères** depuis 2005, siège à Vitrolles (13). Seule entreprise française entièrement dédiée aux **arrêts de maintenance industrielle**. ~200 permanents, ~35M€ CA. Filiale **EMIS Access** dédiée échafaudage et calorifuge.

EMIS intervient comme **entreprise extérieure** (sous-traitant) sur le site du donneur d'ordres (raffineries, pétrochimie) pour exécuter les travaux de montage/levage, nettoyage, chaudronnerie, calorifuge et échafaudage.

### Qu'est-ce qu'un arrêt de maintenance ?

Un **arrêt d'unité** (turnaround/shutdown) est un arrêt planifié d'une unité de production pour réaliser des travaux impossibles en marche : inspection réglementaire (ESP), réparations, modifications, nettoyages internes. Fréquence : tous les 3 à 6 ans. Durée : plusieurs semaines à mois. Chaque jour d'arrêt coûte des millions en perte de production → la préparation en amont est critique.

## L'utilisateur

**Préparateur d'arrêt** chez EMIS. Il prépare les dossiers d'exécution (gammes) pour chaque équipement d'un arrêt planifié :
- Collecter les besoins (exploitation, inspection, ingénierie)
- Rédiger les gammes phase par phase : séquencement, corps de métier, effectifs, heures, sécurité, autorisations, pièces de rechange
- Répertorier toutes les brides touchées avec leurs specs de boulonnerie (tiges) et joints
- Coordonner les sous-traitants et fournisseurs
- Développer le planning mécanique inter-spécialités

**Projet personnel** : développer une application web SaaS pour EMIS. Initiative personnelle, pas encore validée par la hiérarchie.

---

## Le projet SaaS

### Le problème

Chaque arrêt génère une galaxie de fichiers Excel interdépendants (LUT, J&T, gammes, fiches robinetterie, listes de levage, APPRO…). Chaque mise à jour oblige à modifier **plusieurs fichiers manuellement** → doublons, erreurs, versions incohérentes.

### La solution

Une **application web** avec la LUT et le J&T comme **source unique de données**. Tout le reste en découle automatiquement :
- Les documents dérivés (fiches robinetterie, etc.) sont générés à la demande
- Une seule mise à jour se propage partout
- Plus de fichiers en doublon à synchroniser

### Spécifications

| Aspect | Spécification |
|--------|---------------|
| **Utilisateurs** | Préparateurs d'arrêt uniquement (saisie), 10-15 simultanés max |
| **Rapport à Excel** | Remplacer Excel à 95%. Fonctionnalités tableur intégrées (grille éditable, tri, filtre). Excel reste pour les 5% de formules complexes ponctuelles |
| **Import** | Fichiers .xlsm existants (LUT, J&T) comme point d'entrée |
| **Premier livrable** | Fiches robinetterie PDF (modèle `data/FICHES_RELEVES_ROB_20251020 modif cedric.xlsm`) |
| **Mode hors ligne** | Nécessaire pour saisie sur site (zones ATEX, pas de réseau) |
| **Rôles** | Pas pour la V1, à implémenter plus tard |
| **Sécurité** | À terme sur réseaux EMIS, niveau à définir |
| **Cible** | EMIS uniquement pour l'instant |
| **Phase actuelle** | **Planification — pas de code tant que le plan n'est pas validé** |

---

## Les deux fichiers centraux

### LUT — Liste Unifiée de Travaux (fichier mère)

Fichier actuel : `data/BUTACHIMIE - LUT- 20260303.xlsm` — **1 feuille, 297 OTs, 37 colonnes (A-AK)**

Chaque ligne = 1 OT. Un OT = généralement 1 équipement (échangeur, colonne, ballon…), parfois tuyauterie, vanne ou tâches transverses.

**Colonnes clés :**

| Col | Nom | Rôle |
|-----|-----|------|
| H | UNITE | Zone usine : BUTADIENE, SYNTHESE, TF99 |
| I | ITEM | N° équipement — **clé primaire**. Préfixe : B=Buta, S=Synthèse, T=Tank Farm |
| L | TITRE GAMME | Description des travaux |
| M | FAMILLE ITEM | Equipement / Intervention / NC / OTG / Robinetterie / Tuyauterie |
| N | TYPE ITEM | Colonne, Filtre, Ballon, Echangeur, Aéro, Capacité, Réacteur… |
| O | TYPE TRAVAUX | Corps de métier : H0, K0, L0, N0, T0 |
| Q | TB/TC/TA | TB=Base (forfait), TC=Complémentaire (plus cher), TA=Annulé |
| AB-AH | CORPS DE METIER | 7 colonnes cochées X : Échaf, Calo, Montage, Métal, Fourniture, Nettoyage, Autres |

Détail complet : [`docs/metier/LUT.md`](docs/metier/LUT.md)

### J&T — Joint & Tige (suivi boulonnerie)

Fichier actuel : `data/J&T REV E - 20250209 pour correction.xlsm` — **5 feuilles, ~1 542 brides, colonnes utiles A-BH**

Chaque ligne = **1 joint cassé** (1 bride touchée sur un OT).

**Principes fondamentaux :**

1. **Logique en triplet** pour chaque donnée (quantité, matière) :
   - EMIS = relevé terrain par le préparateur
   - BUTA = données théoriques du donneur d'ordres
   - RETENU = formule : si EMIS a une valeur → EMIS, sinon → BUTA. **Le terrain prime toujours**
   - Colonnes DELTA (DN, PN) = signal d'alerte sur les écarts

2. **Colonne OPERATION (X) = colonne moteur** — détermine automatiquement via table de correspondance (feuille "Operations") :
   - NB joints pleins (platines)
   - NB brides pleines
   - NB joints provisoires
   - NB joints définitifs

3. **Repérage BUTA vs EMIS** — Le repère BUTA (col F) est le repère client. Le repère EMIS (col G) complète quand le client n'est pas assez précis (ex : vanne = 2 brides mais 1 seul repère client)

**Colonnes clés :**

| Bloc | Cols | Contenu |
|------|------|---------|
| Identification | A-E | ID Ubleam, NOM, ZONE, FAMILLE, TYPE (B-E = lien LUT) |
| Repères bride | F-I | Repère BUTA, Repère EMIS, Repère Ubleam, Commentaire |
| J-P | — | Non utilisées actuellement, conservées pour d'autres chantiers |
| DN | Q-S | DN relevé, DN client, DELTA |
| PN | T-V | PN relevé, PN client, DELTA. PN 20=CL150, 50=CL300, 100=CL600 |
| Opération | X-Y | Type opération (colonne moteur), Barrette |
| Matériel | Z-AG | NB JP/BP EMIS/BUTA, Matériel EMIS/BUTA/ADF, Clé |
| Tiges quantité | AI-AK | Triplet : NB tiges EMIS / BUTA / retenu |
| Tiges matière | AL-AN | Triplet : matière EMIS / BUTA / retenu |
| Tiges dimensions | AR-AV | Diamètre et longueur (redondant) |
| Joints quantité | AW+ | NB provisoires / définitifs — piloté par col X |
| Joints matière | BA-BC | Triplet : matière EMIS / BUTA / retenu |
| Compléments | BD-BG | Rondelle, Face de bride, Commentaires |

**Feuilles de référence :**

| Feuille | Rôle |
|---------|------|
| APPRO (2915 rows) | Vue approvisionnement |
| Tiges (113 rows) | Table DN/PN → specs tiges pour brides RF et RTJ |
| Operations (31 rows) | Table de correspondance opération → nb joints/brides |
| LISTES DEROULANTES (17 rows) | Listes de validation |

Détail complet : [`docs/metier/J&T.md`](docs/metier/J%26T.md)

### Lien LUT ↔ J&T

La colonne **ITEM** (col I) de la LUT est la clé qui relie les deux fichiers. Un même ITEM peut avoir des dizaines de brides dans le J&T.

```
LUT (tous les OTs)
 ├── J&T (toutes les brides touchées par chaque OT)
 ├── Gammes (séquencement phase par phase)
 ├── Liste de levage (opérations de grue)
 ├── Fiches robinetterie (document dérivé)
 └── Planning (ordonnancement)
```

---

## Arborescence du projet

```
CLAUDE CODE JOINT TIGE/
├── CLAUDE.md                              # Instructions projet
├── docs/
│   ├── metier/
│   │   ├── comprendre_mon_metier.md       # Compréhension du métier de préparateur
│   │   ├── LUT.md                         # Structure et logique du fichier LUT
│   │   ├── J&T.md                         # Structure et logique du fichier J&T
│   │   └── Gamme compilé.md               # Structure du fichier gammes compilées
│   └── equipements/
│       ├── Échangeurs thermiques.md       # Doc technique échangeurs
│       ├── Colonnes de distillation.md    # Doc technique colonnes
│       └── Capacités.md                   # Doc technique capacités/ballons
├── data/
│   ├── BUTACHIMIE - LUT- 20260303.xlsm   # Fichier LUT source
│   ├── J&T REV E - 20250209 pour correction.xlsm  # Fichier J&T source
│   ├── GAMMES COMPILEES REV D.xlsm       # Fichier gammes source
│   └── FICHES_RELEVES_ROB_20251020 modif cedric.xlsm  # Modèle fiches robinetterie
└── src/                                   # Code de l'application (à venir)
```

---

## Conventions techniques

- Toujours utiliser `read_only=True, data_only=True` pour lire les fichiers Excel (macros et formules)
- Encoder la sortie en UTF-8 pour éviter les erreurs cp1252 sur Windows
- `openpyxl` est déjà installé (scripts Python), `xlsx` (SheetJS) pour le code Next.js
- Les fichiers Excel sources sont dans `data/`
- Les colonnes numériques (DN, PN, NB TIGES...) sont **TEXT en base** car elles peuvent contenir "CALO", "PAS D'INFO"
- Les colonnes RETENU et DELTA sont calculées **côté application**, pas en GENERATED SQL

```python
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import openpyxl
wb = openpyxl.load_workbook('data/fichier.xlsm', read_only=True, data_only=True)
```

---

## Stratégie d'import Excel — Import adaptatif (décision validée)

### Problème

Chaque préparateur part de la même base (LUT, J&T) mais diverge : colonnes ajoutées, renommées, réordonnées, projets différents, habitudes personnelles. **L'app doit s'adapter au préparateur, pas l'inverse.**

Le parser actuel est rigide (indices de colonnes hardcodés) → casse si le fichier diffère du template Butachimie.

### Solution retenue : Hybrid Auto-detect + Override + Extra columns

**Workflow utilisateur :**

1. Upload du fichier Excel
2. L'app auto-détecte la ligne d'en-tête (scan lignes 0-15) et fuzzy-matche les colonnes via dictionnaire de synonymes
3. Preview du mapping avec code couleur :
   - **Vert** = matché haute confiance (ex: "NOM" → nom)
   - **Jaune** = suggestion à vérifier (ex: "DN" seul → dn_emis ?)
   - **Gris** = colonne inconnue, sera importée dans extra_columns JSONB
4. L'utilisateur corrige si besoin (dropdown par champ, ~30 secondes)
5. Option : sauvegarder le mapping comme template réutilisable
6. Import : colonnes connues → champs structurés, inconnues → JSONB extra_columns

**Principes :**
- **Zéro perte de données** : toute colonne du fichier est importée, connue ou non
- **Premier import ~1-2 min** (vérifier le mapping), **suivants = instantanés** (template sauvé)
- **Fuzzy matching** avec dictionnaire de synonymes par champ (ex: "DN", "DN RELEVE", "DN EMIS" → dn_emis)
- **Extra columns** affichées en fin de tableur après les colonnes structurées

### Impact architecture

```
Nouveau :
├── import_templates (table DB)           — Mappings sauvegardés réutilisables
├── ot_items.extra_columns JSONB          — Colonnes LUT non reconnues
├── flanges.extra_columns JSONB           — Colonnes J&T non reconnues
├── src/lib/excel/detect-headers.ts       — Auto-détection en-têtes + fuzzy match
├── src/lib/excel/synonyms.ts             — Dictionnaire de synonymes par champ
├── src/components/import/MappingPreview  — UI preview/correction du mapping
└── Modifier : LutSheet + JtSheet         — Afficher extra_columns en fin de tableau
```

### Dictionnaire de synonymes (exemples)

```
dn_emis:   ["DN", "DN RELEVE", "DN EMIS", "DIAMETRE NOMINAL"]
dn_buta:   ["DN CLIENT", "DN BUTA", "DN DONNEES BUTA", "DN DONNEES CLIENT"]
operation: ["OPERATION", "TYPE OPERATION", "OP"]
item:      ["ITEM", "NOM", "REPERE", "TAG", "N° EQUIPEMENT"]
```
