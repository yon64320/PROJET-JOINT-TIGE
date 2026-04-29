import { z } from "zod";

/** PATCH ot-items / flanges */
export const PatchBodySchema = z
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
export type PatchBody = z.infer<typeof PatchBodySchema>;

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
