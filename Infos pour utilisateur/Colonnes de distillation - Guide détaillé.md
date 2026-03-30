# Colonnes de Distillation en Raffinerie - Guide Complet

## 1. Principe de fonctionnement

### 1.1 La distillation

La distillation sépare les composants d'un mélange liquide selon leurs différences de **volatilité** (point d'ébullition). En chauffant le mélange, les composants légers (plus volatils) s'évaporent en premier.

**Fonctionnement d'une colonne** :
1. La **charge** (feed) préchauffée entre dans la colonne à la **zone de flash**
2. Les **vapeurs légères** montent dans la colonne
3. Le **liquide lourd** descend par gravité
4. À chaque plateau ou section de garnissage, un **contact intime** vapeur/liquide permet le transfert de matière et de chaleur
5. Les vapeurs se condensent partiellement (cèdent les lourds), le liquide s'évapore partiellement (cède les légers)
6. La séparation s'affine progressivement d'étage en étage

### 1.2 Reflux et plateaux théoriques

- Le **reflux** est le condensat de tête renvoyé en colonne. Il fournit le liquide descendant nécessaire dans la section de rectification
- **Taux de reflux** = débit reflux / débit distillat. Plus il augmente, moins de plateaux nécessaires, mais plus d'énergie consommée
- Un **plateau théorique** = étage où la vapeur sortante est en équilibre avec le liquide sortant
- Un plateau réel n'atteint jamais 100% d'efficacité → nombre de plateaux réels > théoriques
- **Zone de fonctionnement** : 80-90% de l'engorgement (flooding)

### 1.3 Sections d'une colonne

| Section | Position | Fonction |
|---------|----------|----------|
| **Zone de flash** | Alimentation | Séparation charge en vapeur/liquide |
| **Section de rectification** | Au-dessus du flash | Enrichissement en composants légers |
| **Section de strippage** | Sous le flash | Épuisement des légers dans le liquide |
| **Zone de lavage** (wash) | Au-dessus du 1er soutirage | Lavage des résines et lourds |
| **Circuits de pompe-around** | Plusieurs niveaux | Refroidissement intermédiaire |

---

## 2. Types de colonnes

### 2.1 Colonne atmosphérique

Le premier et plus grand équipement d'une raffinerie. Le brut préchauffé (~350-370°C) entre dans la zone de flash.

**Produits** (du haut vers le bas) : gaz + essences (naphta), kérosène, gas-oil léger (diesel), gas-oil lourd, résidu atmosphérique.

**Particularités** :
- 30 à 50 plateaux
- Strippeurs latéraux recevant les soutirages
- Circuits de pompe-around pour le contrôle thermique
- Vapeur d'eau en pied pour le strippage

### 2.2 Colonne sous vide

Distille le résidu atmosphérique à pression réduite (25-100 mmHg abs) pour éviter le craquage thermique des lourds.

**Particularités** :
- Garnissage structuré (Mellapak) pour très faible perte de charge
- Zone de lavage critique (garnissage grille, Glitsch Grid)
- Plateaux uniquement aux zones de soutirage
- Produits : LVGO, HVGO, slop wax, résidu sous vide (bitume)

### 2.3 Colonne à plateaux

Le plus répandu. Série de plateaux empilés (30-50 typiquement) où se fait le contact vapeur-liquide.

**Avantages** : efficaces pour grands débits, faciles à nettoyer, bonne prévisibilité, tolère les solides.

### 2.4 Colonne à garnissage

Le garnissage remplace les plateaux. Le liquide s'écoule en film, la vapeur monte à contre-courant.

**Avantages** : faible perte de charge, adaptée aux produits thermosensibles et corrosifs, économique pour petits diamètres.

**Inconvénients** : distribution du liquide difficile, sensible à l'encrassement (structuré), coût élevé (structuré).

### 2.5 Colonne de strippage

Élimine les composants légers du produit de fond. Charge en tête, vapeur d'eau ou gaz inerte en pied.
- Ex : élimination du H2S de l'essence, strippage du naphta

### 2.6 Colonne d'absorption

