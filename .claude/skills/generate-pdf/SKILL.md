---
name: generate-pdf
description: Génération de fiches PDF (robinetterie et futurs documents dérivés) à partir des données J&T. Utiliser quand on travaille sur les templates PDF, la mise en page, ou l'export de documents.
user-invocable: true
allowed-tools: Read, Bash, Grep, Glob, Edit, Write
argument-hint: "[robinetterie|levage] [item]"
---

# Skill : Génération de fiches PDF

Tu génères des documents PDF à partir des données de l'application EMIS.

## Premier livrable : Fiches robinetterie

Modèle de référence : `data/FICHES_RELEVES_ROB_20251020 modif cedric.xlsm`

### Stack technique
- **@react-pdf/renderer** — génération PDF côté client (React components → PDF)
- Les templates sont des composants React dans `src/components/pdf/`

### Workflow

1. Récupérer les données de la bride (table `flanges`) via l'API
2. Enrichir avec les données de l'OT parent (table `ot_items`)
3. Appliquer le template PDF
4. Générer le document

### Structure d'une fiche robinetterie

Voir [template fiche robinetterie](references/fiche-rob-template.md) pour le détail.

### Conventions

- Toujours afficher la valeur RETENU (pas EMIS ou BUTA séparément) sauf dans les zones de comparaison
- Signaler visuellement les DELTA (écarts DN/PN) en rouge
- Format papier : A4 portrait
- Une fiche par équipement (ITEM), listant toutes ses brides
