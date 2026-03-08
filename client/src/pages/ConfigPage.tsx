import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listLanguages, listCurricula } from "@/lib/api";
import type { LanguageInfo, LanguagePair } from "@/types/curriculum";
import {
  usePreferences,
  type Proficiency,
} from "@/contexts/UserPreferencesContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const proficiencyOptions: { value: Proficiency; label: string; description: string; icon: string }[] = [
  {
    value: "beginner",
    label: "Beginner",
    description: "I'm just starting out",
    icon: "🌱",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    description: "I know some basics already",
    icon: "📚",
  },
  {
    value: "advanced",
    label: "Advanced",
    description: "I want to polish my skills",
    icon: "🎯",
  },
];

export function ConfigPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { savePreferences } = usePreferences();

  const [languages, setLanguages] = useState<LanguageInfo[]>([]);
  const [pairs, setPairs] = useState<LanguagePair[]>([]);
  const [sourceCode, setSourceCode] = useState("");
  const [targetCode, setTargetCode] = useState("");
  const [proficiency, setProficiency] = useState<Proficiency>("beginner");
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);

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
    const available = pairs.filter((p) => p.source_code === code);
    if (available.length > 0) {
      const stillValid = available.some((p) => p.target_code === targetCode);
      if (!stillValid) setTargetCode(available[0].target_code);
    } else {
      setTargetCode("");
    }
  };

  const canProceedStep1 = sourceCode !== "";
  const canProceedStep2 = targetCode !== "";

  const handleFinish = () => {
    const sourceLang = languages.find((l) => l.code === sourceCode);
    const targetLang = languages.find((l) => l.code === targetCode);

    savePreferences({
      sourceCode,
      sourceName: sourceLang ? `${sourceLang.name}` : sourceCode,
      targetCode,
      targetName: targetLang ? `${targetLang.name}` : targetCode,
      proficiency,
    });

    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ed,transparent_55%),radial-gradient(circle_at_10%_80%,#e0f2fe,transparent_45%),radial-gradient(circle_at_90%_20%,#fae8ff,transparent_45%)] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            PolyGlot Dynamic
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Let's set up your learning preferences
          </p>
        </div>

        {/* Progress indicator */}
        <div className="mb-8 flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                  s < step
                    ? "bg-emerald-500 text-white"
                    : s === step
                      ? "bg-slate-900 text-white shadow-lg"
                      : "border border-slate-300 bg-white text-slate-400"
                }`}
              >
                {s < step ? "✓" : s}
              </div>
              {s < 3 && (
                <div
                  className={`h-0.5 w-10 rounded-full transition-colors ${
                    s < step ? "bg-emerald-500" : "bg-slate-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="w-full rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl backdrop-blur">
          {error && (
            <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}

          {/* Step 1: Base language */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  What language do you speak?
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  This will be your base language for translations and instructions
                </p>
              </div>

              <div className="grid gap-3">
                {sourceOptions.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                    No languages available. Ask an admin to add curricula first.
                  </p>
                ) : (
                  sourceOptions.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => handleSourceChange(lang.code)}
                      className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                        sourceCode === lang.code
                          ? "border-slate-900 bg-slate-50 shadow-sm ring-1 ring-slate-900"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-600">
                        {lang.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{lang.name}</p>
                        <p className="text-sm text-slate-500">{lang.nativeName}</p>
                      </div>
                      {sourceCode === lang.code && (
                        <div className="ml-auto text-emerald-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!canProceedStep1}
                  className="px-8"
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Learning language */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  What language do you want to learn?
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Choose the language you'd like to start learning
                </p>
              </div>

              <div className="grid gap-3">
                {targetOptions.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setTargetCode(lang.code)}
                    className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                      targetCode === lang.code
                        ? "border-slate-900 bg-slate-50 shadow-sm ring-1 ring-slate-900"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-lg font-bold text-amber-600">
                      {lang.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{lang.name}</p>
                      <p className="text-sm text-slate-500">{lang.nativeName}</p>
                    </div>
                    {targetCode === lang.code && (
                      <div className="ml-auto text-emerald-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!canProceedStep2}
                  className="px-8"
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Proficiency */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  What's your current level?
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  This helps us tailor the learning experience to you
                </p>
              </div>

              <div className="grid gap-3">
                {proficiencyOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setProficiency(opt.value)}
                    className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                      proficiency === opt.value
                        ? "border-slate-900 bg-slate-50 shadow-sm ring-1 ring-slate-900"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-xl">
                      {opt.icon}
                    </div>
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

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button onClick={handleFinish} className="px-8">
                  Start Learning
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
