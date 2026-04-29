# Plan d'audit n°4 — CI / Quality gates / Process

> Ce document est un **prompt autonome** destiné à une nouvelle instance de Claude Code, sans contexte préalable. Tout ce qui est nécessaire à l'exécution de l'audit est embarqué ci-dessous.

---

## Mission confiée à Claude

Tu es chargé d'auditer et de **renforcer la chaîne CI/CD** d'une application Next.js 16 hébergée sur GitHub. Un workflow CI minimal existe déjà ; il s'agit de :

1. Vérifier que le pipeline existant est solide et fiable.
2. Identifier les **quality gates manquants** (couverture de tests, audit sécurité, smoke E2E, build PWA, etc.).
3. Proposer une version étendue du workflow.
4. Vérifier la cohérence avec les pratiques 2026 (action SHA pinning, permissions minimales, attestations).
5. Vérifier la couverture de tests existante et proposer un seuil minimal raisonnable.
6. Documenter les règles de protection de branche à appliquer côté GitHub UI.

Tu produis un rapport `docs/audits/findings/ci-{YYYY-MM-DD}.md` ET tu peux **proposer (ne pas appliquer sans validation)** une version améliorée des workflows.

Toute modification effective des workflows ou de la config GitHub passe par un **plan de déploiement** discuté avec l'utilisateur avant exécution.

---

## Contexte projet (à lire intégralement)

### Stack et scripts disponibles

- Next.js 16 (App Router), React 19, TypeScript 6
- Vitest 4 (tests unit), Playwright 1.59 (installé, **aucun test E2E écrit pour le moment**)
- ESLint 9 + Prettier 3 + Husky 9 + lint-staged 16
- Supabase CLI 2.95 en devDep

`package.json` scripts :

```json
"dev": "next dev --webpack"
"build": "next build"
"start": "next start"
"lint": "next lint"
"type-check": "tsc --noEmit"
"test": "vitest run"
"test:watch": "vitest"
"test:ui": "vitest --ui"
"format": "prettier --write \"src/**/*.{ts,tsx}\""
"format:check": "prettier --check \"src/**/*.{ts,tsx}\""
"prepare": "husky"
```

Pas de script `e2e`, pas de script `coverage`.

### CI existant

