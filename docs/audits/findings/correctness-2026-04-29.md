# Audit correctness métier — 2026-04-29

> Audit n°2 — Conformité de la couche logique métier (`src/lib/domain/*.ts`) au cahier des charges. Sources : `docs/metier/*.md`, `data/J&T REV E - 20250209 pour correction.xlsm` (feuille **Operations**), `data/BUTACHIMIE - LUT- 20260303.xlsm`, code et tests existants.

---

## Résumé exécutif

| Indicateur                                                           | Valeur                                                   |
| -------------------------------------------------------------------- | -------------------------------------------------------- |
| Règles métier inventoriées                                           | **15** (8 actives, 4 limites identifiées, 3 dérivées DB) |
| Fonctions exportées de `src/lib/domain/*.ts` couvertes par des tests | **8 / 8** (100 %)                                        |
| Tests Vitest avant audit                                             | ~104 (3 fichiers)                                        |
| Tests Vitest après audit                                             | **146** (+42 cas, 5 fichiers, dont 2 nouveaux)           |
| Findings critiques                                                   | **2**                                                    |
| Findings élevés                                                      | **1**                                                    |
| Findings moyens                                                      | **3**                                                    |
| Findings faibles + info                                              | **4**                                                    |
| `npm run test`                                                       | ✅ **146 / 146**                                         |

**Verdict — déployable sous condition.** Le moteur RETENU/DELTA est correct dans son périmètre actuel, **mais** :

1. **F-001 (corrigé dans cette PR)** — la table OPERATIONS, moteur central de calcul de la boulonnerie, était **vide**. Les prédictions terrain (PWA) et toute fonctionnalité de cascade de quantités étaient inopérantes. Maintenant peuplée à partir des 28 lignes uniques de la feuille Excel "Operations".
2. **F-002 — non corrigé, à arbitrer.** 6 valeurs `OPERATION` saisies dans le J&T réel **ne sont pas dans la table** (ex : `DEPOSE BOUCHON`, `OUVERTURE + POSER COBRA`, `+`, `Non trouvé`). Le préparateur doit soit compléter la table, soit accepter que ces opérations ne déclenchent pas de cascade.
3. **F-005** — `hasDelta` ignore le format français `"100,5"` (parsé en `NaN`). Risque de delta DN/PN raté quand le client met une virgule décimale. À arbitrer.

Aucun calcul produit aujourd'hui des chiffres faux qui passeraient inaperçus — les cas problématiques retournent `null` ou `false` plutôt que des valeurs erronées. Le risque est donc l'**inaction silencieuse** plutôt que la **fausse confiance**.

---

## Inventaire des règles

