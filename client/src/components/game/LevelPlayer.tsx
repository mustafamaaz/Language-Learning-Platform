import { useCallback, useEffect, useState } from "react";
import type { ProficiencyLevel, Section, Unit } from "@/types/curriculum";
import { Button } from "@/components/ui/button";
import { ExerciseCard } from "@/components/game/ExerciseCard";

export type SelectedUnit = {
  proficiencyId: string;
  sectionId: string;
  unitId: string;
};

type LevelPlayerProps = {
  proficiency: ProficiencyLevel;
  section: Section;
  unit: Unit;
  isCompleted: boolean;
  onCompleteLevel: () => void;
  onBack: () => void;
};

export function LevelPlayer({
  proficiency,
  section,
  unit,
  isCompleted,
  onCompleteLevel,
  onBack,
}: LevelPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedExercises, setCompletedExercises] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    setCurrentIndex(0);

    if (isCompleted && unit) {
      const completedMap = unit.exercises.reduce<Record<string, boolean>>(
        (acc, exercise) => {
          acc[exercise.exerciseId] = true;
          return acc;
        },
        {}
      );
      setCompletedExercises(completedMap);
      return;
    }

    setCompletedExercises({});
  }, [unit?.id, section?.id, proficiency?.id, isCompleted, unit]);

  const totalExercises = unit?.exercises.length ?? 0;
  const currentExercise = unit?.exercises[currentIndex] ?? null;
  const isCurrentCompleted = currentExercise
    ? Boolean(completedExercises[currentExercise.exerciseId])
    : false;
  const isLastExercise = currentIndex >= totalExercises - 1;

  const handleExerciseComplete = useCallback((exerciseId: string) => {
    setCompletedExercises((prev) => ({ ...prev, [exerciseId]: true }));
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < totalExercises - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, totalExercises]);

  const handleFinish = useCallback(() => {
    onCompleteLevel();
  }, [onCompleteLevel]);

  if (!unit || !section || !proficiency) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Button>
          <div className="h-6 w-px bg-slate-200" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {proficiency.name} &middot; {section.title} &middot; Unit {unit.order}
            </p>
            <h3 className="text-lg font-semibold text-slate-900">
              {unit.title}
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span>{unit.estimatedMinutes} min</span>
          <span className="text-slate-300">&middot;</span>
          <span>{unit.pointsValue} pts</span>
        </div>
      </div>

      {/* Vocabulary preview */}
      {unit.newVocabulary.length > 0 && currentIndex === 0 && !isCompleted && (
        <div className="mx-auto w-full max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-600">
            New vocabulary in this unit
          </p>
          <div className="flex flex-wrap gap-2">
            {unit.newVocabulary.map((v) => (
              <span
                key={v.term}
                className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-medium text-amber-800"
              >
                {v.term} — {v.definition}
              </span>
            ))}
          </div>
          {unit.grammarFocus && (
            <p className="mt-2 text-xs text-amber-600">
              <span className="font-semibold">Grammar focus:</span> {unit.grammarFocus}
            </p>
          )}
          {unit.culturalNote && (
            <p className="mt-1 text-xs text-amber-600">
              <span className="font-semibold">Cultural note:</span> {unit.culturalNote}
            </p>
          )}
        </div>
      )}

      {currentExercise && (
        <ExerciseCard
          key={currentExercise.exerciseId}
          exercise={currentExercise}
          index={currentIndex}
          totalCount={totalExercises}
          isCompleted={isCurrentCompleted}
          isLast={isLastExercise}
          onComplete={handleExerciseComplete}
          onNext={handleNext}
          onFinish={handleFinish}
        />
      )}

      {isCompleted && (
        <div className="mx-auto w-full max-w-2xl rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <p className="text-lg font-semibold text-emerald-700">
            Unit completed — great job!
          </p>
          <p className="mt-1 text-sm text-emerald-600">
            All {totalExercises} exercises finished. Go back to pick the next unit.
          </p>
          <Button variant="outline" className="mt-4" onClick={onBack}>
            Back to Units
          </Button>
        </div>
      )}
    </div>
  );
}
