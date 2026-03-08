import type { Section, Unit } from "@/types/curriculum";
import { LevelCard } from "@/components/game/LevelCard";
import { ProgressBar } from "@/components/game/ProgressBar";

type CategorySectionProps = {
  section: Section;
  completedUnitIds: string[];
  selectedUnitId: string | null;
  onSelectUnit: (sectionId: string, unit: Unit) => void;
  isUnitUnlocked: (unit: Unit, units: Unit[], completedIds: string[]) => boolean;
};

export function CategorySection({
  section,
  completedUnitIds,
  selectedUnitId,
  onSelectUnit,
  isUnitUnlocked,
}: CategorySectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur rise-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Section {section.order}
          </p>
          <h3 className="text-lg font-semibold text-slate-900">
            {section.title}
          </h3>
          <p className="text-sm text-slate-500">{section.description}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Progress
          </p>
          <p className="text-base font-semibold text-slate-900">
            {completedUnitIds.length}/{section.units.length} units
          </p>
        </div>
      </div>

      <div className="mt-4">
        <ProgressBar
          value={completedUnitIds.length}
          max={section.units.length}
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {section.units.map((unit) => {
          const isCompleted = completedUnitIds.includes(unit.id);
          const unlocked = isUnitUnlocked(unit, section.units, completedUnitIds);
          const isActive = selectedUnitId === unit.id;

          return (
            <LevelCard
              key={unit.id}
              unit={unit}
              topicLabel={unit.topic}
              isLocked={!unlocked}
              isCompleted={isCompleted}
              isActive={isActive}
              onSelect={() => onSelectUnit(section.id, unit)}
            />
          );
        })}
      </div>
    </section>
  );
}
