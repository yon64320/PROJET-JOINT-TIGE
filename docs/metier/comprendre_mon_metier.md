# Ce que j'ai compris de ton métier — Préparateur d'arrêt chez EMIS

---

## 1. L'entreprise et le contexte industriel

**EMIS** (Entretien Maintenance Industrielle et Service) est une filiale du **Groupe Ponticelli Frères** depuis 2005, basée à Vitrolles (13). C'est la seule entreprise française entièrement dédiée aux **arrêts de maintenance industrielle**. ~200 permanents, ~35 M€ de CA. La filiale **EMIS Access** couvre l'échafaudage et le calorifuge.

EMIS intervient toujours comme **entreprise extérieure** — sous-traitant sur le site du donneur d'ordres (raffineries, pétrochimie). Elle n'exploite pas les installations, elle les entretient pendant leur arrêt.

---

## 2. L'arrêt de maintenance (turnaround / shutdown)

Un arrêt d'unité, c'est l'événement central autour duquel tout ton travail s'organise.

### Ce que c'est
Une **unité de production** (colonne de distillation, réacteur, unité de synthèse, butadiène…) est arrêtée volontairement, de façon planifiée, pour réaliser des travaux impossibles en marche : inspection réglementaire ESP, réparations, modifications, nettoyages internes.

### La fréquence et les enjeux
- Fréquence : tous les **3 à 6 ans** (imposé par la réglementation ou par l'usure)
- Durée : **plusieurs semaines à plusieurs mois**
- Coût du retard : chaque jour de prolongation coûte **plusieurs millions d'euros** en perte de production
- C'est pourquoi la **préparation en amont est critique** : une phase manquante, un approvisionnement raté, une séquence incorrecte — et c'est le chemin critique qui dérive

### L'arrêt sur lequel tu travailles
D'après les données : **278 OTs, 2 794 phases, 242 équipements** répartis sur 6 sections :
- **S1** (1 245 phases) — la plus chargée, unité SYNTHESE principalement
- **S2** (979 phases) — BUTADIENE et autres
- **S5** (235 phases), **S4** (138), **S6** (105), **S3** (92)
- Unités représentées : SYNTHESE (179 OTs), TF99 (52), BUTADIENE (34), LOGISTIQUE (12), TF90 (1)

---

## 3. Ton rôle : Préparateur d'arrêt

Tu es en amont de tout. Avant que la première clé à molette soit posée sur un boulon, tu as rédigé le **dossier d'exécution** complet de l'intervention.

### Ce que tu fais concrètement

**Collecter les besoins** — tu réunis les demandes de :
- L'**exploitation** (le client) : ce qu'il veut inspecter, modifier, remplacer
- L'**inspection** : les contrôles réglementaires obligatoires (ESP — Équipements Sous Pression)
- L'**ingénierie** : les modifications de procédé ou de tuyauterie

**Rédiger les gammes** — pour chaque équipement, tu crées l'OT (Ordre de Travail) avec toutes ses phases, de l'échafaudage jusqu'au retour en service. Tu définis :
- La **séquence chronologique** des tâches (phase 10, 20, 30…)
- Le **corps de métier** qui exécute chaque tâche
- Les **effectifs** (Nb pers) et les **heures** estimées
- Les **consignes de sécurité** spécifiques (ARI, T35, présence FAB obligatoire…)
- Les **autorisations préalables** nécessaires : permis de travail (P), permis de feu (F), autorisation de grutage (GRU)
- Les **pièces de rechange** à approvisionner
- Le **détail opératoire** : schémas, références, précautions

**Coordonner les intervenants** — la préparation intègre non seulement les corps EMIS mais aussi tous les autres intervenants (électriciens, instrumentistes, mécaniciens, inspecteurs, fabricants…) dont tu dois orchestrer les interventions dans la bonne séquence.

**Développer le planning mécanique** — tu construis le planning inter-spécialités : qui fait quoi, dans quel ordre, avec quelles dépendances.

**Suivre l'exécution et le reporting** — pendant l'arrêt, tu assures le suivi de l'avancement, les aléas, les modifications de dernière minute.

---

## 4. La gamme : l'unité de travail fondamentale

### Structure d'un OT
```
OT = 1 équipement (ex: échangeur S2708, colonne S1101, filtre B4701)
  └─ Phase 10 : H0 — Montage échafaudage
  └─ Phase 20 : K0 — Dépose calorifuge
  └─ Phase 30 : MAD — Consignation + drainage + platinage
  └─ Phase 40 : C7 — Inspection initiale
  └─ Phase 50 : L0 — Dépose boîtes + manchettes
  └─ Phase 60 : T0 — Travaux chaudronnerie si nécessaire
  └─ Phase 70 : N0 — Nettoyage HP faisceau
  └─ Phase 80 : U17 — Usinage portées de joint (si nécessaire)
  └─ Phase 90 : P19 — Revêtement intérieur (si nécessaire)
  └─ Phase 100 : C7 — Contrôle qualité post-travaux
  └─ Phase 110 : L0 — Repose boîtes
  └─ Phase 120 : MAD — Déconsignation
  └─ Phase 130 : K0 — Repose calorifuge
  └─ Phase 140 : H0 — Démontage échafaudage
```

**Les phases sont multiples de 10** — volontairement : cela laisse de la place pour intercaler une phase 25 ou 35 si une tâche imprévue s'ajoute sans renuméroter tout l'OT.

### Les révisions
Les gammes évoluent avant et pendant l'arrêt : Rev A → B → C → D. Chaque révision traduit un **changement de périmètre** (travaux supplémentaires, suppression d'une intervention, modification des méthodes). La dernière révision en vigueur fait foi. Sur cet arrêt : **Rev D** est la version de référence.

