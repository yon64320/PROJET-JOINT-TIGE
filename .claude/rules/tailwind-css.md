---
globs: "**/*.css"
---

# Tailwind CSS v4 — pièges connus

## @keyframes hors du bloc @theme

Les `@keyframes` imbriqués dans `@theme` cassent le parsing CSS complet → **page blanche** silencieuse.

```css
/* FAUX — casse tout silencieusement */
@theme {
  --animate-fade-in: fade-in 0.4s ease-out;

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
}

/* CORRECT — keyframes à la racine */
@theme {
  --animate-fade-in: fade-in 0.4s ease-out;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
```