Fichier `.github/workflows/ci.yml` actuel :

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run format:check
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test
      - run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: "https://placeholder.supabase.co"
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "placeholder-key-for-build"
```

Forces :

- pin Node 22, cache npm, exécution sur push + PR.
- enchaîne format → lint → type-check → test → build.
- placeholders pour les vars d'env publiques (correct pour le build).

Faiblesses identifiées (non exhaustif, à challenger pendant l'audit) :

- Pas de couverture de tests mesurée.
- Pas de scan de sécurité (npm audit / gitleaks).
- Pas de tests E2E (Playwright installé mais pas exécuté).
- Pas de validation du Service Worker (`src/sw.ts`) ni de la build PWA.
- Pas de smoke test contre une vraie base éphémère (Supabase preview branch ?).
- Actions externes pinnées sur tag majeur (`@v4`), pas sur SHA.
- Permissions du `GITHUB_TOKEN` non explicitement réduites.
- Pas de schedule (audit hebdo / dependency check).
- Pas de validation du build sortie (taille bundle, presence des chunks Univer, etc.).

### Tests existants

Recherche `*.test.ts` dans `src/` (à exécuter pendant l'audit). État connu approximatif :

- `src/lib/domain/__tests__/jt.test.ts`
- `src/lib/domain/__tests__/lut.test.ts`
- `src/lib/domain/__tests__/fiche-rob-fields.test.ts`
- `src/lib/excel/__tests__/detect-columns.test.ts`
- `src/lib/excel/__tests__/generic-parser.test.ts`
- `src/lib/db/__tests__/utils.test.ts`
- `src/lib/validation/__tests__/schemas.test.ts`

Soit ~7 fichiers de tests pour ~127 fichiers de code TS/TSX. Couverture probable très partielle. Domaines critiques **probablement non couverts** : routes API, hooks React, composants tableurs, wizard terrain, sync offline.

### Conventions du projet

- Husky + lint-staged tournent en pre-commit (Prettier sur ts/tsx/json/md/css).
- Pas de hook pre-push.
- Pas de Conventional Commits stricts (à confirmer en lisant `git log`).
- Le projet est mono-utilisateur (un seul dev) → la rigueur PR/review n'est pas naturelle, mais le CI doit malgré tout protéger main.

### Branche de référence

`main` — commits directs possibles pour l'instant (à confirmer côté GitHub settings).

---

## Objectifs précis

1. Vérifier que **chaque commande npm** dans `package.json` tourne réellement en local sans erreur (`format:check`, `lint`, `type-check`, `test`, `build`).
2. Mesurer la **couverture de tests Vitest** réelle sur le code actuel et proposer un seuil minimum (par exemple 70% sur `src/lib/`, 50% global).
3. Identifier ce qui devrait être testé en E2E (au moins le smoke flow : login → créer projet → import LUT → ouvrir J&T).
4. Proposer une **version étendue du workflow** intégrant : coverage, security scan, build artifact, branch protection ready.
5. Pin les actions externes sur des SHA, ajouter `permissions:` explicite.
6. Proposer un workflow secondaire `security.yml` (audit deps + gitleaks) **schedulé** et déclenchable manuellement.
7. Documenter une **liste de règles de protection** de branche à activer côté GitHub UI.

---

## Périmètre

### Fichiers à inspecter

- `.github/workflows/*.yml`
- `.github/dependabot.yml` (existe ? sinon proposer)
- `.husky/*`
- `package.json`, `package-lock.json`
- `vitest.config.ts`
- `playwright.config.ts` (existe ? sinon proposer un squelette)
- `next.config.ts`
- `tsconfig.json`
- `.eslintrc.json` (ou `eslint.config.*`)
- Tout fichier `*.test.ts` ou `*.spec.ts` dans `src/`

### Fichiers à éviter

- `node_modules/`
- `.next/`

---

## Méthodologie — 6 phases

### Phase 1 — Audit de l'existant

Pour chaque commande npm du `package.json`, exécute-la en local et note :

- Code de retour
- Durée d'exécution
- Warnings éventuels
- Erreurs (si la commande échoue, c'est un finding bloquant à régler avant d'étendre le CI)

```bash
npm run format:check
npm run lint
npm run type-check
npm run test
npm run build
```

Remplis ce tableau dans le rapport :

```
| Script | Status | Durée | Warnings | Notes |
```

### Phase 2 — Mesure de la couverture

Vitest 4 supporte la couverture via `@vitest/coverage-v8` ou `@vitest/coverage-istanbul`. Vérifie si un de ces packages est installé. Sinon, propose-le en devDependency.

Procédure :

1. Si non installé : ajoute la devDep correspondante (proposition seulement, demande validation avant `npm install`).
2. Ajoute un script `"coverage": "vitest run --coverage"`.
3. Configure le seuil minimum dans `vitest.config.ts` :

```ts
test: {
  coverage: {
    provider: "v8",
    reporter: ["text", "json", "html", "lcov"],
    include: ["src/**"],
    exclude: ["src/**/*.test.ts", "src/sw.ts", "src/middleware.ts"],
    thresholds: {
      lines: 50,
      functions: 50,
      branches: 50,
      statements: 50,
    },
  },
},
```

4. Exécute `npm run coverage` et capture la sortie.
5. Liste dans le rapport, par dossier, les zones les moins couvertes :

```
| Dossier | Lines | Functions | Branches |
| src/lib/domain | X% | X% | X% |
| src/lib/excel  | X% | X% | X% |
| src/app/api    | X% | X% | X% |
```

6. Propose un seuil **réaliste** (pas 100%, pas 0%) en fonction de l'état actuel. Règle : ne pas pénaliser le présent, contraindre le futur. Si la couverture actuelle est 35%, propose 30% comme plancher CI initial avec engagement de monter à 50% en X semaines.

### Phase 3 — Plan de tests E2E (Playwright)

Playwright est installé. Vérifie la présence de `playwright.config.ts`. Sinon, propose un squelette :

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run build && npm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

Identifie ensuite **3 à 5 user journeys critiques** à tester :

1. Login → liste projets → création projet → vue projet vide
2. Création projet + import LUT (avec un fichier fixture) → vue tableur LUT
3. Import J&T → vue J&T → édition d'une cellule → sauvegarde
4. Création session terrain + sélection d'OTs → page terrain (avec auth simulée)
5. Génération fiche rob PDF (download)

Pour chaque journey, écris un test squelette `e2e/<nom>.spec.ts` (ou propose-les dans le rapport en pseudo-code).

**Note** : un test E2E nécessite des données. Décide avec l'utilisateur :

- soit une instance Supabase de test (preview branch + migrations + seed),
- soit des mocks API au niveau Playwright,
- soit des fixtures fichiers locaux (Excel) avec login bypass dev.

### Phase 4 — Sécurisation des workflows

Pour chaque action externe utilisée :

1. Identifie le SHA correspondant à la version pinnée (`actions/checkout@v4` → SHA spécifique).
2. Remplace `@v4` par `@<SHA>` (avec un commentaire `# v4.1.7` à côté).
3. Ajoute en haut de chaque workflow :

