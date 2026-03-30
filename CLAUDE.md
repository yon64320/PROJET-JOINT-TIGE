# Projet EMIS - Gammes de Maintenance Industrielle

## Contexte

**EMIS** (Entretien Maintenance Industrielle et Service), filiale du **Groupe Ponticelli Frères** depuis 2005, siège à Vitrolles (13). EMIS se positionne comme la seule entreprise française entièrement dédiée aux arrêts de maintenance industrielle. ~200 salariés permanents, ~35M€ de CA. Filiale **EMIS Access** dédiée échafaudage et calorifuge.

**L'utilisateur** est **préparateur d'arrêt** chez EMIS : il prépare les gammes de travaux (dossiers d'exécution) pour chaque équipement d'un arrêt planifié. Son travail consiste à :
- Collecter les besoins (exploitation, inspection, ingénierie)
- Rédiger les gammes phase par phase : séquencement des taches, corps de métier, effectifs, heures, consignes sécurité, autorisations, pièces de rechange
- Coordonner les sous-traitants et fournisseurs
- Développer le planning mécanique inter-spécialités
- Suivre l'exécution et le reporting

### Qu'est-ce qu'un arrêt de maintenance ?

Un **arrêt d'unité** (turnaround/shutdown) est un arrêt planifié d'une unité de production (raffinerie, pétrochimie) pour réaliser des travaux de maintenance, inspection réglementaire (ESP), réparation et modification. Fréquence : tous les 3 à 6 ans. Durée : plusieurs semaines à plusieurs mois. Enjeu majeur : chaque jour d'arrêt coûte des millions en perte de production.

EMIS intervient comme **entreprise extérieure** (sous-traitant) sur le site du donneur d'ordres pour exécuter les travaux des corps de métier de montage/levage nettoyage chaudronnerie, calorifuge et echafaudage

## Source de données exemple d'un arret : `GAMMES COMPILEES REV D.xlsm`

Fichier Excel principal de l'arrêt : 278 OTs, 2794 phases, 242 équipements. Contient les gammes phase par phase (séquencement, corps de métier, effectifs, heures, sécurité, autorisations). Pour le détail complet des feuilles, colonnes et logique métier, voir [`Gamme compilé.md`](Gamme%20compilé.md).

## Documentation technique des équipements

- **Échangeurs thermiques** : types (calandre et tubes, aéroréfrigérants, plaques...), composants, classification TEMA, séquence maintenance, sécurité, défauts → voir [`Échangeurs thermiques.md`](Échangeurs%20thermiques.md)
- **Colonnes de distillation** : types (atmosphérique, sous vide, strippage...), internes (plateaux, garnissage), séquence maintenance, sécurité, défauts → voir [`Colonnes de distillation.md`](Colonnes%20de%20distillation.md)
- **Capacités** : types (ballons séparateurs, reflux, torche, tampon, réacteurs, filtres...), composants, internes, séquence maintenance, sécurité, défauts → voir [`Capacités.md`](Capacités.md)

## Commandes utiles

```python
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import openpyxl
wb = openpyxl.load_workbook('GAMMES COMPILEES REV D.xlsm', read_only=True, data_only=True)
ws = wb['OTs']
# En-tetes ligne 5, données ligne 7+
```

## Conventions techniques

- Toujours utiliser `read_only=True, data_only=True` pour lire le fichier (macros et formules)
- Encoder la sortie en UTF-8 pour éviter les erreurs cp1252 sur Windows
- Python : `/c/Users/yon.otamendi/AppData/Local/Microsoft/WindowsApps/python`
- `openpyxl` est déjà installé
