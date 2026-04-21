import { memo } from "react";

interface RecapRowProps {
  label: string;
  value: string;
  onEdit?: () => void;
}

function RecapRowInner({ label, value, onEdit }: RecapRowProps) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-mcm-warm-gray-border last:border-0">
      <span className="text-sm text-mcm-warm-gray">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-base font-semibold text-mcm-charcoal">{value || "—"}</span>
        {onEdit && (
          <button
            onClick={onEdit}
            className="p-1 -mr-1 text-mcm-warm-gray active:text-mcm-charcoal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export const RecapRow = memo(RecapRowInner);
