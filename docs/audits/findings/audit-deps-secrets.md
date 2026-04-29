# Audit dépendances & secrets — 2026-04-29

> Audit supply chain exécuté sur la branche `main` au commit `b1691d5`.
> Méthode : `npm audit --json`, `npm outdated`, `npm view`, `git log/show/pickaxe`, `Grep` regex sur working tree, scan `.next/static`, lecture des workflows GitHub.
> **Aucune install / update / commit n'a été appliqué.** Toutes les remédiations sont **proposées**.

---

## Résumé exécutif

| Indicateur                        | Valeur                                                                             |
| --------------------------------- | ---------------------------------------------------------------------------------- |
| Vulnérabilités **critiques**      | **0**                                                                              |
| Vulnérabilités **élevées**        | **3** (1 prod, 1 transitive prod, 1 dev-only)                                      |
| Vulnérabilités **modérées**       | **20**                                                                             |
| Vulnérabilités **faibles / info** | 0                                                                                  |
| Secrets exposés (working tree)    | **0**                                                                              |
| Secrets exposés (historique git)  | **0**                                                                              |
| Fichiers `.env*` commités         | 1 (`.env.local.example`, placeholders uniquement — OK)                             |
| Bundle client (`.next/static`)    | **CLEAN** — aucune fuite `service_role`                                            |
| Workflow CI                       | 1 (`ci.yml`) — placeholders OK, mais permissions par défaut + pas de security scan |

**Verdict global : 🟡 JAUNE.**

- Aucun secret n'a fuité dans le repo ni dans son historique.
- Pas de vulnérabilité critique exploitable directement.
- 3 high : 1 réelle exposition côté serveur (`xlsx` SheetJS — sans fix amont), 1 transitive remédiable par bump Univer (`lodash-es`), 1 dev-only sans impact prod (`vite` via vitest).
- L'écosystème Univer (`@univerjs/*` 0.19) cumule 12 vulns transitives modérées qui disparaissent avec un bump 0.19 → 0.21 mais semver pré-1.0 = risque de breaking.
- Deux durcissements CI manquent (permissions `GITHUB_TOKEN` minimisées, pin SHA des actions, scan automatique).

**Top 3 actions court terme :**

