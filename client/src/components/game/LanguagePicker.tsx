import { Button } from "@/components/ui/button";
import type { LanguageInfo, LanguagePair } from "@/types/curriculum";

type LanguagePickerProps = {
  languages: LanguageInfo[];
  pairs: LanguagePair[];
  sourceCode: string;
  targetCode: string;
  onChangeSource: (code: string) => void;
  onChangeTarget: (code: string) => void;
  onRefresh: () => void;
};

export function LanguagePicker({
  languages,
  pairs,
  sourceCode,
  targetCode,
  onChangeSource,
  onChangeTarget,
  onRefresh,
}: LanguagePickerProps) {
  const sourceCodes = Array.from(
    new Set(pairs.map((p) => p.source_code))
  );
  const sourceOptions = languages.filter((l) =>
    sourceCodes.includes(l.code)
  );

  const targetCodes = pairs
    .filter((p) => p.source_code === sourceCode)
    .map((p) => p.target_code);
  const targetOptions = languages.filter((l) =>
    targetCodes.includes(l.code)
  );

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          I speak
        </p>
        <select
          value={sourceCode}
          onChange={(e) => onChangeSource(e.target.value)}
          disabled={sourceOptions.length === 0}
          className="mt-1 w-44 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">Select language</option>
          {sourceOptions.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name} ({l.nativeName})
            </option>
          ))}
        </select>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          I want to learn
        </p>
        <select
          value={targetCode}
          onChange={(e) => onChangeTarget(e.target.value)}
          disabled={targetOptions.length === 0}
          className="mt-1 w-44 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">Select language</option>
          {targetOptions.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name} ({l.nativeName})
            </option>
          ))}
        </select>
      </div>

      <div className="text-xs text-slate-500">
        {pairs.length === 0
          ? "No curricula yet. Add one in Playground."
          : `${pairs.length} course${pairs.length === 1 ? "" : "s"} available`}
      </div>

      <Button variant="secondary" size="sm" onClick={onRefresh}>
        Refresh
      </Button>
    </div>
  );
}
