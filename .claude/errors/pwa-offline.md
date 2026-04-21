# Erreurs — PWA / Offline (Dexie, Service Worker)

## navigator.serviceWorker.ready hang forever

- **Symptôme** : L'app se bloque indéfiniment en attendant le Service Worker. Aucune erreur visible
- **Cause racine** : `navigator.serviceWorker.ready` ne résout jamais si aucun SW n'est enregistré (ex: dev sans SW, ou navigateur sans support)
- **Fix** : Vérifier `sw?.controller` avant d'attendre `.ready`. Ajouter un timeout ou un fallback
- **Prévention** : Piège documenté dans le skill terrain-offline
- **Date** : 2026-03

## Mutations non-idempotentes

- **Symptôme** : Données dupliquées après sync (ex: une bride apparaît 2 fois après re-sync)
- **Cause racine** : Les mutations offline utilisent INSERT au lieu d'UPSERT. Si le sync est relancé (réseau instable), les mêmes mutations sont re-exécutées
- **Fix** : Utiliser UPSERT (ON CONFLICT) pour toutes les mutations offline
- **Prévention** : Skill terrain-offline — "Les mutations offline doivent être idempotentes"
- **Date** : 2026-03

## Upload PDF sans contentType

- **Symptôme** : Le PDF uploadé via Supabase Storage est servi comme `application/octet-stream`, le navigateur télécharge au lieu d'afficher
- **Cause racine** : L'upload Storage ne spécifie pas `contentType: "application/pdf"`
- **Fix** : Passer `contentType: "application/pdf"` dans les options d'upload
- **Prévention** : Skill terrain-offline — "Ne pas oublier contentType sur les uploads Storage"
- **Date** : 2026-03

## Regex SW matcher testé contre l'URL complète → cache terrain inopérant

- **Symptôme** : Les pages `/terrain/*` ne sont pas cachées par le Service Worker. Offline → échec réseau au lieu de servir le cache
- **Cause racine** : Le matcher Serwist `matcher: /^\/terrain(\/.*)?$/` est testé contre l'URL **complète** (`http://localhost:3000/terrain/abc`), pas le pathname. Le `^\/terrain` ne matche jamais
- **Fix** : Callback qui teste le pathname : `matcher: ({ url }: { url: URL }) => url.pathname.startsWith("/terrain")`
- **Prévention** : Dans Serwist, toujours utiliser un callback `({ url }) => ...` plutôt qu'un regex. Les regex sont testés contre `url.href`, pas `url.pathname`
- **Date** : 2026-04-21

## Middleware auth bloque les pages terrain hors-ligne

- **Symptôme** : Navigation vers `/terrain/*` en mode offline redirige vers `/login`
- **Cause racine** : Le middleware appelle `supabase.auth.getUser()` (appel réseau). Hors-ligne → échec → `user = null` → redirect `/login`. Routes `/terrain` absentes des routes publiques
- **Fix** : Ajouter `pathname.startsWith("/terrain")` aux routes publiques du middleware. Les API routes `/api/terrain/*` gardent leur auth Bearer
- **Prévention** : Toute page conçue pour fonctionner offline doit être dans les routes publiques du middleware
- **Date** : 2026-04-21
