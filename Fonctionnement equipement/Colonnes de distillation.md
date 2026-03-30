# Colonnes de distillation - Référence technique

Document de référence pour la rédaction et l'analyse des gammes de maintenance sur colonnes en arrêt d'unité.

## Types de colonnes en raffinerie

| Type | Principe | Internes typiques | Produits |
|------|----------|-------------------|----------|
| **Atmosphérique** | Distillation du brut à pression atmo | Plateaux (30-50) + strippeurs latéraux | Naphta, kérosène, diesel, GO, résidu |
| **Sous vide** | Distillation résidu atmo à 25-100 mmHg | Garnissage structuré (faible perte de charge) | LVGO, HVGO, slop wax, bitume |
| **Strippage** | Élimination des légers (charge en tête, vapeur en pied) | Plateaux (4-6) | Produit épuré |
| **Absorption** | Solvant descendant absorbe un gaz montant (haute P, basse T) | Garnissage ou plateaux | Gaz purifié + solvant riche |
| **Stabilisatrice** | Élimination C3/C4 pour stockage bac | Plateaux | Produit stable |

## Composants principaux

### Structure

| Composant | FR | EN | Détail |
|-----------|-----|-----|--------|
| Virole | Viroles soudées | Shell | Corps cylindrique vertical, SA-516 Gr.70 / inox / Cr-Mo |
| Jupe | Jupe | Skirt | Support cylindrique, droite ou évasée |
| Fond bombé | Torisphérique / elliptique | Head/dome | Fermeture sup. et inf. |
| Trou d'homme (TH) | TH | Manhole | 350-600 mm, 1 tous les 6-10 plateaux |
| Trou de poing | - | Handhole | 150-200 mm, accès limité |

### Piquages

| Piquage | Position | Fonction |
|---------|----------|----------|
| Sortie vapeur tête | Fond sup. | Vers condenseur |
| Retour reflux | Partie haute | Condensat depuis ballon de reflux |
| Alimentation (feed) | Latéral (zone flash) | Introduction charge |
| Retour rebouilleur | Latéral bas | Vapeur du rebouilleur |
| Soutirage fond | Fond inf. | Vers rebouilleur |
| Soutirages latéraux | Latéral (multi-niveaux) | Produits intermédiaires |
| Vapeur strippage | Partie basse | Injection vapeur d'eau |
| Évent | Fond sup. | Purge gaz |
| Vidange | Fond inf. | Drainage |
| PSV | Fond sup. | Soupape de sûreté |

### Types de plateaux

| Type | FR | Caractéristique clé | Avantage / Inconvénient |
|------|-----|---------------------|------------------------|
| **Calottes/cloches** | Bubble cap | Cheminée + cloche percée | Pas de pleurage / Coût élevé, perte de charge |
| **Perforé** | Sieve tray | Trous 3-25 mm | Simple, économique / Pleurage à faible débit |
| **Clapets fixes** | Fixed valve | Profils estampés dans la tôle | Résistant / Moins flexible |
| **Clapets flottants** | Floating valve | Pièces mobiles montant/descendant | Large plage de débits / Encrassement, usure |

**Composants de chaque plateau** : aire active (barbotage), déversoir (downcomer), seuil déversant (weir), tablier (tray deck), anneau de support, pattes de fixation, TH de plateau.

### Types de garnissage

| Catégorie | Exemples | Usage |
|-----------|----------|-------|
| **Structuré** | Mellapak, MellapakPlus, BX (Sulzer), Proflux (Koch-Glitsch) | Faible perte de charge, haute efficacité — colonnes sous vide |
| **Vrac/aléatoire** | Pall rings, IMTP, selles Intalox, Raschig Super-Ring | Robuste, anti-encrassement, polyvalent |

### Autres internes