Inverse du strippage. Un solvant liquide descendant absorbe un composant d'un gaz montant. Haute pression, basse température.
- Ex : absorption H2S/CO2 par amines

### 2.7 Colonne de fractionnement

Synonyme de colonne de distillation quand elle produit plusieurs coupes simultanément. La colonne atmosphérique est souvent appelée "tour de fractionnement".

### 2.8 Colonne stabilisatrice

Élimine les légers (C3/C4) pour rendre le produit stockable en bac atmosphérique. Similaire à un strippeur.

---

## 3. Composants

### 3.1 Enveloppe et structure

| Composant | FR | EN | Description |
|-----------|-----|-----|-------------|
| **Virole** | Viroles soudées | Shell | Corps cylindrique vertical, tôles roulées et soudées. Épaisseur variable selon pression/hauteur. Matériaux : SA-516 Gr.70, inox 304/316/321, Cr-Mo |
| **Jupe** | Jupe (droite ou évasée) | Skirt | Support cylindrique soudé au fond inférieur, transmet la charge aux fondations. Ouvertures d'accès et ventilation |
| **Fond bombé supérieur** | Fond torisphérique ou elliptique | Top head | Fermeture supérieure. Types : torisphérique (Klopper), elliptique (2:1), hémisphérique |
| **Fond bombé inférieur** | Fond + puisard (sump) | Bottom head | Fermeture inférieure, collecte le liquide de fond |
| **Trou d'homme (TH)** | Trou d'homme | Manhole/Manway | Ouvertures 350-600 mm, couvercle boulonné. Typiquement 1 TH tous les 6-10 plateaux |
| **Trou de poing** | Trou de poing | Handhole | Ouvertures 150-200 mm pour accès limité |

### 3.2 Piquages et tubulures

| Piquage | FR | Position | Fonction |
|---------|-----|----------|----------|
| **Sortie vapeur tête** | Sortie vapeur | Fond supérieur | Vers condenseur |
| **Retour reflux** | Retour de reflux | Partie haute | Condensat depuis ballon de reflux |
| **Alimentation** | Piquage de charge | Latéral (zone flash) | Introduction charge préchauffée |
| **Retour rebouilleur** | Retour rebouilleur | Latéral bas | Liquide vaporisé du rebouilleur |
| **Soutirage fond** | Sortie de fond | Fond inférieur | Vers rebouilleur |
| **Soutirages latéraux** | Soutirage | Latéral (plusieurs niveaux) | Extraction produits intermédiaires |
| **Piquages instruments** | TI, PI, LI | Divers niveaux | Thermocouples, pression, niveaux |
| **Évent** | Évent | Fond supérieur | Mise à l'atmosphère, purge gaz |
| **Vidange** | Purge | Fond inférieur | Vidange liquide |
| **Vapeur de strippage** | Piquage vapeur | Partie basse | Injection vapeur d'eau |
| **Soupape (PSV)** | Piquage soupape | Fond supérieur | Soupape de sûreté |

### 3.3 Plateaux (Trays)

#### Plateau à calottes / cloches (Bubble cap tray)

Chaque ouverture comporte une cheminée surmontée d'une cloche percée de fentes. La vapeur monte par la cheminée, est déviée par la cloche, barbote dans le liquide.
- **+** : excellent contact, pas de pleurage, fonctionne à très faible débit
- **-** : perte de charge élevée, coût élevé, encombrant

#### Plateau perforé (Sieve tray)

Plaque percée de trous (3-25 mm). La vapeur passe directement à travers les perforations.
- **+** : simple, économique, facile à entretenir, faible perte de charge
- **-** : pleurage à faible débit, hauteur de mousse élevée

#### Plateau à clapets / soupapes (Valve tray)

Ouvertures équipées de clapets mobiles qui se soulèvent proportionnellement au débit vapeur.
- **Clapets fixes** : profils estampés dans la tôle
- **Clapets flottants** : pièces séparées qui montent/descendent
- **+** : large plage de débits, faible pleurage, efficacité élevée
- **-** : sensible à l'encrassement, usure des clapets