```yaml
permissions:
  contents: read
```

(Ajoute des permissions plus larges seulement par job, et seulement si nécessaire.)

4. Vérifie que `GITHUB_TOKEN` n'est jamais imprimé (`run: echo $TOKEN` interdit).
5. Confirme que les secrets ne sont injectés qu'aux steps qui en ont besoin.

### Phase 5 — Workflow étendu proposé

Rédige le contenu d'un `ci.yml` étendu **dans le rapport** (ne le commit pas sans validation). Squelette :

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  setup:
    runs-on: ubuntu-latest
    outputs:
      cache-hit: ${{ steps.cache.outputs.cache-hit }}
    steps:
      - uses: actions/checkout@<SHA> # v4
      - uses: actions/setup-node@<SHA> # v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci

  quality:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<SHA>
      - uses: actions/setup-node@<SHA>
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run format:check
      - run: npm run lint
      - run: npm run type-check

  test:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<SHA>
      - uses: actions/setup-node@<SHA>
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run coverage
      - uses: actions/upload-artifact@<SHA>
        with:
          name: coverage
          path: coverage/

  build:
    needs: [quality, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<SHA>
      - uses: actions/setup-node@<SHA>
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: "https://placeholder.supabase.co"
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "placeholder-key-for-build"
      - uses: actions/upload-artifact@<SHA>
        with:
          name: next-build
          path: .next/

  e2e:
    needs: build
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@<SHA>
      - uses: actions/setup-node@<SHA>
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.E2E_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.E2E_SUPABASE_ANON_KEY }}
      - run: npx playwright test
      - uses: actions/upload-artifact@<SHA>
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