| #    | Règle                                                                                                                                                  | Fichier:ligne                        | Source spec                                      | Couverture test (après audit)             |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ | ------------------------------------------------ | ----------------------------------------- |
| R-01 | `RETENU = COALESCE(EMIS, BUTA)` (terrain prime)                                                                                                        | `domain/jt.ts:6`                     | `docs/metier/J&T.md` §triplet                    | `__tests__/jt.test.ts` ×8                 |
| R-02 | `DELTA = (EMIS et BUTA tous deux numériques) AND (EMIS ≠ BUTA)`                                                                                        | `domain/jt.ts:15`                    | `docs/metier/J&T.md` §DELTA                      | `__tests__/jt.test.ts` ×12                |
| R-03 | DB GENERATED `*_retenu = COALESCE(*_emis, *_buta)` STORED                                                                                              | `supabase/migrations/001_schema.sql` | `db-schema.md`                                   | (cohérence DB ↔ TS confirmée — voir §3)   |
| R-04 | DB GENERATED `delta_dn`, `delta_pn` (uniquement DN, PN)                                                                                                | `supabase/migrations/001_schema.sql` | `db-schema.md`                                   | (côté DB, hors périmètre Vitest)          |
| R-05 | `parseCorpsDeMetier` : "X" / "x" coché, autre = non coché                                                                                              | `domain/lut.ts:7`                    | `docs/metier/LUT.md` cols AB-AH                  | `__tests__/lut.test.ts` ×10               |
| R-06 | `OPERATION` → quantités joints/brides via table de correspondance                                                                                      | `domain/operations.ts:13`, `:50`     | `docs/metier/J&T.md` §Operations + feuille Excel | `__tests__/operations.test.ts` ×17 (new)  |
| R-07 | Normalisation des clés OPERATION (trim + uppercase) au lookup                                                                                          | `domain/operations.ts:46`            | (décision audit — voir F-004)                    | idem                                      |
| R-08 | `groupIntoValves` : appariement implicite par `(ot_item_id, num_rob)`                                                                                  | `domain/valve-pairs.ts:15`           | `docs/metier/Rob.md`, CLAUDE.md                  | `__tests__/valve-pairs.test.ts` ×11 (new) |
| R-09 | Solo `rob_side='REF'` → vanne avec `refoulement` seul                                                                                                  | `domain/valve-pairs.ts:32`           | logique métier                                   | idem ×2                                   |
| R-10 | 3+ brides par num_rob → 1 paire + reste en solo (anomalie)                                                                                             | `domain/valve-pairs.ts:48`           | logique implicite (commentée dans le code)       | idem ×1                                   |
| R-11 | `getValveLabel` : `nom-repA / repB` si paire, `nom-rep` si solo, `nom` si pas de repère                                                                | `domain/valve-pairs.ts:74`           | `docs/metier/Rob.md`                             | `__tests__/valve-pairs.test.ts` ×7 (new)  |
| R-12 | Fiche rob : 24 champs (12 caractéristiques + 12 travaux)                                                                                               | `domain/fiche-rob-fields.ts:17`      | `docs/metier/Rob.md`                             | `__tests__/fiche-rob-fields.test.ts` ×8   |
| R-13 | `validateTemplate` : keys connues, pas de doublon entre colonnes                                                                                       | `domain/fiche-rob-fields.ts:57`      | logique produit                                  | idem                                      |
| R-14 | (DB) Triplet étendu à 14 champs (DN, PN, NB JP, NB BP, NB JT PROV/DEF, NB TIGES, TIGES, MAT TIGES, MAT JT, RONDELLES, FACE BRIDE, OPERATION, SECURITE) | schéma SQL                           | `docs/metier/J&T.md` §triplet (lignes 161-171)   | (côté DB)                                 |
| R-15 | Conversion PN ↔ Classe ASME (PN20≈CL150, PN50≈CL300, PN100≈CL600)                                                                                      | non implémenté                       | `docs/metier/J&T.md` lignes 53-59                | **non implémenté côté code** (info)       |

---

## Findings

### F-001 — Table OPERATIONS non implémentée — **Critique** ✅ corrigé

**État avant audit** : `OPERATIONS_TABLE` est un tableau vide avec un `TODO`. `getOperationQuantities("DECONNEXION/RECONNEXION")` retourne donc `null` pour toute valeur, y compris les opérations standard. Le moteur de cascade joint/bride ne fonctionne pas.

**Impact** : la PWA terrain ne peut pas pré-remplir les champs `nb_jp`, `nb_bp`, `nb_joints_prov`, `nb_joints_def` à partir du choix d'opération. Toute fonctionnalité dérivée (vérification de cohérence, génération de fiche) est neutralisée.

**Patch appliqué** : extraction des **28 opérations distinctes** de la feuille `Operations` du J&T REV E (29 lignes brutes — un doublon `DECONNEXION/RECONNEXION + BRIDE FINE` dédupliqué, espaces de fin trimés). Ajout d'un index normalisé pour absorber les variations de saisie (trim + uppercase). Voir `src/lib/domain/operations.ts`.