#### Composants communs des plateaux

| Composant | FR | Fonction |
|-----------|-----|----------|
| **Aire active** | Zone de barbotage | Surface de contact vapeur-liquide |
| **Déversoir** (downcomer) | Descente de liquide | Conduit pour le liquide vers le plateau suivant |
| **Seuil déversant** (weir) | Déversoir | Fixe la hauteur de liquide sur le plateau |
| **Tablier** (tray deck) | Surface du plateau | Surface métallique principale |
| **Anneau de support** | Support ring | Anneau soudé à la virole |
| **Pattes de fixation** | Tray clamps | Fixation plateau à l'anneau |
| **TH de plateau** | Tray manway | Passage du personnel |

### 3.4 Garnissage (Packing)

#### Garnissage structuré (Structured packing)

Tôles ondulées en métal perforé, disposées en couches croisées.

| Produit | Fabricant | Caractéristiques |
|---------|-----------|-----------------|
| **Mellapak** | Sulzer | Le plus utilisé au monde, tôles ondulées perforées |
| **MellapakPlus** | Sulzer | Perte de charge réduite, capacité +50% |
| **BX / BXPlus** | Sulzer | Gaze métallique, très haute efficacité |
| **Mellagrid AF** | Sulzer | Grille pour services très encrassants |
| **Proflux** | Koch-Glitsch | Tôles soudées, anti-encrassement |

#### Garnissage vrac / aléatoire (Random packing)

Éléments de forme géométrique versés en vrac.

| Type | Description |
|------|-------------|
| **Anneaux de Raschig** | Cylindres creux simples (historique) |
| **Anneaux de Pall** | Anneaux fenestrés, bien meilleur que Raschig |
| **IMTP** (Koch-Glitsch) | Forme aérodynamique optimisée |
| **Selles Intalox** | Forme en selle, céramique ou plastique |
| **Raschig Super-Ring Plus** | Structure optimisée, haute capacité |

### 3.5 Autres internes

| Composant | FR | Fonction |
|-----------|-----|----------|
| **Distributeur de liquide** | Distributeur | Répartit le liquide sur le garnissage. Types : auges, buses, orifices, tubes |
| **Collecteur** | Collecteur | Recueille le liquide en aval d'une section |
| **Plateau cheminée** | Chimney tray | Collecte le liquide avec cheminées pour passage vapeur |
| **Grille support** | Support de garnissage | Supporte le poids du garnissage |
| **Grille de maintien** | Limiteur de lit | Empêche la fluidisation du garnissage |
| **Dévésiculeur** | Demister / mist eliminator | Treillis captant les gouttelettes en tête de colonne |
| **Distributeur vapeur** | - | Répartit la vapeur sous le garnissage |
| **Dispositif d'alimentation** | Galerie / bras d'injection | Distribue la charge dans la zone de flash |

### 3.6 Équipements associés

| Équipement | FR | Fonction |
|------------|-----|----------|
| **Rebouilleur** | Reboiler | Échangeur en pied vaporisant le liquide de fond |
| **Condenseur** | Condenser | Échangeur en tête refroidissant les vapeurs |
| **Ballon de reflux** | Reflux drum | Collecte le condensat, sépare distillat et reflux |

---

## 4. Opérations de maintenance en arrêt

### 4.1 Séquence complète

#### Phase PRÉ-ARRÊT

1. Repérage de l'équipement
2. Montage échafaudages extérieurs (H0)
3. Dépose calorifuge aux TH et joints brides (K0)
4. Application de produit débloquant sur la boulonnerie
5. Préparation platines, joints, outillage, ventilateurs, éclairage 24V, levage
6. Commande pièces de rechange

#### Phase ARRÊT (travaux principaux)

