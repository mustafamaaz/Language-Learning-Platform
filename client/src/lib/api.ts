import type { LanguageInfo, LanguagePair, CurriculumRecord } from "@/types/curriculum";
import { refreshAccessToken } from "@/lib/authApi";

let _getToken: (() => Promise<string | null>) | null = null;

export function setTokenGetter(fn: () => Promise<string | null>) {
  _getToken = fn;
}

export async function authHeaders(): Promise<Record<string, string>> {
  if (!_getToken) return {};
  const token = await _getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function tryRefreshOnce(): Promise<string | null> {
  if (isRefreshing && refreshPromise) return refreshPromise;
  isRefreshing = true;
  refreshPromise = refreshAccessToken()
    .then((data) => {
      isRefreshing = false;
      refreshPromise = null;
      return data.accessToken;
    })
    .catch(() => {
      isRefreshing = false;
      refreshPromise = null;
      return null;
    });
  return refreshPromise;
}

export async function apiRequest(path: string, options: RequestInit = {}) {
  const auth = await authHeaders();

  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...auth,
      ...(options.headers || {}),
    },
    ...options,
  });

  if (response.status === 401 && _getToken) {
    const newToken = await tryRefreshOnce();
    if (newToken) {
      const retryResponse = await fetch(path, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${newToken}`,
          ...(options.headers || {}),
        },
        ...options,
      });

      const retryPayload = await parseResponse(retryResponse);
      if (!retryResponse.ok) {
        throw new Error(retryPayload?.message || `Request failed (${retryResponse.status})`);
      }
      return retryPayload;
    }
  }

  const payload = await parseResponse(response);

  if (!response.ok) {
    const message = payload?.message || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload;
}

async function parseResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json")
    ? await response.json()
    : await response.text();
}

// ── Languages ──────────────────────────────────────────────

function mapLanguageRow(row: any): LanguageInfo {
  return {
    code: row.code,
    name: row.name,
    nativeName: row.native_name ?? row.nativeName ?? row.name,
  };
}

export async function listLanguages(): Promise<LanguageInfo[]> {
  const result = await apiRequest("/api/languages");
  return (result.items ?? []).map(mapLanguageRow);
}

export async function getAvailableTargets(
  sourceCode: string
): Promise<LanguageInfo[]> {
  const result = await apiRequest(
    `/api/languages/${encodeURIComponent(sourceCode)}/targets`
  );
  return (result.items ?? []).map(mapLanguageRow);
}

export async function getAvailableSources(
  targetCode: string
): Promise<LanguageInfo[]> {
  const result = await apiRequest(
    `/api/languages/${encodeURIComponent(targetCode)}/sources`
  );
  return (result.items ?? []).map(mapLanguageRow);
}

// ── Curricula ──────────────────────────────────────────────

export async function listCurricula(): Promise<LanguagePair[]> {
  const result = await apiRequest("/api/curricula");
  return result.items ?? [];
}

function curriculaPath(sourceCode: string, targetCode: string) {
  return `/api/curricula/${encodeURIComponent(sourceCode)}/${encodeURIComponent(targetCode)}`;
}

export async function getCurriculum(
  sourceCode: string,
  targetCode: string
): Promise<CurriculumRecord> {
  return apiRequest(curriculaPath(sourceCode, targetCode));
}

export async function createCurriculum(
  sourceCode: string,
  targetCode: string,
  payload: { schema: unknown; data: unknown }
): Promise<CurriculumRecord> {
  return apiRequest(curriculaPath(sourceCode, targetCode), {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCurriculum(
  sourceCode: string,
  targetCode: string,
  payload: { schema?: unknown; data?: unknown }
): Promise<CurriculumRecord> {
  return apiRequest(curriculaPath(sourceCode, targetCode), {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function updateCurriculumSchema(
  sourceCode: string,
  targetCode: string,
  schema: unknown
): Promise<CurriculumRecord> {
  return apiRequest(`${curriculaPath(sourceCode, targetCode)}/schema`, {
    method: "PUT",
    body: JSON.stringify({ schema }),
  });
}

export async function updateCurriculumData(
  sourceCode: string,
  targetCode: string,
  data: unknown
): Promise<CurriculumRecord> {
  return apiRequest(`${curriculaPath(sourceCode, targetCode)}/data`, {
    method: "PUT",
    body: JSON.stringify({ data }),
  });
}

export async function getCurriculumSection(
  sourceCode: string,
  targetCode: string,
  proficiencyId: string,
  sectionOrder: number
) {
  return apiRequest(
    `${curriculaPath(sourceCode, targetCode)}/sections/${encodeURIComponent(proficiencyId)}/${sectionOrder}`
  );
}

export async function deleteCurriculum(
  sourceCode: string,
  targetCode: string
) {
  return apiRequest(curriculaPath(sourceCode, targetCode), {
    method: "DELETE",
  });
}

// ── Playground samples ─────────────────────────────────────

export async function getSampleSchema() {
  return apiRequest("/api/playground/schema");
}

export async function getSampleResources(file: "default" | "en-en" = "default") {
  const url = file === "en-en"
    ? "/api/playground/resources?file=en-en"
    : "/api/playground/resources";
  return apiRequest(url);
}
