import { useEffect, useMemo, useState } from "react";
import { getCurriculum } from "@/lib/api";
import {
  getCompletedUnits,
  loadProgress,
  markUnitCompleted,
  pairKey,
  saveProgress,
  isUnitUnlocked,
  findCurrentUnit,
  type ProgressState,
} from "@/lib/progress";
import type {
  CurriculumPayload,
  ProficiencyLevel,
  Section,
  Unit,
} from "@/types/curriculum";
import { usePreferences } from "@/contexts/UserPreferencesContext";
import { TopNav } from "@/components/TopNav";
import { LevelPath, type LevelPathItem } from "@/components/game/LevelPath";
import { LevelPlayer, type SelectedUnit } from "@/components/game/LevelPlayer";
import { ProgressBar } from "@/components/game/ProgressBar";
import { Button } from "@/components/ui/button";

export function HomePage() {
  const { sourceCode, targetCode, sourceName, targetName } = usePreferences();

  const [content, setContent] = useState<CurriculumPayload | null>(null);
  const [activeProficiencyId, setActiveProficiencyId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<SelectedUnit | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress());

  const activePair = sourceCode && targetCode ? pairKey(sourceCode, targetCode) : "";
  const curriculum = content?.curriculum;
  const proficiencyLevels = curriculum?.proficiencyLevels ?? [];

  const activeProficiency = useMemo(() => {
    if (!activeProficiencyId) return proficiencyLevels[0] ?? null;
    return proficiencyLevels.find((p) => p.id === activeProficiencyId) ?? proficiencyLevels[0] ?? null;
  }, [proficiencyLevels, activeProficiencyId]);

  const activeSection = useMemo(() => {
    if (!activeProficiency) return null;
    if (!activeSectionId) return activeProficiency.sections[0] ?? null;
    return activeProficiency.sections.find((s) => s.id === activeSectionId) ?? activeProficiency.sections[0] ?? null;
  }, [activeProficiency, activeSectionId]);

  const completedUnitIds = activeSection && activeProficiency
    ? getCompletedUnits(progress, activePair, activeProficiency.id, activeSection.id)
    : [];

  const currentUnitId = activeSection
    ? findCurrentUnit(activeSection.units, completedUnitIds)
    : null;

  const selectedProficiency = useMemo(() => {
    if (!curriculum || !selectedUnit) return null;
    return curriculum.proficiencyLevels.find((p) => p.id === selectedUnit.proficiencyId) ?? null;
  }, [curriculum, selectedUnit]);

  const selectedSectionObj = useMemo(() => {
    if (!selectedProficiency || !selectedUnit) return null;
    return selectedProficiency.sections.find((s) => s.id === selectedUnit.sectionId) ?? null;
  }, [selectedProficiency, selectedUnit]);

  const selectedUnitData = useMemo(() => {
    if (!selectedSectionObj || !selectedUnit) return null;
    return selectedSectionObj.units.find((u) => u.id === selectedUnit.unitId) ?? null;
  }, [selectedSectionObj, selectedUnit]);

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  useEffect(() => {
    if (!sourceCode || !targetCode) {
      setContent(null);
      return;
    }
    setIsLoading(true);
    getCurriculum(sourceCode, targetCode)
      .then((response) => {
        setContent(response.data);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load curriculum");
        setContent(null);
      })
      .finally(() => setIsLoading(false));
  }, [sourceCode, targetCode]);

  useEffect(() => {
    setSelectedUnit(null);
    setActiveProficiencyId(null);
    setActiveSectionId(null);
  }, [sourceCode, targetCode]);

  const handleSelectUnit = (unit: Unit) => {
    if (!activeProficiency || !activeSection) return;
    if (!isUnitUnlocked(unit, activeSection.units, completedUnitIds)) return;
    setSelectedUnit({
      proficiencyId: activeProficiency.id,
      sectionId: activeSection.id,
      unitId: unit.id,
    });
  };

  const handleBack = () => setSelectedUnit(null);

  const handleCompleteUnit = () => {
    if (!selectedUnit) return;
    const updated = markUnitCompleted(
      progress,
      activePair,
      selectedUnit.proficiencyId,
      selectedUnit.sectionId,
      selectedUnit.unitId
    );
    setProgress(updated);
    setSelectedUnit(null);
  };

  const handleResetProgress = () => {
    if (!activePair) return;
    setProgress((prev) => ({ ...prev, [activePair]: {} }));
    setSelectedUnit(null);
  };

  const pathItems: LevelPathItem[] = useMemo(() => {
    if (!activeSection) return [];
    return activeSection.units.map((unit) => {
      const isCompleted = completedUnitIds.includes(unit.id);
      const isCurrent = unit.id === currentUnitId;
      return {
        unit,
        status: isCompleted
          ? ("completed" as const)
          : isCurrent
            ? ("current" as const)
            : ("locked" as const),
        topicLabel: unit.topic,
        disabled: !isUnitUnlocked(unit, activeSection.units, completedUnitIds),
      };
    });
  }, [activeSection, completedUnitIds, currentUnitId]);

  const isInExerciseView = selectedUnit && selectedProficiency && selectedSectionObj && selectedUnitData;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ed,transparent_55%),radial-gradient(circle_at_10%_80%,#e0f2fe,transparent_45%),radial-gradient(circle_at_90%_20%,#fae8ff,transparent_45%)] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-10">
        <TopNav />

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-slate-100 px-4 py-1.5 text-sm font-medium text-slate-700">
              {sourceName || sourceCode}
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <div className="rounded-full bg-amber-100 px-4 py-1.5 text-sm font-medium text-amber-700">
              {targetName || targetCode}
            </div>
          </div>
          <p className="text-xs text-slate-400">Change language in Settings</p>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-8 text-center text-sm text-slate-500">
            Loading curriculum...
          </div>
        )}

        {!isLoading && !curriculum && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-sm text-slate-500">
            No curriculum loaded. Ask an admin to add a curriculum for this language pair.
          </div>
        )}

        {/* Exercise view */}
        {isInExerciseView && (
          <LevelPlayer
            proficiency={selectedProficiency}
            section={selectedSectionObj}
            unit={selectedUnitData}
            isCompleted={completedUnitIds.includes(selectedUnitData.id)}
            onCompleteLevel={handleCompleteUnit}
            onBack={handleBack}
          />
        )}

        {/* Navigation view */}
        {curriculum && activeProficiency && !isInExerciseView && (
          <>
            {/* Proficiency level tabs */}
            {proficiencyLevels.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {proficiencyLevels.map((pl) => (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={() => {
                      setActiveProficiencyId(pl.id);
                      setActiveSectionId(null);
                      setSelectedUnit(null);
                    }}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                      activeProficiency.id === pl.id
                        ? "bg-slate-900 text-white shadow-sm"
                        : "border border-slate-200 bg-white/80 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {pl.name}
                    <span className="ml-1.5 text-xs opacity-60">({pl.cefrLevel})</span>
                  </button>
                ))}
              </div>
            )}

            {/* Section tabs */}
            {activeProficiency.sections.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {activeProficiency.sections.map((sec) => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => {
                      setActiveSectionId(sec.id);
                      setSelectedUnit(null);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      activeSection?.id === sec.id
                        ? "bg-blue-600 text-white shadow-sm"
                        : "border border-slate-200 bg-white/80 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    S{sec.order}: {sec.title}
                  </button>
                ))}
              </div>
            )}

            {/* Active section info */}
            {activeSection && (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm rise-in">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {activeSection.title}
                  </h3>
                  <p className="text-sm text-slate-500">{activeSection.description}</p>
                  {activeSection.topicsCovered.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {activeSection.topicsCovered.map((topic) => (
                        <span
                          key={topic}
                          className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm">
                    <p className="font-semibold text-slate-900">
                      {completedUnitIds.length}/{activeSection.units.length}
                    </p>
                    <p className="text-xs text-slate-500">units completed</p>
                  </div>
                  <div className="w-24">
                    <ProgressBar
                      value={completedUnitIds.length}
                      max={activeSection.units.length}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Unit path */}
            {activeSection && activeSection.units.length > 0 && (
              <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur">
                <LevelPath
                  items={pathItems}
                  selectedUnitId={null}
                  onSelectUnit={handleSelectUnit}
                />
                {currentUnitId && (
                  <p className="pb-6 text-center text-sm text-slate-500">
                    Tap the next unit to start learning
                  </p>
                )}
              </div>
            )}

            {activeSection && activeSection.units.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-sm text-slate-500">
                No units available in this section yet. Content is being prepared.
              </div>
            )}

            <div className="flex items-center justify-center">
              <Button variant="ghost" size="sm" onClick={handleResetProgress}>
                Reset progress
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