| Étape | Opération | Corps de métier |
|-------|-----------|-----------------|
| 1 | **MAD** : arrêt, vidange, drainage, purge vapeur, inertage, consignation | Exploitant (MAD) |
| 2 | **Platinage** : pose platines sur toutes les tuyauteries connectées | L0 |
| 3 | **Ouverture TH** : dépose couvercles, ventilation forcée (coppus), éclairage 24V TBT | L0 |
| 4 | **Contrôle atmosphère** : O2, LEL, H2S, benzène, COV → permis espace confiné | Exploitant/Sécurité |
| 5 | **Échafaudage intérieur** (si nécessaire) | H0 |
| 6 | **Nettoyage HP** : tête rotative, rinçage garnissage, nettoyage plateau cheminée + lignes soutirage | N0 |
| 7 | **Réception propreté** | C7 / Exploitant |
| 8 | **Dépose internes** : garnissage, distributeurs, grilles support, plateaux endommagés → mise en benne | L0 + M4 (spécialiste) |
| 9 | **Échafaudage intérieur** pour accès parois | H0 |
| 10 | **Inspection CND** : VT, UT (épaisseurs), PT (ressuage), MT (magnétoscopie), RT (radiographie) | C7/C6 |
| 11 | **Réparations** : meulage, rechargement, réparation soudures, remplacement tôles, piquages corrodés | T0 + L0 |
| 12 | **Contrôle post-réparation** : CND sur soudures de réparation | C7 |
| 13 | **Validation technique** : autorisation repose internes | C7 |
| 14 | **Repose internes** : garnissage + distributeurs + grille support, ou plateaux neufs. Vérification planéité | L0 + M4 |
| 15 | **Démontage échafaudage intérieur** | H0 |
| 16 | **Fermeture** : repose couvercles TH, joints neufs, serrage au couple | L0 |
| 17 | **Épreuve hydraulique** (si requalification ESP) : 120% PS, maintien, vérification | L0 + C7 + OH |
| 18 | **Déplatinage** | L0 |
| 19 | **Repose calorifuge** | K0 |
| 20 | **Démontage échafaudages** | H0 |
| 21 | **Remise à disposition** exploitant | Exploitant |

### 4.2 Opérations spécifiques

#### Inspection et remplacement des plateaux

- Vérification planéité, fixation, usure clapets, érosion perforations
- Vérification déversoirs : hauteur, intégrité, étanchéité
- Vérification aires actives : bouchage, corrosion, déformation
- Remplacement complet si corrosion/érosion excessive
- Vérification espacement plateau-à-plateau (tray spacing)

#### Remplacement du garnissage

- Montage à blanc au sol (vérifier conformité)
- Dépose ancien garnissage (par TH, mise en benne)
- Nettoyage section de colonne
- Repose : internes + garnissage + grille support
- Assistance spécialiste obligatoire pour garnissages structurés propriétaires

#### Épreuve hydraulique (requalification ESP)

- **PE = 1.2 x PS** (pression maximale admissible) pour requalification
- **PE = 1.5 x PS** pour épreuve initiale (code de construction)
- Maintien 30 min minimum
- Poinçon "tête de cheval" apposé par l'Organisme Habilité si conforme

#### Requalification ESP

