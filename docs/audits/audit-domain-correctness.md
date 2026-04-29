# Plan d'audit n°2 — Correctness métier (logique de calcul J&T / LUT)

> Ce document est un **prompt autonome** destiné à une nouvelle instance de Claude Code, sans contexte préalable. Tout ce qui est nécessaire à l'exécution de l'audit est embarqué ci-dessous.

---

## Mission confiée à Claude

Tu es chargé de réaliser un **audit de correction fonctionnelle** sur la couche logique métier d'une application de préparation d'arrêts de maintenance industrielle. Cet audit n'est **pas un audit sécurité** ni un audit performance — c'est un audit de **conformité au cahier des charges métier** : est-ce que le code calcule **les bons nombres** dans **toutes les situations** que rencontre un préparateur d'arrêt sur le terrain ?

Tu dois :

1. Lire le contexte métier embarqué ci-dessous + les docs `docs/metier/*.md`.
2. Inventorier toutes les règles de calcul implémentées.
3. Pour chaque règle, vérifier qu'elle correspond à la spec, qu'elle est testée, qu'elle gère les cas limites (null, valeurs non numériques, espaces, casse, etc.).
4. Compléter la suite de tests Vitest avec des cas manquants.
5. Identifier les règles métier **non encore implémentées** mais documentées (la table OPERATIONS notamment).
6. Produire un rapport `docs/audits/findings/correctness-{YYYY-MM-DD}.md`.

L'enjeu est sérieux : **un mauvais calcul de boulonnerie ou de joints peut bloquer un arrêt à plusieurs millions d'euros par jour**. La fiabilité prime sur l'élégance.

---

## Contexte métier (à lire intégralement)

### Domaine

L'application est un outil de préparation d'arrêts de maintenance industrielle (raffineries, pétrochimie). Un **arrêt** = arrêt planifié d'une unité de production, fréquence 3 à 6 ans. Un préparateur d'arrêt prépare les dossiers d'exécution (gammes, boulonnerie, joints, levage) pour chaque équipement avant l'arrêt.

### Vocabulaire central

- **OT** (Ordre de Travail) — un travail à effectuer sur un équipement. Identifié par sa colonne **ITEM** (clé primaire métier dans la LUT).
- **LUT** (Liste Unique des Travaux) — référentiel de tous les OTs. 1 ligne = 1 OT.
- **J&T** (Joints & Tiges) — pour chaque OT, liste des **brides** (assemblages boulonnés) à démonter/remonter. 1 ligne = 1 bride.
- **Bride** — assemblage boulonné qui scelle une jonction de tuyauterie. Caractéristiques : DN (diamètre nominal mm), PN (pression nominale bar), face (RF / RTJ).
- **Joint** — élément d'étanchéité entre deux brides. Catégories :
  - **Joint plein (JP)** = platine, pour aveugler.
  - **Joint provisoire** = utilisé pendant les travaux.
  - **Joint définitif** = remonté à la fin.
- **Bride pleine (BP)** = bride aveugle.
- **Tige** = goujon (élément de boulonnerie). Caractéristiques : nb, diamètre, longueur, matière.
- **Vanne / Robinetterie** = équipement à 2 brides généralement (admission ADM + refoulement REF). Identifiée par un `num_rob` non vide sur la table `flanges`.

### Le triplet EMIS / BUTA / RETENU — règle d'or

Pour chaque mesure dans le J&T :

- **EMIS** = valeur relevée par le préparateur sur le terrain (terrain = vérité ultime).
- **BUTA** (ou CLIENT) = valeur fournie par le donneur d'ordres dans son fichier original.
- **RETENU** = `COALESCE(EMIS, BUTA)` — si terrain renseigné, on garde terrain ; sinon on prend client.
- **DELTA** = booléen d'alerte : EMIS et BUTA présents mais différents (uniquement DN et PN aujourd'hui).

Cette règle est implémentée :

- Côté DB : colonnes `*_retenu` `GENERATED ALWAYS AS (COALESCE(*_emis, *_buta)) STORED` dans `flanges`.
- Côté code : `src/lib/domain/jt.ts` (`computeRetenu`, `hasDelta`).

### La colonne OPERATION — moteur du calcul

Dans le J&T, la colonne **OPERATION** détermine **automatiquement** le nombre de joints et de brides nécessaires. C'est la seule donnée que le préparateur saisit, le reste se calcule.

