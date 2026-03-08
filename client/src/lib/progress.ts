import type { Unit } from "@/types/curriculum";

const STORAGE_KEY = "llp_progress_v3";
const OLD_STORAGE_KEY = "llp_progress_v2";

export function pairKey(sourceCode: string, targetCode: string): string {
  return `${sourceCode}:${targetCode}`;
}

/**
 * Progress shape: pair -> proficiencyId -> sectionId -> completedUnitIds[]
 */
export type ProgressState = {
  [pair: string]: {
    [proficiencyId: string]: {
      [sectionId: string]: {
        completedUnitIds: string[];
      };
    };
  };
};

function migrateV2(): ProgressState {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(OLD_STORAGE_KEY);
    if (!raw) return {};

    // v2 shape: pair -> categoryId -> { completedLevels: number[] }
    // We can't perfectly map old numeric level IDs to new string unit IDs,
    // so we drop old progress on migration. Users start fresh.
    window.localStorage.removeItem(OLD_STORAGE_KEY);
    return {};
  } catch {
    return {};
  }
}

export function loadProgress(): ProgressState {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ProgressState;
  } catch {
    /* ignore corrupt data */
  }

  const migrated = migrateV2();
  if (Object.keys(migrated).length > 0) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
  }
  return migrated;
}

export function saveProgress(progress: ProgressState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function getCompletedUnits(
  progress: ProgressState,
  pair: string,
  proficiencyId: string,
  sectionId: string
): string[] {
  return progress?.[pair]?.[proficiencyId]?.[sectionId]?.completedUnitIds ?? [];
}

export function markUnitCompleted(
  progress: ProgressState,
  pair: string,
  proficiencyId: string,
  sectionId: string,
  unitId: string
): ProgressState {
  const pairProgress = progress[pair] ?? {};
  const profProgress = pairProgress[proficiencyId] ?? {};
  const sectionProgress = profProgress[sectionId] ?? { completedUnitIds: [] };

  const nextCompleted = Array.from(
    new Set([...sectionProgress.completedUnitIds, unitId])
  );

  return {
    ...progress,
    [pair]: {
      ...pairProgress,
      [proficiencyId]: {
        ...profProgress,
        [sectionId]: { completedUnitIds: nextCompleted },
      },
    },
  };
}

export function isUnitUnlocked(
  unit: Unit,
  allUnits: Unit[],
  completedUnitIds: string[]
): boolean {
  if (unit.order <= 1) return true;
  const previousUnit = allUnits.find((u) => u.order === unit.order - 1);
  if (!previousUnit) return true;
  return completedUnitIds.includes(previousUnit.id);
}

export function findCurrentUnit(
  units: Unit[],
  completedUnitIds: string[]
): string | null {
  const sorted = [...units].sort((a, b) => a.order - b.order);
  for (const unit of sorted) {
    if (
      !completedUnitIds.includes(unit.id) &&
      isUnitUnlocked(unit, units, completedUnitIds)
    ) {
      return unit.id;
    }
  }
  return null;
}

export function resetProgress(
  progress: ProgressState,
  pair: string,
  proficiencyId?: string,
  sectionId?: string
): ProgressState {
  if (!progress[pair]) return progress;

  if (!proficiencyId) {
    const { [pair]: _removed, ...rest } = progress;
    return rest;
  }

  if (!sectionId) {
    const { [proficiencyId]: _prof, ...remaining } = progress[pair];
    return { ...progress, [pair]: remaining };
  }

  const profProgress = progress[pair][proficiencyId];
  if (!profProgress) return progress;

  const { [sectionId]: _section, ...remainingSections } = profProgress;
  return {
    ...progress,
    [pair]: {
      ...progress[pair],
      [proficiencyId]: remainingSections,
    },
  };
}
