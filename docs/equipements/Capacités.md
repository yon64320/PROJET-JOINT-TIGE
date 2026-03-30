# Capacités - Référence technique

Document de référence pour la rédaction et l'analyse des gammes de maintenance sur capacités (ballons, séparateurs, réacteurs) en arrêt d'unité.

## Types de capacités en raffinerie

| Type | FR | Principe | Position typique |
|------|-----|----------|-----------------|
| **Ballon séparateur** | Séparateur G/L ou triphasique | Séparation par gravité + internes | Horizontal ou vertical |
| **Ballon de reflux** | Ballon de reflux | Collecte condensat de tête colonne | Horizontal |
| **Ballon de torche** | Knockout drum | Captation liquides avant torche | Horizontal ou vertical |
| **Ballon tampon** | Accumulateur | Amortissement fluctuations débit/pression | Variable |
| **Ballon de détente** | Flash drum | Vaporisation partielle par détente | Vertical ou horizontal |
| **Réacteur lit fixe** | Réacteur catalytique | Réaction sur lit de catalyseur | Vertical |
| **Réacteur lit fluidisé** | FCC | Catalyseur en suspension | Vertical |
| **Filtre sous pression** | Filtre à paniers/cartouches | Rétention particules solides | Vertical |
| **Sphère / cigare** | Stockage pression | Stockage GPL, NH3 | Sphérique / horizontal |
| **Dessaleur** | Dessaleur | Séparation eau/brut par champ électrique | Horizontal |

## Composants principaux

### Structure

| Composant | FR | EN | Détail |
|-----------|-----|-----|--------|
| Virole | Corps, enveloppe | Shell | Cylindre principal, SA-516 Gr.70 / Cr-Mo / inox / clad |
| Fond bombé | Elliptique 2:1 (courant), torisphérique, hémisphérique | Head/dome | Fermeture sup. et inf. |
| Trou d'homme (TH) | TH | Manhole | 450-600 mm, couvercle boulonné |
| Trou de poing | - | Handhole | 150-200 mm, accès limité |

### Supports

| Type | Usage |
|------|-------|
| **Berceaux** (saddles) | Capacités horizontales — 1 fixe + 1 coulissant |
| **Jupe** (skirt) | Capacités verticales |
| **Pieds** (legs) | Petites capacités |
| **Consoles** (lugs) | Capacités suspendues sur structure |

### Piquages

| Piquage | Position | Fonction |
|---------|----------|----------|
| Entrée process | Latéral | Introduction fluide |
| Sortie gaz/vapeur | Partie haute | Phase gazeuse |
| Sortie liquide | Fond ou latéral bas | Phase liquide |
| Sortie eau (boot) | Fond | Eau libre (triphasiques) |
| Évent | Fond sup. | Purge gaz |
| Vidange / drain | Fond inf. | Drainage |
| PSV | Partie haute | Soupape de sûreté |
| Disque de rupture | Partie haute | Protection secours |
| Piquages instruments | Divers | TI, PI, LI, LG |

### Internes

| Interne | FR | EN | Fonction |
|---------|-----|-----|----------|
| Déflecteur d'entrée | Plaque d'impact | Inlet deflector | Casse la vitesse, distribue |
| Dévésiculeur | Matelas grillage | Demister | Capte gouttelettes dans le gaz |
| Coalesceur | Plaque coalescente | Coalescer | Grossissement gouttelettes eau/HC |
| Anti-vortex | Briseur de vortex | Vortex breaker | Empêche tourbillons en sortie fond |
| Chicane/seuil | Déflecteur | Baffle/weir | Guide l'écoulement |
| Panier filtre | Panier | Basket/screen | Retient les solides |
| Grille support catalyseur | Support catalyseur | Support grid | Supporte le lit catalytique |
| Distributeur | Diffuseur | Distributor | Répartit fluide sur catalyseur |
| Réfractaire | Béton projeté | Refractory lining | Protection thermique (FCC) |
| Résine/lining | Revêtement intérieur | Internal lining | Protection anticorrosion |

## Séquence type maintenance capacité

```
Échafaudage (si en hauteur)
Dépose calorifuge aux TH, brides, zones inspection
Mise hors tension traceurs
Consignation exploitant (arrêt, vidange, purge, inertage N2)
Consignation instrumentation
Desserrage progressif 1 boulon sur 2
Platinage toutes tuyauteries
Ouverture TH + ventilation forcée + éclairage 24V TBT
Contrôle atmosphère : O2, LEL, H2S, benzène → permis espace confiné
NHP intérieur (parois, internes, fond, piquages)
Nettoyage chimique (si dépôts tenaces)
Réception propreté
Dépose internes si requis (dévésiculeurs, coalesceurs, paniers)
Inspection CND : VT, UT (épaisseurs CMLs), PT, MT, RT
Inspection périodique / requalification ESP
Dépose/repose PSV (passage au banc, tarage)
Réparations chaudronnerie (meulage, rechargement, soudures)
Reprise revêtement intérieur (résine, lining, peinture)
Contrôle post-réparation + validation technique
Repose internes (dévésiculeurs, coalesceurs neufs si besoin)
Fermeture TH (joints neufs, serrage au couple)
Épreuve hydraulique (si requalification : 1.2 x PS)
Réception épreuve + OH (poinçon)
Déplatinage
Remise en service instrumentation
Remise sous tension traceurs
Repose calorifuge
Démontage échafaudage
```

