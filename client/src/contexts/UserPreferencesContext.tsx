import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Proficiency = "beginner" | "intermediate" | "advanced";

export type UserPreferences = {
  sourceCode: string;
  sourceName: string;
  targetCode: string;
  targetName: string;
  proficiency: Proficiency;
  isConfigured: boolean;
};

type PreferencesState = UserPreferences & {
  savePreferences: (prefs: Omit<UserPreferences, "isConfigured">) => void;
  clearPreferences: () => void;
};

const STORAGE_KEY = "llp_user_preferences";

const defaults: UserPreferences = {
  sourceCode: "",
  sourceName: "",
  targetCode: "",
  targetName: "",
  proficiency: "beginner",
  isConfigured: false,
};

function loadPreferences(): UserPreferences {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as UserPreferences;
  } catch {
    /* ignore corrupt data */
  }
  return defaults;
}

function persistPreferences(prefs: UserPreferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

const PreferencesContext = createContext<PreferencesState | null>(null);

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<UserPreferences>(() => loadPreferences());

  const savePreferences = useCallback(
    (incoming: Omit<UserPreferences, "isConfigured">) => {
      const next: UserPreferences = { ...incoming, isConfigured: true };
      setPrefs(next);
      persistPreferences(next);
    },
    []
  );

  const clearPreferences = useCallback(() => {
    setPrefs(defaults);
    persistPreferences(defaults);
  }, []);

  const value = useMemo<PreferencesState>(
    () => ({ ...prefs, savePreferences, clearPreferences }),
    [prefs, savePreferences, clearPreferences]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesState {
  const ctx = useContext(PreferencesContext);
  if (!ctx)
    throw new Error("usePreferences must be used within UserPreferencesProvider");
  return ctx;
}