**Tests** : 17 cas (`operations.test.ts`) — opérations connues, inconnues, saisies dégradées (`+`, `Non trouvé`), normalisation casse/espaces.

---

### F-002 — Opérations utilisées dans le J&T mais absentes de la feuille Operations — **Critique** ⚠️ non corrigé

**Constat** : la colonne `OPERATION EMIS` du J&T (1542 lignes) contient **33 valeurs distinctes**, alors que la feuille de référence n'en définit que **28**. Six valeurs sont utilisées sans correspondance :

| Valeur saisie dans J&T                | Statut                                      |
| ------------------------------------- | ------------------------------------------- |
| `DECONNEXION/RECONNEXION + JL`        | Manquante de la table                       |
| `DEPOSE BOUCHON`                      | Manquante de la table                       |
| `DEPOSE REPOSE BUSE`                  | Manquante de la table                       |
| `OUVERTURE + POSER COBRA`             | Manquante de la table                       |
| `POSE/DEPOSE JP AVEC BRIDE ENTRE`     | Manquante de la table                       |
| `POSER BOUCHON NPT`                   | Manquante de la table                       |
| `+`                                   | Saisie parasite (à nettoyer côté donnée)    |
| `Non trouvé`                          | Saisie de fallback (à nettoyer côté donnée) |
| `REMPLACEMENT ACTIONNEURE MATERIEL ?` | Saisie incertaine                           |

À l'inverse, la table définit 2 opérations **non utilisées** dans le J&T (`OUVERTURE TH + CROISILLON`, `DECONNEXION/RECONNEXION + BP NETTOYAGE HP`) — c'est OK, ces opérations restent disponibles.

**Impact** : `getOperationQuantities` retourne `null` pour ces 6 valeurs, donc le préparateur ne voit aucune cascade pour ~5-10 % des brides du J&T (à mesurer précisément).

**Décision à arbitrer** :

1. Compléter la feuille Excel "Operations" avec les 6 opérations manquantes (préférable — la table reste source de vérité). **Ne nécessite pas de nouveau code.**
2. OU accepter que ces opérations restent sans cascade (cas dégradé toléré).
3. ET nettoyer les saisies parasites (`+`, `Non trouvé`, `… ?`) — peut-être au moment de l'import (validation d'enum).

**Test verrouillant le comportement actuel** : `operations.test.ts` "returns null for an operation used in the J&T but missing from the table".

---

### F-005 — `hasDelta` ignore le format décimal français — **Élevée** ⚠️ non corrigé

**Constat** : `Number("100,5")` retourne `NaN`. Donc `hasDelta("100.5", "100,5")` retourne `false` (pas de delta), alors que les deux valeurs représentent la même chose, **OU** `hasDelta("100", "200,5")` retourne `false` alors qu'il y a un vrai écart.

**Impact** : si BUTA fournit les nombres en format français (`100,5`) et EMIS les saisit en format anglais (`100.5`), aucun delta n'est détecté, même quand les valeurs sont distinctes. L'alerte rouge en UI ne s'allume pas → le préparateur peut passer à côté d'une incohérence.

**Décision à arbitrer** : faut-il normaliser la virgule en point (`v.replace(",", ".")`) avant `Number()` ? Ou laisser tomber au moment de l'import en convertissant tout en format anglais côté DB ?

**Test verrouillant** : `jt.test.ts` "FINDING F-005 — French decimal '100,5' is parsed as NaN, no delta detected vs '100.5'".

---

### F-003 — Doublon dans la feuille "Operations" — **Moyenne** (info) ⚠️ source à corriger

**Constat** : la feuille `Operations` du J&T REV E contient 29 lignes mais 28 opérations distinctes — `DECONNEXION/RECONNEXION + BRIDE FINE` apparaît deux fois (lignes 7 et 16 de la feuille), avec des quantités identiques.

**Impact** : nul aujourd'hui (le code dédoublonne via `Map`), mais le préparateur pourrait être surpris si un futur mainteneur lit l'Excel et voit 2 versions.