1. **Bump Univer 0.19 → 0.21.1** (≥ 8 vulns transitives résolues d'un coup) — à valider sur les vues tableur LUT/J&T avant merge.
2. **Décider du sort de `xlsx` 0.18.5** (3 voies détaillées en §5) — c'est la seule vuln high qui touche le runtime serveur réel.
3. **Activer Dependabot + workflow security minimal** (squelettes en annexes A et B) — pas de coût, gain immédiat sur les bumps de sécurité futurs.

---

## 1. Stack auditée

| Composant      | Version installée | Rôle                                |
| -------------- | ----------------- | ----------------------------------- |
| Next.js        | 16.2.1            | Framework full-stack                |
| React          | 19.2.4            | UI                                  |
| TypeScript     | 6.0.2             | Typage                              |
| Supabase JS    | 2.101.0           | Auth + DB + Storage côté serveur    |
| Supabase SSR   | 0.10.0            | Cookies + RLS côté SSR              |
| Univer presets | 0.19.0            | Suite tableurs                      |
| xlsx (SheetJS) | 0.18.5            | Lecture Excel côté serveur (import) |
| exceljs        | 4.4.0             | Génération Excel                    |
| pdfjs-dist     | 5.6.205           | Viewer PDF côté navigateur          |
| Dexie          | 4.4.2             | IndexedDB (PWA terrain)             |
| Serwist        | 9.5.7             | Service Worker (PWA terrain)        |
| Zod            | 4.3.6             | Validation (frontière API + UI)     |
| Vitest         | 4.1.2 (dev)       | Tests unitaires                     |
| Playwright     | 1.59.1 (dev)      | Installé, **aucun test E2E écrit**  |

`package.json` à la racine, pas de monorepo.

---

## 2. Vulnérabilités dépendances (`npm audit`)

### 2.1 Compteurs bruts (`npm audit --json`)

```
total=23  critical=0  high=3  moderate=20  low=0  info=0
```

### 2.2 Vulnérabilités HIGH

| #   | Package     | Type            | Version | Avis                                                                                                                                                | Fix dispo                                                          | Effort              |
| --- | ----------- | --------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------- |
| 1   | `xlsx`      | **Direct prod** | 0.18.5  | Prototype Pollution (GHSA-4r6h-8v6p-xvw6) + ReDoS (GHSA-5pgg-2g8v-p4x9)                                                                             | **Aucun** (dernière publiée sur npm = 0.18.5)                      | **Élevé** — voir §5 |
| 2   | `lodash-es` | Transitive prod | 4.17.23 | Code Injection via `_.template` (GHSA-r5fr-rjxr-66jc) + Prototype Pollution (GHSA-f23m-r3pf-42rh)                                                   | OUI — résolu en bumpant la racine `@univerjs/core` au-delà de 0.19 | Moyen               |
| 3   | `vite`      | Transitive dev  | 8.0.3   | Path traversal `.map` (GHSA-4w7w-66w2-5vf9), `server.fs.deny` bypass (GHSA-v2wj-q39q-566r), Arbitrary file read via WebSocket (GHSA-p9ff-h696-f583) | OUI — `vite >= 8.0.10` (vient avec un bump `vitest`)               | Faible (dev-only)   |

**Trace vite** : `vitest@4.1.2 → @vitest/mocker@4.1.2 → vite@8.0.3` et `vitest@4.1.2 → vite@8.0.3`. **Dev-only** : aucun runtime serveur Next.js ne charge vite, aucune CI publique exposée. Risque limité au poste développeur.

**Trace lodash-es** : `@univerjs/presets@0.19.0 → @univerjs/core@0.19.0 → lodash-es@4.17.23`. Embarqué dans le bundle client si Univer charge `_.template` — peu probable côté usage projet, mais hygiène à corriger.

### 2.3 Vulnérabilités MODERATE (résumé par groupe)

| Groupe                                                  | Nb vulns | Cause racine                                                                                                                     | Fix recommandé                                                                                                        |
| ------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Chaîne Univer (`@univerjs-pro/*`, `@univerjs/preset-*`) | **12**   | Cascade depuis `@univerjs-pro/collaboration` (utilise `uuid@13.0.0` vulnérable) et `@univerjs-pro/exchange-client` >= 0.2.10     | **Bump `@univerjs/*` 0.19 → 0.21.1** (latest disponible)                                                              |
| `uuid <14.0.0`                                          | 1        | `Missing buffer bounds check in v3/v5/v6` (GHSA-w5hq-g745-h8pq), tiré par `exceljs` (uuid@8.3.2) **et** par Univer (uuid@13.0.0) | Bump Univer (réduit 1 chaîne) ; pour `exceljs` le fix sémantique imposerait `exceljs@3.4.0` (downgrade major, refusé) |
| `postcss <8.5.10`                                       | 1        | XSS via `</style>` non échappé (GHSA-qx2v-qp2m-jg93). `next` dépend de postcss < seuil.                                          | Bump `next` à `>=16.2.4` (déjà disponible, voir §3)                                                                   |
| `next` (>=9.3.4-canary.0 via postcss)                   | 1        | Effet de la vuln postcss ci-dessus                                                                                               | idem                                                                                                                  |
| `@serwist/next`                                         | 1        | dépend de `next`                                                                                                                 | Suit le bump Next                                                                                                     |
| `exceljs >=3.5.0`                                       | 1        | Dépend de uuid vulnérable                                                                                                        | `npm audit fix --force` proposerait `exceljs@3.4.0` → **refus** (downgrade major destructeur)                         |

> Note : `npm audit` rapporte 23 entrées car chaque maillon de la chaîne Univer apparaît séparément ; concrètement il n'y a que **3 racines** côté Univer (`uuid` transitive, `@univerjs-pro/collaboration`, `@univerjs-pro/exchange-client`).

### 2.4 Plan de remédiation priorisé

| Priorité | Action                                                                                                        | Effet                                             | Risque breaking                                              |
| -------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------ |
| P1       | Bump `@univerjs/presets`, `@univerjs/preset-sheets-core/conditional-formatting/data-validation` 0.19 → 0.21.1 | Résout ≥ 12 vulns Univer + lodash-es high         | Pré-1.0 — tester LUT, J&T, Robinetterie en local avant merge |
| P2       | Bump `next` 16.2.1 → 16.2.4 (patch)                                                                           | Résout postcss moderate + serwist transitive      | Faible (patch Next)                                          |
| P2       | Bump `vitest` au prochain release qui pin `vite >= 8.0.10`                                                    | Résout 3 vulns vite high (dev-only)               | Faible                                                       |
| P3       | Décider du sort de `xlsx` (cf. §5)                                                                            | Résout 2 vulns high (prototype pollution + ReDoS) | Variable selon voie                                          |
| P3       | Bump patch global `npm update` sans `--force` (cf. liste §3)                                                  | Hygiène (postcss, prettier, dotenv, react…)       | Faible (patch only)                                          |
| P4       | `eslint` 9 → 10 (1 majeur)                                                                                    | Confort, pas de vuln connue                       | Moyen — config ESLint à relire                               |

**Aucun bump avec `--force`** sur `exceljs` : il proposerait un downgrade major (4.4.0 → 3.4.0).

---

## 3. Dépendances obsolètes (`npm outdated`)

| Package                          | Current | Wanted  | Latest     | Type | Risque sécurité aujourd'hui                          | Effort bump                           |
| -------------------------------- | ------- | ------- | ---------- | ---- | ---------------------------------------------------- | ------------------------------------- |
| `@univerjs/preset-*` (4 paquets) | 0.19.0  | 0.19.0  | 0.21.1     | dep  | **Élevé** — racine de 12+ vulns transitives moderate | Moyen (pré-1.0)                       |
| `@supabase/ssr`                  | 0.10.0  | 0.10.2  | 0.10.2     | dep  | Faible                                               | Faible                                |
| `@supabase/supabase-js`          | 2.101.0 | 2.105.1 | 2.105.1    | dep  | Faible                                               | Faible                                |
| `@tailwindcss/postcss`           | 4.2.2   | 4.2.4   | 4.2.4      | dev  | Faible                                               | Faible                                |
| `@types/node`                    | 25.5.0  | 25.6.0  | 25.6.0     | dev  | Faible                                               | Faible                                |
| `@vitest/ui`                     | 4.1.2   | 4.1.5   | 4.1.5      | dev  | Faible                                               | Faible                                |
| `dotenv`                         | 17.3.1  | 17.4.2  | 17.4.2     | dev  | Faible                                               | Faible                                |
| `eslint`                         | 9.39.4  | 9.39.4  | **10.2.1** | dev  | Faible                                               | **Moyen** — relire `eslint.config.js` |
| `pdfjs-dist`                     | 5.6.205 | 5.7.284 | 5.7.284    | dep  | Faible (pas de CVE active reportée par audit)        | Faible                                |
| `postcss`                        | 8.5.8   | 8.5.12  | 8.5.12     | dev  | **Moderate XSS** (résolu par 8.5.10+)                | Faible                                |
| `prettier`                       | 3.8.1   | 3.8.3   | 3.8.3      | dev  | Faible                                               | Faible                                |
| `react` / `react-dom`            | 19.2.4  | 19.2.5  | 19.2.5     | dep  | Faible                                               | Faible                                |
| `supabase` (CLI)                 | 2.95.5  | 2.95.6  | 2.95.6     | dev  | Faible                                               | Faible                                |
| `tailwindcss`                    | 4.2.2   | 4.2.4   | 4.2.4      | dev  | Faible                                               | Faible                                |
| `typescript`                     | 6.0.2   | 6.0.3   | 6.0.3      | dev  | Faible                                               | Faible                                |
| `vitest`                         | 4.1.2   | 4.1.5   | 4.1.5      | dev  | **High via vite** transitive (cf. §2.2)              | Faible                                |

**Aucun paquet `deprecated` détecté** sur les dépendances directes (`npm view <pkg> deprecated` retourne vide pour `xlsx`, `pdfjs-dist`, `exceljs`, `next`).

`eslint 10` est le seul retard d'un majeur entier.

---

## 4. Inspection ciblée des dépendances à risque historique

### 4.1 `next` — 16.2.1 → 16.2.4 disponible

CVE notable historique sur la branche 13/14 : **CVE-2025-29927** (middleware bypass via header `x-middleware-subrequest`). **Patché à partir de Next 14.2.25, 15.2.3, et toutes les 16.x** d'après l'advisory officiel Vercel — la version installée 16.2.1 **n'est pas affectée** par ce CVE précis.

Vuln moderate restante : `postcss <8.5.10` (cf. §2.3). Bump 16.2.1 → 16.2.4 résout.

### 4.2 `xlsx` (SheetJS) — 0.18.5

- **Aucun fix npm disponible** : la dernière version sur npmjs.com est 0.18.5, et SheetJS a déplacé le développement actif sur leur CDN (`https://cdn.sheetjs.com`). Le miroir npm n'est plus mis à jour.
- 2 vulns high signalées : **GHSA-4r6h-8v6p-xvw6** (prototype pollution sur `_object`/`__proto__` dans certains parsers cellule) + **GHSA-5pgg-2g8v-p4x9** (ReDoS sur certains formats de date / formules).
- **Surface d'exposition côté projet** : import `.xlsm` LUT/J&T uploadés par préparateur authentifié → fichier de confiance modérée (provenance EMIS), mais un fichier malveillant déposé par un utilisateur compromis pourrait déclencher la prototype pollution sur le runtime serveur.

### 4.3 `exceljs` — 4.4.0

- Dernière version stable. La vuln rapportée est **transitive via `uuid@8.3.2`** (buffer bounds check). Pas de fix sans downgrade major refusé.
- Pas de RegEx DoS active sur 4.4.x (les CVE historiques ciblaient 4.0/4.1).

### 4.4 `pdfjs-dist` — 5.6.205

- `npm audit` ne signale aucune vuln. La CVE-2024-4367 (XSS via fontes malformées) a été corrigée en 4.2.x ; la version installée est en 5.6.x. **OK**.
- Bump patch disponible 5.6.205 → 5.7.284 — sans urgence.

### 4.5 `@univerjs/*` — 0.19.0

- Pas de CVE 2025+ propre à Univer trouvée. Toutes les vulns rapportées par `npm audit` sont **transitives** (uuid, lodash-es, @univerjs-pro/exchange-client et collaboration). Bump 0.21 corrige la majorité.

### 4.6 `dexie` — 4.4.2

- Pas de vuln publiée. Pas de fuite mémoire majeure connue sur la branche 4.x. **OK**.

---

## 5. xlsx — 3 voies pour sortir des 2 vulns high

**Voie A — accepter le risque, documenter (effort : nul, risque résiduel : moyen)**

- Confirmer que les `.xlsm` ne viennent que de comptes EMIS authentifiés (déjà le cas via la vérification `owner_id = user.id`).
- Ajouter une validation MIME stricte + taille max + parse uniquement les feuilles attendues.
- Documenter le risque résiduel dans le rapport sécurité.

**Voie B — migrer vers `@sheet/sheet` (SheetJS CDN officiel) (effort : moyen, risque résiduel : faible)**

- Remplacer la dépendance npm par `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` dans `package.json`.
- Versions CDN reçoivent les patches sécu (0.20.x patché contre les deux CVEs).
- Inconvénient : dépendance non-npm → CI doit pouvoir résoudre l'URL, Dependabot ne fonctionnera pas dessus.

**Voie C — supprimer `xlsx`, ne garder que `exceljs` (effort : élevé, risque résiduel : nul sur xlsx)**

- `exceljs` couvre déjà la lecture/écriture .xlsx mais **pas .xlsm** (macros). Les fichiers source EMIS sont .xlsm — incompatible.
- Voie inadaptée tant que les `.xlsm` ne sont pas convertis en `.xlsx` côté préparateur.

**Recommandation : Voie B** si l'effort de migration est supportable, sinon Voie A en attendant que SheetJS publie une version patchée sur npm.

---

## 6. Audit des secrets

### 6.1 Working tree — scan regex

Patterns scannés via `Grep` sur tout le repo (hors `node_modules`, `.next`) :

| Pattern                                        | Hits réels | Faux positifs                                                                                           | Action |
| ---------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------- | ------ |
| `sk-[A-Za-z0-9]{20,}` (OpenAI / Anthropic)     | **0**      | —                                                                                                       | OK     |
| `AKIA[0-9A-Z]{16}` (AWS access key)            | **0**      | —                                                                                                       | OK     |
| `ghp_[A-Za-z0-9]{36}` (GitHub PAT)             | **0**      | —                                                                                                       | OK     |
| `sbp_[A-Za-z0-9]{30,}` (Supabase access token) | **0**      | —                                                                                                       | OK     |
| `eyJhbGciOi[A-Za-z0-9._-]{50,}` (JWT brut)     | **0**      | —                                                                                                       | OK     |
| `password\s*[:=]\s*['"][^'"]+['"]`             | **0**      | —                                                                                                       | OK     |
| `api[_-]?key\s*[:=]\s*['"][^'"]{10,}['"]` (i)  | 1          | 1 — `supabase/config.toml:95` → `openai_api_key = "env(OPENAI_API_KEY)"` (référence env, pas la valeur) | OK     |
| `service_role` / `SUPABASE_SERVICE_ROLE_KEY`   | 6          | 6 — tous références `process.env.*` ou doc                                                              | OK     |
| `eyJ` (JWT plat dans `src/`)                   | **0**      | —                                                                                                       | OK     |

**Détail des hits `service_role` / `SUPABASE_SERVICE_ROLE_KEY` (tous légitimes) :**

```
src/lib/db/supabase-server.ts:9        process.env.SUPABASE_SERVICE_ROLE_KEY!
src/lib/db/seed-bolt-specs.ts:13       process.env.SUPABASE_SERVICE_ROLE_KEY!
src/app/api/terrain/sync/route.ts:3    import { supabaseAdmin as supabase } from "@/lib/db/supabase-server"
src/app/api/terrain/sessions/route.ts:3 idem
src/app/api/terrain/plans/route.ts:2   idem
src/app/api/terrain/download/route.ts:2 idem
```

**Aucun secret en dur.** Toutes les usages passent par `process.env.*`.

### 6.2 Fichiers `.env*`

| Fichier              | Suivi par git ?                          | Contenu inspecté                                                                                                                                                                                    | Verdict |
| -------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `.env.local`         | **Non** (`git ls-files .env.local` vide) | Non lu par l'audit (interdit par sandbox)                                                                                                                                                           | OK      |
| `.env.local.example` | **Oui**                                  | 5 lignes, **placeholders uniquement** : `your-project.supabase.co`, `your-anon-key`, `your-service-role-key` + `SKIP_AUTH=true` (gardé par `NODE_ENV !== "production"` dans `src/middleware.ts:29`) | OK      |

`SKIP_AUTH=true` dans le `.example` est explicitement guarded en code → impossible de bypass auth en prod, même si la variable est settée. Pas une fuite, simple aide au DX.

### 6.3 Historique git complet

Repo : 26 commits sur `main`, branche `backup-2026-04-28` également scannée.

```bash
git log --all --full-history -- ".env*" "*.pem" "*.key" "credentials*" "secrets*"
# → uniquement ece4632 ".env.local.example | 6 ++"
git log --all --oneline -S "service_role"
# → b1691d5 (refactor RPC archive — référence code, pas valeur)
git log --all --oneline -S "eyJhbGciOi"
# → vide
```

- **Aucun fichier `.env*` autre que `.env.local.example` n'a jamais été commité.**
- **Aucun JWT brut, AWS key, GitHub PAT, Supabase access token n'apparaît dans l'historique** (pickaxe scan négatif).
- Le seul match `service_role` dans l'historique pointe vers le code legitime (`process.env.SUPABASE_SERVICE_ROLE_KEY` dans `supabase-server.ts`).

### 6.4 `.gitignore`

Contenu analysé. Couvre :

```
/node_modules ✅
/.next/ ✅
.env*.local ✅       ← couvre .env.local, .env.production.local, etc.
*.pem ✅
.vercel ✅
data/*.xlsm ✅       (fichiers Excel sources, hygiène, pas sécu)
```

**Manques mineurs :**

- ❌ Pas de `.env` tout court (sans suffixe `.local`). Si quelqu'un crée `.env` à la racine, il sera commité.
- ❌ Pas de `*.key` ni `credentials*.json` — pas critique pour la stack actuelle, mais préventif.

**Recommandation** : ajouter ces 3 lignes dans `.gitignore` :

```
.env
*.key
credentials*.json
```

### 6.5 Bundle client (`.next/static`)

```bash
grep -rl "service_role"               .next/static/   →  aucun fichier
grep -rl "SUPABASE_SERVICE_ROLE_KEY"  .next/static/   →  aucun fichier
```

**CLEAN.** Aucune fuite côté navigateur.

Vérifié également par cross-référence statique : aucun fichier marqué `"use client"` dans `src/` n'importe `supabase-server` ni ne référence `SUPABASE_SERVICE_ROLE_KEY`. Le Service Worker `src/sw.ts` est aussi propre.

### 6.6 `.mcp.json`

```json
"args": [..., "--access-token", "${SUPABASE_ACCESS_TOKEN}"]
```

Référence env correcte, pas de valeur en dur. **OK.**

### 6.7 `supabase/config.toml`

Ligne 95 : `openai_api_key = "env(OPENAI_API_KEY)"` — pattern de référence env supporté par Supabase CLI. **OK.**

---

## 7. Audit CI/CD (`.github/workflows/`)

Un seul workflow : `ci.yml`.

### 7.1 Findings sur `ci.yml`

| #   | Constat                                                                                                                 | Sévérité | Recommandation                                                                     |
| --- | ----------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------- |
| 1   | Pas de bloc `permissions:` global → `GITHUB_TOKEN` reçoit les permissions par défaut du repo (souvent `write` sur tout) | Moderate | Ajouter `permissions: contents: read` au niveau workflow                           |
| 2   | `actions/checkout@v4` et `actions/setup-node@v4` pinnés sur tag mutable (`@v4`)                                         | Low      | Pour un projet OSS public, pin SHA recommandé (`@v4` peut être réécrit par GitHub) |
| 3   | Variables `placeholder` correctement utilisées pour `NEXT_PUBLIC_*` au build                                            | OK       | RAS                                                                                |
| 4   | Aucun `echo $SECRET` ou variable secrète imprimée                                                                       | OK       | RAS                                                                                |
| 5   | Aucun secret réel codé en dur                                                                                           | OK       | RAS                                                                                |
| 6   | Pas de scan sécurité (npm audit, gitleaks) en pre-merge                                                                 | Moderate | Ajouter le workflow `security.yml` proposé en annexe A                             |
| 7   | Pas de `dependabot.yml` détecté                                                                                         | Moderate | Ajouter le fichier proposé en annexe B                                             |

### 7.2 Versions de Node

`node-version: 22` dans `ci.yml`. Node 22 est en LTS jusqu'à 2027-04-30. **OK.**

---

## 8. Recommandations

### 8.1 Court terme (cette semaine)

1. **Bump `next` 16.2.1 → 16.2.4** (patch) + `postcss` (suit) → résout 3 modérées.
2. **Ajouter `.env`, `*.key`, `credentials*.json` dans `.gitignore`** (préventif, 1 commit).
3. **Ajouter `permissions: contents: read`** au début de `ci.yml` (1 ligne, hardening).
4. **Décider voie A/B/C pour `xlsx`** — au minimum acter par écrit la voie A si statu quo.

### 8.2 Moyen terme (ce mois)

1. **Bump Univer 0.19.0 → 0.21.1** — créer une branche `chore/univer-021`, valider sur les 7 vues J&T + LUT + Robinetterie, puis merger. Résout 12+ vulns transitives moderate + lodash-es high.
2. **Bump `vitest` au release qui pin vite ≥ 8.0.10** — surveiller `npm view vitest dist-tags`.
3. **Activer Dependabot** (annexe B) — PR auto pour tout futur bump security.
4. **Ajouter workflow `security.yml`** (annexe A) avec npm audit + gitleaks en pre-merge.
5. **Pin SHA des actions GitHub** dans `ci.yml` une fois Dependabot activé (Dependabot maintient les SHA).

### 8.3 Long terme

1. **Remplacer `xlsx` par la version CDN SheetJS** ou écrire un parser .xlsm propre côté serveur si la stack le permet.
2. **Surveiller `eslint` 10** — passer quand l'écosystème de configs (next, prettier) est stabilisé.

---

## 9. Procédure de rotation Supabase (à suivre uniquement si un secret leak réel est découvert plus tard)

Aucun secret n'a été détecté en clair dans le repo ni dans l'historique. Cette procédure est documentée à titre **préventif**, pour que le réflexe soit prêt :

1. **Révoquer la clé** dans le dashboard Supabase → Project Settings → API → "Reset service_role JWT".
2. **Mettre à jour `.env.local`** avec la nouvelle clé.
3. **Mettre à jour le secret CI** (GitHub → Settings → Secrets and variables → Actions) si jamais un secret CI était compromis.
4. **Invalider les sessions actives** côté Supabase (Auth → Users → "Sign out all users") si la clé `anon` était impactée.
5. **Auditer les logs Supabase** des 30 derniers jours pour détecter toute requête anormale postérieure à la fuite.
6. **Si le secret est dans l'historique git** : rotate **avant** de tenter une réécriture d'historique (`git filter-repo` ou BFG). Une réécriture seule **ne suffit pas** — le secret peut déjà avoir été récupéré par GitHub Secret Scanning, des forks, ou des bots. La rotation est l'unique vraie remédiation.

---

## Annexes

### Annexe A — Workflow `security.yml` proposé

> À placer dans `.github/workflows/security.yml`. Squelette basé sur l'écosystème 2026 (Dependabot + gitleaks + npm audit). **Pas de SHA pinné en exemple — à remplacer par les SHA actuels au moment de l'application.**

```yaml
name: Security
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: "0 6 * * 1" # tous les lundis 06:00 UTC
permissions:
  contents: read

jobs:
  npm-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm audit --audit-level=high
        # Échoue le job si une vuln high ou critical apparaît.

  gitleaks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # nécessaire pour scanner l'historique
      - uses: gitleaks/gitleaks-action@v2 # → remplacer par SHA pinné en prod
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Annexe B — `dependabot.yml` proposé

> À placer dans `.github/dependabot.yml`.

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    groups:
      univer:
        patterns:
          - "@univerjs/*"
          - "@univerjs-pro/*"
      supabase:
        patterns:
          - "@supabase/*"
          - "supabase"
      types:
        patterns:
          - "@types/*"

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

Le **groupage Univer** est important : sans ça, Dependabot ouvrirait 4 PR simultanées pour les 4 paquets `@univerjs/preset-*`, qui doivent **toujours** bumper de concert.

### Annexe C — Hardening minimal de `ci.yml`

Patch suggéré (à appliquer après validation) :

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions: # ← ajout
  contents: read # ← minimise GITHUB_TOKEN

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

---

## Critères d'acceptation — checklist finale

- [x] `npm audit --json` exécuté, totaux et chaque vuln high/moderate documentés.
- [x] Plan de remédiation explicite par sévérité.
- [x] `npm outdated` exécuté, paquets ≥ 1 majeur de retard listés (`eslint` uniquement).
- [x] CVE manuelles vérifiées sur `next`, `xlsx`, `exceljs`, `pdfjs-dist`, `@univerjs/*`.
- [x] Aucun paquet `deprecated` détecté en dépendance directe.
- [x] Patterns regex critiques exécutés sur `src/`, racine, `supabase/`, `.github/`.
- [x] `.env.local` confirmé absent du suivi git.
- [x] `.env.local.example` ne contient que des placeholders.
- [x] `.gitignore` couvre `.env*.local` (manque `.env` brut, recommandation faite).
- [x] Historique git scanné via `git log --full-history` + `git log -S` (pickaxe).
- [x] Bundle `.next/static` inspecté — aucune fuite `service_role` / `SUPABASE_SERVICE_ROLE_KEY`.
- [x] Aucun fichier `"use client"` ni `src/sw.ts` n'importe le client serveur Supabase.
- [x] Workflow CI audité : 7 findings dont 4 OK et 3 améliorations proposées.
- [x] Workflow `security.yml` proposé (annexe A) — non appliqué.
- [x] `dependabot.yml` proposé (annexe B) — non appliqué.
- [x] Procédure de rotation Supabase documentée à titre préventif.

---

**Fin du rapport.** Aucune valeur de secret n'apparaît dans ce document.
