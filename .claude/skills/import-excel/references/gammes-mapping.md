# Gammes Compilées → LUT

Transforme un fichier Excel "Gammes Compilées" client en LUT EMIS au format BUTACHIMIE (moins les 2 colonnes `Responsable secondaire` × 2). Items concernés EMIS en clair, items non concernés marqués `NC` en italique sur fond gris moyen.

Deux modes d'utilisation :

- **Web (recommandé)** : page `/projets/[id]/import-gammes` — wizard 3 étapes, importe directement en DB + téléchargement .xlsx.
- **CLI standalone** : `npx tsx scripts/gammes-to-lut.ts` — sans serveur, génère uniquement le .xlsx local.

## Lancement

```bash
# Une fois (génère templates/lut-template.xlsx) :
npx tsx scripts/build-lut-template.ts

# Mode CLI (sans web) :
npx tsx scripts/gammes-to-lut.ts
```

## Fichier Gammes attendu

Une feuille (typiquement nommée `OTs`) avec une ligne d'en-tête (typiquement ligne 5) puis 1 ligne par phase :

| Colonne (variable selon client) | Rôle                           | Mapping interactif           |
| ------------------------------- | ------------------------------ | ---------------------------- |
| `Item`                          | Clé d'agrégation               | **Obligatoire**              |
| `Corps de métier`               | Code court (`K0`, `L0`, `T0`…) | **Obligatoire**              |
| `Libellé OT` / `Titre`          | Titre global de l'item         | Optionnel — peut être absent |

Le script auto-détecte la ligne d'en-tête (heuristique : 1ʳᵉ ligne avec ≥ 3 cellules courtes, majoritairement non-numériques, dans les 20 premières lignes) et pré-sélectionne les colonnes via regex (`/^item$/i`, `/corps.*m.*tier/i`, `/lib.*ll.*ot/i`, `/titre/i`). L'utilisateur valide ou corrige.

## Logique métier

Pour chaque ITEM distinct, on agrège l'ensemble des codes corps de métier vus sur ses phases (trim + uppercase, dédoublonnage). On intersecte avec la sélection EMIS saisie par l'utilisateur. L'item est :

- **concerné** si l'intersection est non vide → la colonne `TYPE TRAVAUX` reçoit la liste séparée par `, ` (ex `K0, L0, T0`)
- **non concerné** sinon → `TYPE TRAVAUX = "NC"`, ligne entière (34 colonnes) en gris `#A6A6A6` + texte gris foncé `#595959` italique

## Indices de colonnes dans le template (1-based ExcelJS)

Le template `templates/lut-template.xlsx` reproduit la LUT BUTACHIMIE moins les 2 colonnes "Responsable secondaire". Le range source commence à la colonne `B` (col `A` vide), donc les indices SheetJS 0-based sont décalés d'une lettre par rapport aux notations Excel humaines :

| Champ        | Source (Excel) | Template (Excel) | Template (1-based) |
| ------------ | -------------- | ---------------- | ------------------ |
| ITEM         | col H          | col F            | 6                  |
| TITRE GAMME  | col K          | col I            | 9                  |
| TYPE TRAVAUX | col N          | col L            | 12                 |

Total colonnes template : 34 (36 source - 2 supprimées).

## Architecture

Modules partagés entre web et CLI :

```
src/lib/import/gammes/
├── parse-gammes.ts       # SheetJS : load, detectHeader, extractPhases, distinctCorps, preselectColumns
├── aggregate-items.ts    # group by ITEM + intersection EMIS
└── write-lut.ts          # ExcelJS : writeLut (CLI/disk) + writeLutBuffer (web/Buffer)

src/app/api/import/
├── gammes-detect/route.ts   # POST upload + parsing → JSON détection
└── gammes-confirm/route.ts  # POST confirmation → archive + insert + génération .xlsx (base64)

src/app/projets/[id]/import-gammes/page.tsx    # Server Component
src/components/import/GammesImportWizard.tsx  # Client wizard 3 étapes

scripts/
├── build-lut-template.ts     # one-shot : crée templates/lut-template.xlsx
├── gammes-to-lut.ts          # orchestrateur CLI (importe depuis src/lib/import/gammes/)
└── lib/prompts.ts            # @inquirer/prompts : prompts CLI uniquement
```

- **SheetJS (`xlsx`)** pour la lecture (tolérant aux shared formulas du fichier source).
- **ExcelJS** pour l'écriture stylée (fills, italiques, fusions conservées via le template).
- **`@inquirer/prompts`** pour le mode CLI uniquement.

## Workflow web

1. **Page projet `/projets/[id]`** :
   - Si LUT vide : CTA "Aucune LUT importée" avec 2 boutons frères ("Importer une LUT" + "Construire à partir des gammes")
   - Bouton "Depuis les gammes" toujours visible dans l'en-tête (même après import LUT, pour régénérer)
2. **Wizard `/projets/[id]/import-gammes`** :
   - Étape 1 : upload `.xlsx`/`.xlsm` → `POST /api/import/gammes-detect`
   - Étape 2 : mapping 3 colonnes (auto-pré-sélection regex) + multi-checkbox corps EMIS
   - Étape 3 : récap + bouton "Construire la LUT" → `POST /api/import/gammes-confirm`
3. **Confirm — deux modes selon l'état du projet** (déterminés côté serveur, le client ne décide pas) :
   - **Mode `build`** (projet vide, `ot_items` count = 0) : insert batch (50/batch) en `ot_items` avec `type_travaux = corpsEmis.join(", ")` ou `"NC"`. Génération `.xlsx`. Réponse `{ mode: "build", inserted, ... }`.
   - **Mode `export`** (LUT existante) : **aucune écriture DB**. Génération `.xlsx` uniquement. Réponse `{ mode: "export", inserted: 0, ... }`. Le wizard affiche "LUT inchangée".
   - Le client décode `file` (base64) → download auto. En mode `build`, propose ensuite "Voir la LUT". En mode `export`, juste "Retour au projet".

**Pourquoi pas de mode "régénération forcée"** : la LUT générée depuis les gammes est partielle (ITEM + TITRE GAMME + TYPE TRAVAUX). Une LUT existante peut contenir des champs ajoutés à la main (FAMILLE, TYPE, REV, statut, commentaires…) — les écraser serait destructeur. Si l'utilisateur veut vraiment refaire de zéro, il supprime le projet ou utilise le `.xlsx` généré comme source du ré-import LUT classique.

## Marquage NC en DB

Pas de migration : l'item non concerné a simplement `type_travaux = "NC"` dans `ot_items`. La colonne `extra_columns` JSONB stocke `{ gammes_corps_all: [...] }` pour audit (corps non-EMIS qui interviennent sur l'item).

## Pièges connus

- **ExcelJS plante en lisant les shared formulas** de la LUT BUTACHIMIE source : le getter `cell.formula` throw sur les clones dont le master a été supprimé. C'est pour ça que `build-lut-template.ts` lit avec SheetJS et écrit un template propre avec ExcelJS, plutôt que de cloner directement le fichier source.
- **Décalage d'indice SheetJS** : si le `!ref` du fichier ne commence pas à `A` (ex : `B1:AK302`), `sheet_to_json({ header: 1 })` indexe à partir du début du range. L'index 0 dans l'array correspond alors à la colonne B, pas A. Toujours vérifier `ws['!ref']` avant de raisonner sur les indices.
- **Sélection EMIS** : les codes (`K0`, `L0`…) sont propres au client. Pas de liste fixe possible — sélection à chaque run via la liste DISTINCT extraite du fichier.
