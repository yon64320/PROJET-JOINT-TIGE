---
globs: "src/app/**/page.tsx"
---

# Layout des pages

## Pages tableur (LUT, J&T, Robinetterie)

Structure obligatoire — une seule ligne d'en-tête, hauteur maximale pour le tableur :

```tsx
<main className="flex flex-col h-screen">
  {/* En-tête single-line — ~32px */}
  <div className="flex items-center gap-3 px-4 py-1.5 border-b border-slate-200 bg-white">
    {/* 1. Logo EMIS */}
    <a href="/projets" className="flex items-center gap-2 shrink-0">
      <div className="w-6 h-6 bg-mcm-mustard rounded flex items-center justify-center">
        <span className="text-white font-bold text-xs">E</span>
      </div>
      <span className="text-xs font-semibold text-mcm-charcoal hidden sm:inline">EMIS</span>
    </a>
    {/* 2. Séparateur */}
    <div className="w-px h-4 bg-slate-200" />
    {/* 3. Lien retour projet (flèche + nom) */}
    {/* 4. Séparateur */}
    {/* 5. Titre page (text-sm font-semibold) */}
    {/* 6. Badge compteur */}
  </div>

  {/* Contenu pleine hauteur */}
  <div className="flex-1 min-h-0">
    <Sheet ... />
  </div>
</main>
```

Pas de navbar globale — le layout.tsx ne contient aucun `<nav>`. Chaque page intègre le branding EMIS dans son propre en-tête.

## Palette couleurs par section

| Section      | Badge bg          | Badge text         |
| ------------ | ----------------- | ------------------ |
| LUT          | `bg-blue-100`     | `text-blue-700`    |
| J&T          | `bg-emerald-100`  | `text-emerald-700` |
| Robinetterie | `#F5E0D8` (style) | `#C2572A` (style)  |
| Terrain      | `bg-amber-100`    | `text-amber-700`   |

Quand une nouvelle section est ajoutée (Gammes, Levage, Planning), choisir une couleur distincte et l'ajouter ici.

## Pages terrain (mobile-first, PWA offline)

Structure différente des pages tableur — optimisée pour mobile avec gants :

- **Touch target minimum** : 56px height
- **Font body** : 18px min, valeurs numériques : 24px
- **Layout** : `TerrainLayout` (header compact + OnlineBadge + nav retour)
- **Routes** : tout sous `/terrain/` — UI séparée du desktop
- **Données** : IndexedDB via Dexie, mutations en file d'attente, sync au retour réseau

## Pages non-tableur (liste projets, hub, import)

- Container : `max-w-5xl mx-auto px-6 py-10`
- Logo EMIS plus grand : `w-8 h-8` avec texte complet "EMIS | Préparation d'arrêts"
- Animations : `animate-fade-in`, `animate-slide-in`
- Pas de `h-screen` — scroll naturel