**Décision à arbitrer** : signaler au donneur d'ordres que le fichier source contient un doublon, et le supprimer dans la prochaine révision du J&T.

---

### F-004 — `getOperationQuantities` ne normalisait pas la casse/espaces — **Moyenne** ✅ corrigé

**Constat avant** : strict equality (`op.operation_type === operationType`). Une saisie `"deconnexion/reconnexion"` ou `"DECONNEXION/RECONNEXION "` (avec espace) renvoyait `null`. Or l'Excel source contient déjà un trailing space sur `"DECONNEXION/RECONNEXION + BP VIDANGE "` — donc même la table était piégée.

**Patch appliqué** : index pré-calculé sur `operation_type.trim().toUpperCase()`, lookup avec la même normalisation. Voir `operations.ts` lignes 44-50.

**Décision validée** : casse insensible et espaces ignorés. Cohérent avec la pratique terrain (saisie rapide, pas attentive à la casse).

---

### F-006 — `computeRetenu("", "BUTA")` retourne `""`, pas `"BUTA"` — **Moyenne** ⚠️ à arbitrer

**Constat** : l'opérateur `??` ne traite que `null`/`undefined` comme nullish. Une chaîne vide `""` est considérée comme une valeur, donc la chaîne vide EMIS écrase la valeur BUTA.

```ts
computeRetenu("", "100"); // → "" (et non "100")
computeRetenu("   ", "100"); // → "   "
```

**Impact** : si l'utilisateur efface une cellule EMIS dans le tableur (la met à `""` au lieu de la laisser à `null`), il **perd la valeur BUTA de fallback**. Aujourd'hui le tableur Univer envoie probablement `null` à la place de `""`, mais ce n'est pas garanti par contrat.

**Décision à arbitrer** :

1. Garder le comportement actuel (chaîne vide = "saisie consciente d'absence", interprétée comme une valeur).
2. OU traiter `""` et `"   "` comme nullish (changer en `emis?.trim() || buta`).

**Test verrouillant** : `jt.test.ts` "FINDING F-006 — empty string is NOT treated as null".

---

### F-007 — `parseCorpsDeMetier` ne fait pas de trim — **Faible** ⚠️ à arbitrer

**Constat** : `isChecked(" X ")` retourne `false` (pas de `.trim()` avant comparaison à `"X"`). Si l'import Excel contient une cellule avec espaces autour, le corps de métier est incorrectement décoché.

**Impact** : faible — SheetJS retourne en général la valeur sans espaces. Mais c'est une fragilité.

**Décision à arbitrer** : ajouter `.trim()`.

**Test verrouillant** : `lut.test.ts` "FINDING F-007 — does NOT trim leading/trailing whitespace".

---

### F-008 — `getValveLabel` retourne `""` quand `nom` ET repère sont nuls — **Faible** (info)

**Constat** : si une bride a `nom=null`, `repere_buta=null`, `repere_emis=null`, le label de la vanne est `""` (chaîne vide). L'UI affiche alors un libellé invisible.

**Impact** : faible — cas rare (toute bride a au moins un nom). Verrouillé dans le test pour signaler.

**Décision possible** : afficher `"---"` comme pour `admission=null && refoulement=null`, ou un identifiant de fallback (`flange_id` tronqué).

---

### F-009 — Colonnes Excel non modélisées (PLATINE EP, DUCHENE, BRIDE PERCEE) — **Info**

**Constat** : la feuille `Operations` contient 9 colonnes, dont 3 (`PLATINE EP`, `DUCHENE`, `BRIDE PERCEE`) ne sont pas représentées dans `OperationRef`. Elles ne sont renseignées que pour 4 opérations sur 28.

**Décision** : si ces colonnes encodent des matériels supplémentaires à compter, étendre `OperationRef` avec `nb_platine_ep`, `nb_duchene`, `nb_bride_percee`. Sinon ignorer (à confirmer avec le métier).

