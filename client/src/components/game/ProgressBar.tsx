type ProgressBarProps = {
  value: number;
  max: number;
};

export function ProgressBar({ value, max }: ProgressBarProps) {
  const clampedMax = max > 0 ? max : 1;
  const percentage = Math.min(100, Math.round((value / clampedMax) * 100));

  return (
    <div className="h-2 w-full rounded-full bg-slate-200">
      <div
        className="h-2 rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 transition-all"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
