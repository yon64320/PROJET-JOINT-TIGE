# Capacités en Raffinerie - Guide Complet

## 1. Qu'est-ce qu'une capacité ?

### 1.1 Définition

Une **capacité** (pressure vessel / drum) est un récipient fermé sous pression conçu pour contenir, séparer, stocker ou traiter des fluides (gaz, liquides, ou mélanges polyphasiques). En raffinerie, ce terme regroupe tous les appareils à pression qui ne sont ni des échangeurs thermiques ni des colonnes de distillation.

**Réglementation** : Les capacités sont des **Équipements Sous Pression (ESP)** soumis à la Directive Européenne 2014/68/UE (DESP) et à l'Arrêté du 20/11/2017 relatif au suivi en service.

### 1.2 Fonction générale

Les capacités assurent une ou plusieurs de ces fonctions :
- **Séparation** : séparer des phases (gaz/liquide, eau/hydrocarbures, triphasique)
- **Accumulation / tampon** : amortir les variations de débit et de pression
- **Stockage sous pression** : contenir des produits volatils (GPL, NH3, Cl2)
- **Réaction** : contenir une réaction chimique sous pression et température (réacteurs)
- **Filtration** : retenir les particules solides
- **Détente / flash** : provoquer une vaporisation partielle par réduction de pression

---

## 2. Types de capacités

### 2.1 Ballons séparateurs (Separator Drums)

Le type le plus courant. Séparent deux ou trois phases par gravité et/ou force centrifuge.

**Principe** : Le mélange entre dans le ballon, la vitesse diminue (section plus grande), la gravité sépare le liquide lourd (descend) du gaz (monte). Des internes améliorent la séparation.

#### Séparateur biphasique (gaz/liquide)

| Paramètre | Détail |
|-----------|--------|
| **Fonction** | Séparer les gouttelettes de liquide entraînées dans un flux gazeux |
| **Position** | Horizontal ou vertical |
| **Internes** | Déflecteur d'entrée, dévésiculeur (demister), chicanes |
| **Exemples** | Ballon aspirant compresseur, ballon de torche, séparateur sortie réacteur |

#### Séparateur triphasique (gaz/huile/eau)

| Paramètre | Détail |
|-----------|--------|
| **Fonction** | Séparer gaz, hydrocarbures et eau libre |
| **Position** | Généralement horizontal (meilleure interface) |
| **Internes** | Déflecteur, plaque coalescente, seuils, dévésiculeur |
| **Temps de séjour** | 3-10 min typiquement (selon viscosité) |
| **Exemples** | Séparateur de production, dessaleur (dans les dessaleurs, une émulsion eau/brut est traitée par champ électrique) |

### 2.2 Ballons de reflux (Reflux Drums)