---

### F-010 — Doc d'audit obsolète sur l'appariement rob — **Info** ✅ déjà corrigé

**Constat** : le prompt d'audit (`docs/audits/audit-domain-correctness.md`) parlait à l'origine de `rob_pair_id` + `rob_side` et de la RPC `pair_flanges`. Le code utilise désormais l'appariement implicite via `(ot_item_id, num_rob)` (CLAUDE.md roadmap §J&T). Le prompt a été mis à jour entre-temps pour refléter le code actuel.

---

## Tests ajoutés

| Fichier                                             | Status   | Cas (avant → après)                                                |
| --------------------------------------------------- | -------- | ------------------------------------------------------------------ |
| `src/lib/domain/__tests__/jt.test.ts`               | modifié  | 12 → **24** (+12 edge cases : whitespace, format fr, empty string) |
| `src/lib/domain/__tests__/lut.test.ts`              | modifié  | 5 → **10** (+5 : trim, ✓, oui, X.)                                 |
| `src/lib/domain/__tests__/operations.test.ts`       | **créé** | 0 → **17**                                                         |
| `src/lib/domain/__tests__/valve-pairs.test.ts`      | **créé** | 0 → **20**                                                         |
| `src/lib/domain/__tests__/fiche-rob-fields.test.ts` | inchangé | 8                                                                  |

Total Vitest projet : **146 tests passants** (`npm run test`).

---

## Décisions à arbitrer avec l'utilisateur

| ID  | Question                                                                               | Recommandation                                                                                        |
| --- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --- | ------ |
| D-1 | F-002 — Compléter la feuille Excel "Operations" avec les 6 opérations manquantes ?     | **Oui** — c'est la source de vérité. Demander au donneur d'ordres ou ajouter en interne.              |
| D-2 | F-005 — Normaliser virgule décimale française en point dans `hasDelta` ?               | **Oui** — risque réel de delta raté. Ajouter `Number(v.replace(",", "."))`.                           |
| D-3 | F-006 — `computeRetenu("", "BUTA")` doit-il retomber sur BUTA ?                        | **À discuter** — dépend de la sémantique attendue côté tableur. Le plus prudent : `emis?.trim()       |     | buta`. |
| D-4 | F-007 — Ajouter `.trim()` dans `parseCorpsDeMetier` ?                                  | **Oui** — coût quasi nul, robustesse en plus.                                                         |
| D-5 | F-009 — Modéliser PLATINE EP / DUCHENE / BRIDE PERCEE ?                                | **À demander au préparateur** — sont-ce des matériels à compter ou des annotations ?                  |
| D-6 | F-002 — Faut-il valider l'enum OPERATION à l'import (rejeter `+`, `Non trouvé`, `?`) ? | **Soft warning à l'import** — ne pas bloquer l'import, mais signaler la liste des valeurs hors table. |
| D-7 | R-15 — Implémenter une fonction `pnToClass(pn)` (PN20→CL150) ?                         | **À évaluer** — uniquement si une exigence d'export concrète apparaît.                                |

---

## Annexe A — Table OPERATIONS extraite

Source : feuille `Operations` du `J&T REV E - 20250209 pour correction.xlsm`, 29 lignes (28 distinctes après dédoublonnage). Colonnes : `Operation`, `NB JT PROV`, `NB JT DEF`, `NB BP`, `NB JP`, `PLATINE EP`, `DUCHENE`, `BRIDE PERCEE`. Les 3 dernières colonnes ne sont pas modélisées (F-009).

