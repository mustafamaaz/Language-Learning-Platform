import { useCallback, useMemo, useRef, useState } from "react";
import type {
  Exercise,
  ExerciseOption,
  PronunciationWord,
  DialogueLine,
  MatchingPair,
  FillBlank,
} from "@/types/curriculum";
import { Button } from "@/components/ui/button";
import { SpeakButton } from "@/components/ui/SpeakButton";
import { SpecialCharBar } from "@/components/ui/SpecialCharBar";
import { fuzzyMatch, fuzzyIncludes } from "@/lib/textNormalize";

const EMPTY_ARRAY: any[] = [];

type ExerciseCardProps = {
  exercise: Exercise;
  index: number;
  totalCount: number;
  isCompleted: boolean;
  isLast: boolean;
  targetLang: string;
  onComplete: (exerciseId: string) => void;
  onNext: () => void;
  onFinish: () => void;
};

export function ExerciseCard({
  exercise,
  index,
  totalCount,
  isCompleted,
  isLast,
  targetLang,
  onComplete,
  onNext,
  onFinish,
}: ExerciseCardProps) {
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");

  const handleCorrect = () => {
    if (!isCompleted) {
      onComplete(exercise.exerciseId);
    }
    setStatus("correct");
  };

  const handleWrong = () => {
    setStatus("wrong");
  };

  return (
    <div className="rise-in mx-auto w-full max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex-1">
          <div className="h-2 rounded-full bg-slate-200">
            <div
              className="h-2 rounded-full bg-slate-900 transition-all duration-500"
              style={{ width: `${((index + (isCompleted ? 1 : 0)) / totalCount) * 100}%` }}
            />
          </div>
        </div>
        <span className="text-sm font-medium text-slate-500">
          {index + 1} / {totalCount}
        </span>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {exercise.type.replace(/_/g, " ")}
          <span className="ml-2 text-slate-300">&middot;</span>
          <span className="ml-2">{exercise.points} pts</span>
        </p>

        <h4 className="mt-3 text-xl font-semibold text-slate-900">
          {exercise.instruction}
        </h4>

        <div className="mt-5">
          <ExerciseRenderer
            exercise={exercise}
            targetLang={targetLang}
            onCorrect={handleCorrect}
            onWrong={handleWrong}
            isCompleted={isCompleted || status === "correct"}
          />
        </div>

        {exercise.hint && status !== "correct" && !isCompleted ? (
          <p className="mt-4 text-sm text-slate-500">
            <span className="font-medium">Hint:</span> {exercise.hint}
          </p>
        ) : null}

        {status === "correct" && exercise.explanation ? (
          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {exercise.explanation}
          </div>
        ) : null}

        {status === "wrong" ? (
          <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
            Not quite right — try again!
          </div>
        ) : null}

        {status === "correct" || isCompleted ? (
          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
            <p className="text-sm font-semibold text-emerald-600">
              Correct!
            </p>
            {isLast ? (
              <Button onClick={onFinish} className="px-6">
                Complete Level
              </Button>
            ) : (
              <Button onClick={onNext} className="px-6">
                Next
                <svg xmlns="http://www.w3.org/2000/svg" className="ml-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

type RendererProps = {
  exercise: Exercise;
  targetLang: string;
  isCompleted: boolean;
  onCorrect: () => void;
  onWrong: () => void;
};

function ExerciseRenderer({ exercise, targetLang, isCompleted, onCorrect, onWrong }: RendererProps) {
  switch (exercise.type) {
    case "pronunciation":
      return <PronunciationExercise exercise={exercise} targetLang={targetLang} isCompleted={isCompleted} onCorrect={onCorrect} />;
    case "complete_chat":
      return <CompleteChatExercise exercise={exercise} targetLang={targetLang} isCompleted={isCompleted} onCorrect={onCorrect} onWrong={onWrong} />;
    case "listen_select":
      return <ListenSelectExercise exercise={exercise} targetLang={targetLang} isCompleted={isCompleted} onCorrect={onCorrect} onWrong={onWrong} />;
    case "matching_pairs":
      return <MatchingPairsExercise exercise={exercise} targetLang={targetLang} isCompleted={isCompleted} onCorrect={onCorrect} />;
    case "select_translation":
      return <SelectTranslationExercise exercise={exercise} targetLang={targetLang} isCompleted={isCompleted} onCorrect={onCorrect} onWrong={onWrong} />;
    case "reorder_words":
      return <ReorderWordsExercise exercise={exercise} targetLang={targetLang} isCompleted={isCompleted} onCorrect={onCorrect} onWrong={onWrong} />;
    case "fill_blank":
      return <FillBlankExercise exercise={exercise} targetLang={targetLang} isCompleted={isCompleted} onCorrect={onCorrect} onWrong={onWrong} />;
    case "multiple_choice":
      return <MultipleChoiceExercise exercise={exercise} targetLang={targetLang} isCompleted={isCompleted} onCorrect={onCorrect} onWrong={onWrong} />;
    case "grammar":
      return <GrammarExercise exercise={exercise} targetLang={targetLang} isCompleted={isCompleted} onCorrect={onCorrect} onWrong={onWrong} />;
    case "write_response":
      return <WriteResponseExercise exercise={exercise} targetLang={targetLang} isCompleted={isCompleted} onCorrect={onCorrect} />;
    default:
      return <p className="text-sm text-slate-500">Unsupported exercise type.</p>;
  }
}

/* ────────────────────────────────────────────────────────────
   1. Pronunciation — word-by-word breakdown
   ──────────────────────────────────────────────────────────── */

function PronunciationExercise({ exercise, targetLang, isCompleted, onCorrect }: Omit<RendererProps, "onWrong">) {
  const content = exercise.content ?? {};
  const words = (content.words as PronunciationWord[]) ?? EMPTY_ARRAY;
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex-1">
          <p className="text-lg font-semibold text-slate-900">{content.sentence}</p>
          {content.translation && (
            <p className="mt-1 text-sm text-slate-500">{content.translation}</p>
          )}
        </div>
        {content.sentence && (
          <SpeakButton text={content.sentence} lang={targetLang} audioUrl={content.audioUrl} />
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {words.map((w, i) => (
          <div key={`${w.word}-${i}`} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                w.isNew
                  ? "border-amber-300 bg-amber-50 font-semibold text-amber-800"
                  : "border-slate-200 bg-white text-slate-700"
              } ${expandedIdx === i ? "ring-2 ring-blue-300" : ""}`}
            >
              {w.word}
            </button>
            <SpeakButton text={w.word} lang={targetLang} size="sm" />
          </div>
        ))}
      </div>

      {expandedIdx !== null && words[expandedIdx] && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-sm">
          <div className="flex-1">
            <span className="font-semibold text-blue-800">{words[expandedIdx].word}</span>
            <span className="mx-2 text-blue-300">&middot;</span>
            <span className="text-blue-700">{words[expandedIdx].meaning}</span>
            <span className="mx-2 text-blue-300">&middot;</span>
            <span className="font-mono text-xs text-blue-600">[{words[expandedIdx].phonetic}]</span>
          </div>
          <SpeakButton text={words[expandedIdx].word} lang={targetLang} size="sm" />
        </div>
      )}

      <Button onClick={onCorrect} disabled={isCompleted}>
        Mark as practiced
      </Button>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   2. Complete Chat — dialogue with option selection
   ──────────────────────────────────────────────────────────── */

function CompleteChatExercise({ exercise, targetLang, isCompleted, onCorrect, onWrong }: RendererProps) {
  const content = exercise.content ?? {};
  const dialogue = (content.dialogue as DialogueLine[]) ?? EMPTY_ARRAY;
  const options = (content.options as ExerciseOption[]) ?? EMPTY_ARRAY;
  const [selected, setSelected] = useState<string | null>(null);
  const correctOption = useMemo(() => options.find((o) => o.isCorrect), [options]);

  const handleCheck = () => {
    if (!selected || !correctOption) return;
    selected === correctOption.id ? onCorrect() : onWrong();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        {dialogue.map((line, i) => (
          <div key={i} className={`flex ${line.speaker === "user" ? "justify-end" : "justify-start"}`}>
            {line.text ? (
              <div className={`flex items-start gap-1.5 max-w-[85%] ${
                line.speaker === "app" ? "" : "flex-row-reverse"
              }`}>
                <div className={`rounded-xl px-3 py-2 text-sm ${
                  line.speaker === "app"
                    ? "bg-white text-slate-800 border border-slate-200"
                    : "bg-blue-500 text-white"
                }`}>
                  <p>{line.text}</p>
                  {line.translation && (
                    <p className={`mt-0.5 text-xs ${line.speaker === "app" ? "text-slate-400" : "text-blue-100"}`}>
                      {line.translation}
                    </p>
                  )}
                </div>
                {line.speaker === "app" && (
                  <SpeakButton text={line.text} lang={targetLang} size="sm" className="mt-1" />
                )}
              </div>
            ) : (
              <div className="max-w-[80%] rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-400">
                Your response...
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setSelected(opt.id)}
            disabled={isCompleted}
            className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
              selected === opt.id ? "border-slate-400 bg-slate-100" : "border-slate-200 bg-white"
            }`}
          >
            {opt.text}
          </button>
        ))}
      </div>

      <Button onClick={handleCheck} disabled={isCompleted || !selected}>
        Check answer
      </Button>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   3. Listen & Select — audio comprehension
   ──────────────────────────────────────────────────────────── */

function ListenSelectExercise({ exercise, targetLang, isCompleted, onCorrect, onWrong }: RendererProps) {
  const content = exercise.content ?? {};
  const options = (content.options as ExerciseOption[]) ?? EMPTY_ARRAY;
  const transcript = (content.transcript as string) ?? "";
  const [selected, setSelected] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const correctOption = useMemo(() => options.find((o) => o.isCorrect), [options]);

  const handleCheck = () => {
    if (!selected || !correctOption) return;
    selected === correctOption.id ? onCorrect() : onWrong();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <SpeakButton text={transcript} lang={targetLang} audioUrl={content.audioUrl} />
        <div>
          <p className="text-sm font-medium text-slate-600">Tap to listen</p>
          <p className="text-xs text-slate-400">Listen carefully, then choose the correct answer</p>
        </div>
        <button
          type="button"
          onClick={() => setShowTranscript((v) => !v)}
          className="ml-auto text-xs text-blue-500 underline"
        >
          {showTranscript ? "Hide" : "Show"} transcript
        </button>
      </div>

      {showTranscript && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-800">
          {transcript}
        </div>
      )}

      <div className="grid gap-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setSelected(opt.id)}
            disabled={isCompleted}
            className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
              selected === opt.id ? "border-slate-400 bg-slate-100" : "border-slate-200 bg-white"
            }`}
          >
            {opt.text}
          </button>
        ))}
      </div>

      <Button onClick={handleCheck} disabled={isCompleted || !selected}>
        Check answer
      </Button>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   4. Matching Pairs — tap pairs to match
   ──────────────────────────────────────────────────────────── */

function MatchingPairsExercise({ exercise, targetLang, isCompleted, onCorrect }: Omit<RendererProps, "onWrong">) {
  const content = exercise.content ?? {};
  const pairs = (content.pairs as MatchingPair[]) ?? EMPTY_ARRAY;

  const shuffledTargets = useMemo(
    () => [...pairs].sort(() => Math.random() - 0.5),
    [pairs]
  );

  const [selectedSource, setSelectedSource] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrongPair, setWrongPair] = useState<{ source: number; target: number } | null>(null);

  const allMatched = matched.size === pairs.length;

  const handleSourceClick = (idx: number) => {
    if (isCompleted || matched.has(idx)) return;
    setSelectedSource(idx);
    setWrongPair(null);
  };

  const handleTargetClick = (shuffledIdx: number) => {
    if (isCompleted || selectedSource === null) return;
    const sourceItem = pairs[selectedSource];
    const targetItem = shuffledTargets[shuffledIdx];

    if (sourceItem.target === targetItem.target) {
      const next = new Set(matched);
      next.add(selectedSource);
      setMatched(next);
      setSelectedSource(null);
      setWrongPair(null);
      if (next.size === pairs.length) onCorrect();
    } else {
      setWrongPair({ source: selectedSource, target: shuffledIdx });
      setTimeout(() => setWrongPair(null), 800);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Source</p>
          {pairs.map((p, i) => (
            <div key={`s-${i}`} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleSourceClick(i)}
                disabled={isCompleted || matched.has(i)}
                className={`flex-1 rounded-lg border px-3 py-2 text-left text-sm transition ${
                  matched.has(i)
                    ? "border-emerald-200 bg-emerald-50 text-emerald-600 line-through"
                    : selectedSource === i
                      ? "border-blue-400 bg-blue-50 font-semibold text-blue-800"
                      : wrongPair?.source === i
                        ? "border-rose-300 bg-rose-50"
                        : "border-slate-200 bg-white"
                }`}
              >
                {p.source}
              </button>
              <SpeakButton text={p.source} lang={targetLang} size="sm" />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Target</p>
          {shuffledTargets.map((p, i) => {
            const originalIdx = pairs.findIndex((orig) => orig.target === p.target);
            const isMatched = matched.has(originalIdx);
            return (
              <button
                key={`t-${i}`}
                type="button"
                onClick={() => handleTargetClick(i)}
                disabled={isCompleted || isMatched}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                  isMatched
                    ? "border-emerald-200 bg-emerald-50 text-emerald-600 line-through"
                    : wrongPair?.target === i
                      ? "border-rose-300 bg-rose-50"
                      : "border-slate-200 bg-white"
                }`}
              >
                {p.target}
              </button>
            );
          })}
        </div>
      </div>

      {allMatched && !isCompleted && (
        <p className="text-sm font-semibold text-emerald-600">All pairs matched!</p>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   5. Select Translation — pick the correct translation
   ──────────────────────────────────────────────────────────── */

function SelectTranslationExercise({ exercise, targetLang, isCompleted, onCorrect, onWrong }: RendererProps) {
  const content = exercise.content ?? {};
  const prompt = (content.prompt as string) ?? "";
  const options = (content.options as ExerciseOption[]) ?? EMPTY_ARRAY;
  const [selected, setSelected] = useState<string | null>(null);
  const correctOption = useMemo(() => options.find((o) => o.isCorrect), [options]);

  const handleCheck = () => {
    if (!selected || !correctOption) return;
    selected === correctOption.id ? onCorrect() : onWrong();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex-1">
          <p className="text-lg font-semibold text-slate-900">{prompt}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            Translate {content.promptLanguage === "target" ? "from target language" : "from source language"}
          </p>
        </div>
        {content.promptLanguage === "target" && prompt && (
          <SpeakButton text={prompt} lang={targetLang} />
        )}
      </div>

      <div className="grid gap-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setSelected(opt.id)}
            disabled={isCompleted}
            className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
              selected === opt.id ? "border-slate-400 bg-slate-100" : "border-slate-200 bg-white"
            }`}
          >
            {opt.text}
          </button>
        ))}
      </div>

      <Button onClick={handleCheck} disabled={isCompleted || !selected}>
        Check answer
      </Button>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   6. Reorder Words — drag/tap words into correct order
   ──────────────────────────────────────────────────────────── */

function ReorderWordsExercise({ exercise, isCompleted, onCorrect, onWrong }: RendererProps) {
  const content = exercise.content ?? {};
  const words = (content.shuffledWords as string[]) ?? EMPTY_ARRAY;
  const correctOrder = (content.correctOrder as string[]) ?? EMPTY_ARRAY;
  const [answer, setAnswer] = useState<string[]>([]);

  const handleWordClick = (word: string, index: number) => {
    if (isCompleted) return;
    const key = `${word}-${index}`;
    if (answer.includes(key)) return;
    setAnswer((prev) => [...prev, key]);
  };

  const handleReset = () => setAnswer([]);

  const handleCheck = () => {
    const normalized = answer.map((entry) => entry.split("-")[0]);
    const isCorrect =
      normalized.length === correctOrder.length &&
      normalized.every((w, idx) => w === correctOrder[idx]);
    isCorrect ? onCorrect() : onWrong();
  };

  return (
    <div className="space-y-3">
      {content.translation && (
        <p className="text-sm text-slate-500">Translation: {content.translation}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {words.map((word, index) => (
          <button
            key={`${word}-${index}`}
            type="button"
            onClick={() => handleWordClick(word, index)}
            disabled={isCompleted || answer.includes(`${word}-${index}`)}
            className={`rounded-full border px-3 py-1 text-sm transition ${
              answer.includes(`${word}-${index}`)
                ? "border-slate-300 bg-slate-100 text-slate-400"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
            }`}
          >
            {word}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">
        {answer.length === 0
          ? "Tap words to build the sentence."
          : answer.map((entry) => entry.split("-")[0]).join(" ")}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleCheck} disabled={isCompleted || answer.length === 0}>
          Check order
        </Button>
        <Button variant="secondary" onClick={handleReset} disabled={isCompleted}>
          Reset
        </Button>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   7. Fill in the Blank
   ──────────────────────────────────────────────────────────── */

function FillBlankExercise({ exercise, targetLang, isCompleted, onCorrect, onWrong }: RendererProps) {
  const content = exercise.content ?? {};
  const text = (content.text as string) ?? "";
  const blanks = (content.blanks as FillBlank[]) ?? EMPTY_ARRAY;
  const [answers, setAnswers] = useState<string[]>(blanks.map(() => ""));
  const [activeBlank, setActiveBlank] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const parts = useMemo(() => text.split(/_{3,}/g), [text]);

  const handleChange = (index: number, value: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleInsertChar = useCallback(
    (char: string) => {
      const input = inputRefs.current[activeBlank];
      if (!input || isCompleted) return;
      const start = input.selectionStart ?? answers[activeBlank].length;
      const end = input.selectionEnd ?? start;
      const current = answers[activeBlank];
      const updated = current.slice(0, start) + char + current.slice(end);
      handleChange(activeBlank, updated);
      requestAnimationFrame(() => {
        input.focus();
        const pos = start + char.length;
        input.setSelectionRange(pos, pos);
      });
    },
    [activeBlank, answers, isCompleted]
  );

  const handleCheck = () => {
    const isCorrect = blanks.every((blank, index) => {
      const answer = (answers[index] ?? "").trim();
      const accepted = blank.acceptedAnswers ?? [];
      return accepted.some((v) => fuzzyMatch(answer, v, blank.caseSensitive));
    });
    isCorrect ? onCorrect() : onWrong();
  };

  return (
    <div className="space-y-3">
      {content.context && (
        <p className="text-xs text-slate-400">{content.context}</p>
      )}

      <SpecialCharBar lang={targetLang} onInsert={handleInsertChar} />

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
        {parts.map((part, index) => (
          <span key={`part-${index}`}>
            {part}
            {index < blanks.length ? (
              <input
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                value={answers[index]}
                onChange={(e) => handleChange(index, e.target.value)}
                onFocus={() => setActiveBlank(index)}
                disabled={isCompleted}
                className="mx-1 inline-flex w-24 rounded-md border border-slate-300 px-2 py-1 text-sm"
              />
            ) : null}
          </span>
        ))}
      </div>
      <Button onClick={handleCheck} disabled={isCompleted}>
        Check answers
      </Button>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   8. Multiple Choice
   ──────────────────────────────────────────────────────────── */

function MultipleChoiceExercise({ exercise, isCompleted, onCorrect, onWrong }: RendererProps) {
  const content = exercise.content ?? {};
  const question = (content.question as string) ?? "";
  const options = (content.options as ExerciseOption[]) ?? EMPTY_ARRAY;
  const [selected, setSelected] = useState<string | null>(null);
  const correctOption = useMemo(() => options.find((o) => o.isCorrect), [options]);

  const handleCheck = () => {
    if (!selected || !correctOption) return;
    selected === correctOption.id ? onCorrect() : onWrong();
  };

  return (
    <div className="space-y-3">
      <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        {question}
      </p>

      <div className="grid gap-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setSelected(opt.id)}
            disabled={isCompleted}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
              selected === opt.id ? "border-slate-400 bg-slate-100" : "border-slate-200 bg-white"
            }`}
          >
            <span>{opt.text}</span>
          </button>
        ))}
      </div>

      <Button onClick={handleCheck} disabled={isCompleted || !selected}>
        Check answer
      </Button>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   9. Grammar — focused grammar practice with rule display
   ──────────────────────────────────────────────────────────── */

function GrammarExercise({ exercise, targetLang, isCompleted, onCorrect, onWrong }: RendererProps) {
  const content = exercise.content ?? {};
  const rule = (content.rule as string) ?? "";
  const question = (content.question as string) ?? "";
  const options = (content.options as ExerciseOption[]) ?? EMPTY_ARRAY;
  const grammarExplanation = (content.explanation as string) ?? "";
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const correctOption = useMemo(() => options.find((o) => o.isCorrect), [options]);

  const handleCheck = () => {
    if (!selected || !correctOption) return;
    setShowResult(true);
    selected === correctOption.id ? onCorrect() : onWrong();
  };

  return (
    <div className="space-y-3">
      {rule && (
        <div className="rounded-lg border border-violet-100 bg-violet-50 px-3 py-2 text-sm text-violet-700">
          <span className="font-semibold">Grammar rule:</span> {rule}
        </div>
      )}

      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        <p className="flex-1">{question}</p>
        {question && <SpeakButton text={question} lang={targetLang} size="sm" />}
      </div>

      <div className="grid gap-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setSelected(opt.id)}
            disabled={isCompleted}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
              selected === opt.id ? "border-slate-400 bg-slate-100" : "border-slate-200 bg-white"
            }`}
          >
            <span>{opt.text}</span>
          </button>
        ))}
      </div>

      {showResult && grammarExplanation && (
        <div className="rounded-lg border border-violet-100 bg-violet-50 px-3 py-2 text-sm text-violet-700">
          {grammarExplanation}
        </div>
      )}

      <Button onClick={handleCheck} disabled={isCompleted || !selected}>
        Check answer
      </Button>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   10. Write Response — read/listen and write summary
   ──────────────────────────────────────────────────────────── */

function WriteResponseExercise({ exercise, targetLang, isCompleted, onCorrect }: Omit<RendererProps, "onWrong">) {
  const content = exercise.content ?? {};
  const promptText = (content.prompt as string) ?? "";
  const sourceText = (content.text as string) ?? "";
  const sampleAnswer = (content.sampleAnswer as string) ?? "";
  const acceptedKeywords = (content.acceptedKeywords as string[]) ?? EMPTY_ARRAY;
  const minWords = (content.minWords as number) ?? 1;
  const [userInput, setUserInput] = useState("");
  const [showSample, setShowSample] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wordCount = userInput.trim().split(/\s+/).filter(Boolean).length;

  const handleInsertChar = useCallback(
    (char: string) => {
      const ta = textareaRef.current;
      if (!ta || isCompleted) return;
      const start = ta.selectionStart ?? userInput.length;
      const end = ta.selectionEnd ?? start;
      const updated = userInput.slice(0, start) + char + userInput.slice(end);
      setUserInput(updated);
      requestAnimationFrame(() => {
        ta.focus();
        const pos = start + char.length;
        ta.setSelectionRange(pos, pos);
      });
    },
    [userInput, isCompleted]
  );

  const handleSubmit = () => {
    if (wordCount < minWords) return;

    const matchedKeywords = acceptedKeywords.filter((kw) =>
      fuzzyIncludes(userInput, kw)
    );

    if (matchedKeywords.length >= Math.ceil(acceptedKeywords.length * 0.4)) {
      onCorrect();
    } else {
      onCorrect();
    }
    setShowSample(true);
  };

  return (
    <div className="space-y-4">
      {promptText && (
        <p className="text-sm text-slate-600">{promptText}</p>
      )}

      <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="flex-1 text-base font-medium text-slate-900">{sourceText}</p>
        {sourceText && (
          <SpeakButton text={sourceText} lang={targetLang} audioUrl={content.audioUrl} />
        )}
      </div>

      <SpecialCharBar lang={targetLang} onInsert={handleInsertChar} />

      <textarea
        ref={textareaRef}
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        disabled={isCompleted}
        rows={3}
        placeholder="Write your response here..."
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
      />

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
          {wordCount} word{wordCount !== 1 ? "s" : ""} (min {minWords})
        </p>
        <Button onClick={handleSubmit} disabled={isCompleted || wordCount < minWords}>
          Submit
        </Button>
      </div>

      {showSample && (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm">
          <p className="font-semibold text-emerald-700">Sample answer:</p>
          <p className="text-emerald-600">{sampleAnswer}</p>
        </div>
      )}
    </div>
  );
}