| Paramètre | Détail |
|-----------|--------|
| **Fonction** | Recueillir le condensat de tête de colonne, séparer le distillat, le reflux et l'eau libre |
| **Position** | Horizontal (meilleure séparation de l'eau) |
| **Liaison** | En aval du condenseur de tête, alimente le reflux vers la colonne et le distillat vers stockage/unité aval |
| **Internes** | Seuil de rétention, plaque coalescente, botte à eau |
| **Instruments** | Niveaux (LG, LIC), pression (PIC), température (TI) |

### 2.3 Ballons de torche (Flare Knockout Drums)

| Paramètre | Détail |
|-----------|--------|
| **Fonction** | Capter les liquides entraînés avant la torche (sécurité critique) |
| **Position** | Horizontal ou vertical, en amont de la torche |
| **Enjeu** | Empêcher tout liquide d'atteindre la flamme (risque pluie de feu, "rain-out") |
| **Dimensionnement** | Selon API 521 — capacité suffisante pour dépressurisation d'urgence |
| **Particularité** | Souvent très gros diamètre, faible pression de calcul |

### 2.4 Ballons tampons / Accumulateurs (Surge Drums)

| Paramètre | Détail |
|-----------|--------|
| **Fonction** | Amortir les fluctuations de débit et pression, assurer l'alimentation continue d'un équipement aval |
| **Exemples** | Ballon d'aspiration de pompe, ballon tampon charge, ballon intermédiaire |
| **Dimensionnement** | Temps de rétention 5-15 min typiquement |
| **Particularité** | Souvent sans internes complexes (déflecteur, anti-vortex en sortie) |

### 2.5 Ballons de détente / Flash Drums

| Paramètre | Détail |
|-----------|--------|
| **Fonction** | Provoquer une vaporisation partielle par réduction de pression (détente) |
| **Principe** | Le fluide sous haute pression entre, la pression chute, les composants légers se vaporisent |
| **Exemples** | Ballon HP/MP/BP dans les unités d'hydrotraitement, ballon flash du dessaleur |
| **Internes** | Déflecteur d'entrée, dévésiculeur |

### 2.6 Réacteurs (Reactor Vessels)

Les plus critiques. Contiennent les réactions chimiques sous conditions sévères.

#### Réacteur à lit fixe (Fixed Bed Reactor)

| Paramètre | Détail |
|-----------|--------|
| **Principe** | Le fluide traverse un lit de catalyseur fixe (particules empilées) |
| **Applications** | Hydrotraitement (HDS, HDN), reformage catalytique, isomérisation, hydrocraquage |
| **Conditions** | 300-450°C, 30-200 bar (H2) |
| **Internes** | Distributeur, lit de catalyseur, grilles support, billes de céramique (quench), collecteur, panier |
| **Particularité** | Rechargement catalyseur périodique (cycle catalytique 2-5 ans) |

#### Réacteur à lit mobile (Moving Bed Reactor)

| Paramètre | Détail |
|-----------|--------|
| **Principe** | Le catalyseur circule lentement par gravité, régénéré en continu |
| **Applications** | Reformage catalytique continu (CCR), procédé UOP |
| **Particularité** | Complexité accrue, mais opération continue sans arrêt pour régénération |

#### Réacteur à lit fluidisé (Fluidized Bed Reactor)

| Paramètre | Détail |
|-----------|--------|
| **Principe** | Le catalyseur en poudre est maintenu en suspension par le flux gazeux |
| **Applications** | FCC (Fluid Catalytic Cracking) — régénérateur + réacteur (riser) |
| **Particularité** | Érosion intense par le catalyseur, revêtement réfractaire obligatoire |

### 2.7 Filtres sous pression (Filter Vessels)

| Paramètre | Détail |
|-----------|--------|
| **Fonction** | Retenir les particules solides (catalyseur, oxydes, calamine) |
| **Types** | Filtres à paniers (basket strainers), filtres à cartouches, filtres à sable |
| **Position** | En amont de pompes, compresseurs, échangeurs |
| **Maintenance** | Nettoyage/remplacement éléments filtrants, parfois rétro-lavage |

### 2.8 Capacités de stockage sous pression

| Type | Forme | Produits | Pression |
|------|-------|----------|----------|
| **Sphère** (Horton sphere) | Sphérique | GPL (propane, butane) | 8-17 bar |
| **Cigare** (bullet) | Cylindrique horizontal | GPL, NH3 | Jusqu'à 25 bar |
| **Ballon vertical** | Cylindrique vertical | Divers | Variable |

### 2.9 Autres capacités

| Type | Fonction |
|------|----------|
| **Dessaleur** | Séparation eau/brut par champ électrique (grilles sous tension) |
| **Pot de purge** (blowdown drum) | Recueil des purges sous pression |
| **Éjecteur / ballon d'eau motrice** | Alimentation éjecteurs (systèmes de vide) |
| **Ballon de lavage** (wash drum) | Lavage gaz par injection de liquide |

---

## 3. Composants d'une capacité

### 3.1 Enveloppe

| Composant | FR | EN | Description |
|-----------|-----|-----|-------------|
| **Virole** | Corps, enveloppe | Shell | Cylindre principal, tôles roulées et soudées. Épaisseur selon calcul ASME/CODAP |
| **Fond bombé supérieur** | Fond, calotte | Top head | Fermeture supérieure |
| **Fond bombé inférieur** | Fond | Bottom head | Fermeture inférieure |

#### Types de fonds bombés

| Type | Forme | Usage |
|------|-------|-------|
| **Elliptique 2:1** | Demi-ellipse (rapport 2:1) | **Le plus courant** en raffinerie. Bon compromis résistance/coût |
| **Torisphérique** (Klopper) | Calotte sphérique + raccordement torique | Basses pressions. Plus économique mais plus épais |
| **Hémisphérique** | Demi-sphère | Hautes pressions. Plus résistant à épaisseur égale |
| **Conique** | Cône | Fond de capacités avec solides (catalyseur), vidange facilitée |
| **Plat** | Plan renforcé | Très basses pressions, petits diamètres |

### 3.2 Supports

| Type | Description | Utilisation |
|------|-------------|-------------|
| **Jupe** (skirt) | Cylindre soudé sous le fond inférieur | Capacités verticales |
| **Berceaux** (saddles) | Supports en forme de selle, posés sur massifs béton | **Capacités horizontales** — le plus courant |
| **Pieds** (legs) | Tubes ou profilés soudés | Petites capacités |
| **Oreilles / consoles** (lugs/brackets) | Soudées sur la virole | Capacités suspendues ou fixées à une structure |
| **Jupe évasée** | Jupe conique élargissant la base | Grandes capacités verticales (stabilité) |

> **Pour les berceaux** : toujours un berceau fixe (ancrage) et un berceau coulissant (dilatation). Usure des plaques de glissement à vérifier en arrêt.

### 3.3 Internes

| Interne | FR | EN | Fonction |
|---------|-----|-----|----------|
| **Déflecteur d'entrée** | Plaque d'impact, déflecteur | Inlet deflector / Impingement plate | Casser la vitesse du flux entrant, distribuer |
| **Dévésiculeur** | Dévésiculeur, matelas de grillage | Demister / Mist eliminator | Capter les fines gouttelettes dans le gaz |
| **Plaque coalescente** | Coalesceur | Coalescer | Favoriser la coalescence des gouttelettes (séparation eau/HC) |
| **Chicane/seuil** | Chicane, déflecteur | Baffle / Weir | Diriger l'écoulement, imposer un chemin |
| **Anti-vortex** | Briseur de vortex | Vortex breaker | Empêcher la formation de tourbillons à la sortie de fond (cavitation pompe) |
| **Grille support** | Support catalyseur | Catalyst support grid | Supporter le lit de catalyseur (réacteurs) |
| **Distributeur** | Diffuseur | Distributor | Répartir le fluide sur le lit de catalyseur |
| **Panier filtre** | Panier | Basket / Screen | Retenir les solides |
| **Garnissage** | Garnissage coalescent | Packing | Garnissage structuré dans certains séparateurs pour améliorer la coalescence |
| **Revêtement réfractaire** | Réfractaire, béton projeté | Refractory lining | Protection thermique (réacteurs FCC, régénérateurs) |
| **Résine / lining** | Revêtement intérieur | Internal lining | Protection contre la corrosion (résine époxy, caoutchouc, inox cladding) |

### 3.4 Piquages et accessoires

| Piquage | FR | Position | Fonction |
|---------|-----|----------|----------|
| **Entrée process** | Piquage d'entrée | Latéral | Introduction du fluide |
| **Sortie gaz/vapeur** | Sortie vapeur | Partie haute | Évacuation phase gazeuse |
| **Sortie liquide** | Sortie liquide, soutirage | Fond ou latéral bas | Évacuation phase liquide |
| **Sortie eau** | Botte à eau, purge eau | Fond | Évacuation eau libre (séparateurs triphasiques) |
| **Évent** | Évent | Fond supérieur | Mise à l'atmosphère, purge gaz |
| **Vidange / drain** | Purge, vidange | Fond inférieur | Vidange complète |
| **Soupape (PSV)** | Piquage PSV | Partie haute | Protection surpression |
| **Disque de rupture** | Piquage disque de rupture | Partie haute | Protection surpression de secours |
| **Piquages instruments** | TI, PI, LI, LG | Divers | Température, pression, niveaux, indicateur à glace |
| **Trou d'homme** | TH | Latéral ou fond | Accès inspection/maintenance (450-600 mm) |
| **Trou de poing** | - | Latéral | Accès limité (150-200 mm) |

### 3.5 Matériaux courants

| Matériau | Nuance | Application |
|----------|--------|-------------|
| **Acier carbone** | SA-516 Gr.60/70 | Service général, T < 425°C |
| **Cr-Mo** | SA-387 Gr.11/22 (1.25Cr/2.25Cr) | Haute température, résistance H2 (HTHA) |
| **Inox austénitique** | 304/304L, 316/316L, 321, 347 | Résistance corrosion, basses T (cryogénique) |
| **Inox duplex** | 2205, 2507 | Résistance corrosion + haute résistance mécanique |
| **Acier plaqué** (clad) | Acier carbone + inox/Inconel/Monel | Résistance mécanique (base) + corrosion (placage) |
| **Inconel** | 625, 825 | Corrosion sévère (HF, H2S, CO2) |
| **Monel** | 400 | Service HF (alkylation) |
| **Acier nickel** | SA-203 (3.5% Ni), SA-353 (9% Ni) | Service cryogénique (GNL : -196°C) |

---

## 4. Dimensionnement et conception

### 4.1 Codes de construction

| Code | Portée | Utilisation |
|------|--------|-------------|
| **ASME Section VIII Div. 1** | Appareils à pression (règles prescriptives) | **Le plus utilisé** en raffinerie |
| **ASME Section VIII Div. 2** | Appareils à pression (analyse détaillée) | Épaisseur réduite mais calculs plus complexes |
| **EN 13445** | Norme européenne appareils à pression | Alternative à ASME en Europe |
| **CODAP** | Code français (anciennement) | France, remplacé progressivement par EN 13445 |

### 4.2 Paramètres de conception

| Paramètre | Description |
|-----------|-------------|
| **Pression de calcul** (design pressure) | PS majorée d'une marge (10% ou + 2 bar typiquement) |
| **Température de calcul** (design temperature) | Température max de service + marge |
| **Pression d'épreuve** | 1.3 x PS (DESP) ou 1.5 x PC (ASME initial) |
| **MDMT** | Température minimale de calcul du métal (Minimum Design Metal Temperature) |
| **Surépaisseur de corrosion** | 1.5 à 6 mm selon service et durée de vie visée |
| **Contrainte admissible** | Selon matériau, température et code de construction |
| **Radiographie soudures** | Totale (RT-1), par sondage (RT-2), spot (RT-3) |
| **PWHT** | Traitement thermique post-soudage si épaisseur > seuil ou service H2/SCC |

### 4.3 Plaque signalétique

Toute capacité porte une plaque rivée indiquant :
- Nom du fabricant
- N° de série / N° de fabrication
- Date de fabrication
- Code de construction (ASME, CODAP, EN 13445)
- Pression de service (PS) et pression d'épreuve (PE)
- Température de service (TS) min et max
- Volume (litres)
- Fluide (groupe 1 ou 2)
- Catégorie de risque (I à IV)
- Organisme notifié (marquage CE)

---

## 5. Opérations de maintenance en arrêt

### 5.1 Séquence type complète

| Étape | Corps de métier | Opération |
|-------|----------------|-----------|
| 1 | **H0** Échafaudage | Montage échafaudage (si en hauteur) |
| 2 | **K0** Calorifuge | Dépose calorifuge aux TH, brides, zones d'inspection |
| 3 | **E2/E7** Électricité | Mise hors tension, décoller traceurs électriques |
| 4 | **MAD** Exploitant | Arrêt, vidange, drainage, purge vapeur, inertage N2, consignation |
| 5 | **R70** Instrumentation | Consignation/débranchement instruments (LG, LIC, PIC, PSV...) |
| 6 | **L0** Tuyauterie | Desserrage progressif 1 boulon sur 2 (brides et TH) |
| 7 | **L0** Tuyauterie | Platinage (pose platines d'isolement sur toutes les tuyauteries) |
| 8 | **L0** Tuyauterie | Ouverture trous d'homme (dépose couvercles) |
| 9 | **MAD** Exploitant/Sécurité | Ventilation forcée, contrôle atmosphère (O2, LEL, H2S, benzène) → permis espace confiné |
| 10 | **N0** Nettoyage | NHP intérieur (parois, internes, fond, piquages) |
| 11 | **NC14** Nettoyage chimique | Nettoyage chimique si dépôts tenaces (recirculation acide/base) |
| 12 | **C7** Inspection | Réception propreté |
| 13 | **L0/M5** Tuyauterie/Mécanique | Dépose internes si requis (déflecteurs, dévésiculeurs, coalesceurs, paniers) |
| 14 | **IU6/IO6** Inspection | Inspection CND : VT, UT (épaisseurs aux CMLs), PT, MT, RT si requis |
| 15 | **IU6/IO6** Inspection | Inspection périodique / requalification ESP |
| 16 | **PSV** Soupapes | Passage au banc des soupapes de sûreté (dépose/repose, tarage) |
| 17 | **T0** Chaudronnerie | Réparations : meulage défauts, rechargement soudure, pièces rapportées, remplacement tôle |
| 18 | **P19** Résine | Reprise revêtement intérieur si applicable (résine, lining, peinture) |
| 19 | **C7** Inspection | Contrôle post-réparation, validation technique avant fermeture |
| 20 | **L0/M5** Tuyauterie/Mécanique | Repose internes (dévésiculeurs, coalesceurs, paniers neufs si besoin) |
| 21 | **L0** Tuyauterie | Fermeture TH (joints neufs, serrage contrôlé au couple) |
| 22 | **L0** Tuyauterie | Épreuve hydraulique si requise (PE = 1.2 x PS requalification ou 1.5 x PC initiale) |
| 23 | **C7/OH** Inspection | Réception épreuve, poinçon "tête de cheval" si requalification |
| 24 | **L0** Tuyauterie | Déplatinage |
| 25 | **R70** Instrumentation | Remise en service instruments |
| 26 | **E2/E7** Électricité | Remise sous tension traceurs |
| 27 | **K0** Calorifuge | Repose calorifuge |
| 28 | **H0** Échafaudage | Démontage échafaudage |

### 5.2 Opérations spécifiques aux séparateurs

#### Dépose/repose dévésiculeur (demister)

1. Dépose par le TH (souvent en sections roulées ou pliées)
2. Inspection état : colmatage, déformation, corrosion
3. Remplacement si bouché ou endommagé (éléments en grillage inox ou polypropylène)
4. Repose avec fixation correcte sur supports

#### Dépose/repose plaques coalescentes

1. Extraction par le TH
2. Nettoyage ou remplacement
3. Vérification supports et guides
4. Repose dans le bon sens d'écoulement

#### Nettoyage bottes à eau

Les bottes à eau (boot) en fond de ballon horizontal accumulent les boues :
- NHP fond de botte
- Vérification corrosion (souvent zone critique)
- Mesure d'épaisseur ciblée

### 5.3 Opérations spécifiques aux réacteurs

#### Déchargement / rechargement catalyseur

| Étape | Opération | Corps de métier |
|-------|-----------|-----------------|
| 1 | Passivation catalyseur (si pyrophorique) | Exploitant |
| 2 | Ouverture TH supérieur et inférieur | L0 |
| 3 | Vidange catalyseur par gravité ou aspiration (vacuum truck) | Spécialiste catalyseur |
| 4 | Nettoyage intérieur (billes céramiques, crasses) | N0 |
| 5 | Inspection internes (grilles support, distributeurs, parois) | C7 |
| 6 | Rechargement : billes céramiques fond + catalyseur + billes dessus | Spécialiste catalyseur |
| 7 | Densité de chargement contrôlée (kg/m³), planéité du lit | Spécialiste |
| 8 | Vérification perte de charge à froid | Exploitant |
| 9 | Fermeture TH | L0 |

> **Sécurité catalyseur** : Certains catalyseurs sont pyrophoriques (auto-inflammation au contact de l'air). Passivation obligatoire avant ouverture. Manipulation sous atmosphère inerte (N2) si nécessaire. Poussières de catalyseur : ARI + masque filtrant P3.

#### Inspection revêtement réfractaire (réacteurs FCC, régénérateurs)

1. Contrôle visuel : fissures, écaillage, érosion, décollements
2. Sondage au marteau (zones creuses)
3. Mesure épaisseur résiduelle
4. Réparation : patch de béton réfractaire projeté (gunitage) ou coulé
5. Séchage contrôlé (montée en température progressive)

### 5.4 Épreuve hydraulique

Selon ASME Section VIII, UG-99 et arrêté du 20/11/2017 :

| Contexte | Pression d'épreuve |
|----------|-------------------|
| **Initiale** (fabrication) | 1.5 x pression de calcul (ASME) |
| **Requalification ESP** | 1.2 x PS (pression maximale admissible) |
| **Après réparation notable** | Selon notification DREAL |

**Procédure** :
1. Installer platines et évents
2. Remplir d'eau (déminéralisée si inox), purger l'air
3. Montée progressive par paliers (50%, 70%, 80%, 90%, 100%)
4. Maintien à PE pendant 30 min minimum (1h si gros volume)
5. Inspection visuelle complète (soudures, brides, TH, piquages)
6. Décompression lente (max 0.5 bar/min)
7. Vidange

**Précautions** :
- Température métal > MDMT + 17°C, max 48°C
- Vérifier que la structure (berceaux, fondations) supporte le poids d'eau
- Ne jamais rester sous l'équipement pendant l'épreuve

### 5.5 Soupapes de sûreté (PSV)

| Opération | Détail |
|-----------|--------|
| **Dépose** | Dévisser, protéger les portées de joint du piquage |
| **Passage au banc** | Contrôle tarage (pression d'ouverture = PS), étanchéité, débit |
| **Réglage** | Ajustement ressort si hors tolérance |
| **Repose** | Joint neuf, serrage contrôlé, plomb |
| **Périodicité** | À chaque requalification ESP, ou selon plan d'inspection |

> **Gammes EMIS** : la dépose/repose PSV est une phase à part entière, souvent confiée au sous-traitant soupapier.

### 5.6 Inspection

| Méthode | Sigle | Usage sur capacités |
|---------|-------|---------------------|
| **Examen visuel** | VT | Surfaces internes/externes, soudures, corrosion, internes |
| **Ultrasons** | UT | Mesure épaisseur aux CMLs (Condition Monitoring Locations) |
| **Ressuage** | PT | Fissures en surface (soudures, piquages) |
| **Magnétoscopie** | MT | Fissures surface/sous-surface (matériaux ferromagnétiques) |
| **Radiographie** | RT | Contrôle soudures (initiale ou après réparation) |
| **TOFD** | TOFD | Dimensionnement défauts en soudure |
| **Phased Array** | PAUT | Inspection avancée soudures et épaisseurs |
| **MFL** (Magnetic Flux Leakage) | MFL | Inspection fond de bac, viroles (corrosion interne sous dépôt) |
| **Répliques métallographiques** | - | Vérification état métallurgique (fluage, fragilisation H2) |
| **Test de dureté** | HB/HV | Vérification après PWHT ou rechargement |

### 5.7 Requalification ESP

| Opération | Périodicité standard | Contenu |
|-----------|---------------------|---------|
| **Inspection périodique** | ~40 mois (raffinerie, selon plan d'inspection) | Examen visuel interne/externe, accessoires sécurité, documentation |
| **Requalification périodique** | 10 ans (standard), 6 ans (fluides corrosifs), 2-3 ans (toxiques) | Vérification administrative + inspection interne/externe + épreuve hydraulique + accessoires (PSV) + poinçon |

**Organismes habilités** : Apave, Bureau Veritas, Socotec, Dekra.
**Autorité compétente** : DREAL.

---

## 6. Sécurité

### 6.1 Espace confiné

Les capacités sont des **espaces confinés** dès que le personnel y entre :
- Ouverture TH de 450-600 mm (accès limité)
- Volume clos, pas de ventilation naturelle
- Risques : atmosphère toxique, appauvrie en O2, explosive

**Mesures obligatoires** :
- Permis d'entrée en espace confiné
- Contrôle atmosphère continu : O2 (19.5-23.5%), H2S (< 5 ppm), LEL (< 10% LIE), benzène (< 1 ppm), COV
- Ventilation forcée permanente (coppus/extracteur)
- Surveillant extérieur permanent
- Moyens de sauvetage (treuil, harnais, ARI de secours)
- Communication permanente intérieur/extérieur
- Procédure d'évacuation connue de tous
- Éclairage TBT 24V ATEX

### 6.2 Pression résiduelle

| Risque | Mesure |
|--------|--------|
| **Pression piégée** | Vérifier manomètre à 0, ouvrir évent avant desserrage |
| **Desserrage brides** | 1 boulon sur 2, progressif, écran facial, présence fabricant |
| **Bouchon sous pression** | Ne JAMAIS desserrer un bouchon/TH sous pression |
| **Effet fond** | Force = Pression x Surface → même 0.5 bar sur un TH de 600 mm = ~140 kg de poussée |

### 6.3 Produits chimiques et toxiques

| Risque | Source | Mesure |
|--------|--------|--------|
| **H2S** | Résiduel dans la capacité, dépôts de sulfure | Détecteur continu, ARI si > 10 ppm, T35 |
| **Benzène** | Hydrocarbures légers résiduels | Détecteur COV, limite 1 ppm, ARI |
| **HF (acide fluorhydrique)** | Unités d'alkylation | EPI anti-HF complets, douche décontamination, équipe secours |
| **NH3** | Unités amines, tour de lavage | Détecteur spécifique, ARI |
| **Catalyseur (Ni, Co, Mo)** | Réacteurs | Masque P3, combinaison, exposition CMR |
| **Pyrophorie** | Sulfure de fer dans les dépôts | Maintenir humide en permanence, interdiction de sécher à l'air |

### 6.4 Levage et manutention

| Risque | Mesure |
|--------|--------|
| **Extraction/repose internes** | Plan de levage, élingues certifiées, commandant de manœuvre |
| **Catalyseur** | Trémie de chargement, flexible, vent de dégazage |
| **Poids des couvercles TH** | Dispositif de levage adapté (30-200 kg typiquement) |
| **Pièces lourdes** | Grue ou palan certifié, zone de manœuvre dégagée |

### 6.5 Consignes types (extraites des gammes EMIS)

- `ARI + T35 + PRESENCE FAB OBLIGATOIRE` — ouverture, platinage
- `T35 + ARLD + PRESENCE FAB` — desserrage brides sous pression résiduelle
- `ECRAN FACIAL + PRESENCE FAB LORS DU PLATINAGE` — risque projection
- `CONTRÔLE ATMOSPHERE CONTINU` — entrée espace confiné
- `OUTILLAGE ADF` — atmosphère explosive (ATEX)
- `ANTI ACIDE + GANTS BOTTES + VISIERE` — nettoyage chimique
- `MASQUE P3 + COMBINAISON` — manipulation catalyseur

---

## 7. Défauts et modes de défaillance

### 7.1 Corrosion

| Mécanisme | Zone affectée | Conditions | Agents |
|-----------|---------------|------------|--------|
| **Corrosion généralisée** | Partout (acier carbone) | Toute | H2S, H2O, acides |
| **Corrosion par piqûres** (pitting) | Inox, surtout zones stagnantes | Présence de chlorures | Cl⁻, eau, O2 |
| **Corrosion sous contrainte** (SCC) | Soudures, zones de contrainte | Variable | H2S humide, chlorures, acide polythionique |
| **Corrosion sous dépôt** | Fond de capacité, zones stagnantes | Variable | Concentration locale agents corrosifs |
| **Corrosion sous calorifuge** (CUI) | Surface externe sous calorifuge | 50-175°C (acier carbone), -4 à 175°C (inox) | Eau infiltrée, chlorures (inox) |
| **HTHA** (High Temperature Hydrogen Attack) | Réacteurs H2 | > 200°C | H2 à haute pression, décarburation |
| **Corrosion HF** | Alkylation | Toute | Acide fluorhydrique |
| **Corrosion par amines** | Colonnes/ballons régénération amines | Variable | MEA, DEA dégradées |
| **Corrosion galvanique** | Contact métaux différents | Toute | Couple galvanique |
| **Érosion-corrosion** | Piquages d'entrée, changements de section | Haute vitesse | Flux turbulent + agents corrosifs |

### 7.2 Fragilisation

| Mécanisme | Cause | Conséquence |
|-----------|-------|-------------|
| **Fragilisation par l'hydrogène** (HE) | Service H2 haute pression et température | Fissures, décohésion |
| **Fragilisation par le revenu** (temper embrittlement) | Cr-Mo après service prolongé 350-550°C | Augmentation température de transition, risque rupture fragile au refroidissement |
| **Vieillissement** | Service prolongé | Augmentation dureté, perte de ductilité |

### 7.3 Défauts structurels

| Défaut | Localisation | Détection |
|--------|-------------|-----------|
| **Amincissement** | Zones de corrosion préférentielle (CMLs) | UT |
| **Fissures soudures** | Soudures longitudinales et circulaires, piquages | PT, MT, UT, RT, TOFD |
| **Piqûres** (pitting) | Surface interne | VT, UT (scan) |
| **Déformation / ovalisation** | Virole (surpression, tassement) | Mesure géométrique |
| **Fluage** (creep) | Réacteurs haute T | UT, répliques métallographiques |
| **Cloquage** (blistering) | Service H2S humide (acier carbone) | VT (surface interne), UT |
| **Fissuration HIC** | Acier carbone en service H2S humide | UT avancé (TOFD/PAUT) |
| **Défauts revêtement** | Lining/résine/réfractaire | VT, sondage au marteau, test d'étincelle |

### 7.4 Défauts des internes

| Défaut | Composant | Cause |
|--------|-----------|-------|
| **Colmatage dévésiculeur** | Demister | Dépôts solides, polymérisation |
| **Corrosion dévésiculeur** | Demister | Agents corrosifs (HCl, H2S) |
| **Érosion déflecteur** | Inlet deflector | Flux à haute vitesse avec particules |
| **Encrassement coalesceur** | Coalescer | Solides, paraffines |
| **Désagrégation réfractaire** | Réfractaire (réacteurs) | Cycles thermiques, érosion |
| **Tassement catalyseur** | Lit catalytique | Vibrations, pression, attrition |

### 7.5 Indicateurs en opération

- **Augmentation perte de charge** = encrassement internes ou dévésiculeur bouché
- **Mauvaise séparation** (carry-over/carry-under) = internes endommagés, surcharge, niveau mal réglé
- **Niveau instable** = instrumentation défaillante ou botte à eau bouchée
- **Perte d'épaisseur en service** = suivi par UT aux CMLs planifiés

---

## 8. Positionnement horizontal vs vertical

| Critère | Horizontal | Vertical |
|---------|-----------|----------|
| **Séparation gaz/liquide** | Bonne (grande interface) | Correcte (utilise la hauteur) |
| **Séparation liquide/liquide** | **Excellente** (grande interface) | Médiocre |
| **Emprise au sol** | Grande | Faible |
| **Maintenance internes** | Accès facile par TH latéraux | Plus difficile (travail en hauteur) |
| **Piégeage de liquide** | Risque en fond | Bon drainage naturel |
| **Stockage tampon** | Grand volume utile | Volume limité |
| **Exemples** | Ballons de reflux, séparateurs, ballon de torche | Ballons d'aspiration, colonnes-ballons, filtres |

---

## 9. Désignations sur P&ID

| Lettre(s) | Signification | Exemples |
|-----------|---------------|----------|
| **V** | Vessel / Capacité | V-1001, V-2301 |
| **D** | Drum / Ballon | D-101, D-405 |
| **S** | Separator / Séparateur | S-1201 |
| **F** | Filter / Filtre | F-301 |
| **R** | Reactor / Réacteur | R-101 |
| **FA** | Flash drum | FA-201 |
| **KO** | Knockout drum | KO-101 |
| **B** | Blowdown drum | B-501 |

> **Dans les gammes EMIS** : les tags commencent souvent par **S** (ex: S2602, S3001) pour les capacités, et **R** pour les réacteurs. La lettre peut varier selon le donneur d'ordres.

---

## 10. Glossaire FR/EN

| Français | English |
|----------|---------|
| Capacité | Pressure vessel / Drum |
| Ballon séparateur | Separator drum |
| Ballon de reflux | Reflux drum |
| Ballon de torche | Flare knockout drum |
| Ballon tampon | Surge drum |
| Ballon de détente | Flash drum |
| Réacteur | Reactor vessel |
| Filtre sous pression | Pressure filter |
| Sphère de stockage | Pressure storage sphere |
| Virole | Shell |
| Fond bombé | Dished head / Dome |
| Fond elliptique | Ellipsoidal head |
| Fond torisphérique | Torispherical head |
| Fond hémisphérique | Hemispherical head |
| Jupe | Skirt |
| Berceau | Saddle support |
| Trou d'homme (TH) | Manhole / Manway |
| Trou de poing | Handhole |
| Piquage / tubulure | Nozzle |
| Évent | Vent |
| Vidange / purge | Drain |
| Soupape de sûreté (PSV) | Pressure Safety Valve |
| Disque de rupture | Rupture disk |
| Dévésiculeur | Demister / Mist eliminator |
| Déflecteur d'entrée | Inlet deflector / Impingement plate |
| Coalesceur | Coalescer |
| Anti-vortex | Vortex breaker |
| Botte à eau | Boot (water boot) |
| Chicane / seuil | Baffle / Weir |
| Panier filtre | Basket / Strainer |
| Revêtement réfractaire | Refractory lining |
| Résine / lining | Internal lining / Coating |
| Catalyseur | Catalyst |
| Lit fixe | Fixed bed |
| Lit fluidisé | Fluidized bed |
| Passivation | Passivation |
| Épreuve hydraulique | Hydrotest |
| Requalification ESP | Pressure equipment requalification |
| Platinage | Blinding / Spading |
| Platine | Blind / Spade |
| Espace confiné | Confined space |
| Mesure d'épaisseur (CML) | Thickness measurement (CML) |
| Rechargement | Weld overlay |
| Cloquage | Blistering |
| Fragilisation par l'hydrogène | Hydrogen embrittlement |
| Pyrophorie | Pyrophoric deposits |
| Corrosion sous calorifuge | CUI (Corrosion Under Insulation) |
| HTHA | High Temperature Hydrogen Attack |
| Perte de charge | Pressure drop |
| Temps de séjour | Residence time |

---

## 11. Normes de référence

| Norme | Objet |
|-------|-------|
| **ASME Section VIII Div. 1 & 2** | Conception et fabrication appareils à pression |
| **ASME PCC-2** | Réparation appareils à pression |
| **API 510** | Inspection en service appareils à pression |
| **API 572** | Guide pratique inspection appareils à pression |
| **API 576** | Inspection soupapes de sûreté |
| **API 579 / ASME FFS-1** | Fitness-For-Service (aptitude au service) |
| **API 521** | Systèmes de dépressurisation et de torche |
| **API 2000** | Ventilation bacs et capacités à pression atmosphérique |
| **API 620** | Réservoirs à basse pression |
| **API 650** | Réservoirs de stockage atmosphériques (bacs) |
| **DESP 2014/68/UE** | Directive Européenne Équipements Sous Pression |
| **Arrêté 20/11/2017** | Suivi en service ESP en France |
| **EN 13445** | Appareils à pression non soumis à la flamme (norme européenne) |
| **NACE MR0175 / ISO 15156** | Matériaux en service H2S (résistance SSC/SCC) |
| **NACE SP0472** | Prévention SCC pour soudures inox en raffinerie |
| **API RP 941** | Limites Nelson curves (HTHA) |