Exemple (à confirmer en lisant les Excel) :

- "Ouverture" → 1 JP, 0 BP, 1 joint provisoire, 1 joint définitif
- "Aveugler" → 0 JP, 1 BP, 0 prov, 0 def
- "Pas de manutention" → 0 JP, 0 BP, 0 prov, 0 def
- etc.

La table de correspondance complète existe dans la feuille **"Operations"** du fichier `data/J&T - *.xlsm` (ou similaire). **Aujourd'hui dans le code, cette table est vide** :

```ts
// src/lib/domain/operations.ts
export const OPERATIONS_TABLE: Omit<OperationRef, "id">[] = [
  // TODO: Extraire les valeurs exactes depuis la feuille Operations du J&T
];
```

**C'est probablement le finding majeur de cet audit.**

### Familles d'items (col M de la LUT)

- Equipement (échangeur, colonne, ballon, aéro, capacité, réacteur, filtre)
- Intervention
- NC (non-conformité)
- OTG
- Robinetterie
- Tuyauterie

### Statuts OT (col Q)

- **TB** = Travaux de Base (forfait contractuel)
- **TC** = Travaux Complémentaires (hors forfait)
- **TA** = Travaux Annulés

### Corps de métier (LUT col O — 7 colonnes AB-AH dans Excel)

H0 (Montage/Levage), K0 (Chaudronnerie), L0 (Nettoyage), N0 (Calorifuge), T0 (Tuyauterie), + autres. Chaque colonne contient `"X"` si coché, sinon vide.

### Appariement de brides robinetterie (vannes)

L'appariement est **implicite**, dérivé des données : au sein d'un même OT (`ot_item_id`), deux brides partageant le même `num_rob` forment une vanne. `rob_side` (`'ADM' | 'REF' | null`) reste comme propriété par bride pour distinguer les côtés.

Cas à valider :

- 2 brides dans le groupe `(ot_item_id, num_rob)` → vanne complète ADM/REF.
- 1 bride → vanne incomplète (paire en cours de saisie ou cas rare).
- 3+ brides → anomalie de saisie à signaler.

Logique : `src/lib/domain/valve-pairs.ts` (`groupIntoValves`, `getValveLabel`).

### DN / PN — équivalences

- DN en mm (ex 25, 50, 100, 200, 300)
- PN en bar. Équivalences classes US :
  - PN 20 ≈ CL150
  - PN 50 ≈ CL300
  - PN 100 ≈ CL600

### Boulonnerie (table de référence)

`bolt_specs` — référentiel de 135 lignes (RF + RTJ × DN × PN) — donne `nb_tiges`, `diametre_tige`, `longueur_tige`, `cle` pour une combinaison (face_type, dn, pn). C'est une table figée, validée par l'utilisateur. **Ne pas auditer** sa correction (hors périmètre).

---

## Modules à auditer

### Code domaine (priorité absolue)

| Fichier                              | Rôle                                        | Ligne testée ?                              |
| ------------------------------------ | ------------------------------------------- | ------------------------------------------- |
| `src/lib/domain/jt.ts`               | `computeRetenu`, `hasDelta`                 | `__tests__/jt.test.ts` existe               |
| `src/lib/domain/lut.ts`              | `parseCorpsDeMetier` (X/non-X)              | `__tests__/lut.test.ts` existe              |
| `src/lib/domain/operations.ts`       | Table OPERATIONS + `getOperationQuantities` | **vide, pas de tests**                      |
| `src/lib/domain/valve-pairs.ts`      | `groupIntoValves`, `getValveLabel`          | **pas de tests**                            |
| `src/lib/domain/fiche-rob-fields.ts` | Liste champs fiche PDF                      | `__tests__/fiche-rob-fields.test.ts` existe |

### Code limitrophe à examiner (peut contenir de la logique métier déguisée)

- `src/lib/excel/generic-parser.ts` — parsing des fichiers d'import. Conversions de types ? Trim ?
- `src/lib/excel/detect-columns.ts` — fuzzy match colonnes. Synonymes documentés dans `src/lib/excel/synonyms.ts` ?
- `src/lib/db/import-lut.ts`, `src/lib/db/import-jt.ts` — qu'est-ce qui est calculé / dérivé pendant l'import ?
- `src/components/spreadsheet/JtSheet.tsx`, `LutSheet.tsx`, `RobSheet.tsx` — vérifier qu'aucune règle métier n'a été dupliquée côté UI.
- `src/components/terrain/wizard-steps/*.tsx` — saisie terrain avec prédictions (`src/lib/offline/predictions.ts`). Les prédictions sont-elles fidèles à la table OPERATIONS ?