Et un workflow `security.yml` séparé (cf. plan d'audit n°3 si tu en as connaissance).

### Phase 6 — Branch protection (recommandations côté GitHub UI)

Liste à fournir dans le rapport :

- [ ] Require pull request before merging (même pour solo dev — discipline)
- [ ] Require status checks to pass : `quality`, `test`, `build` (et `e2e` si activé)
- [ ] Require branches to be up to date before merging
- [ ] Require linear history (optionnel)
- [ ] Restrict force pushes
- [ ] Restrict deletions
- [ ] Require signed commits (optionnel mais recommandé en 2026)

Précise comment l'utilisateur active cela : Settings → Branches → Branch protection rules → main.

---

## Checklist détaillée

### Pipeline existant

- [ ] Chaque commande npm tourne en local sans erreur (capturer durée et output)
- [ ] Le workflow CI actuel a été lu et tous les steps compris
- [ ] Les versions pinnées (Node, actions) ont été vérifiées
- [ ] Les permissions `GITHUB_TOKEN` ont été passées en revue

### Couverture

- [ ] Provider de coverage installé ou proposé
- [ ] Script `coverage` ajouté ou proposé
- [ ] Seuils initiaux fixés à un niveau réaliste vs état actuel
- [ ] Zones non couvertes critiques identifiées (au moins 5 fichiers)

### E2E

- [ ] `playwright.config.ts` audité ou proposé
- [ ] 3-5 user journeys critiques décrits
- [ ] Stratégie données E2E (fixtures, mocks, preview branch) décidée
- [ ] Squelette de tests fourni au moins en pseudo-code

### Workflows

- [ ] Actions externes : proposition de pin SHA fournie
- [ ] `permissions:` minimales ajoutées
- [ ] `concurrency:` ajoutée pour annuler les runs obsolètes
- [ ] Jobs séparés en quality / test / build / e2e
- [ ] Artifacts uploadés (coverage, next-build, playwright-report)

### Branch protection

- [ ] Liste des règles à activer fournie
- [ ] Status checks requis identifiés
- [ ] Procédure d'activation côté UI documentée

### Husky / pre-commit

- [ ] Configuration actuelle de husky vérifiée
- [ ] lint-staged configuration revue
- [ ] Proposition d'ajout d'un pre-push (optionnel : `npm run test`)

---

## Format du livrable

`docs/audits/findings/ci-{YYYY-MM-DD}.md` :

```markdown
# Audit CI / Quality gates — {date}

## Résumé exécutif

- Score CI actuel : N / 10
- Couverture globale : X%
- Findings critiques : N
- Findings élevés : N
- Verdict : ...

## État de l'existant

[Tableau scripts npm + status local]
[Description du workflow actuel + forces / faiblesses]

## Couverture de tests

[Tableau couverture par dossier]
[Seuils proposés et justification]

## Plan E2E

[Liste des journeys + stratégie données + squelettes]

## Workflows proposés

### ci.yml étendu

[Contenu complet du nouveau workflow]

### security.yml (si pas couvert ailleurs)

[Contenu]

## Branch protection

[Checklist d'activation côté GitHub UI]

## Plan de déploiement

1. Étape 1 : ajouter coverage en local + script
2. Étape 2 : étendre ci.yml en gardant les jobs courts en first
3. Étape 3 : activer branch protection avec status checks requis
4. Étape 4 : écrire les premiers tests E2E
5. Étape 5 : intégrer security.yml (cf. audit deps-secrets)

## Annexes

- Annexe A : pin SHA actions externes (table)
- Annexe B : config vitest.config.ts coverage
- Annexe C : playwright.config.ts proposé
```

---

## Critères d'acceptation

L'audit est complet quand :

1. Toutes les commandes `package.json` ont été testées en local et leur status est documenté.
2. La couverture actuelle est mesurée (chiffre concret par dossier).
3. Le workflow étendu proposé est complet, copiable-collable, avec SHA pinning expliqué.
4. Les 3-5 user journeys E2E critiques sont décrits.
5. La liste des règles de branch protection est exhaustive.
6. Le plan de déploiement est priorisé et chaque étape est faisable indépendamment (incrément possible).

---

## Contraintes de comportement

- **Pas de modification de `.github/workflows/*.yml`** sans validation explicite de l'utilisateur. Le rapport propose, l'utilisateur applique.
- **Pas de `npm install`** d'un nouveau package (`@vitest/coverage-v8`, `fast-check`, etc.) sans validation. Tu peux proposer la commande dans le rapport.
- **Test local d'abord** : avant de proposer un job CI, vérifie que le script tourne sur ta machine.
- **Énonce ton modèle mental** avant chaque changement non trivial (cf. `.claude/rules/process.md`).
- **Si une commande npm échoue en local**, c'est un finding **bloquant** : signaler avant de continuer.
- **Si le `npm run build` échoue à cause d'un import client→serveur** (ex: route serveur importée dans un composant client), c'est un finding architectural à remonter, pas un fix CI.

---

## Sources de référence

- [GitHub Actions 2026 Security Roadmap](https://github.blog/news-insights/product-news/whats-coming-to-our-github-actions-2026-security-roadmap/)
- [Production-grade CI/CD with Next.js + GitHub Actions (Coffey)](https://coffey.codes/articles/production-grade-ci-cd-with-nextjs-vercel-and-github-actions)
- [GitHub Actions CI/CD for Next.js (DEV)](https://dev.to/whoffagents/github-actions-cicd-for-nextjs-tests-type-checking-and-auto-deploy-1kp7)
- [Vitest coverage docs](https://vitest.dev/guide/coverage.html)
- [Playwright config docs](https://playwright.dev/docs/test-configuration)
- [GitHub Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Pinning actions to a full length commit SHA — GitHub Security Hardening](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions#using-third-party-actions)
- [Generating coverage reports with GitHub Actions](https://oneuptime.com/blog/post/2026-01-27-code-coverage-reports-github-actions/view)
