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

- **HTML → PDF** côté serveur : `src/lib/pdf/fiche-rob-html.ts` génère du HTML pur, converti en PDF via l'API route
- **Preview côté client** : `src/components/fiche-rob/FichePreviewStatic.tsx` (rendu HTML statique, pas React-PDF)
- L'ancien `FichePreview.tsx` (React-PDF) a été supprimé

### Workflow

1. Récupérer les données des brides (table `flanges`) via l'API
2. Grouper en vannes via `groupIntoValves()` (`src/lib/domain/valve-pairs.ts`)
3. Une fiche = 1 vanne (2 brides ADM/REF appariées) ou 1 bride solo
4. `buildPage1Html(admRow, refRow)` génère le HTML avec colonnes ENTREE (ADM) / SORTIE (REF)
5. Générer le PDF

### Appariement robinetterie (ADM/REF)

- `rob_pair_id` UUID + `rob_side` TEXT ('ADM'/'REF') sur la table `flanges`
- Pairing atomique via `supabase.rpc("pair_flanges", ...)` (migration 009)
- Auto-appariement bulk : `POST /api/flanges/pair/auto`
- Modal guidé : `src/components/fiche-rob/PairingModal.tsx`

### Structure d'une fiche robinetterie

Voir [template fiche robinetterie](references/fiche-rob-template.md) pour le détail.

### Conventions

- Toujours afficher la valeur RETENU (pas EMIS ou BUTA séparément) sauf dans les zones de comparaison
- Signaler visuellement les DELTA (écarts DN/PN) en rouge
- Format papier : A4 portrait
- Une fiche par vanne (ADM+REF appariées) ou par bride solo si non appariée
- Template builder personnalisable : `src/components/fiche-rob/TemplateBuilder.tsx`
