import { SPECIAL_CHARS } from "@/lib/textNormalize";

type SpecialCharBarProps = {
  lang: string;
  onInsert: (char: string) => void;
};

export function SpecialCharBar({ lang, onInsert }: SpecialCharBarProps) {
  const chars = SPECIAL_CHARS[lang.toLowerCase()];
  if (!chars || chars.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {chars.map((ch) => (
        <button
          key={ch}
          type="button"
          onClick={() => onInsert(ch)}
          className="rounded border border-slate-200 bg-white px-2 py-0.5 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 active:scale-95"
        >
          {ch}
        </button>
      ))}
    </div>
  );
}
