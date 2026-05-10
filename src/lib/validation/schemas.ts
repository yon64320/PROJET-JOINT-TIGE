import { z } from "zod";

/**
 * PATCH ot-items / flanges
 * - Forme `scalar`  : `{ id, field|extra_field, value: scalar }`
 * - Forme `feb`     : `{ id, feb_field, value: any JSON }` — cible une sous-clé
 *   du JSONB `flanges.echaf_feb` (FEB Échafaudage), routée vers la RPC
 *   `merge_echaf_feb`. Permet d'envoyer arrays/objets pour les champs FEB
 *   (`types`, `entreprises`, `hauteurs_planchers_supp`...).
 */
const PatchScalarBodySchema = z
  .strictObject({
    id: z.uuid(),
    field: z.string().optional(),
    extra_field: z.string().optional(),
    value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  })
  .refine((d) => d.field || d.extra_field, {
    message: "field ou extra_field requis",
    path: ["field"],
  });

const PatchFebBodySchema = z.strictObject({
  id: z.uuid(),
  feb_field: z.string().min(1),
  value: z.unknown(),
});

export const PatchBodySchema = z.union([PatchScalarBodySchema, PatchFebBodySchema]);
export type PatchBody = z.infer<typeof PatchBodySchema>;

/**
 * EchafFebSchema — schéma JSONB stocké dans flanges.echaf_feb (FEB Échafaudage).
 * Tous les champs sont optionnels — la FEB se construit progressivement (wizard
 * mobile + tableur desktop). Utilisé pour valider l'objet complet PATCH ainsi
 * que pour typer le décodage côté client.
 */
export const EchafFebSchema = z.object({
  feb_number: z.string().optional(),
  feb_date: z.string().optional(),
  societe_echafaudeur: z.string().optional(),
  types: z.array(z.enum(["interne", "externe", "plein_pied", "suspendu", "roulant"])).default([]),
  options: z.array(z.enum(["bache_ignifugee", "bache_filet", "balisage"])).default([]),
  type_autres: z.string().optional(),
  nb_planchers: z.number().int().min(1).default(1),
  hauteurs_planchers_supp: z.array(z.number()).default([]),
  elevation_depart: z.string().optional(),
  nb_acces: z.number().int().min(1).default(1),
  travaux: z.array(z.string()).default([]),
  travaux_autres: z.string().optional(),
  contraintes: z.array(z.string()).default([]),
  sol_type: z.string().optional(),
  risques: z.string().optional(),
  date_montage: z.string().optional(),
  date_depose: z.string().optional(),
  cmu_classe3: z.boolean().default(true),
  cmu_autre: z.string().optional(),
  descriptif: z.string().optional(),
  prescriptions: z.string().optional(),
  entreprises: z.array(z.string()).default([]),
});
export type EchafFebData = z.infer<typeof EchafFebSchema>;

/** Import — mapping confirmé */
export const ConfirmedMappingSchema = z.strictObject({
  fileType: z.enum(["lut", "jt"]),
  headerRow: z.number().int().min(0).max(50),
  columnMap: z.record(z.string(), z.number().int().min(0)),
  extraColumns: z.array(z.object({ index: z.number().int(), header: z.string() })),
  primaryKeyField: z.string(),
  headers: z.record(z.coerce.string(), z.string()),
});
export type ConfirmedMapping = z.infer<typeof ConfirmedMappingSchema>;

/** MIME types Excel autorisés (comparaison case-insensitive via isAllowedExcelMime) */
const ALLOWED_EXCEL_MIMES_LOWER = new Set([
  "application/vnd.ms-excel.sheet.macroenabled.12",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
]);

export function isAllowedExcelMime(mime: string): boolean {
  return ALLOWED_EXCEL_MIMES_LOWER.has(mime.toLowerCase().trim());
}

export function isExcelExtension(filename: string): boolean {
  return /\.(xlsx|xlsm|xls)$/i.test(filename);
}

/** Fiche template — non-strict pour strip backward-compat des anciennes clés (photoPosition, blockLayouts, …) */
export const FicheTemplateSchema = z.object({
  caracteristiques: z.array(z.string()),
  travaux: z.array(z.string()),
});
export type FicheTemplate = z.infer<typeof FicheTemplateSchema>;

// Les schémas PairFlangesBodySchema / UnpairFlangesBodySchema /
// AutoPairFlangesBodySchema ont été supprimés : l'appariement Robinetterie
// est maintenant implicite via la clé (ot_item_id, num_rob).

/** Create field session — POST /api/terrain/sessions */
export const CreateFieldSessionBodySchema = z.strictObject({
  projectId: z.uuid(),
  name: z.string().min(1),
  otItemIds: z.array(z.uuid()).min(1),
  selectedFields: z.array(z.string()).nullish(),
});
export type CreateFieldSessionBody = z.infer<typeof CreateFieldSessionBodySchema>;

