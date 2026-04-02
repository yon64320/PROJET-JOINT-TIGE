/** Shared style utilities for Univer spreadsheet components */

/** Thin border applied to all cells (Excel grey) */
export const THIN_BORDER = { s: 1, cl: { rgb: "#B4B4B4" } };
export const ALL_BORDERS = {
  t: THIN_BORDER,
  r: THIN_BORDER,
  b: THIN_BORDER,
  l: THIN_BORDER,
};

/**
 * Builds a dynamic style key combining a base style with a background color.
 * Deduplicates by caching in the provided styles record.
 */
export function getStyleKey(
  baseStyleName: string | undefined,
  bgColor: string | undefined,
  baseStyles: Record<string, Record<string, unknown>>,
  dynamicStyles: Record<string, Record<string, unknown>>,
): string | undefined {
  if (!bgColor) return baseStyleName;
  const key = `${baseStyleName ?? "default"}_${bgColor}`;
  if (!dynamicStyles[key]) {
    const baseObj = baseStyleName ? { ...(baseStyles[baseStyleName] ?? {}) } : {};
    dynamicStyles[key] = { ...baseObj, bg: { rgb: bgColor }, bd: ALL_BORDERS };
  }
  return key;
}

/** Merges base styles (adding borders) with dynamic styles into a single record */
export function mergeStyles(
  baseStyles: Record<string, Record<string, unknown>>,
  dynamicStyles: Record<string, Record<string, unknown>>,
): Record<string, Record<string, unknown>> {
  const styles: Record<string, Record<string, unknown>> = {};
  for (const [key, val] of Object.entries(baseStyles)) {
    styles[key] = { ...val, bd: ALL_BORDERS };
  }
  for (const [key, val] of Object.entries(dynamicStyles)) {
    styles[key] = val;
  }
  return styles;
}

/** Builds the header style key for a header cell with an Excel color */
export function buildHeaderStyleKey(
  excelColor: string,
  headerBaseStyle: Record<string, unknown>,
  dynamicStyles: Record<string, Record<string, unknown>>,
): string {
  const hdrKey = `hdr_${excelColor}`;
  if (!dynamicStyles[hdrKey]) {
    dynamicStyles[hdrKey] = {
      ...headerBaseStyle,
      bg: { rgb: excelColor },
      bd: ALL_BORDERS,
    };
  }
  return hdrKey;
}
