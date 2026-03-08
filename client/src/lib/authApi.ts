export type AuthUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: "user" | "admin";
};

type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

async function authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers as Record<string, string> ?? {}) },
    ...options,
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(body?.message ?? `Request failed (${res.status})`);
  }

  return body as T;
}

export async function googleLogin(credential: string, role?: "admin"): Promise<AuthResponse> {
  return authRequest<AuthResponse>("/api/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential, role }),
  });
}

let _inflightRefresh: Promise<AuthResponse> | null = null;

export async function refreshAccessToken(): Promise<AuthResponse> {
  if (_inflightRefresh) return _inflightRefresh;
  _inflightRefresh = authRequest<AuthResponse>("/api/auth/refresh", { method: "POST" })
    .finally(() => { _inflightRefresh = null; });
  return _inflightRefresh;
}

export async function logoutApi(): Promise<void> {
  await authRequest<{ message: string }>("/api/auth/logout", { method: "POST" });
}

export async function getCurrentUser(accessToken: string): Promise<AuthUser> {
  return authRequest<AuthUser>("/api/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
