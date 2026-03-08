import type { Unit } from "@/types/curriculum";

type LevelCardProps = {
  unit: Unit;
  topicLabel: string;
  isLocked: boolean;
  isCompleted: boolean;
  isActive: boolean;
  onSelect: () => void;
};

export function LevelCard({
  unit,
  topicLabel,
  isLocked,
  isCompleted,
  isActive,
  onSelect,
}: LevelCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={isLocked}
      className={`group relative flex min-h-[120px] flex-col justify-between rounded-2xl border p-4 text-left transition ${
        isLocked
          ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
          : "border-slate-200 bg-white/90 text-slate-900 shadow-sm hover:-translate-y-1 hover:border-slate-300"
      } ${isActive ? "border-slate-400 shadow-md soft-pulse" : ""}`}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Unit {unit.order}
        </p>
        <h4 className="mt-1 text-sm font-semibold text-slate-900">
          {unit.title}
        </h4>
        <p className="mt-1 text-xs text-slate-500">{topicLabel}</p>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{unit.estimatedMinutes} min</span>
        <span>{unit.pointsValue} pts</span>
      </div>

      {isCompleted ? (
        <span className="absolute right-3 top-3 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
          Completed
        </span>
      ) : null}

      {isLocked ? (
        <span className="absolute right-3 top-3 rounded-full bg-slate-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Locked
        </span>
      ) : null}
    </button>
  );
}
