import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listLanguages, listCurricula } from "@/lib/api";
import type { LanguageInfo, LanguagePair } from "@/types/curriculum";
import {
  usePreferences,
  type Proficiency,
} from "@/contexts/UserPreferencesContext";
import { TopNav } from "@/components/TopNav";
import { Button } from "@/components/ui/button";

const proficiencyOptions: { value: Proficiency; label: string; description: string }[] = [
  { value: "beginner", label: "Beginner", description: "I'm just starting out" },
  { value: "intermediate", label: "Intermediate", description: "I know some basics already" },
  { value: "advanced", label: "Advanced", description: "I want to polish my skills" },
];

export function SettingsPage() {
  const navigate = useNavigate();
  const prefs = usePreferences();

  const [languages, setLanguages] = useState<LanguageInfo[]>([]);
  const [pairs, setPairs] = useState<LanguagePair[]>([]);
  const [sourceCode, setSourceCode] = useState(prefs.sourceCode);
  const [targetCode, setTargetCode] = useState(prefs.targetCode);
  const [proficiency, setProficiency] = useState<Proficiency>(prefs.proficiency);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([listLanguages(), listCurricula()])
      .then(([langs, curricula]) => {
        setLanguages(langs);
        setPairs(curricula);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load languages")
      );
  }, []);

  const sourceCodes = Array.from(new Set(pairs.map((p) => p.source_code)));
  const sourceOptions = languages.filter((l) => sourceCodes.includes(l.code));

  const targetCodes = pairs
    .filter((p) => p.source_code === sourceCode)
    .map((p) => p.target_code);
  const targetOptions = languages.filter((l) => targetCodes.includes(l.code));

  const handleSourceChange = (code: string) => {
    setSourceCode(code);
    setSaved(false);
    const available = pairs.filter((p) => p.source_code === code);
    if (available.length > 0) {
      const stillValid = available.some((p) => p.target_code === targetCode);
      if (!stillValid) setTargetCode(available[0].target_code);
    } else {
      setTargetCode("");
    }
  };

  const handleSave = () => {
    const sourceLang = languages.find((l) => l.code === sourceCode);
    const targetLang = languages.find((l) => l.code === targetCode);

    prefs.savePreferences({
      sourceCode,
      sourceName: sourceLang?.name ?? sourceCode,
      targetCode,
      targetName: targetLang?.name ?? targetCode,
      proficiency,
    });

    setSaved(true);
    setTimeout(() => navigate("/", { replace: true }), 600);
  };

  const hasChanges =
    sourceCode !== prefs.sourceCode ||
    targetCode !== prefs.targetCode ||
    proficiency !== prefs.proficiency;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ed,transparent_55%),radial-gradient(circle_at_10%_80%,#e0f2fe,transparent_45%),radial-gradient(circle_at_90%_20%,#fae8ff,transparent_45%)] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-10">
        <TopNav />

        <div className="mx-auto w-full max-w-2xl">
          <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
          <p className="mt-1 text-sm text-slate-500">
            Update your learning language and proficiency level
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}

          {saved && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
              Preferences saved! Redirecting...
            </div>
          )}

          <div className="mt-8 space-y-8">
            {/* Base language */}
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
              <label className="block text-sm font-semibold text-slate-700">
                I speak (Base language)
              </label>
              <select
                value={sourceCode}
                onChange={(e) => handleSourceChange(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition-colors focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                <option value="">Select language</option>
                {sourceOptions.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name} ({l.nativeName})
                  </option>
                ))}
              </select>
            </div>

            {/* Learning language */}
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
              <label className="block text-sm font-semibold text-slate-700">
                I want to learn (Target language)
              </label>
              <select
                value={targetCode}
                onChange={(e) => {
                  setTargetCode(e.target.value);
                  setSaved(false);
                }}
                disabled={targetOptions.length === 0}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition-colors focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                <option value="">Select language</option>
                {targetOptions.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name} ({l.nativeName})
                  </option>
                ))}
              </select>
            </div>

            {/* Proficiency */}
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
              <label className="block text-sm font-semibold text-slate-700">
                Proficiency level
              </label>
              <div className="mt-3 grid gap-3">
                {proficiencyOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setProficiency(opt.value);
                      setSaved(false);
                    }}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                      proficiency === opt.value
                        ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div>
                      <p className="font-medium text-slate-900">{opt.label}</p>
                      <p className="text-sm text-slate-500">{opt.description}</p>
                    </div>
                    {proficiency === opt.value && (
                      <div className="ml-auto text-emerald-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => navigate("/")}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || !sourceCode || !targetCode}
                className="px-8"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