| Composant | FR | Fonction |
|-----------|-----|----------|
| Distributeur de liquide | Distributeur (auges, buses, orifices) | Répartition liquide sur garnissage — **critique** |
| Collecteur | Collecteur | Recueil liquide après section garnissage |
| Plateau cheminée | Chimney tray | Collecte liquide + passage vapeur |
| Grille support | Support de garnissage | Supporte poids garnissage + liquide |
| Grille de maintien | Limiteur de lit | Empêche fluidisation garnissage |
| Dévésiculeur | Demister | Capte gouttelettes en tête de colonne |

### Équipements associés

- **Rebouilleur** (reboiler) : échangeur en pied, vaporise le liquide de fond
- **Condenseur** : échangeur en tête, refroidit les vapeurs
- **Ballon de reflux** : collecte condensat, sépare distillat et reflux

## Séquence type maintenance colonne

```
Échafaudage extérieur (montage)
Dépose calorifuge aux TH et brides
Consignation exploitant (arrêt, vidange, purge, inertage)
Platinage toutes tuyauteries
Ouverture TH + ventilation forcée (coppus) + éclairage 24V TBT
Contrôle atmosphère : O2, LEL, H2S, benzène → permis espace confiné
Échafaudage intérieur (si besoin)
NHP tête rotative, rinçage garnissage, plateau cheminée, lignes soutirage
Réception propreté
Dépose internes (garnissage, distributeurs, grille support, plateaux)
Assistance spécialiste dépose internes
Échafaudage intérieur (accès parois)
Inspection CND : VT, UT, PT, MT, RT
Réparations chaudronnerie (meulage, rechargement, soudures)
Contrôle post-réparation + validation technique repose
Repose internes (garnissage + distributeurs + grille support / plateaux neufs)
Assistance spécialiste repose
Démontage échafaudage intérieur
Fermeture TH (joints neufs, serrage au couple)
Épreuve hydraulique (si requalification ESP : 1.2 x PS)
Réception épreuve + OH (poinçon)
Déplatinage
Repose calorifuge
Démontage échafaudage extérieur
```

## Opérations de maintenance clés

### Dépose/repose internes
- **Garnissage** : montage à blanc au sol → dépose par TH → nettoyage → repose avec spécialiste
- **Plateaux** : vérification planéité/clapets/déversoirs → remplacement si corrosion/érosion excessive

### Épreuve hydraulique (requalification ESP)
- PE = 1.2 x PS (requalification) ou 1.5 x PS (initiale)
- Maintien 30 min minimum
- Organismes habilités : Apave, Bureau Veritas, Socotec, Dekra

### Requalification ESP
- Inspection périodique : variable selon plan d'inspection
- Requalification périodique : 10 ans standard, 6 ans corrosifs, 2-3 ans toxiques

## Consignes sécurité types

- **Espace confiné** : permis, contrôle atmosphère continu (O2/H2S/LEL/benzène), ventilation forcée, surveillant, sauvetage
- **Travail en hauteur** : H0, harnais, éclairage TBT 24V
- **Pyrophorie** : maintenir humide les dépôts (sulfure de fer → auto-inflammation à l'air)
- **ATEX** : outillage anti-étincelles, équipements ATEX, permis de feu si soudage

## Désignations P&ID

- **T** : Tower / Tour (ex: T-1001, T1063)
- **C** : Column / Colonne
- **S** : dans nos gammes EMIS, capacités avec garnissage (S1101, S1121)

## Défauts courants

| Défaut | Détection | Action maintenance |
|--------|-----------|-------------------|
| Corrosion/érosion plateaux | VT intérieur | Remplacement plateaux |
| Usure clapets | VT | Remplacement plateaux ou clapets |
| Encrassement garnissage | Perte de charge en opération | NHP ou remplacement |
| Maldistribution liquide | Perte efficacité séparation | Vérification/remplacement distributeur |
| Amincissement virole | UT mesure épaisseur | Rechargement T0 |
| Fissures soudures | PT/MT/UT | Réparation T0 |
| Dépôts pyrophoriques | VT (dépôts noirs) | NHP maintien humide |
| Engorgement/flooding | Indicateurs opération | Dépose/remplacement internes |
