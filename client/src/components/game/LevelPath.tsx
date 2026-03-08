import type { Unit } from "@/types/curriculum";
import { LevelNode, type LevelStatus } from "./LevelNode";

export type LevelPathItem = {
  unit: Unit;
  status: LevelStatus;
  topicLabel: string;
  disabled: boolean;
};

type LevelPathProps = {
  items: LevelPathItem[];
  selectedUnitId: string | null;
  onSelectUnit: (unit: Unit) => void;
};

const OFFSET_CLASSES = [
  "",
  "translate-x-12 sm:translate-x-16",
  "",
  "-translate-x-12 sm:-translate-x-16",
];

function getOffsetClass(index: number): string {
  return OFFSET_CLASSES[index % 4];
}

export function LevelPath({
  items,
  selectedUnitId,
  onSelectUnit,
}: LevelPathProps) {
  const completedCount = items.filter((i) => i.status === "completed").length;
  const progressPercent =
    items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <div className="relative mx-auto w-full max-w-xs py-8">
      <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="w-full rounded-full bg-gradient-to-b from-emerald-400 to-emerald-300 transition-all duration-700 ease-out"
          style={{ height: `${progressPercent}%` }}
        />
      </div>

      <div className="relative flex flex-col items-center gap-10">
        {items.map((item, index) => (
          <div
            key={item.unit.id}
            className={`transition-transform duration-500 ease-out ${getOffsetClass(index)}`}
          >
            <LevelNode
              unit={item.unit}
              status={item.status}
              topicLabel={item.topicLabel}
              isSelected={item.unit.id === selectedUnitId}
              disabled={item.disabled}
              onClick={() => onSelectUnit(item.unit)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