## Opérations de maintenance clés

### Épreuve hydraulique
- PE = 1.2 x PS (requalification) ou 1.5 x PC (initiale ASME)
- Montée progressive par paliers, maintien 30 min à 1h
- Métal > MDMT + 17°C, max 48°C
- Vérifier charge berceaux/fondations avec poids eau

### PSV (soupapes de sûreté)
- Dépose → passage au banc (tarage, étanchéité, débit) → réglage → repose joint neuf + plomb
- Périodicité : à chaque requalification ESP minimum
- Norme : API 576

### Dépose/repose internes
- **Dévésiculeur** : extraction par TH, remplacement si bouché/corrodé
- **Coalesceur** : nettoyage ou remplacement, repose dans le bon sens
- **Paniers filtre** : nettoyage ou remplacement éléments filtrants

### Opérations spécifiques réacteurs
- **Déchargement catalyseur** : passivation (si pyrophorique) → ouverture → aspiration vacuum truck → nettoyage → inspection
- **Rechargement catalyseur** : billes céramique fond + catalyseur + billes dessus, densité contrôlée
- **Réfractaire** : VT + sondage marteau → réparation gunitage → séchage progressif

### Nettoyage
- **NHP** (N0) : parois, internes, fond, piquages
- **Chimique** (NC14) : recirculation acide/base pour dépôts tenaces
- **Botte à eau** : NHP fond de botte (zone critique corrosion)

### Requalification ESP
- Inspection périodique : ~40 mois (raffinerie)
- Requalification périodique : 10 ans standard, 6 ans corrosifs, 2-3 ans toxiques
- Organismes habilités : Apave, Bureau Veritas, Socotec, Dekra

## Consignes sécurité types

- **Espace confiné** : permis, contrôle atmosphère continu (O2/H2S/LEL/benzène), ventilation forcée, surveillant, ARI de secours
- **Pression résiduelle** : vérifier mano à 0, évent ouvert, desserrage 1/2, écran facial, présence fab
- **Pyrophorie** : maintenir humide les dépôts (sulfure de fer → auto-inflammation à l'air)
- **Catalyseur** : passivation, masque P3, combinaison, ARI si pyrophorique
- **ATEX** : outillage ADF, équipements ATEX, éclairage 24V TBT
- **Levage internes** : plan de levage, élingues certifiées, commandant de manœuvre
- `ARI + T35 + PRESENCE FAB OBLIGATOIRE` — ouverture, platinage
- `ECRAN FACIAL + PRESENCE FAB` — risque projection
- `CONTRÔLE ATMOSPHERE CONTINU` — espace confiné

## Horizontal vs Vertical

| Critère | Horizontal | Vertical |
|---------|-----------|----------|
| Séparation G/L | Bonne | Correcte |
| Séparation L/L | **Excellente** | Médiocre |
| Emprise au sol | Grande | Faible |
| Maintenance internes | Accès facile (TH latéraux) | Plus difficile |
| Tampon volume | Grand volume utile | Limité |

## Désignations P&ID

- **V** : Vessel / Capacité (V-1001)
- **D** : Drum / Ballon (D-101)
- **S** : Separator (S-1201)
- **F** : Filter (F-301)
- **R** : Reactor (R-101)
- **KO** : Knockout drum (KO-101)

## Défauts courants

| Défaut | Détection | Action maintenance |
|--------|-----------|-------------------|
| Amincissement virole | UT mesure épaisseur (CMLs) | Rechargement T0 ou remplacement tôle |
| Corrosion sous calorifuge (CUI) | UT/VT sous calorifuge déposé | Sablage + peinture, remplacement calorifuge |
| Fissures soudures | PT/MT/UT/RT | Meulage + réparation T0 |
| Piqûres (pitting) | VT/UT | Rechargement si profond |
| Cloquage (blistering) | VT surface interne | Monitoring UT, remplacement si sévère |
| Dévésiculeur bouché | VT / perte de charge en service | Remplacement demister |
| Coalesceur encrassé | Mauvaise séparation en service | Nettoyage ou remplacement |
| Dégradation réfractaire | VT + sondage marteau | Réparation gunitage |
| Tassement catalyseur | Augmentation perte de charge | Criblage ou remplacement catalyseur |
| Défaut revêtement/lining | VT + test étincelle | Reprise résine P19 |
| PSV hors tarage | Passage au banc | Réglage ou remplacement |
| Corrosion botte à eau | UT ciblé | Rechargement ou remplacement |
