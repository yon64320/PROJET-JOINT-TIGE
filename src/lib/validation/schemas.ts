import { z } from "zod";

/** PATCH ot-items / flanges */
export const PatchBodySchema = z
  .object({
    id: z.string().uuid(),
    field: z.string().optional(),
    extra_field: z.string().optional(),
    value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  })
  .refine((d) => d.field || d.extra_field, {
    message: "field ou extra_field requis",
  });

/** Import — mapping confirmé */
export const ConfirmedMappingSchema = z.object({
  fileType: z.enum(["lut", "jt"]),
  headerRow: z.number().int().min(0).max(50),
  columnMap: z.record(z.string(), z.number().int().min(0)),
  extraColumns: z.array(z.object({ index: z.number().int(), header: z.string() })),
  primaryKeyField: z.string(),
  headers: z.record(z.coerce.string(), z.string()),
});

/** MIME types Excel autorisés (comparaison case-insensitive via isAllowedExcelMime) */
const ALLOWED_EXCEL_MIMES_LOWER = new Set([
  "application/vnd.ms-excel.sheet.macroenabled.12",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
]);

export function isAllowedExcelMime(mime: string): boolean {
  return ALLOWED_EXCEL_MIMES_LOWER.has(mime.toLowerCase());
}

/** Fiche template */
export const FicheTemplateSchema = z.object({
  caracteristiques: z.array(z.string()),
  travaux: z.array(z.string()),
  photoPosition: z.enum(["left", "right"]).default("right"),
  blockLayouts: z.any().optional(),
});
