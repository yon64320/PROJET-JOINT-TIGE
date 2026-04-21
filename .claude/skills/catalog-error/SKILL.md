---
name: catalog-error
description: >
  Cataloguer une erreur dans le référentiel .claude/errors/.
  Utiliser après chaque bug fix, quand l'utilisateur dit "catalogue cette erreur",
  "ajoute au référentiel", "log cette erreur", ou proactivement après avoir résolu un bug.
user-invocable: true
allowed-tools: Read, Edit, Write, Glob, Grep
argument-hint: "[description courte de l'erreur]"
---

# Skill : Cataloguer une erreur

Après un fix, tu catalogues l'erreur dans le bon fichier référentiel pour mémoire projet.

## Fichiers référentiels

```
.claude/errors/
├── INDEX.md              ← index symptôme → fichier+section
├── excel-sheetjs.md      ← SheetJS, formules, encoding, feuilles
├── univer.md             ← Workbook, events, lifecycle, rendering
├── supabase-postgres.md  ← GENERATED, RLS, migrations, types
├── css-tailwind.md       ← Tailwind v4, parsing CSS, @theme
├── nextjs-react.md       ← SSR, hydration, API routes, middleware
├── pwa-offline.md        ← Dexie, Service Worker, sync, IndexedDB
└── browser-env.md        ← CORS, MIME types, Chrome, Windows
```

Si aucune catégorie ne correspond, créer un nouveau fichier et l'ajouter à INDEX.md.

## Workflow

### 1. Identifier

Extraire du contexte de la conversation :

- **Symptôme** : ce que l'utilisateur a vu (message d'erreur, comportement)
- **Cause racine** : pourquoi ça s'est produit
- **Fix** : ce qui a résolu le problème
- **Prévention** : comment éviter à l'avenir (si applicable)

### 2. Classifier

Choisir le fichier par domaine technique :

- C'est un problème de parsing Excel ? → `excel-sheetjs.md`
- C'est un problème de tableur Univer ? → `univer.md`
- C'est un problème de base de données ? → `supabase-postgres.md`
- C'est un problème de CSS/Tailwind ? → `css-tailwind.md`
- C'est un problème de Next.js/React ? → `nextjs-react.md`
- C'est un problème PWA/offline ? → `pwa-offline.md`
- C'est un problème navigateur/OS ? → `browser-env.md`

### 3. Vérifier les doublons

Lire le fichier cible. Si une entrée similaire existe, enrichir plutôt que dupliquer.

### 4. Ajouter l'entrée

Format strict — append à la fin du fichier :

```markdown
## Titre court et descriptif

- **Symptôme** : Ce qu'on observe (message d'erreur exact si possible)
- **Cause racine** : Explication technique de pourquoi
- **Fix** : Ce qui a résolu le problème
- **Prévention** : Comment éviter (rule, convention, check)
- **Date** : YYYY-MM-DD
```

### 5. Mettre à jour INDEX.md

Ajouter une ligne dans la table "Lookup rapide par symptôme" :

```markdown
| symptôme court, mots-clés | fichier.md | Titre de la section |
```

### 6. Évaluer la promotion en rule

Si le pattern est récurrent (3+ occurrences dans le référentiel, ou risque élevé de récidive) :

- Proposer de créer ou enrichir une rule dans `.claude/rules/`
- Ajouter `- **Règle promue** : .claude/rules/xxx.md` à l'entrée

## Principes

- **Un problème = un domaine technique**, pas une page de l'app
- **Symptôme d'abord** : formuler du point de vue de ce qu'on voit, pas de ce qu'on sait
- **Pas de doublons** : enrichir une entrée existante plutôt qu'en créer une nouvelle
- **Concis** : chaque entrée < 10 lignes. Le détail est dans le code (git blame)
