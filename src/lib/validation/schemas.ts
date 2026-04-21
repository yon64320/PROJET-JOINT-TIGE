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

/** Pair flanges — POST /api/flanges/pair */
export const PairFlangesBodySchema = z
  .strictObject({
    flangeIdA: z.uuid(),
    flangeIdB: z.uuid(),
    sideA: z.enum(["ADM", "REF"]).optional(),
  })
  .refine((d) => d.flangeIdA !== d.flangeIdB, {
    message: "Impossible d'apparier une bride avec elle-même",
    path: ["flangeIdB"],
  });
export type PairFlangesBody = z.infer<typeof PairFlangesBodySchema>;

/** Unpair flanges — DELETE /api/flanges/pair */
export const UnpairFlangesBodySchema = z.strictObject({
  pairId: z.string().min(1),
});
export type UnpairFlangesBody = z.infer<typeof UnpairFlangesBodySchema>;

/** Auto-pair flanges — POST /api/flanges/pair/auto */
export const AutoPairFlangesBodySchema = z.strictObject({
  projectId: z.uuid(),
});
export type AutoPairFlangesBody = z.infer<typeof AutoPairFlangesBodySchema>;

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

/** Sync terrain mutation — discriminated union (prêt pour extensibilité) */
export const FieldMutationSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("upsert_flange"),
    flangeId: z.uuid(),
    field: z.string().min(1),
    value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
    timestamp: z.string().datetime(),
  }),
]);
export type FieldMutation = z.infer<typeof FieldMutationSchema>;

/**
 * Schéma legacy (sans discriminant `type`) — utilisé par le client terrain actuel.
 * Maintenu pour compat pendant la migration.
 */
export const LegacyFieldMutationSchema = z.strictObject({
  flangeId: z.uuid(),
  field: z.string().min(1),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  timestamp: z.string(),
});
export type LegacyFieldMutation = z.infer<typeof LegacyFieldMutationSchema>;

/** Sync terrain body */
export const SyncTerrainBodySchema = z.strictObject({
  sessionId: z.uuid(),
  mutations: z.array(LegacyFieldMutationSchema),
});
export type SyncTerrainBody = z.infer<typeof SyncTerrainBodySchema>;