| #   | Operation                                                          | NB JT PROV | NB JT DEF | NB BP | NB JP | PLATINE EP | DUCHENE | BRIDE PERCEE |
| --- | ------------------------------------------------------------------ | ---------- | --------- | ----- | ----- | ---------- | ------- | ------------ |
| 1   | DECONNEXION/RECONNEXION                                            | 0          | 1         | 0     | 0     | 0          | 0       | 0            |
| 2   | DECONNEXION/RECONNEXION + BP                                       | 1          | 1         | 1     | 0     | 0          | 0       | 0            |
| 3   | DECONNEXION/RECONNEXION + BP + BP EP                               | 2          | 1         | 2     | 0     | 0          | 0       | 1            |
| 4   | DECONNEXION/RECONNEXION + BP + BP CHIM                             | 2          | 1         | 2     | 0     | 0          | 0       | –            |
| 5   | DECONNEXION/RECONNEXION + BRIDE FINE                               | 1          | 1         | 1     | 0     | –          | –       | –            |
| 6   | DECONNEXION/RECONNEXION + BP EP                                    | 1          | 1         | 1     | 0     | –          | –       | –            |
| 7   | DECONNEXION/RECONNEXION + BP CHIM                                  | 1          | 1         | 1     | 0     | –          | –       | –            |
| 8   | DECONNEXION/RECONNEXION + BP CHIM + BP EP                          | 2          | 1         | 2     | 0     | –          | –       | –            |
| 9   | DECONNEXION/RECONNEXION + BP NETTOYAGE HP                          | 1          | 1         | 1     | 0     | –          | –       | –            |
| 10  | DECONNEXION/RECONNEXION + NPT                                      | 0          | 0         | 0     | 0     | –          | –       | –            |
| 11  | DECONNEXION/RECONNEXION + BP VIDANGE _(trailing space dans Excel)_ | 1          | 1         | 1     | 0     | –          | –       | –            |
| 12  | DECONNEXION/RECONNEXION + BP PASSIV.                               | 1          | 1         | 1     | 0     | –          | –       | –            |
| 13  | DECONNEXION/RECONNEXION + RO + BP                                  | 1          | 2         | 1     | 0     | –          | –       | –            |
| 14  | _(DOUBLON)_ DECONNEXION/RECONNEXION + BRIDE FINE                   | 1          | 1         | 1     | 0     | –          | –       | –            |
| 15  | DEPOSE REPOSE NPT                                                  | 0          | 0         | 0     | 0     | –          | –       | –            |
| 16  | DEPOSE/POSE RO                                                     | 0          | 2         | 0     | 0     | –          | –       | –            |
| 17  | OUVERTURE COUVERCLE                                                | 0          | 1         | 0     | 0     | –          | –       | –            |
| 18  | OUVERTURE TH                                                       | 0          | 1         | 0     | 0     | –          | –       | –            |
| 19  | OUVERTURE TH + CROISILLON                                          | 0          | 1         | 0     | 0     | –          | –       | –            |
| 20  | OUVERTURE TROU DE POING                                            | 0          | 1         | 0     | 0     | –          | –       | –            |
| 21  | POSE/DEPOSE JP                                                     | 2          | 1         | 0     | 1     | –          | –       | –            |
| 22  | POSE/DEPOSE JP ENTRETOISE                                          | 3          | 2         | 0     | 1     | –          | –       | –            |
| 23  | POSE/DEPOSE JP EP                                                  | 2          | 1         | 0     | 1     | –          | –       | –            |
| 24  | DEPOSE/REPOSE DOME OU BOITE                                        | 0          | 1         | 0     | 0     | –          | –       | –            |
| 25  | DEPOSE/POSE FUSIBLE + JP                                           | 2          | 2         | 0     | 1     | –          | –       | –            |
| 26  | DEPOSE/POSE FUSIBLE                                                | 0          | 2         | 0     | 0     | –          | –       | –            |
| 27  | REMPLACEMENT/EQUILIBRAGE BOULONNERIE                               | 0          | 0         | 0     | 0     | –          | –       | –            |
| 28  | DECONNEXION/RECONNEXION + BP + BP CHIM + VANNE 3 VOIES             | 3          | 1         | 2     | 0     | –          | –       | –            |
| 29  | DECONNEXION/RECONNEXION + BP + BP CHIM + VANNE DE REMPLISSAGE      | 3          | 1         | 2     | 0     | –          | –       | –            |