| Opération | Périodicité | Contenu |
|-----------|-------------|---------|
| **Inspection périodique** | Variable (plan d'inspection) | Examen visuel, documentation, accessoires sécurité |
| **Requalification périodique** | **10 ans** (standard), 6 ans (corrosifs), 2-3 ans (toxiques) | Vérification administrative + inspection interne/externe + épreuve hydraulique + accessoires + poinçon |

Organismes habilités : Apave, Bureau Veritas, Socotec, Dekra.
Autorité : DREAL.

### 4.3 Exemple réel de nos gammes : S1101

- Ph50 L0 : Montage à blanc au sol du garnissage
- Ph160 N0 : Nettoyage HP par tête rotative (rinçage garnissage avant dépose)
- Ph190 L0 : Dépose internes d'alimentation + garnissage + 1/4 grille support
- Ph200 M4 : Assistance dépose par spécialiste
- Ph210 H0 : Échafaudage interne (prévoir échelle accès plateau cheminée)
- Ph220 N0 : NHP après dépose (tête rotative, plateau cheminée + lignes soutirage)
- Ph240 C7 : Validation technique (autorisation repose garnissage)
- Ph250 L0 : Repose garnissage + internes distribution + grille support
- Ph260 M4 : Assistance repose par spécialiste

---

## 5. Sécurité

### 5.1 Espace confiné

Les colonnes sont des **espaces confinés par excellence** :
- Accès limité (TH de 600 mm)
- Pas de ventilation naturelle
- Risques : atmosphère toxique (H2S, benzène, COV), appauvrie en O2 (inertage N2 résiduel), explosive (ATEX)

**Mesures obligatoires** :
- Permis d'entrée en espace confiné
- Contrôle atmosphère continu : O2 (19.5-23.5%), H2S (<5 ppm), LEL (<10% LIE), benzène (<1 ppm)
- Ventilation forcée permanente (coppus/air mover)
- Surveillant extérieur permanent
- Moyens de sauvetage (treuil, harnais, ARI)
- Communication permanente intérieur/extérieur
- Procédure d'évacuation connue de tous

### 5.2 Travail en hauteur

Colonnes de 10 à 60+ mètres :
- Échafaudages conformes (H0)
- Harnais obligatoire, points d'ancrage vérifiés
- Éclairage TBT 24V à l'intérieur

### 5.3 Permis de feu

Obligatoire pour soudage, meulage, découpage :
- Analyse ATEX avant tout point chaud
- Contrôle atmosphère renforcé
- Veilleur feu avec extincteur
- Bâches ignifuges

### 5.4 Risques spécifiques

| Risque | Source | Mesure |
|--------|--------|--------|
| **H2S** | Résiduel dans colonne/dépôts | Détecteur continu, ARI si >10 ppm |
| **Benzène** | Résiduel hydrocarbures | Détecteur COV, limite 1 ppm, masque/ARI |
| **LEL** | Vapeurs d'hydrocarbures | Explosimètre continu, <10% LIE |
| **Pyrophorie** | Sulfure de fer (auto-inflammation à l'air) | Maintenir humide, NHP, interdiction sécher |
| **Asphyxie** | N2 résiduel, ventilation insuffisante | Mesure O2 continue, ventilation forcée |
| **Chute d'objets** | Brides, boulons, outils | Périmètre sécurité au sol |

---

## 6. Défauts et modes de défaillance

### 6.1 Défauts des plateaux

| Défaut | Cause | Conséquence |
|--------|-------|-------------|
| **Corrosion** | Acides naphténiques, H2S, HCl, NH4Cl | Amincissement, perforation, perte efficacité |
| **Érosion clapets** | Ouverture/fermeture répétée | Usure, perte étanchéité |
| **Déformation/flambage** | Surpression, montée rapide pression | Plateaux pliés, effondrés |
| **Bouchage** | Cokage, dépôts de sels, polymérisation | Perte de charge élevée, engorgement |
| **Pleurage** (weeping) | Débit vapeur insuffisant | Liquide passe à travers perforations |
| **Entraînement** (entrainment) | Débit vapeur excessif | Gouttelettes vers plateau supérieur |
| **Engorgement** (flooding) | Surcharge hydraulique (72% des cas), vide (21%) | Perte totale de séparation |

### 6.2 Défauts du garnissage

| Défaut | Cause | Conséquence |
|--------|-------|-------------|
| **Encrassement/colmatage** | Coke, sels, polymères | Restriction canaux, maldistribution |
| **Écrasement** | Surpression, poids excessif | Perte géométrie, perte de charge accrue |
| **Maldistribution** | Distributeur bouché ou mal aligné | Zones sèches, perte efficacité |
| **Cokage zone de lavage** (sous vide) | Température trop élevée | Perte de vide |

### 6.3 Mécanismes de corrosion

| Mécanisme | Zone | Température | Agents |
|-----------|------|-------------|--------|
| **Acide naphténique** (NAC) | Soutirages latéraux | 190-360°C | Acides du brut (TAN > 0.5) |
| **Sulfidique** | Zones haute T | > 220°C | H2S, mercaptans, sulfures |
| **HCl** | Système de tête | < 120°C | HCl de l'hydrolyse des chlorures |
| **NH4Cl** (dépôt) | Système de tête | 120-200°C | NH3 + HCl |
| **Sous dépôt** | Zones stagnantes | Variable | Concentration locale agents corrosifs |
| **Sous contrainte** (SCC) | Soudures | Variable | H2S humide, acide polythionique |
| **Érosion-corrosion** | Zones haute vitesse | Variable | Flux + agents corrosifs |

### 6.4 Défauts structurels

| Défaut | Localisation | Détection |
|--------|-------------|-----------|
| Amincissement virole | Zones corrosion préférentielle | UT |
| Fissures en soudure | Soudures virole, piquages | PT, MT, UT, RT |
| Piqûres (pitting) | Surface interne | VT, UT |
| Déformation jupe | Base colonne | VT, mesure géométrique |
| Fluage (creep) | Zones haute température | UT, répliques métallographiques |

---

## 7. Désignations sur P&ID

| Lettre | Signification |
|--------|---------------|
| **T** | Tower / Tour |
| **C** | Column / Colonne |
| **V** | Vessel / Capacité (ballons, bacs) |
| **DA** | Distillation Atmosphérique |
| **DV** | Distillation Vacuum |

**Format tag** : XX-YZZ (ex: T-1001 = Tour n°1 de la zone 10)

**Dans nos gammes EMIS** : préfixe **T** (T1001, T1002, T1016, T1045, T1063) et **S** pour capacités contenant du garnissage (S1101, S1121).

---

## 8. Glossaire FR/EN

| Français | English |
|----------|---------|
| Colonne de distillation | Distillation column / tower |
| Virole | Shell |
| Jupe | Skirt |
| Fond bombé | Dished head / dome |
| Trou d'homme (TH) | Manhole / Manway |
| Piquage / tubulure | Nozzle |
| Soutirage | Draw-off |
| Plateau | Tray / Plate |
| Plateau à calottes/cloches | Bubble cap tray |
| Plateau perforé | Sieve tray |
| Plateau à clapets/soupapes | Valve tray |
| Clapet fixe / flottant | Fixed / Floating valve |
| Déversoir / descente de liquide | Downcomer |
| Seuil déversant | Weir |
| Aire active / zone de barbotage | Active area / Bubbling area |
| Garnissage | Packing |
| Garnissage structuré | Structured packing |
| Garnissage vrac / aléatoire | Random packing |
| Anneau de Raschig / Pall | Raschig / Pall ring |
| Selle Intalox | Intalox saddle |
| Distributeur de liquide | Liquid distributor |
| Collecteur | Liquid collector |
| Plateau cheminée | Chimney tray |
| Grille support | Packing support plate |
| Grille de maintien | Bed limiter / Hold-down plate |
| Dévésiculeur | Demister / Mist eliminator |
| Rebouilleur | Reboiler |
| Condenseur | Condenser |
| Ballon de reflux | Reflux drum |
| Reflux / Taux de reflux | Reflux / Reflux ratio |
| Étage théorique | Theoretical plate |
| Perte de charge | Pressure drop |
| Engorgement | Flooding |
| Pleurage | Weeping |
| Entraînement | Entrainment |
| Zone de flash | Flash zone |
| Strippage | Stripping |
| Section de rectification | Rectifying section |
| Section d'épuisement | Stripping section |
| Pompe-around | Pump-around |
| Épreuve hydraulique | Hydrotest |
| Requalification ESP | Pressure equipment requalification |
| Platinage | Blinding / Spading |
| Platine | Blind / Spade |
| Espace confiné | Confined space |
| CND | NDT (Non-Destructive Testing) |
| Ressuage | Penetrant Testing (PT) |
| Ultrasons | Ultrasonic Testing (UT) |
| Magnétoscopie | Magnetic Particle Testing (MT) |
| Radiographie | Radiographic Testing (RT) |
| Mesure d'épaisseurs | Thickness measurement |
| Pyrophorie | Pyrophoric deposits |
| Cokage | Coking |
