# Échangeurs thermiques - Référence technique

Document de référence pour la rédaction et l'analyse des gammes de maintenance sur échangeurs en arrêt d'unité.

## Types d'échangeurs en raffinerie

| Type | FR | Principe | Faisceau extractible |
|------|-----|----------|---------------------|
| **Calandre et tubes** | Échangeur tubulaire | Faisceau de tubes dans une enveloppe cylindrique | Selon config TEMA |
| **Aéroréfrigérant** | ACHE / Fin fan | Tubes à ailettes refroidis par ventilateurs | Non (tubes fixes) |
| **À plaques** | PHE | Plaques ondulées empilées | N/A |
| **Bi-tubulaire** | Double pipe | Tube dans tube concentrique | N/A |
| **Spiral** | Spiral HX | Canaux enroulés en spirale | N/A |

## Sous-types calandre et tubes

| Sous-type | Caractéristique clé | Usage raffinerie |
|-----------|---------------------|-----------------|
| **Tête flottante** | Faisceau extractible, absorbe dilatation | Le plus courant - préchauffeurs, refroidisseurs |
| **Tubes en U** | Un seul plan tubulaire, économique | Condenseurs, service moyen |
| **Plaques fixes** | Non extractible, simple | Services propres |
| **Bouilloire** (kettle) | Calandre élargie type K | Rebouilleurs de colonne |

## Classification TEMA (3 lettres)

**Format : [Tête avant] [Calandre] [Tête arrière]**

### Têtes avant

| Lettre | Type | Accès côté tubes |
|--------|------|-----------------|
| **A** | Boîte à couvercle démontable | Facile (couvercle seul) |
| **B** | Calotte intégrale (bonnet) | Dépose boîte complète |
| **D** | Fermeture haute pression | > 150 bar |

### Calandres

| Lettre | Type | Perte de charge |
|--------|------|----------------|
| **E** | Simple passe | Standard |
| **F** | Deux passes + chicane longitudinale | Standard |
| **J** | Écoulement séparé | Moitié de E |
| **K** | Bouilloire | N/A (rebouilleur) |
| **X** | Transversal | Très faible |

### Têtes arrière

| Lettre | Type | Extractible |
|--------|------|-------------|
| **L/M/N** | Plan tubulaire fixe | Non |
| **S** | Tête flottante anneau fendu | Oui - **le plus courant** |
| **T** | Tête flottante traversante | Oui |
| **U** | Faisceau en U | Oui |

### Désignations courantes

- **AES** : service général (le plus fréquent)
- **BEM** : service propre, eau de refroidissement
- **AEU/BEU** : condenseurs
- **AKT** : rebouilleur bouilloire

## Composants principaux

| Composant | FR courant | EN | Fonction |
|-----------|-----------|-----|----------|
| Calandre | Virole, enveloppe | Shell | Contient le faisceau |
| Faisceau tubulaire | Faisceau, tubes | Tube bundle | Surface d'échange |
| Plaque tubulaire | Plan tubulaire | Tubesheet | Fixation des tubes |
| Chicane | Déflecteur | Baffle | Support tubes + guide écoulement |
| Boîte de distribution | Boîte | Channel | Entrée/sortie côté tubes |
| Fond de boîte | Couvercle | Channel cover | Fermeture démontable de la boîte |
| Tête flottante | - | Floating head | Absorbe la dilatation |
| Piquage | Tubulure, bride | Nozzle | Connexion fluides/instruments |
| Joint | Joint de bride | Gasket | Étanchéité (spiral, kammprofile, RTJ) |
| Tirant/entretoise | Tige de soutien | Tie rod/spacer | Espacement chicanes |
| Déflecteur d'impact | Plaque d'impact | Impingement plate | Protection tubes à l'entrée |
| Soupape (PSV) | Soupape de sûreté | Safety valve | Protection surpression |

## Séquence type maintenance échangeur

```
Échafaudage
Dépose calorifuge
Mise hors tension traceurs
Consignation exploitant
Consignation instrumentation
Dépose partielle 1 boulon sur 2
Platinage
Dépose boîtes/couvercles
NHP faisceau + boîtes + plaques (tringleuse)
Nettoyage chimique (si requis)
Test hydraulique
Réception essai hydraulique
Bouchonnage tubes fuyards (Permaplug)
Mesure épaisseur / inspection / requalification ESP
Rechargement portées de joint, anodes, réparations
Reprise résine boîtes + plaques
Usinage portées de joint
Validation technique avant fermeture
Repose boîtes (joints neufs)
Déplatinage
Remise en service instrumentation
Remise sous tension
Repose calorifuge
Démontage échafaudage
```

## Opérations de maintenance clés

### Bouchonnage de tubes
- **Permaplug** (mécanique expansible) : jusqu'à 480 bar
- Bouchon conique (marteau) : ~14 bar
- Bouchon soudé : permanent
- **Règle** : tube bouchonné aux 2 extrémités → percer entre les 2 bouchons (ASME PCC-2)
- **Limite** : ~10% max de tubes bouchonnés avant retubage

### Épreuve hydraulique
- PE = 1.5 x pression de calcul (ASME) ou 1.2 x PS (requalification ESP)
- Montée progressive par paliers, maintien 30 min à 1h
- Métal > MDMT + 17°C, max 48°C

### Nettoyage
- **NHP** (N0) : 300-2500 bar, tringleuse pour tubes
- **Chimique** (NC14) : circulation acide/base, endoscopie avant/après
- **Moyenne pression** : matériaux sensibles (tubes cuivre)

### Rechargement portées de joint
- T0 (chaudronnerie) : rechargement par soudure
- U17 (usinage) : surfaçage après rechargement

## Consignes sécurité types

- `ARI + T35 + PRESENCE FAB OBLIGATOIRE` — ouverture/platinage
- `ECRAN FACIAL + PRESENCE FAB LORS DU PLATINAGE` — risque projection
- `T35 + ARI + OUTILLAGE ADF` — atmosphère explosive
- `ANTI ACIDE + GANTS BOTTES + VISIERE` — nettoyage chimique

## Défauts courants

| Défaut | Détection | Action maintenance |
|--------|-----------|-------------------|
| Tubes fuyards | Test hydraulique | Bouchonnage Permaplug |
| Encrassement tubes | Perte de charge élevée | NHP / nettoyage chimique |
| Corrosion virole/boîtes | UT mesure épaisseur | Rechargement T0 / résine P19 |
| Portées de joint endommagées | Inspection visuelle | Rechargement + usinage |
| Fissures soudures | PT/MT/UT | Réparation T0 |
| Corrosion tubes | ECT/IRIS/RFT | Bouchonnage ou retubage |
