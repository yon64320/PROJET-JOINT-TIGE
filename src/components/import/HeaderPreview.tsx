"use client";

interface HeaderPreviewProps {
  headers: string[];
  previewRows: unknown[][];
  headerRow: number;
}

/** Table read-only des premières lignes de données pour vérification visuelle */
export default function HeaderPreview({ headers, previewRows, headerRow }: HeaderPreviewProps) {
  if (!previewRows || previewRows.length === 0) return null;

  // Limiter à 15 colonnes max pour la lisibilité
  const maxCols = Math.min(headers.length, 15);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium text-mcm-charcoal">Aperçu des données</h3>
        <span className="text-xs text-mcm-warm-gray-light">
          Ligne d&apos;en-tête : {headerRow + 1} — {previewRows.length} premières lignes
        </span>
      </div>
      <div className="overflow-x-auto border border-mcm-warm-gray-border rounded-lg">
        <table className="text-xs w-full">
          <thead>
            <tr className="bg-mcm-warm-gray-bg">
              {headers.slice(0, maxCols).map((h, i) => (
                <th
                  key={i}
                  className="px-2 py-1.5 text-left font-medium text-mcm-warm-gray border-b border-mcm-warm-gray-border whitespace-nowrap"
                >
                  {h || <span className="text-mcm-warm-gray-light">—</span>}
                </th>
              ))}
              {headers.length > maxCols && (
                <th className="px-2 py-1.5 text-left text-mcm-warm-gray-light border-b border-mcm-warm-gray-border">
                  +{headers.length - maxCols} cols
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, rowIdx) => (
              <tr key={rowIdx} className={rowIdx % 2 === 1 ? "bg-mcm-warm-gray-bg/40" : ""}>
                {(row as unknown[]).slice(0, maxCols).map((cell, cellIdx) => (
                  <td
                    key={cellIdx}
                    className="px-2 py-1 text-mcm-charcoal border-b border-mcm-warm-gray-border/50 whitespace-nowrap max-w-[200px] truncate"
                  >
                    {cell != null ? String(cell) : ""}
                  </td>
                ))}
                {headers.length > maxCols && (
                  <td className="px-2 py-1 text-mcm-warm-gray-light border-b border-mcm-warm-gray-border/50">
                    ...
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