---

## 5. Les corps de métier

### Corps EMIS (ton périmètre direct)

| Code | Métier | Phases sur cet arrêt |
|------|--------|----------------------|
| **L0** | Tuyauterie — montage/démontage tuyauteries, brides, manchettes, platinage | 456 |
| **K0** | Calorifuge — dépose/repose isolation thermique | 324 |
| **H0** | Échafaudage — structures d'accès en hauteur | 213 |
| **T0** | Chaudronnerie — travaux sur appareils à pression (colonnes, échangeurs, capacités) | 97 |
| **N0** | Nettoyage industriel haute pression (NHP) | 89 |

**L0 est le corps central** : c'est lui qui ouvre et referme les équipements, pose et dépose les éléments lourds. C'est aussi le corps le plus impliqué dans les opérations de **levage**.

### Autres corps sur le chantier (hors EMIS, mais intégrés dans tes gammes)

| Code | Métier | Phases |
|------|--------|--------|
| R70 | Instrumentation | 230 |
| MAD | Mise à disposition (exploitant) — consignation, drainage, purge, platinage | 221 |
| E7/E2 | Électricité | 296 |
| C7/C6 | Contrôle/Inspection — CND, requalification ESP | 186 |
| MFA | Fabrication (ateliers) | 140 |
| L1 | Tuyauterie spécialisée (autre prestataire) | 77 |
| M7 | Mécanique — machines tournantes, vannes | 62 |
| IO6 | Instrumentation/soupapes — inspection périodique PSV | 60 |

**MAD (Mise à Disposition)** est crucial : c'est l'exploitant lui-même qui consigne l'équipement (isolation électrique, dépressurisiation, platinage des tuyaux, purge du contenu). Aucun travail EMIS ne commence avant que le MAD soit fait. De même, à la fin, le MAD déconsigne. C'est la phase qui encadre tout le reste.

---

## 6. Les équipements rencontrés

### Échangeurs de chaleur (le type d'équipement le plus fréquent)

L'échangeur est l'équipement "cœur de métier" de tes gammes. Tu en maîtrises parfaitement l'anatomie :

- **BDD (Boîte De Distribution)** — la boîte latérale de l'échangeur qui distribue le fluide dans les tubes. Elle est boulonnée et doit être déposée pour accéder au faisceau. C'est une pièce lourde qui nécessite souvent une **grue**.
- **FDC (Fond De Couvercle)** — le fond d'extrémité opposé. Toujours déposé/reposé en même temps que la BDD dans la même phase (on ouvre les deux côtés).
- **Manchettes** — tubulures de raccordement entre les brides de l'échangeur et la tuyauterie. Déposées avec les boîtes.
- **Faisceau** — le tube bundle, le cœur de l'échangeur. Extrait pour nettoyage HP (N0) ou remplacement.
- **PSV / Soupape** — soupape de sécurité sur l'échangeur, déposée pour passage au banc de réglage.
- **Verins** — actionneurs hydrauliques/pneumatiques sur certaines vannes associées.

