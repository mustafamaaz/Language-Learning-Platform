import type { Unit } from "@/types/curriculum";

export type LevelStatus = "completed" | "current" | "locked";

type LevelNodeProps = {
  unit: Unit;
  status: LevelStatus;
  topicLabel: string;
  isSelected: boolean;
  disabled: boolean;
  onClick: () => void;
};

const circleStyles: Record<LevelStatus, string> = {
  completed:
    "border-emerald-300 bg-emerald-500 text-white shadow-emerald-200/60",
  current: "border-blue-300 bg-blue-500 text-white shadow-blue-200/60",
  locked: "border-slate-300 bg-slate-100 text-slate-400 shadow-none",
};

const labelStyles: Record<LevelStatus, { title: string; topic: string }> = {
  completed: { title: "text-slate-700", topic: "text-slate-400" },
  current: { title: "text-slate-800", topic: "text-slate-500" },
  locked: { title: "text-slate-400", topic: "text-slate-300" },
};

function CheckIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

export function LevelNode({
  unit,
  status,
  topicLabel,
  isSelected,
  disabled,
  onClick,
}: LevelNodeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group flex flex-col items-center gap-1.5 outline-none ${
        disabled ? "cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <div className={status === "current" ? "level-bounce" : ""}>
        <div
          className={`
            relative flex h-14 w-14 items-center justify-center rounded-full
            border-[3px] text-base font-bold shadow-md
            transition-transform duration-200
            ${circleStyles[status]}
            ${!disabled ? "group-hover:scale-110" : ""}
            ${isSelected ? "ring-4 ring-blue-200 ring-offset-2" : ""}
          `}
        >
          {status === "completed" ? (
            <CheckIcon />
          ) : status === "locked" ? (
            <LockIcon />
          ) : (
            <span>{unit.order}</span>
          )}
        </div>
      </div>

      <div className="max-w-[120px] text-center">
        <p className={`truncate text-xs font-semibold ${labelStyles[status].title}`}>
          {unit.title}
        </p>
        <p className={`truncate text-[10px] ${labelStyles[status].topic}`}>
          {topicLabel}
        </p>
      </div>
    </button>
  );
}
