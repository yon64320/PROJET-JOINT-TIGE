# Section 9 — Erreurs & observabilité

**Niveau** : MINOR
**Cibles** : `src/app/api/**/*.ts`

## Règles

### 9.1 — Format erreur uniforme

- **Méthode** : grep
- **Pattern** :
  ```
  rg -n 'NextResponse\.json' src/app/api/ | rg -v 'error.*:'
  ```
- **Attendu** : toute réponse non-OK utilise `{ error: "<message clair>" }` ou
  `{ error, details }` (pour erreurs de validation Zod).
- **Signal WARN** : réponse d'erreur sous forme de string brut, ou champ `message`
  au lieu de `error` → cliente doit gérer plusieurs formats.

### 9.2 — Codes HTTP corrects

- **Méthode** : grep + jugement
- **Pattern** :
  ```
  rg -n 'status:\s*\d+' src/app/api/
  ```
- **Attendu** :
  - `400` validation Zod / payload invalide
  - `401` non authentifié (`!user`)
  - `403` authentifié mais pas le droit (owner_id mismatch)
  - `404` ressource introuvable
  - `413` payload trop gros (upload)
  - `500` erreur serveur (catch d'imprévu, erreur DB)
- **Signal WARN** :
  - `400` pour non-auth (devrait être 401)
  - `500` pour validation (devrait être 400)
  - `403` pour ressource inexistante (devrait être 404 — sauf info-leak intentionnel)

### 9.3 — Pas de leak d'info interne

- **Méthode** : grep
- **Pattern** :
  ```
  rg -n 'error\.message|error\.stack|err\.message' src/app/api/
  ```
- **Attendu** : `error.message` envoyé au client UNIQUEMENT pour erreurs
  contrôlées (validation, métier). Pour 500, message générique côté client +
  détail loggé côté serveur.
- **Signal WARN** : `NextResponse.json({ error: error.message }, { status: 500 })`
  pour une erreur DB brute → leak structure de table, requête SQL, contraintes PG.
- **Fix** :
  ```ts
  catch (e) {
    console.error("[POST /api/foo]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
  ```

### 9.4 — `console.error` pour 500

- **Méthode** : grep
- **Pattern** :
  ```
  rg -n 'status:\s*500' src/app/api/ -B 3 | rg -B 3 'console\.(error|warn)'
  ```
- **Attendu** : toute réponse 500 est précédée d'un `console.error()` avec
  contexte (route, payload sanitisé) → visible dans les logs Vercel/Supabase.
- **Signal WARN** : 500 sans log → debug impossible en prod.

### 9.5 — Pas de try/catch sur safeParse

- **Méthode** : grep
- **Pattern** :
  ```
  rg -n 'safeParse' src/app/api/ -B 1 -A 1 | rg -B 1 -A 1 'try\s*{'
  ```
- **Attendu** : 0 résultat. `safeParse` ne throw jamais, le `try/catch` est inutile
  et masque les vraies erreurs.
- **Signal FAIL** : `try { ... safeParse ... } catch` → anti-pattern, retirer le try.

### 9.6 — Try/catch ciblé

- **Méthode** : jugement
- **Cibles** : routes avec `try { ... } catch` enveloppant tout le handler
- **Attendu** : `try/catch` autour de l'opération qui peut throw (parse JSON externe,
  appel API tiers), pas autour de la totalité de la route.
- **Signal WARN** : `try { /* tout le handler */ } catch (e) { return 500 }` →
  attrape les erreurs prévisibles (auth, validation) qui devraient être 401/400,
  rend les erreurs de logique invisibles.
