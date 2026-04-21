# Guide d'extraction de regles verifiables

Comment transformer le contenu d'un SKILL.md ou d'une rule en regles concretes a verifier.

## Categories de regles

### Auto-verifiable (grep/lecture directe)

Regle exprimee en termes de presence/absence de code. Verifiable par Grep ou Read.

Exemples :

- "Touch targets 56px min" → grep `min-h-\[` dans les composants terrain, verifier >= 56
- "Mutations UPSERT" → grep `INSERT` dans les fichiers offline/sync, absence = OK
- "TerrainLayout utilise" → grep `TerrainLayout` dans les pages terrain
- "COALESCE(emis, buta)" → verifier pattern dans les migrations
- "contentType application/pdf" → grep dans les uploads Storage
- "Pas de @keyframes dans @theme" → grep multiline dans globals.css
- "NextResponse.json({ error" → verifier format erreur dans les routes API
- "EDITABLE whitelist" → verifier presence du Set dans les routes PATCH
- "useEffect cleanup" → verifier return () => dans les hooks Univer

### Jugement (analyse semantique)

Regle qui necessite comprehension du code, pas un simple pattern match.

Exemples :

- "Architecture correcte" → les fichiers sont au bon endroit dans l'arborescence
- "Nommage coherent" → colonnes snake_case, suffixes \_emis/\_buta/\_retenu
- "Progressive disclosure" → le skill charge les references a la demande
- "Pas de refactor opportuniste" → seuls les fichiers necessaires sont touches

### Non applicable

Regle qui existe dans le skill mais ne concerne pas les fichiers du diff.

Exemple : la rule db-schema parle de "JSONB extra_columns" mais le diff ne touche que du CSS → ignorer.

## Processus d'extraction

1. Lire le SKILL.md ou la rule en entier
2. Identifier chaque phrase imperative ou pattern documente
3. Classer : auto-verifiable / jugement / non applicable
4. Pour les auto-verifiables : formuler le grep ou la lecture a faire
5. Pour les jugements : formuler la question a se poser en lisant le code
6. Ignorer les non applicables
