"use client";

interface Props {
  item: string;
  unite: string | null;
  flangeCount: number;
  completedCount: number;
  onClick: () => void;
}

export function EquipmentCard({ item, unite, flangeCount, completedCount, onClick }: Props) {
  const progress = flangeCount > 0 ? (completedCount / flangeCount) * 100 : 0;

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 bg-white rounded-xl border border-mcm-warm-gray-border
                 active:bg-mcm-warm-gray-bg transition-colors min-h-[72px]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-mcm-charcoal truncate">{item}</h3>
          {unite && <p className="text-sm text-mcm-warm-gray">{unite}</p>}
        </div>
        <div className="text-right shrink-0">
          <span className="text-2xl font-bold text-mcm-charcoal">
            {completedCount}/{flangeCount}
          </span>
          <p className="text-xs text-mcm-warm-gray">brides</p>
        </div>
      </div>
      {/* Progress bar */}
      <div className="mt-3 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${progress}%`,
            backgroundColor: progress === 100 ? "#2A7D6E" : "#C28B2D",
          }}
        />
      </div>
    </button>
  );
}
