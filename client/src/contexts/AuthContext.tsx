import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  googleLogin as apiGoogleLogin,
  refreshAccessToken,
  logoutApi,
  type AuthUser,
} from "@/lib/authApi";
import { setTokenGetter } from "@/lib/api";

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (credential: string, role?: "admin") => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthState | null>(null);

const REFRESH_MARGIN_MS = 13 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimer = useRef<ReturnType<typeof setTimeout>>();
  const refreshPromise = useRef<Promise<string | null> | null>(null);

  const scheduleRefresh = useCallback((tokenLifeMs: number) => {
    clearTimeout(refreshTimer.current);
    const delay = Math.max(tokenLifeMs - 2 * 60 * 1000, 30_000);
    refreshTimer.current = setTimeout(() => {
      doRefresh();
    }, delay);
  }, []);

  const doRefresh = useCallback(async (): Promise<string | null> => {
    try {
      const data = await refreshAccessToken();
      setAccessToken(data.accessToken);
      setUser(data.user);
      scheduleRefresh(REFRESH_MARGIN_MS);
      return data.accessToken;
    } catch {
      setAccessToken(null);
      setUser(null);
      return null;
    }
  }, [scheduleRefresh]);

  const getToken = useCallback(async (): Promise<string | null> => {
    if (accessToken) return accessToken;
    if (!refreshPromise.current) {
      refreshPromise.current = doRefresh().finally(() => {
        refreshPromise.current = null;
      });
    }
    return refreshPromise.current;
  }, [accessToken, doRefresh]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await refreshAccessToken();
        if (cancelled) return;
        setAccessToken(data.accessToken);
        setUser(data.user);
        scheduleRefresh(REFRESH_MARGIN_MS);
      } catch {
        /* no valid session */
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(refreshTimer.current);
    };
  }, [scheduleRefresh]);

  const login = useCallback(
    async (credential: string, role?: "admin") => {
      const data = await apiGoogleLogin(credential, role);
      setAccessToken(data.accessToken);
      setUser(data.user);
      scheduleRefresh(REFRESH_MARGIN_MS);
    },
    [scheduleRefresh]
  );

  const logout = useCallback(async () => {
    await logoutApi().catch(() => {});
    setAccessToken(null);
    setUser(null);
    clearTimeout(refreshTimer.current);
  }, []);

  useEffect(() => {
    setTokenGetter(getToken);
  }, [getToken]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      accessToken,
      isLoading,
      isAuthenticated: !!user,
      isAdmin: user?.role === "admin",
      login,
      logout,
      getToken,
    }),
    [user, accessToken, isLoading, login, logout, getToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
