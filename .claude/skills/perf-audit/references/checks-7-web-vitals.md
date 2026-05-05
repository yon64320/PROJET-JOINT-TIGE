# Section 7 — Web Vitals & UX

**Niveau** : MEDIUM
**Cibles** : pages publiques + tableurs (LCP / INP / CLS)

## Seuils Core Web Vitals (75e percentile)

| Metric | Good     | Needs improvement | Poor    |
| ------ | -------- | ----------------- | ------- |
| LCP    | <= 2.5s  | 2.5-4s            | > 4s    |
| INP    | <= 200ms | 200-500ms         | > 500ms |
| CLS    | <= 0.1   | 0.1-0.25          | > 0.25  |

Source : [web.dev/articles/vitals](https://web.dev/articles/vitals)

## Regles

### 7.1 — `next/image` partout (pas de `<img>` brut)

- **Methode** : grep
- **Pattern** :
  ```
  rg -n '<img ' src/components/ src/app/
  ```
- **Attendu** : `<Image />` de `next/image` (lazy + WebP + sizing automatique).
  Exception possible : photos terrain dynamiques avec signed URL si traitement specifique.
- **Signal WARN** : `<img>` natif -> pas d'optimisation, layout shift probable.
- **Source** : [Next.js — Image component](https://nextjs.org/docs/app/api-reference/components/image)

### 7.2 — `next/font` pour fonts auto-host

- **Methode** : grep
- **Pattern** :
  ```
  rg -n "from ['\"]next/font" src/app/
  rg -n "fonts.googleapis|@font-face" src/app/ src/styles/ public/
  ```
- **Attendu** : fonts charges via `next/font/google` ou `next/font/local`
  (CSS inline, font-display swap, pas de FOIT).
- **Signal WARN** : `<link href="https://fonts.googleapis.com">` ou
  `@font-face` manuel -> CLS + requete externe bloquante.
- **Source** : [Next.js — Font Module](https://nextjs.org/docs/app/api-reference/components/font)

### 7.3 — LCP element identifie sur pages cles

- **Methode** : jugement
- **Cibles** : `/projets`, `/projets/[id]`
- **Attendu** : element principal (titre + premiere row du tableau projets,
  ou en-tete projet) sans dependance reseau differee. Pas d'image LCP differee.
- **Signal WARN** : LCP element est un placeholder skeleton qui reste affiche
  longtemps faute de fetch parallelise.
- **Source** : [web.dev — LCP](https://web.dev/articles/lcp)

### 7.4 — CLS : skeletons avec meme structure que contenu final

- **Methode** : Read + jugement
- **Pattern** :
  ```
  rg -n "Skeleton|animate-pulse" src/components/ src/app/
  ```
- **Attendu** : skeletons LUT/J&T/Robinetterie ont meme `h-9` en-tete + meme
  taille corps que le tableur final (cf. `.claude/rules/page-layout.md`).
- **Signal WARN** : skeleton hauteur differente du contenu -> CLS au remplacement.
- **Source** : `.claude/rules/page-layout.md` + [web.dev — CLS](https://web.dev/articles/cls)

### 7.5 — INP : interactions tableur < 200ms

- **Methode** : jugement (mesure manuelle)
- **Cibles** : keystroke Univer, click bouton "ajouter ligne", filtre vue J&T
- **Attendu** : long task (> 50ms) absente sur main thread pendant interaction.
- **Signal WARN** : interactivite > 200ms -> INP poor.
- **Mesure recommandee** : Performance panel DevTools, "Long tasks" overlay.
- **Source** : [web.dev — INP](https://web.dev/articles/inp)

### 7.6 — `useReportWebVitals` pour collecter en prod

- **Methode** : grep
- **Pattern** :
  ```
  rg -n "useReportWebVitals" src/app/
  ```
- **Attendu** : hook present (au moins log console en dev) pour mesurer en
  field data, pas juste lab data Lighthouse.
- **Signal WARN** : pas de hook -> aucune visibilite Web Vitals reels en prod.
- **Source** : [Next.js — useReportWebVitals](https://nextjs.org/docs/app/api-reference/functions/use-report-web-vitals)

### 7.7 — `<Script>` pour scripts tiers

- **Methode** : grep
- **Pattern** :
  ```
  rg -n "<script " src/app/ src/components/
  ```
- **Attendu** : scripts tiers via `next/script` avec strategie `afterInteractive`
  ou `lazyOnload`.
- **Signal WARN** : `<script>` brut bloquant.
- **Source** : [Next.js — Script component](https://nextjs.org/docs/app/guides/scripts)

### 7.8 — Lighthouse / unlighthouse (mesure `--measure`)

- **Methode** : commande suggeree
- **Action si `--measure`** : afficher la commande
  ```
  npm run build && npm run start &
  npx unlighthouse --site http://localhost:3000
  ```
  Ne PAS executer automatiquement (requiert serveur lance + navigateur headless).
- **Source** : [Next.js — Core Web Vitals (Lighthouse)](https://nextjs.org/docs/app/guides/production-checklist#core-web-vitals)