La séquence type sur un échangeur :
```
Platinage → Dépose BDD + FDC + manchettes (L0, grue)
→ Nettoyage HP faisceau (N0) → Inspection (C7/U17/P19 selon constat)
→ Repose BDD + FDC + manchettes (L0, grue) → Déplatinage
```

### Colonnes (S1101, S1121…)

Les colonnes de distillation sont des appareils à pression hauts et étroits, avec des **internaux** complexes :

- **TH (Trou d'Homme)** — ouvertures latérales permettant l'accès à l'intérieur. Couverture lourde = grue nécessaire.
- **Garnissage** — remplissage structuré (Packing) à l'intérieur qui assure la séparation des phases liquide/gaz. Déposé et reposé par L0 avec montage à blanc au sol pour vérifier la géométrie.
- **Internaux d'alimentation** — distributeurs et grilles support du garnissage.
- **Dévésiculeur** — séparateur de gouttelettes en tête de colonne.
- **Bête à corne** — composant interne spécifique à certaines colonnes (distributeur en forme de corne).
- **Cannes** — tubes de piquage internes pour mesures de niveau ou températures.

### Capacités, ballons, sphères (S2001, S2002, S2003, S2020…)

- Accès par **TH** (trous d'hommes)
- **Soupapes PSV** boulonnées sur les buses
- Système de **coppus** (ventilation forcée pendant l'intervention)
- **Dômes** (capacités sphériques) déposés à la grue

### Réacteurs (S2020, S2021, S2022…)

- **Cannes de mesure** internes (thermocouples, niveaux)
- **PSV** sur buse
- Fond de réacteur nettoyé par NHP avec accès depuis piquage canne

### Vannes et actionneurs (B4701, B2008-V, B30235YLV…)

- **Vannes automatiques** (avec actionneur) — remplacement de l'actionneur/servo ou de la vanne entière
- **Verins** — actionneurs hydrauliques, déposés pour révision
- Préfixe **-V** ou **BPV** dans le numéro d'équipement = vanne

### Filtres (B4701)

- Dépose du couvercle (lourd, grue)
- Remplacement des cartouches filtrantes
- Remplacement de vannes de corps de filtre

---

## 7. Le levage : une dimension spécifique de ta préparation

Le **levage à la grue** est un risque particulier sur un arrêt. Chaque opération de levage nécessite une **autorisation préalable GRU** et doit être **justifiée** dans la gamme.

### La "Liste de levage"

Tu maintiens un fichier dédié `Liste de levage` avec une feuille **"JUSTIFICATION GRUE EN PLUS"** qui recense toutes les opérations nécessitant une grue supplémentaire au-delà du matériel standard. Pour chaque ligne :

| Info | Description |
|------|-------------|
| Action | Depose ou Repose |
| OT | L'équipement concerné |
| Famille | Type d'équipement (EQPT, VANNE…) |
| Élément | Ce qui est levé (BDD, FDC, TH, Packing, Soupape, Dome, VANNE…) |
| Poids | Le poids de l'élément (justifie le besoin de grue) |
| Phase GAMMES | La référence exacte dans la gamme (N° OT, N° phase, corps, heures…) |

Les éléments les plus fréquemment levés à la grue (sur cet arrêt : 132 opérations) :

| Élément | Nb opérations |
|---------|---------------|
| BDD | 28 |
| Soupape | 22 |
| VANNE | 18 |
| FDC | 12 |
| TH | 10 |
| Évent | 10 |
| 2 Soupapes | 8 |
| Packing | 4 |
| + divers | … |

### Logique de correspondance levage ↔ gamme

Pour pointer chaque opération de levage vers la bonne phase GAMMES, tu appliques un raisonnement expert :
- **FDC** = toujours dans la même phase que BDD (les deux fonds d'un échangeur s'ouvrent ensemble) → phase "DEPOSE BOITES"
- **Manchettes** = incluses dans la phase boîte sur les échangeurs
- **Soupapes** = parfois phase L0 (si sur tuyauterie), parfois corps M7 ou IO6 (si mécanique)
- **Verins de vannes** = la phase "DEPOSE VERIN" correspond à la Depose VANNE dans le levage
- **TH** = OUVERTURE pour Depose / FERMETURE TROU D'HOMME pour Repose
- Une seule phase peut couvrir **plusieurs éléments** (ex : "DEPOSE BOITES + PSV-BS-XXXX + GRILLE" couvre BDD + Soupape + grille de protection)

---

## 8. La logique sécurité intégrée aux gammes

Chaque phase porte ses consignes de sécurité. Quelques éléments récurrents que tu as intégrés dans les gammes :

- **ARI** — Appareil Respiratoire Isolant : obligatoire dans les espaces confinés ou atmosphères toxiques
- **T35** — protection spécifique pour travaux à haute température
- **PRÉSENCE FAB OBLIGATOIRE** — l'exploitant (fabricant) doit être présent physiquement pendant l'opération
- **Permis de feu (F)** — tout travail par points chauds (soudure, meulage) en zone à risque
- **Permis de travail (P)** — autorisation générale d'intervenir sur l'équipement
- **GRU** — autorisation de grutage, avec plan de levage associé

---

## 9. Ce que j'ai compris du raisonnement métier

### La gamme n'est pas une liste de tâches — c'est un scénario

Tu ne listes pas des actions dans l'ordre où elles viennent. Tu **scénarises une intervention** en tenant compte de :
- Les **contraintes physiques** : on ne peut pas ouvrir un échangeur avant de l'avoir isolé, et on ne peut pas isoler avant que le MAD ait planifié les platinages
- Les **dépendances inter-corps** : L0 attend MAD, C7 attend L0, L0 attend C7 (pour reprendre après inspection)
- Les **fenêtres de chemin critique** : certaines phases bloquent des dizaines d'autres interventions en attente
- Les **contraintes réglementaires** : une épreuve hydraulique ESP impose une séquence stricte, une inspection CND a ses propres prérequis

### L'expertise implicite dans les titres de phases

En travaillant avec les données, j'ai observé que les titres de phases portent une information codée que seul un préparateur expérimenté sait décoder :
- "PLATINAGE + DEPOSE BOITES + LIGNES ASSOCIEES" → signifie simultanément : platinage des tuyaux connexes, dépose BDD+FDC, dépose manchettes, tout en une seule mobilisation de grue
- "OUVERTURE COUVERCLE INF + DEPOSE BOITE SUP" → les deux fonds d'un échangeur à deux passes, dans l'ordre vertical
- "ISOLEMENT - OUVERTURE + POSE COPUS + OUVERTURE LIGNE VERS S5121" → séquence atomique MAD+L0 sur un ballon avec ventilation forcée
- "DÉPOSE PARTIELLE 1 BOULON SUR 2" → phase préliminaire de relâchement de contrainte avant ouverture complète, sécurité anti-flash

### La hiérarchie des révisions
Les révisions A→B→C→D ne sont pas de simples corrections — elles reflètent l'**évolution du scope** au fil des réunions avec le client. Un OT en Rev D peut avoir eu des phases ajoutées, modifiées, ou supprimées depuis la Rev A initiale. Tu traces cette évolution et t'assures que la dernière version fait foi sur chantier.

### La coordination sous-traitants
EMIS n'est qu'un des nombreux corps de métier présents simultanément. Tes gammes doivent intégrer les phases des autres (MAD, C7, E7, M7…) même si EMIS ne les exécute pas, pour que le chef de chantier ait une vision complète de la séquence et puisse déclencher les bons intervenants au bon moment.

---

## 10. Les fichiers clés de ton quotidien

### Le trinôme LUT → Gammes → J&T

Ton travail s'articule autour de **trois fichiers majeurs** qui se complètent :

```
LUT (fichier mère)
 │   Référentiel de tous les OTs de l'arrêt
 │   1 ligne = 1 OT = généralement 1 équipement
 │
 ├── GAMMES COMPILEES
 │     Détail phase par phase de chaque OT
 │     Séquencement, corps de métier, effectifs, sécurité
 │
 └── J&T (Joint & Tige)
       Toutes les brides touchées par chaque OT
       Spécifications boulonnerie (tiges) et joints
       Double saisie EMIS / donneur d'ordres
```

### La LUT — Liste Unifiée de Travaux

Fichier : `BUTACHIMIE - LUT - 20260303.xlsm` — **297 OTs**, 37 colonnes.

C'est le **fichier mère** : le référentiel unique de tous les ordres de travail de l'arrêt. Chaque ligne recense un OT avec son équipement (ITEM), l'unité concernée, le type de travaux, les corps de métier impliqués, et le statut (TB = base / TC = complémentaire / TA = annulé).

La colonne ITEM est la **clé primaire** qui relie la LUT à tous les autres fichiers. Voir [`LUT.md`](LUT.md) pour le détail complet.

### Les Gammes compilées

Fichier : `GAMMES COMPILEES REV D.xlsm` — **278 OTs, 2 794 phases, 242 équipements**.

Le fichier maître d'exécution. C'est la "Bible de l'arrêt" : chaque OT y est détaillé phase par phase avec séquencement, corps de métier, effectifs, heures, consignes sécurité. Voir [`Gamme compilé.md`](Gamme%20compilé.md).

### Le J&T — Joint & Tige

Fichier : `J&T REV E - 20250209 pour correction.xlsm` — **5 feuilles, ~1 542 brides**, 77 colonnes (utiles jusqu'à BH).

Le fichier de suivi de **toutes les brides touchées** pendant l'arrêt. **Règle fondamentale : 1 ligne = 1 joint cassé.** Pour chaque bride : dimensions (DN, PN), opération à réaliser, spécifications tiges (quantité, matière, diamètre, longueur), spécifications joints (provisoires, définitifs, matière).

**Logique en triplet EMIS / BUTA / RETENU :** Pour chaque donnée dimensionnelle ou matière, 3 colonnes : le relevé terrain EMIS, la donnée théorique client BUTA, et une formule "si EMIS a une valeur → EMIS, sinon → BUTA". **Le terrain prime toujours sur le papier.** Les colonnes DELTA (DN, PN) signalent les écarts.

**La colonne OPERATION est la colonne moteur :** elle pilote automatiquement le nombre de joints pleins, brides pleines, joints provisoires et définitifs via une table de correspondance (feuille "Operations").

**Le repérage EMIS complète le repérage client :** quand un repère Butachimie n'est pas assez précis (ex : une vanne = 2 brides, mais 1 seul repère client), le préparateur ajoute un sous-repère EMIS pour distinguer chaque joint.

Voir [`J&T.md`](J%26T.md) pour le détail complet.

### Autres fichiers

- **`Liste de levage.xlsx`** — le registre des opérations de grue, croisé avec les gammes.
- **Python / openpyxl** — pour automatiser les croisements de données entre fichiers, compléter les colonnes de référence, générer des rapports.
- **Matrices de standards/dimensions** — `Matrice STAND-DIM`, `Standards TF`, `Dimensions TF` : référentiels techniques pour dimensionner les boulonneries, joints, supports.

---

## 11. Ce que j'aurais du mal à faire à ta place

- **Savoir qu'un "FDC" est toujours dans la même phase qu'une "BDD"** — ça ne se lit pas dans les données, ça se sait par expérience terrain
- **Distinguer qu'une soupape peut être L0 (si sur tuyauterie) ou M7 (si mécanicien)** selon le contexte de l'équipement
- **Comprendre pourquoi une phase "OUVERTURE LIGNE POUR NETT" implique un accès aux cannes internes** sans que ce soit écrit
- **Anticiper qu'une "DÉPOSE PARTIELLE 1 BOULON SUR 2"** n'est pas une vraie dépose mais un pré-relâchement de contrainte thermique avant l'ouverture réelle
- **Évaluer si un OT absent des GAMMES est un oubli de préparation** (à compléter) **ou une intervention hors périmètre EMIS** (à signaler)

---

## 12. Le projet SaaS — Pourquoi cette appli

### Le problème

Aujourd'hui, chaque arrêt génère une galaxie de fichiers Excel interdépendants : LUT, J&T, gammes compilées, fiches robinetterie, listes de levage, APPRO… Chaque mise à jour (nouvelle révision, nouvel OT, correction de données) oblige à modifier **plusieurs fichiers manuellement**. C'est du travail en doublon, source d'erreurs et de versions incohérentes.

### La solution envisagée

Une **application web** avec la LUT et le J&T comme **source unique de données**. Tout le reste en découle automatiquement :
- Les documents dérivés (fiches robinetterie, etc.) sont générés à la demande
- Une seule mise à jour se propage partout
- Plus de fichiers en doublon à synchroniser

### Les contraintes réalité terrain

- Les préparateurs doivent pouvoir **travailler comme dans Excel** (grille éditable, tri, filtre) — sinon adoption impossible
- Le relevé sur site nécessite un **mode hors ligne** (zones ATEX, pas de réseau)
- C'est un **projet perso** pour l'instant — il faut que ça marche concrètement avant de le présenter

### Premier livrable visé

Import LUT + J&T → génération automatique des fiches robinetterie en PDF.

---

*Document généré à partir de l'analyse des fichiers de l'arrêt Butachimie et des échanges de travail sur la préparation de l'arrêt.*