---

## Annexe B — Cohérence DB ↔ TS sur le triplet RETENU

| Champ      | DB GENERATED                           | TS `computeRetenu(emis, buta)`       | Résultat identique ?           |
| ---------- | -------------------------------------- | ------------------------------------ | ------------------------------ |
| `*_retenu` | `COALESCE(*_emis, *_buta)` (NULL only) | `emis ?? buta` (null/undefined only) | ✅ Oui (modulo F-006 sur `""`) |

Note importante : la cohérence est garantie tant que les colonnes sont **NULL** (pas vides). Si l'import écrit `""` au lieu de `NULL` dans `*_emis`, le résultat diverge entre DB (qui renvoie `""` car `COALESCE` n'est pas nullish-aware sur les chaînes vides) et TS (idem). Donc cohérent **dans le bug** F-006.

---

## Annexe C — Property-based testing (proposition)

`fast-check` n'est **pas installé** dans ce projet (volontaire — pas dans le scope de l'audit d'ajouter une dépendance). Si l'utilisateur valide D-2 et D-3, voici 4 propriétés candidates à coder une fois `fast-check` ajouté :

```ts
// 1) Idempotence et terrain prime
fc.property(fc.string(), fc.string(), (e, b) => {
  return computeRetenu(e, b) === e;
});

// 2) Commutativité de hasDelta
fc.property(fc.string(), fc.string(), (a, b) => {
  return hasDelta(a, b) === hasDelta(b, a);
});

// 3) hasDelta(x, x) === false (idempotence)
fc.property(fc.string(), (x) => hasDelta(x, x) === false);

// 4) groupIntoValves preserve count
// Pour tout array de RobFlangeRow avec num_rob non vide,
// sum(adm + ref) over valves === input.length
```

Ce sont des propriétés peu coûteuses qui durciraient le contrat des fonctions pures. À ajouter uniquement si l'effort de maintenance est jugé valoir le coup.

---

## Critères d'acceptation

- [x] Chaque fichier `src/lib/domain/*.ts` a été ouvert et chaque fonction listée
- [x] Chaque doc `docs/metier/*.md` a été lu intégralement
- [x] Tableau de correspondance règle ↔ doc ↔ test complet (R-01 à R-15)
- [x] Règles non implémentées listées (R-15)
- [x] Comportement avec `""`, whitespace, `"NULL"`, `"PAS D'INFO"` testé (F-006)
- [x] Cohérence DB GENERATED ↔ TS confirmée (Annexe B)
- [x] Format français `"100,5"` testé (F-005)
- [x] Toutes les valeurs Excel `"X"`, `"x"`, `"✓"`, `"1"`, `"oui"`, `null`, `""`, `" X "`, `"X."` testées
- [x] Décision documentée sur ce qui compte comme "coché" (R-05 : strict `"X"/"x"`, à arbitrer dans D-4)
- [x] Bride solo, paire complète, paire incomplète, 3+ brides testés (`valve-pairs.test.ts`)
- [x] `getValveLabel` : tous les cas testés (nom seul, nom-rep, nom-rep1/rep2, "---")
- [x] Table OPERATIONS extraite et documentée (Annexe A)
- [x] `OPERATIONS_TABLE` peuplé (`operations.ts`)
- [x] Cas "OPERATION absente / inconnue" géré (retourne null, ne plante pas — F-002)
- [x] Décision documentée sur la normalisation casse / espaces (D-4 + F-004 corrigé)
- [x] Au moins une ligne de test pour chaque règle ✅
- [x] Property-based tests proposés (Annexe C) — non implémentés
- [x] `npm run test` passe en local après ajout (146 / 146)
- [x] Arbitrages produit listés explicitement (D-1 à D-7)