### Fichiers Excel sources de vérité

- `data/BUTACHIMIE - LUT- *.xlsm` (ou plus récent) — feuille principale + feuille de correspondances éventuelles.
- `data/*JT*.xlsm` — feuille principale + feuille **"Operations"** (la table à extraire).
- `data/GAMMES COMPILEES REV D.xlsm` (pour comprendre lien OT → gammes, hors périmètre direct).

Pour les explorer en lecture, utilise un script Python avec `openpyxl` (cf. `.claude/rules/excel-python.md`).

### Documentation métier (référence absolue)

- `docs/metier/LUT.md`
- `docs/metier/J&T.md`
- `docs/metier/comprendre_mon_metier.md`
- `docs/metier/Rob.md`
- `docs/metier/Gamme compilé.md`
- `.claude/skills/domain-maintenance/references/operations-table.md`
- `.claude/skills/domain-maintenance/references/glossaire.md`

**Si une règle dans le code contredit une règle dans la doc métier : la doc métier gagne.** Sauf preuve explicite que la doc est obsolète (à demander à l'utilisateur).

---

## Objectifs précis

1. **Inventorier** toutes les règles de calcul métier implémentées dans le code (au moins une ligne par règle).
2. Pour chaque règle, **comparer le code à la spec** (docs métier, fichiers Excel sources).
3. **Identifier les règles documentées mais non implémentées** (table OPERATIONS notamment).
4. **Identifier les règles implémentées mais non documentées** (potentielle dette de spec).
5. **Compléter la suite de tests Vitest** : pour chaque règle, viser un jeu de cas représentatifs incluant les edge cases (null, "", "0", whitespace, casse, valeurs Excel typiques comme "CALO", "PAS D'INFO", "X", "x", "✓").
6. Optionnellement, introduire **du property-based testing** avec `fast-check` sur les règles de pure fonction (`computeRetenu`, `hasDelta`, parsing). Ce n'est pas obligatoire mais à proposer si pertinent.

---

## Méthodologie — 5 phases

### Phase 1 — Inventaire des règles

Lis chaque fichier `src/lib/domain/*.ts` et chaque fichier limitrophe listé. Extrais sous forme de tableau :

```
| Règle | Fichier:ligne | Spec source (doc/Excel) | Couverture test actuelle |
```

Exemples de règles à attendre :

- "RETENU = EMIS si défini sinon BUTA"
- "DELTA(DN) = true si EMIS ≠ BUTA et tous deux numériques"
- "Corps de métier coché = colonne contient 'X' (case insensitive)"
- "Une bride avec un `num_rob` seule dans son groupe `(ot_item_id, num_rob)` est une vanne incomplète"
- "Repère affiché = `nom-repereBUTA / repereREF` si paire complète, sinon `nom-repere` si solo"

### Phase 2 — Vérification spec ↔ code

Pour chaque règle de l'inventaire :

1. Ouvre la doc métier correspondante.
2. Liste les cas qu'elle évoque (explicitement ou implicitement).
3. Compare avec le code : la règle est-elle exactement la même ? Plus stricte ? Plus laxiste ?
4. Marque chaque cas non couvert comme **finding**.

Cas typiques à challenger :

- `computeRetenu("", "BUTA")` retourne quoi ? `""` ou `"BUTA"` ? Le code utilise `??` donc `""` (chaîne vide) **n'est pas** considérée comme null → retourne `""`. Est-ce le comportement attendu métier ? **À questionner.**
- `hasDelta("100", "100,0")` → false (Number("100,0") = NaN sur en-US). Bug potentiel sur valeurs Excel formatées en français.
- `parseCorpsDeMetier(["x", null, "X", " X ", "✓", "1"])` → seul "X" et "x" sont true ; les autres false. Le métier attend-il "✓" comme coché ? Et un trim ?
- `groupIntoValves` : si 2 brides ont le même `(ot_item_id, num_rob)` sans `rob_side` explicite, la 1re est traitée comme ADM et la 2nde comme REF. À questionner : ordre stable ? Auto-affectation acceptable côté métier ? Si 3+ brides : les 2 premières sont appariées, les autres exposées en vannes solo (anomalie signalée par la clé `pairKey` suffixée `::extra-N`).

### Phase 3 — Extraction de la table OPERATIONS

C'est probablement le finding n°1. Procédure :

1. Identifie le fichier J&T sous `data/`.
2. Avec un script Python `openpyxl` (lecture seule), liste les feuilles du workbook.
3. Si une feuille s'appelle "Operations" (ou similaire) : extrais les colonnes operation_type, nb_jp, nb_bp, nb_joints_prov, nb_joints_def.
4. Vérifie que toutes les valeurs distinctes de la colonne OPERATION du J&T sont présentes dans la table.
5. Propose un peuplement de `OPERATIONS_TABLE` dans `src/lib/domain/operations.ts` ET/OU une migration SQL `INSERT INTO operations_ref` (la table existe déjà, hors RLS write).
6. Écris des tests pour `getOperationQuantities` qui couvrent au moins :
   - Un cas existant
   - Un cas inexistant → null
   - Casse différente (ex: "ouverture" vs "Ouverture") — décide si on doit normaliser

### Phase 4 — Property-based testing (optionnel mais recommandé)

Pour les fonctions pures critiques :

```ts
import * as fc from "fast-check";

test("computeRetenu — terrain prime sur client", () => {
  fc.assert(
    fc.property(
      fc.option(fc.string(), { nil: null }),
      fc.option(fc.string(), { nil: null }),
      (emis, buta) => {
        const r = computeRetenu(emis, buta);
        if (emis !== null) return r === emis;
        return r === buta;
      },
    ),
  );
});
```

Propose 3 à 5 propriétés de ce style sur :

- `computeRetenu` (terrain prime, idempotence)
- `hasDelta` (commutatif, false si l'un est null)
- `groupIntoValves` (somme des brides en sortie = nb brides en entrée, pas de duplication)

Si fast-check n'est pas installé, ajoute-le en devDependency : `npm i -D fast-check`.

### Phase 5 — Tests d'intégration sur scénarios réels

À partir d'un extrait anonymisé d'un J&T réel (que tu généreras à partir des Excel dans `data/`), construis 3 à 5 fixtures :

1. Un OT simple à 2 brides (1 ouverture).
2. Un OT robinetterie (paire ADM/REF avec aveuglement).
3. Un OT avec delta DN entre EMIS et BUTA.
4. Un OT avec OPERATION inconnue (cas dégradé).
5. Un OT terrain partiel (EMIS sur certaines brides, pas d'autres).

Pour chaque fixture, écris un test qui passe la donnée dans la chaîne complète (parse → computeRetenu → groupIntoValves → getOperationQuantities) et vérifie le résultat attendu.

---

## Checklist détaillée

### Inventaire

- [ ] Chaque fichier `src/lib/domain/*.ts` a été ouvert et chaque fonction listée
- [ ] Chaque doc `docs/metier/*.md` a été lu intégralement
- [ ] Tableau de correspondance règle ↔ doc ↔ test est complet
- [ ] Les règles non implémentées sont listées explicitement (avec leur source)

### Triplet EMIS/BUTA/RETENU

- [ ] Comportement avec `""` (chaîne vide) défini et testé
- [ ] Comportement avec whitespace seul défini et testé
- [ ] Comportement avec `"NULL"` / `"null"` / `"PAS D'INFO"` défini et testé (valeurs Excel courantes)
- [ ] Cohérence DB GENERATED ↔ TS `computeRetenu` confirmée

### Delta

- [ ] Casse correctement les valeurs numériques formatées français (`"100,5"`)
- [ ] Casse correctement les valeurs avec unités (`"100 mm"`)
- [ ] Retourne false si un seul des deux est null (et non true par accident)
- [ ] Documente quelles colonnes ont un delta (DN, PN — confirmer s'il y en a d'autres)

### Corps de métier (LUT)

- [ ] Toutes les valeurs Excel typiques testées : `"X"`, `"x"`, `"✓"`, `"1"`, `"oui"`, `null`, `""`, `" X "`, `"X."`, `"NA"`
- [ ] Décision documentée : qu'est-ce qui compte comme "coché" ?

### Valve pairs (clé `(ot_item_id, num_rob)`)

- [ ] Bride seule dans son groupe → `ValvePair` avec un seul côté renseigné
- [ ] Paire complète ADM + REF (`rob_side` explicite ou auto-affecté) → `ValvePair` correct
- [ ] 3+ brides dans le même groupe → 2 premières appariées, les autres exposées en vannes solo (`pairKey` suffixé `::extra-N`)
- [ ] Brides à `num_rob` vide ou null → exclues de la vue Robinetterie
- [ ] Bride avec pair_id mais sans side → comportement défini (actuellement : ADM par défaut, écrasement si plusieurs)
- [ ] `getValveLabel` : tous les cas (nom seul, nom-rep, nom-rep1/rep2, "---")

### OPERATIONS

- [ ] Table extraite du J&T Excel et documentée dans le rapport
- [ ] `OPERATIONS_TABLE` peuplé dans `operations.ts` OU `operations_ref` peuplé via migration
- [ ] Tous les types d'OPERATION rencontrés dans les J&T réels couverts
- [ ] Cas "OPERATION absente / inconnue" géré dans le wizard terrain (pas de plantage)
- [ ] Décision documentée sur la normalisation de casse / espaces

### Tests

- [ ] Au moins une ligne de test pour chaque règle
- [ ] Property-based tests sur les fonctions pures (proposé sinon implémenté)
- [ ] Fixtures d'intégration sur scénarios réels
- [ ] `npm run test` passe en local après ajout

---

## Format du livrable

`docs/audits/findings/correctness-{YYYY-MM-DD}.md` :

```markdown
# Audit correctness métier — {date}

## Résumé exécutif

- Règles inventoriées : N
- Règles couvertes par des tests : N / N
- Findings critiques : N
- Findings élevés : N
- Verdict : (peut-on déployer en confiance ? oui/non/sous condition)

## Inventaire des règles

[Tableau exhaustif règle → fichier → source spec → couverture]

## Findings

### F-001 — Table OPERATIONS non implémentée — Critique

[Description, impact, patch]

### F-002 — ...

## Tests ajoutés

[Liste des fichiers test créés/modifiés + nombre de cas]

## Décisions à arbitrer avec l'utilisateur

[Cas où la spec est ambiguë et où il faut un choix produit]

## Annexe : table OPERATIONS extraite

[Tableau avec toutes les opérations + nb_jp / nb_bp / nb_prov / nb_def]
```

### Échelle de sévérité

- **Critique** : règle absente ou fausse qui produit des chiffres erronés sur le terrain → impact direct sur l'arrêt.
- **Élevée** : règle correcte mais qui plante / retourne null sur des cas réels rencontrés.
- **Moyenne** : edge case non couvert, comportement implicite à clarifier.
- **Informative** : code pourrait être plus robuste / mieux testé.

---

## Critères d'acceptation de l'audit

L'audit est complet quand :

1. Toutes les fonctions exportées de `src/lib/domain/*.ts` ont au moins un test.
2. Toutes les règles documentées dans `docs/metier/*.md` ont une ligne dans l'inventaire (présente OU absente, avec mention).
3. La table OPERATIONS est soit extraite et fournie en annexe (avec proposition de patch), soit son extraction est expliquée comme bloquée par X (ex: fichier Excel non disponible) avec piste à suivre.
4. Les tests ajoutés tournent en CI sans erreur (`npm run test`).
5. Les arbitrages produit (cas ambigus) sont listés explicitement, pas tranchés silencieusement.

---

## Contraintes de comportement

- **Avant tout edit non trivial**, énonce ton modèle mental dans le chat (cf. `.claude/rules/process.md`).
- **Si tu observes un fait qui contredit une règle métier de la doc**, stop, demande confirmation avant de modifier le code.
- **Pas d'invention de valeurs** dans la table OPERATIONS — extrais-les ou laisse vide avec note explicite.
- **Pas de modification de la DB live** sans demande explicite. Les inserts dans `operations_ref` passent par une migration ou une seed, jamais par appel direct.
- Tu peux écrire dans `src/lib/domain/__tests__/`, dans `src/lib/domain/operations.ts` (peuplement table), dans `supabase/seed.sql` (ajout opérations), et dans le rapport.

---

## Sources de référence

- [OWASP Business Logic Testing](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/10-Business_Logic_Testing/)
- [Property-based testing with fast-check](https://fast-check.dev/)
- [Testing Strategies in DDD](https://dev.to/ruben_alapont/testing-strategies-in-domain-driven-design-ddd-2d93)
- [Property-based testing of business rules — Springer](https://link.springer.com/article/10.1007/s10270-017-0647-0)
- Vitest docs : https://vitest.dev/