/** Generate fiches rob PDF — POST /api/pdf/fiches-rob */
export const GenerateFichesRobBodySchema = z.strictObject({
  projectId: z.uuid(),
  flangeIds: z.array(z.uuid()).min(1),
});
export type GenerateFichesRobBody = z.infer<typeof GenerateFichesRobBodySchema>;

/**
 * Sync terrain mutation — accepte 4 formes :
 *   - update (nouveau format avec discriminant)
 *   - create (insertion bride hors-ligne, flangeId = `temp_<uuid>`)
 *   - delete (suppression bride existante)
 *   - legacy (sans `type`) — anciennes mutations persistées en IndexedDB
 *     avant l'introduction du discriminant. Traitées comme `update` côté
 *     serveur.
 */
const ScalarValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const UpdateMutationSchema = z.strictObject({
  type: z.literal("update"),
  flangeId: z.uuid(),
  field: z.string().min(1),
  value: ScalarValueSchema,
  timestamp: z.string(),
});

/**
 * Mutation FEB — cible une sous-clé du JSONB `flanges.echaf_feb`. Permet
 * d'envoyer arrays/objets en plus des scalaires (pour les champs `types`,
 * `entreprises`, `hauteurs_planchers_supp`...).
 */
export const UpdateFebMutationSchema = z.strictObject({
  type: z.literal("update_feb"),
  flangeId: z.uuid(),
  febField: z.string().min(1),
  value: z.unknown(),
  timestamp: z.string(),
});

export const CreateMutationSchema = z.strictObject({
  type: z.literal("create"),
  flangeId: z.string().regex(/^temp_/, "tempId must start with 'temp_'"),
  otItemId: z.uuid(),
  initialFields: z.record(z.string(), ScalarValueSchema),
  timestamp: z.string(),
});

export const DeleteMutationSchema = z.strictObject({
  type: z.literal("delete"),
  flangeId: z.uuid(),
  timestamp: z.string(),
});

export const LegacyFieldMutationSchema = z.strictObject({
  flangeId: z.uuid(),
  field: z.string().min(1),
  value: ScalarValueSchema,
  timestamp: z.string(),
});
export type LegacyFieldMutation = z.infer<typeof LegacyFieldMutationSchema>;

/**
 * Union exhaustive — Zod discriminatedUnion ne gère pas un membre sans
 * discriminant, donc on passe par z.union (un peu moins performant mais
 * couvre la rétro-compat legacy).
 */
export const SyncMutationSchema = z.union([
  UpdateMutationSchema,
  UpdateFebMutationSchema,
  CreateMutationSchema,
  DeleteMutationSchema,
  LegacyFieldMutationSchema,
]);
export type SyncMutation = z.infer<typeof SyncMutationSchema>;

/** Sync terrain body */
export const SyncTerrainBodySchema = z.strictObject({
  sessionId: z.uuid(),
  mutations: z.array(SyncMutationSchema),
});
export type SyncTerrainBody = z.infer<typeof SyncTerrainBodySchema>;

/** Création d'une bride — POST /api/flanges */
export const CreateFlangeBodySchema = z.strictObject({
  projectId: z.uuid(),
  otItemId: z.uuid(),
  fields: z.record(z.string(), ScalarValueSchema).default({}),
});
export type CreateFlangeBody = z.infer<typeof CreateFlangeBodySchema>;

/** Suppression d'une bride — DELETE /api/flanges */
export const DeleteFlangeBodySchema = z.strictObject({
  flangeId: z.uuid(),
});
export type DeleteFlangeBody = z.infer<typeof DeleteFlangeBodySchema>;

/** Gammes → LUT — confirm body (mapping + sélection corps EMIS) */
export const GammesMappingSchema = z.strictObject({
  sheetName: z.string().min(1),
  headerRowIdx: z.number().int().min(0).max(100),
  itemColIdx: z.number().int().min(0),
  corpsColIdx: z.number().int().min(0),
  titreColIdx: z.number().int().min(0).nullable(),
});
export type GammesMapping = z.infer<typeof GammesMappingSchema>;

/**
 * Gammes confirm — deux variantes mutuellement exclusives :
 *  - `projectId` : projet existant (mode build si vide, mode export sinon)
 *  - `projectName + client` : création d'un nouveau projet (mode build forcé)
 */
export const GammesConfirmBodySchema = z
  .strictObject({
    projectId: z.uuid().optional(),
    projectName: z.string().min(1).max(100).optional(),
    client: z.string().min(1).max(100).optional(),
    mapping: GammesMappingSchema,
    corpsEmis: z.array(z.string().min(1)).min(1),
  })
  .refine(
    (d) =>
      (d.projectId && !d.projectName && !d.client) || (!d.projectId && d.projectName && d.client),
    { message: "Fournir soit projectId, soit (projectName + client)" },
  );
export type GammesConfirmBody = z.infer<typeof GammesConfirmBodySchema>;
