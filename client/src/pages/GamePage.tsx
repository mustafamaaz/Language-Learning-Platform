import { useEffect, useMemo, useState } from "react";
import {
  getCurriculum,
  listLanguages,
  listCurricula,
} from "@/lib/api";
import {
  getCompletedUnits,
  loadProgress,
  markUnitCompleted,
  pairKey,
  saveProgress,
  isUnitUnlocked,
  type ProgressState,
} from "@/lib/progress";
import type {
  CurriculumPayload,
  CurriculumRecord,
  LanguageInfo,
  LanguagePair,
  Unit,
} from "@/types/curriculum";
import { TopNav } from "@/components/TopNav";
import { LanguagePicker } from "@/components/game/LanguagePicker";
import { CategorySection } from "@/components/game/CategorySection";
import { LevelPlayer, type SelectedUnit } from "@/components/game/LevelPlayer";
import { Button } from "@/components/ui/button";

type Status = {
  type: "success" | "error";
  message: string;
};

export function GamePage() {
  const [languages, setLanguages] = useState<LanguageInfo[]>([]);
  const [pairs, setPairs] = useState<LanguagePair[]>([]);
  const [sourceCode, setSourceCode] = useState("");
  const [targetCode, setTargetCode] = useState("");
  const [content, setContent] = useState<CurriculumPayload | null>(null);
  const [record, setRecord] = useState<CurriculumRecord | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<SelectedUnit | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress());

  const activePair = sourceCode && targetCode ? pairKey(sourceCode, targetCode) : "";

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  const showStatus = (type: Status["type"], message: string) => {
    setStatus({ type, message });
  };

  const loadData = async () => {
    const [langs, curricula] = await Promise.all([
      listLanguages(),
      listCurricula(),
    ]);
    setLanguages(langs);
    setPairs(curricula);

    if (curricula.length === 0) {
      setSourceCode("");
      setTargetCode("");
      return;
    }

    const currentExists = curricula.some(
      (p) => p.source_code === sourceCode && p.target_code === targetCode
    );
    if (!currentExists) {
      setSourceCode(curricula[0].source_code);
      setTargetCode(curricula[0].target_code);
    }
  };

  useEffect(() => {
    loadData().catch((error) => {
      showStatus("error", error instanceof Error ? error.message : "Unknown error");
    });
  }, []);

  useEffect(() => {
    if (!sourceCode || !targetCode) {
      setContent(null);
      setRecord(null);
      return;
    }

    setIsLoading(true);
    getCurriculum(sourceCode, targetCode)
      .then((response) => {
        setRecord(response);
        setContent(response.data);
        setStatus(null);
      })
      .catch((error) => {
        showStatus("error", error instanceof Error ? error.message : "Unknown error");
        setContent(null);
        setRecord(null);
      })
      .finally(() => setIsLoading(false));
  }, [sourceCode, targetCode]);

  useEffect(() => {
    setSelectedUnit(null);
  }, [sourceCode, targetCode]);

  const handleSourceChange = (code: string) => {
    setSourceCode(code);
    const available = pairs.filter((p) => p.source_code === code);
    if (available.length > 0) {
      const stillValid = available.some((p) => p.target_code === targetCode);
      if (!stillValid) setTargetCode(available[0].target_code);
    } else {
      setTargetCode("");
    }
  };

  const curriculum = content?.curriculum;
  const metadata = curriculum?.metadata;

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

  const handleSelectUnit = (sectionId: string, unit: Unit) => {
    if (!curriculum) return;
    for (const pl of curriculum.proficiencyLevels) {
      const section = pl.sections.find((s) => s.id === sectionId);
      if (section) {
        const completedIds = getCompletedUnits(progress, activePair, pl.id, sectionId);
        if (!isUnitUnlocked(unit, section.units, completedIds)) return;
        setSelectedUnit({ proficiencyId: pl.id, sectionId, unitId: unit.id });
        return;
      }
    }
  };

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

    if (selectedSectionObj && selectedUnitData) {
      const index = selectedSectionObj.units.findIndex((u) => u.id === selectedUnitData.id);
      const nextUnit = selectedSectionObj.units[index + 1];
      if (nextUnit) {
        setSelectedUnit({
          proficiencyId: selectedUnit.proficiencyId,
          sectionId: selectedUnit.sectionId,
          unitId: nextUnit.id,
        });
      }
    }
  };

  const handleResetProgress = () => {
    if (!activePair) return;
    setProgress((prev) => ({ ...prev, [activePair]: {} }));
    setSelectedUnit(null);
  };

  const isInExerciseView = selectedUnit && selectedProficiency && selectedSectionObj && selectedUnitData;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ed,transparent_55%),radial-gradient(circle_at_10%_80%,#e0f2fe,transparent_45%),radial-gradient(circle_at_90%_20%,#fae8ff,transparent_45%)] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10">
        <TopNav />

        <section className="shimmer-bg rounded-3xl border border-slate-200 bg-gradient-to-r from-white via-rose-50 to-amber-50 p-6 shadow-lg backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Curriculum
              </p>
              <h2 className="text-2xl font-semibold text-slate-900">
                {curriculum
                  ? `${curriculum.sourceLanguage.name} → ${curriculum.targetLanguage.name}`
                  : "Choose a language pair"}
              </h2>
              <p className="text-sm text-slate-500">
                {curriculum
                  ? `${curriculum.sourceLanguage.nativeName} → ${curriculum.targetLanguage.nativeName}`
                  : ""}
              </p>
            </div>
            {metadata ? (
              <div className="text-right text-xs text-slate-500">
                <p>Version {metadata.version}</p>
                <p>Updated {metadata.lastUpdated}</p>
              </div>
            ) : null}
          </div>

          <div className="mt-5">
            <LanguagePicker
              languages={languages}
              pairs={pairs}
              sourceCode={sourceCode}
              targetCode={targetCode}
              onChangeSource={handleSourceChange}
              onChangeTarget={setTargetCode}
              onRefresh={() =>
                loadData().catch((error) =>
                  showStatus("error", error instanceof Error ? error.message : "Unknown error")
                )
              }
            />
          </div>

          {status ? (
            <div
              className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                status.type === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-600"
                  : "border-emerald-200 bg-emerald-50 text-emerald-600"
              }`}
            >
              {status.message}
            </div>
          ) : null}
        </section>

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-8 text-center text-sm text-slate-500">
            Loading curriculum...
          </div>
        ) : null}

        {!isLoading && !curriculum ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-sm text-slate-500">
            No curriculum loaded. Add a language pair in Playground first.
          </div>
        ) : null}

        {isInExerciseView && (
          <LevelPlayer
            proficiency={selectedProficiency}
            section={selectedSectionObj}
            unit={selectedUnitData}
            isCompleted={
              getCompletedUnits(
                progress,
                activePair,
                selectedUnit.proficiencyId,
                selectedUnit.sectionId
              ).includes(selectedUnitData.id)
            }
            onCompleteLevel={handleCompleteUnit}
            onBack={() => setSelectedUnit(null)}
          />
        )}

        {curriculum && !isInExerciseView ? (
          <div className="flex flex-col gap-8">
            {curriculum.proficiencyLevels.map((pl) => (
              <div key={pl.id}>
                <h2 className="mb-4 text-xl font-bold text-slate-900">
                  {pl.name}
                  <span className="ml-2 text-sm font-normal text-slate-400">({pl.cefrLevel})</span>
                </h2>
                {pl.sections.map((section) => {
                  const completedIds = getCompletedUnits(progress, activePair, pl.id, section.id);
                  return (
                    <CategorySection
                      key={section.id}
                      section={section}
                      completedUnitIds={completedIds}
                      selectedUnitId={selectedUnit?.unitId ?? null}
                      onSelectUnit={handleSelectUnit}
                      isUnitUnlocked={isUnitUnlocked}
                    />
                  );
                })}
              </div>
            ))}

            <div className="flex items-center justify-center">
              <Button variant="outline" size="sm" onClick={handleResetProgress}>
                Reset progress
              </Button>
            </div>

            {record ? (
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-xs text-slate-500">
                <p>Course: {record.source_code} → {record.target_code}</p>
                <p>Last updated {new Date(record.data.curriculum.metadata.lastUpdated).toLocaleDateString()}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
